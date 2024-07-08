from collections import defaultdict
from collections.abc import Callable
from typing import cast

from pydantic import BaseModel
from sqlalchemy.orm import Session

from danswer.configs.chat_configs import MULTILINGUAL_QUERY_EXPANSION
from danswer.db.embedding_model import get_current_db_embedding_model
from danswer.db.models import User
from danswer.document_index.factory import get_default_document_index
from danswer.llm.interfaces import LLM
from danswer.search.enums import QueryFlow
from danswer.search.enums import SearchType
from danswer.search.models import IndexFilters
from danswer.search.models import InferenceChunk
from danswer.search.models import InferenceSection
from danswer.search.models import RerankMetricsContainer
from danswer.search.models import RetrievalMetricsContainer
from danswer.search.models import SearchQuery
from danswer.search.models import SearchRequest
from danswer.search.postprocessing.postprocessing import filter_sections
from danswer.search.postprocessing.postprocessing import rerank_chunks
from danswer.search.postprocessing.postprocessing import (
    should_apply_llm_based_relevance_filter,
)
from danswer.search.postprocessing.postprocessing import should_rerank
from danswer.search.preprocessing.preprocessing import retrieval_preprocessing
from danswer.search.retrieval.search_runner import retrieve_chunks
from danswer.utils.threadpool_concurrency import run_functions_tuples_in_parallel


class ChunkRange(BaseModel):
    chunks: list[InferenceChunk]
    start: int
    end: int
    combined_content: str | None = None


def merge_chunk_intervals(chunk_ranges: list[ChunkRange]) -> list[ChunkRange]:
    """This acts on a single document to merge the overlapping ranges of sections
    Algo explained here for easy understanding: https://leetcode.com/problems/merge-intervals
    """
    sorted_ranges = sorted(chunk_ranges, key=lambda x: x.start)

    combined_ranges: list[ChunkRange] = []

    for new_chunk_range in sorted_ranges:
        if not combined_ranges or combined_ranges[-1].end < new_chunk_range.start:
            combined_ranges.append(new_chunk_range)
        else:
            current_range = combined_ranges[-1]
            current_range.end = max(current_range.end, new_chunk_range.end)
            current_range.chunks.extend(new_chunk_range.chunks)

    return combined_ranges


