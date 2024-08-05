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

        self.include_metadata = include_metadata
        self.chunk_token_limit = chunk_token_limit

        self.tokenizer = get_tokenizer(
            model_name=embedder.model_name,
            provider_type=embedder.provider_type,
        )

        self.blurb_splitter = SentenceSplitter(
            tokenizer=self.tokenizer.tokenize,
            chunk_size=blurb_size,
            chunk_overlap=0,
        )

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

    def _extract_blurb(self, text: str) -> str:
        texts = self.blurb_splitter.split_text(text)
        if not texts:
            return ""
        return texts[0]

    def _get_mini_chunk_texts(self, chunk_text: str) -> list[str] | None:
        if self.mini_chunk_splitter and chunk_text.strip():
            return self.mini_chunk_splitter.split_text(chunk_text)
        return None

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

        def _create_chunk(
            text: str,
            links: dict[int, str],
            is_continuation: bool = False,
        ) -> DocAwareChunk:
            return DocAwareChunk(
                source_document=document,
                chunk_id=len(chunks),
                blurb=self._extract_blurb(text),
                content=text,
                source_links=links or {0: ""},
                section_continuation=is_continuation,
                title_prefix=title_prefix,
                metadata_suffix_semantic=metadata_suffix_semantic,
                metadata_suffix_keyword=metadata_suffix_keyword,
                mini_chunk_texts=self._get_mini_chunk_texts(text),
            )

        for section in document.sections:
            section_text = section.text
            section_link_text = section.link or ""

            section_token_count = len(self.tokenizer.tokenize(section_text))

            # Large sections are considered self-contained/unique
            # Therefore, they start a new chunk and are not concatenated
            # at the end by other sections
            if section_token_count > content_token_limit:
                if chunk_text:
                    chunks.append(_create_chunk(chunk_text, link_offsets))
                    link_offsets = {}
                    chunk_text = ""

                split_texts = self.chunk_splitter.split_text(section_text)
                for i, split_text in enumerate(split_texts):
                    chunks.append(
                        _create_chunk(
                            text=split_text,
                            links={0: section_link_text},
                            is_continuation=(i != 0),
                        )
                    )
                continue

            current_token_count = len(self.tokenizer.tokenize(chunk_text))
            current_offset = len(shared_precompare_cleanup(chunk_text))
            # In the case where the whole section is shorter than a chunk, either add
            # to chunk or start a new one
            next_section_tokens = (
                len(self.tokenizer.tokenize(SECTION_SEPARATOR)) + section_token_count
            )
            if next_section_tokens + current_token_count <= content_token_limit:
                if chunk_text:
                    chunk_text += SECTION_SEPARATOR
                chunk_text += section_text
                link_offsets[current_offset] = section_link_text
            else:
                chunks.append(_create_chunk(chunk_text, link_offsets))
                link_offsets = {0: section_link_text}
                chunk_text = section_text

        # Once we hit the end, if we're still in the process of building a chunk, add what we have.
        # If there is only whitespace left then don't include it. If there are no chunks at all
        # from the doc, we can just create a single chunk with the title.
        if chunk_text.strip() or not chunks:
            chunks.append(_create_chunk(chunk_text, link_offsets))

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


def connect_mega_chunks(
    chunks: list[DocAwareChunk], mega_chunks: list[DocAwareChunk]
) -> list[DocAwareChunk]:
    """
    this takes a list of chunks and a list of mega chunks that are from the same source docuement,
    compares the doc_text_ranges of each chunk and mega chunk,
    and points the mega chunk to the chunk that it is a part of the same document and text range.
    Assumptions:
    - The chunks are in order
    - The mega chunks are in order
    - The total text length of the chunks is the same as the total text length of the mega chunks
    - The mega chunks are not overlapping
    - The chunks and mega chunks are from the same document
    """
    chunk_text_length = 0
    mega_chunk_text_length = 0
    chunk_index = 0

    for i, mega_chunk in enumerate(mega_chunks):
        mega_chunk.mega_chunk_reference_ids = []
        if chunk_text_length != mega_chunk_text_length:
            mega_chunk.mega_chunk_reference_ids.append(chunk_index - 1)

        # Add the length of the mega chunk content
        mega_chunk_text_length += len(mega_chunk.content)
        # Subtract the length of the section seperators
        if mega_chunk.source_links:
            mega_chunk_text_length -= (len(mega_chunk.source_links) - 1) * len(
                SECTION_SEPARATOR
            )

        while chunk_text_length < mega_chunk_text_length:
            if chunk_index >= len(chunks):
                break
            chunk_text_length += len(chunks[chunk_index].content)
            links = chunks[chunk_index].source_links
            if links:
                chunk_text_length -= (len(links) - 1) * len(SECTION_SEPARATOR)
            chunk_text_length -= CHUNK_OVERLAP
            mega_chunk.mega_chunk_reference_ids.append(chunk_index)
            chunk_index += 1

    return mega_chunks
