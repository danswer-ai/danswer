from danswer.configs.app_configs import BLURB_SIZE
from danswer.configs.app_configs import ENABLE_MINI_CHUNK
from danswer.configs.app_configs import MEGA_CHUNK_SIZE
from danswer.configs.app_configs import MINI_CHUNK_SIZE
from danswer.configs.app_configs import SKIP_METADATA_IN_CHUNK
from danswer.configs.constants import DocumentSource
from danswer.configs.constants import RETURN_SEPARATOR
from danswer.configs.constants import SECTION_SEPARATOR
from danswer.configs.model_configs import DOC_EMBEDDING_CONTEXT_SIZE
from danswer.connectors.cross_connector_utils.miscellaneous_utils import (
    get_metadata_keys_to_ignore,
)
from danswer.connectors.models import Document
from danswer.indexing.embedder import IndexingEmbedder
from danswer.indexing.models import DocAwareChunk
from danswer.natural_language_processing.utils import get_tokenizer
from danswer.utils.logger import setup_logger
from danswer.utils.text_processing import shared_precompare_cleanup


# Not supporting overlaps, we need a clean combination of chunks and it is unclear if overlaps
# actually help quality at all
CHUNK_OVERLAP = 0
# Fairly arbitrary numbers but the general concept is we don't want the title/metadata to
# overwhelm the actual contents of the chunk
# For example in a rare case, this could be 128 tokens for the 512 chunk and title prefix
# could be another 128 tokens leaving 256 for the actual contents
MAX_METADATA_PERCENTAGE = 0.25
CHUNK_MIN_CONTENT = 256

logger = setup_logger()


def _get_metadata_suffix_for_document_index(
    metadata: dict[str, str | list[str]], include_separator: bool = False
) -> tuple[str, str]:
    """
    Returns the metadata as a natural language string representation with all of the keys and values for the vector embedding
    and a string of all of the values for the keyword search

    For example, if we have the following metadata:
    {
        "author": "John Doe",
        "space": "Engineering"
    }
    The vector embedding string should include the relation between the key and value wheres as for keyword we only want John Doe
    and Engineering. The keys are repeat and much more noisy.
    """
    if not metadata:
        return "", ""

    metadata_str = "Metadata:\n"
    metadata_values = []
    for key, value in metadata.items():
        if key in get_metadata_keys_to_ignore():
            continue

        value_str = ", ".join(value) if isinstance(value, list) else value

        if isinstance(value, list):
            metadata_values.extend(value)
        else:
            metadata_values.append(value)

        metadata_str += f"\t{key} - {value_str}\n"

    metadata_semantic = metadata_str.strip()
    metadata_keyword = " ".join(metadata_values)

    if include_separator:
        return RETURN_SEPARATOR + metadata_semantic, RETURN_SEPARATOR + metadata_keyword
    return metadata_semantic, metadata_keyword