class SearchPipeline:
    def __init__(
        self,
        search_request: SearchRequest,
        user: User | None,
        llm: LLM,
        fast_llm: LLM,
        db_session: Session,
        bypass_acl: bool = False,  # NOTE: VERY DANGEROUS, USE WITH CAUTION
        retrieval_metrics_callback: Callable[[RetrievalMetricsContainer], None]
        | None = None,
        rerank_metrics_callback: Callable[[RerankMetricsContainer], None] | None = None,
    ):
        self.search_request = search_request
        self.user = user
        self.llm = llm
        self.fast_llm = fast_llm
        self.db_session = db_session
        self.bypass_acl = bypass_acl
        self.retrieval_metrics_callback = retrieval_metrics_callback
        self.rerank_metrics_callback = rerank_metrics_callback

        self.embedding_model = get_current_db_embedding_model(db_session)
        self.document_index = get_default_document_index(
            primary_index_name=self.embedding_model.index_name,
            secondary_index_name=None,
        )

        self._search_query: SearchQuery | None = None
        self._predicted_search_type: SearchType | None = None
        self._predicted_flow: QueryFlow | None = None

        self._retrieved_chunks: list[InferenceChunk] | None = None
        self._reranked_chunks: list[InferenceChunk] | None = None
        self._reranked_sections: list[InferenceSection] | None = None
        self._relevant_section_indices: list[int] | None = None

    """Pre-processing"""

    def _run_preprocessing(self) -> None:
        (
            final_search_query,
            predicted_search_type,
            predicted_flow,
        ) = retrieval_preprocessing(
            search_request=self.search_request,
            user=self.user,
            llm=self.llm,
            db_session=self.db_session,
            bypass_acl=self.bypass_acl,
        )
        self._predicted_search_type = predicted_search_type
        self._predicted_flow = predicted_flow
        self._search_query = final_search_query

    @property
    def search_query(self) -> SearchQuery:
        if self._search_query is not None:
            return self._search_query

        self._run_preprocessing()
        return cast(SearchQuery, self._search_query)

    @property
    def predicted_search_type(self) -> SearchType:
        if self._predicted_search_type is not None:
            return self._predicted_search_type

        self._run_preprocessing()
        return cast(SearchType, self._predicted_search_type)

    @property
    def predicted_flow(self) -> QueryFlow:
        if self._predicted_flow is not None:
            return self._predicted_flow

        self._run_preprocessing()
        return cast(QueryFlow, self._predicted_flow)

    """Retrieval and Postprocessing"""

    def _retrieve_chunks(self) -> list[InferenceChunk]:
        """TODO as a future extension:
        If large chunks (above 512 tokens) are used which cannot be directly fed to the LLM,
        This step should run the two retrievals to get all of the base size chunks
        """
        if self._retrieved_chunks is not None:
            return self._retrieved_chunks

        self._retrieved_chunks = retrieve_chunks(
            query=self.search_query,
            document_index=self.document_index,
            db_session=self.db_session,
            hybrid_alpha=self.search_request.hybrid_alpha,
            multilingual_expansion_str=MULTILINGUAL_QUERY_EXPANSION,
            retrieval_metrics_callback=self.retrieval_metrics_callback,
        )

        return cast(list[InferenceChunk], self._retrieved_chunks)

    def _get_reranked_chunks(self) -> list[InferenceChunk]:
        """Reranking is always done at the chunk level since section merging could create arbitrarily
        long sections which could be:
        1. Longer than the maximum context limit of even large rerankers
        2. Slow to calculate due to the quadratic scaling laws of Transformers
        """
        if self._reranked_chunks is not None:
            return self._reranked_chunks

        retrieved_chunks = self._retrieve_chunks()

        if not should_rerank(self.search_query):
            return retrieved_chunks

        self._reranked_chunks = rerank_chunks(
            query=self.search_query,
            chunks_to_rerank=retrieved_chunks,
            rerank_metrics_callback=self.rerank_metrics_callback,
        )

        return self._reranked_chunks

    def _expand_reranked_chunks(self) -> list[InferenceSection]:
        """Returns an expanded section from each of the chunks.
        If whole docs instead of above/below context is specified then it will give back all of the whole docs
        that have a corresponding chunk. Since this could be arbitrarily large, the docs will be potentially
        truncated when doing the filtering"""
        reranked_chunks = self._get_reranked_chunks()

        if self._search_query is None:
            # Should never happen
            raise RuntimeError("Failed in Query Preprocessing")

        above = self._search_query.chunks_above
        below = self._search_query.chunks_below

        functions_with_args: list[tuple[Callable, tuple]] = []
        final_inference_sections = []

        # Full doc setting takes priority
        if self._search_query.full_doc:
            seen_document_ids = set()
            unique_chunks = []
            for chunk in reranked_chunks:
                if chunk.document_id not in seen_document_ids:
                    seen_document_ids.add(chunk.document_id)
                    unique_chunks.append(chunk)

                    functions_with_args.append(
                        (
                            self.document_index.id_based_retrieval,
                            (
                                chunk.document_id,
                                None,  # Start chunk ind
                                None,  # End chunk ind
                                # There is no chunk level permissioning, this expansion around chunks
                                # can be assumed to be safe
                                IndexFilters(access_control_list=None),
                            ),
                        )
                    )

            list_inference_chunks = run_functions_tuples_in_parallel(
                functions_with_args, allow_failures=False
            )

            for ind, chunk in enumerate(unique_chunks):
                inf_chunks = list_inference_chunks[ind]
                combined_content = "\n".join([chunk.content for chunk in inf_chunks])
                final_inference_sections.append(
                    InferenceSection(
                        center_chunk=chunk,
                        chunks=inf_chunks,
                        combined_content=combined_content,
                    )
                )

            return final_inference_sections

        # General flow:
        # - Combine chunks into lists by document_id
        # - For each document, run merge-intervals to get combined ranges
        # - Fetch all of the new chunks with contents for the combined ranges
        # - Map it back to the combined ranges (which each know their "center" chunk)
        # - Reiterate the chunks again and map to the results above based on the chunk.
        #   This maintains the original chunks ordering. Note, we cannot simply sort by score here
        #   as reranking flow may wipe the scores for a lot of the chunks.
        doc_chunk_ranges_map = defaultdict(list)
        for chunk in reranked_chunks:
            # The list of ranges for each document is ordered by score
            doc_chunk_ranges_map[chunk.document_id].append(
                ChunkRange(
                    chunks=[chunk],
                    start=max(0, chunk.chunk_id - above),
                    # No max known ahead of time, filter will handle this anyway
                    end=chunk.chunk_id + below,
                )
            )

        # List of ranges, outside list represents documents, inner list represents ranges
        merged_ranges = [
            merge_chunk_intervals(ranges) for ranges in doc_chunk_ranges_map.values()
        ]
        flat_ranges = [r for ranges in merged_ranges for r in ranges]

        for chunk_range in flat_ranges:
            functions_with_args.append(
                (
                    # If Large Chunks are introduced, additional filters need to be added here
                    self.document_index.id_based_retrieval,
                    (
                        # Only need the document_id here, just use any chunk in the range is fine
                        chunk_range.chunks[0].document_id,
                        chunk_range.start,
                        chunk_range.end,
                        # There is no chunk level permissioning, this expansion around chunks
                        # can be assumed to be safe
                        IndexFilters(access_control_list=None),
                    ),
                )
            )

        # list of list of inference chunks where the inner list needs to be combined for content
        list_inference_chunks = run_functions_tuples_in_parallel(
            functions_with_args, allow_failures=False
        )
        flattened_inference_chunks = [
            chunk for sublist in list_inference_chunks for chunk in sublist
        ]

        doc_chunk_ind_to_chunk = {
            (chunk.document_id, chunk.chunk_id): chunk
            for chunk in flattened_inference_chunks
        }

        # Build the surroundings for all of the initial reranked_chunks
        for chunk in reranked_chunks:
            start_ind = max(0, chunk.chunk_id - above)
            end_ind = chunk.chunk_id + below
            # Since the index of the max_chunk is unknown, just allow it to be None and filter after
            surrounding_chunks_or_none = [
                doc_chunk_ind_to_chunk.get((chunk.document_id, chunk_ind))
                for chunk_ind in range(start_ind, end_ind + 1)  # end_ind is inclusive
            ]
            surrounding_chunks = [
                chunk for chunk in surrounding_chunks_or_none if chunk is not None
            ]

            combined_content = "\n".join(chunk.content for chunk in surrounding_chunks)
            final_inference_sections.append(
                InferenceSection(
                    center_chunk=chunk,
                    chunks=surrounding_chunks,
                    combined_content=combined_content,
                )
            )

        # TODO TEST THIS BEFORE MERGING THE PR!!!
        return final_inference_sections

    @property
    def reranked_sections(self) -> list[InferenceSection]:
        if self._reranked_sections is not None:
            return self._reranked_sections

        self._reranked_sections = self._expand_reranked_chunks()

        return self._reranked_sections

    @property
    def relevant_section_indices(self) -> list[int]:
        if self._relevant_section_indices is not None:
            return self._relevant_section_indices

        reranked_sections = self.reranked_sections

        if not should_apply_llm_based_relevance_filter(self.search_query):
            return []

        relevant_sections = filter_sections(
            query=self.search_query,
            sections_to_filter=reranked_sections,
            llm=self.fast_llm,
        )

        self._relevant_section_indices = [
            ind
            for ind, section in enumerate(reranked_sections)
            if section in relevant_sections
        ]

        return self._relevant_section_indices

    @property
    def section_relevance_list(self) -> list[bool]:
        return [
            True if ind in self.relevant_section_indices else False
            for ind in range(len(self.reranked_sections))
        ]