class Chunker:
    """
    Chunks documents into smaller chunks for indexing.
    """

    def __init__(
        self,
        embedder: IndexingEmbedder,
        blurb_size: int = BLURB_SIZE,
        include_metadata: bool = not SKIP_METADATA_IN_CHUNK,
        chunk_token_limit: int = DOC_EMBEDDING_CONTEXT_SIZE,
        chunk_overlap: int = CHUNK_OVERLAP,
        enable_mini_chunk: bool = ENABLE_MINI_CHUNK,
        mini_chunk_size: int = MINI_CHUNK_SIZE,
    ) -> None:
        from llama_index.text_splitter import SentenceSplitter

        self.tokenizer = get_tokenizer(
            model_name=embedder.model_name,
            provider_type=embedder.provider_type,
        )
        self.blurb_splitter = SentenceSplitter(
            tokenizer=self.tokenizer.tokenize,
            chunk_size=blurb_size,
            chunk_overlap=0,
        )

        self.chunk_token_limit = chunk_token_limit
        self.chunk_splitter = SentenceSplitter(
            tokenizer=self.tokenizer.tokenize,
            chunk_size=chunk_token_limit,
            chunk_overlap=chunk_overlap,
        )

        self.mini_chunk_splitter = (
            SentenceSplitter(
                tokenizer=self.tokenizer.tokenize,
                chunk_size=mini_chunk_size,
                chunk_overlap=0,
            )
            if enable_mini_chunk
            else None
        )

        self.include_metadata = include_metadata

    def _extract_blurb(self, text: str) -> str:
        texts = self.blurb_splitter.split_text(text)
        if not texts:
            return ""
        return texts[0]

    def _get_mini_chunk_texts(self, chunk_text: str) -> list[str] | None:
        if self.mini_chunk_splitter and chunk_text.strip():
            return self.mini_chunk_splitter.split_text(chunk_text)
        return None

    def _chunk_large_section(
        self,
        section_text: str,
        section_link_text: str,
        document: Document,
        start_chunk_id: int,
        blurb: str,
        title_prefix: str,
        metadata_suffix_semantic: str,
        metadata_suffix_keyword: str,
    ) -> list[DocAwareChunk]:
        split_texts = self.chunk_splitter.split_text(section_text)

        chunks = [
            DocAwareChunk(
                source_document=document,
                chunk_id=start_chunk_id + chunk_ind,
                blurb=blurb,
                content=chunk_text,
                source_links={0: section_link_text},
                section_continuation=(chunk_ind != 0),
                title_prefix=title_prefix,
                metadata_suffix_semantic=metadata_suffix_semantic,
                metadata_suffix_keyword=metadata_suffix_keyword,
                mini_chunk_texts=self._get_mini_chunk_texts(chunk_text),
            )
            for chunk_ind, chunk_text in enumerate(split_texts)
        ]
        return chunks

    def _chunk_document(
        self,
        document: Document,
        title_prefix: str,
        metadata_suffix_semantic: str,
        metadata_suffix_keyword: str,
        content_token_limit: int,
    ) -> list[DocAwareChunk]:
        """
        Loops through sections of the document, adds metadata and converts them into chunks.
        """
        chunks: list[DocAwareChunk] = []
        link_offsets: dict[int, str] = {}
        chunk_text = ""
        for section in document.sections:
            section_text = section.text
            section_link_text = section.link or ""

            section_token_length = len(self.tokenizer.tokenize(section_text))
            current_token_length = len(self.tokenizer.tokenize(chunk_text))
            curr_offset_len = len(shared_precompare_cleanup(chunk_text))

            # Large sections are considered self-contained/unique
            # Therefore, they start a new chunk and are not concatenated
            # at the end by other sections
            if section_token_length > content_token_limit:
                if chunk_text:
                    chunks.append(
                        DocAwareChunk(
                            source_document=document,
                            chunk_id=len(chunks),
                            blurb=self._extract_blurb(chunk_text),
                            content=chunk_text,
                            source_links=link_offsets,
                            section_continuation=False,
                            title_prefix=title_prefix,
                            metadata_suffix_semantic=metadata_suffix_semantic,
                            metadata_suffix_keyword=metadata_suffix_keyword,
                            mini_chunk_texts=self._get_mini_chunk_texts(chunk_text),
                        )
                    )
                    link_offsets = {}
                    chunk_text = ""

                large_section_chunks = self._chunk_large_section(
                    section_text=section_text,
                    section_link_text=section_link_text,
                    document=document,
                    start_chunk_id=len(chunks),
                    blurb=self._extract_blurb(section_text),
                    title_prefix=title_prefix,
                    metadata_suffix_semantic=metadata_suffix_semantic,
                    metadata_suffix_keyword=metadata_suffix_keyword,
                )
                chunks.extend(large_section_chunks)
                continue

            # In the case where the whole section is shorter than a chunk, either add
            # to chunk or start a new one
            if (
                current_token_length
                + len(self.tokenizer.tokenize(SECTION_SEPARATOR))
                + section_token_length
                <= content_token_limit
            ):
                chunk_text += SECTION_SEPARATOR * bool(chunk_text) + section_text
                link_offsets[curr_offset_len] = section_link_text
            else:
                chunks.append(
                    DocAwareChunk(
                        source_document=document,
                        chunk_id=len(chunks),
                        blurb=self._extract_blurb(chunk_text),
                        content=chunk_text,
                        source_links=link_offsets,
                        section_continuation=False,
                        title_prefix=title_prefix,
                        metadata_suffix_semantic=metadata_suffix_semantic,
                        metadata_suffix_keyword=metadata_suffix_keyword,
                        mini_chunk_texts=self._get_mini_chunk_texts(chunk_text),
                    )
                )
                link_offsets = {0: section_link_text}
                chunk_text = section_text

        # Once we hit the end, if we're still in the process of building a chunk, add what we have.
        # If there is only whitespace left then don't include it. If there are no chunks at all
        # from the doc, we can just create a single chunk with the title.
        if chunk_text.strip() or not chunks:
            chunks.append(
                DocAwareChunk(
                    source_document=document,
                    chunk_id=len(chunks),
                    blurb=self._extract_blurb(chunk_text),
                    content=chunk_text,
                    source_links=link_offsets,
                    section_continuation=False,
                    title_prefix=title_prefix,
                    metadata_suffix_semantic=metadata_suffix_semantic,
                    metadata_suffix_keyword=metadata_suffix_keyword,
                    mini_chunk_texts=self._get_mini_chunk_texts(chunk_text),
                )
            )

        # If the chunk does not have any useable content, it will not be indexed
        return chunks

    def chunk(self, document: Document) -> list[DocAwareChunk]:
        # Specifically for reproducing an issue with gmail
        if document.source == DocumentSource.GMAIL:
            logger.debug(f"Chunking {document.semantic_identifier}")

        title = self._extract_blurb(document.get_title_for_document_index() or "")
        title_prefix = title + RETURN_SEPARATOR if title else ""
        title_tokens = len(self.tokenizer.tokenize(title_prefix))

        metadata_suffix_semantic = ""
        metadata_suffix_keyword = ""
        metadata_tokens = 0
        if self.include_metadata:
            (
                metadata_suffix_semantic,
                metadata_suffix_keyword,
            ) = _get_metadata_suffix_for_document_index(
                document.metadata, include_separator=True
            )
            metadata_tokens = len(self.tokenizer.tokenize(metadata_suffix_semantic))

        if metadata_tokens >= self.chunk_token_limit * MAX_METADATA_PERCENTAGE:
            # Note: we can keep the keyword suffix even if the semantic suffix is too long to fit in the model
            # context, there is no limit for the keyword component
            metadata_suffix_semantic = ""
            metadata_tokens = 0

        content_token_limit = self.chunk_token_limit - title_tokens - metadata_tokens
        # If there is not enough context remaining then just index the chunk with no prefix/suffix
        if content_token_limit <= CHUNK_MIN_CONTENT:
            content_token_limit = self.chunk_token_limit
            title_prefix = ""
            metadata_suffix_semantic = ""

        return self._chunk_document(
            document,
            title_prefix,
            metadata_suffix_semantic,
            metadata_suffix_keyword,
            content_token_limit,
        )


_DEFAULT_CHUNKER: Chunker | None = None
_MEGA_CHUNKER: Chunker | None = None


def get_default_chunker(embedder: IndexingEmbedder) -> Chunker:
    global _DEFAULT_CHUNKER
    if _DEFAULT_CHUNKER is None:
        logger.debug("Creating default chunker")
        _DEFAULT_CHUNKER = Chunker(embedder)
    return _DEFAULT_CHUNKER


def get_mega_chunker(embedder: IndexingEmbedder) -> Chunker:
    global _MEGA_CHUNKER
    if _MEGA_CHUNKER is None:
        logger.debug("Creating mega chunker")
        _MEGA_CHUNKER = Chunker(
            embedder,
            chunk_token_limit=MEGA_CHUNK_SIZE,
            enable_mini_chunk=False,
            chunk_overlap=0,
        )
    return _MEGA_CHUNKER
