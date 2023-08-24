import abc
import re
from collections.abc import Callable

from danswer.chunking.models import DocAwareChunk
from danswer.configs.app_configs import BLURB_LENGTH
from danswer.configs.app_configs import CHUNK_MAX_CHAR_OVERLAP
from danswer.configs.app_configs import CHUNK_SIZE
from danswer.configs.app_configs import CHUNK_WORD_OVERLAP
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.text_processing import shared_precompare_cleanup

SECTION_SEPARATOR = "\n\n"
ChunkFunc = Callable[[Document], list[DocAwareChunk]]


def extract_blurb(text: str, blurb_len: int) -> str:
    if len(text) < blurb_len:
        return text

    match = re.search(r"[.!?:]", text[blurb_len:])
    max_blub_len = min(2 * blurb_len, len(text))

    end_index = (
        max_blub_len
        if match is None
        else min(blurb_len + match.start() + 1, max_blub_len)
    )

    if text[end_index : end_index + 1] not in [" ", "", "\r", "\n"]:
        last_space = text.rfind(" ", 0, end_index)
        # If there's no space in the text (single word longer than blurb_len), return the whole text
        end_index = last_space if last_space != -1 else len(text)

    blurb = text[:end_index]

    blurb = blurb.replace("\n", " ")
    blurb = blurb.replace("\r", " ")
    while "  " in blurb:
        blurb = blurb.replace("  ", " ")

    return blurb


def chunk_large_section(
    section: Section,
    document: Document,
    start_chunk_id: int,
    chunk_size: int = CHUNK_SIZE,
    word_overlap: int = CHUNK_WORD_OVERLAP,
    blurb_len: int = BLURB_LENGTH,
    chunk_overflow_max: int = CHUNK_MAX_CHAR_OVERLAP,
) -> list[DocAwareChunk]:
    """Split large sections into multiple chunks with the final chunk having as much previous overlap as possible.
    Backtracks word_overlap words, delimited by whitespace, backtrack up to chunk_overflow_max characters max
    When chunk is finished in forward direction, attempt to finish the word, but only up to chunk_overflow_max

    Some details:
        - Backtracking (overlap) => finish current word by backtracking + an additional (word_overlap - 1) words
        - Continuation chunks start with a space generally unless overflow limit is hit
        - Chunks end with a space generally unless overflow limit is hit
    """
    section_text = section.text
    blurb = extract_blurb(section_text, blurb_len)
    char_count = len(section_text)
    chunk_strs: list[str] = []

    # start_pos is the actual start of the chunk not including the backtracking overlap
    # segment_start_pos counts backwards to include overlap from previous chunk
    start_pos = segment_start_pos = 0
    while start_pos < char_count:
        back_overflow_chars = 0
        forward_overflow_chars = 0
        back_count_words = 0
        end_pos = segment_end_pos = min(start_pos + chunk_size, char_count)

        # Forward overlap to attempt to finish the current word
        while forward_overflow_chars < chunk_overflow_max:
            if (
                segment_end_pos >= char_count
                or section_text[segment_end_pos - 1].isspace()
            ):
                break
            segment_end_pos += 1
            forward_overflow_chars += 1

        # Backwards overlap counting up to word_overlap words (whitespace delineated) or chunk_overflow_max chars
        # Counts back by finishing current word by backtracking + an additional (word_overlap - 1) words
        # If starts on a space, it considers finishing the current word as done
        while back_overflow_chars < chunk_overflow_max:
            if segment_start_pos == 0:
                break
            # no -1 offset here because we want to include prepended space to be clear it's a continuation
            if section_text[segment_start_pos].isspace():
                back_count_words += 1
                if back_count_words > word_overlap:
                    break
                back_count_words += 1
            segment_start_pos -= 1
            back_overflow_chars += 1

        # Extract chunk from section text based on the pointers from above
        chunk_str = section_text[segment_start_pos:segment_end_pos]
        chunk_strs.append(chunk_str)

        # Move pointers to next section, not counting overlaps forward or backward
        start_pos = segment_start_pos = end_pos

    # Last chunk should be as long as possible, overlap favored over tiny chunk with no context
    if len(chunk_strs) > 1:
        chunk_strs.pop()
        back_count_words = 0
        back_overflow_chars = 0
        # Backcount chunk size number of characters then
        # add in the backcounting overlap like with every other previous chunk
        start_pos = char_count - chunk_size
        while back_overflow_chars < chunk_overflow_max:
            if start_pos == 0:
                break
            if section_text[start_pos].isspace():
                if back_count_words > word_overlap:
                    break
                back_count_words += 1
            start_pos -= 1
            back_overflow_chars += 1
        chunk_strs.append(section_text[start_pos:])

    chunks = []
    for chunk_ind, chunk_str in enumerate(chunk_strs):
        chunks.append(
            DocAwareChunk(
                source_document=document,
                chunk_id=start_chunk_id + chunk_ind,
                blurb=blurb,
                content=chunk_str,
                source_links={0: section.link},
                section_continuation=(chunk_ind != 0),
            )
        )
    return chunks


def chunk_document(
    document: Document,
    chunk_size: int = CHUNK_SIZE,
    subsection_overlap: int = CHUNK_WORD_OVERLAP,
    blurb_len: int = BLURB_LENGTH,
) -> list[DocAwareChunk]:
    chunks: list[DocAwareChunk] = []
    link_offsets: dict[int, str] = {}
    chunk_text = ""
    for section in document.sections:
        current_length = len(chunk_text)
        curr_offset_len = len(shared_precompare_cleanup(chunk_text))
        section_length = len(section.text)

        # Large sections are considered self-contained/unique therefore they start a new chunk and are not concatenated
        # at the end by other sections
        if section_length > chunk_size:
            if chunk_text:
                chunks.append(
                    DocAwareChunk(
                        source_document=document,
                        chunk_id=len(chunks),
                        blurb=extract_blurb(chunk_text, blurb_len),
                        content=chunk_text,
                        source_links=link_offsets,
                        section_continuation=False,
                    )
                )
                link_offsets = {}
                chunk_text = ""

            large_section_chunks = chunk_large_section(
                section=section,
                document=document,
                start_chunk_id=len(chunks),
                chunk_size=chunk_size,
                word_overlap=subsection_overlap,
                blurb_len=blurb_len,
            )
            chunks.extend(large_section_chunks)
            continue

        # In the case where the whole section is shorter than a chunk, either adding to chunk or start a new one
        if current_length + len(SECTION_SEPARATOR) + section_length <= chunk_size:
            chunk_text += (
                SECTION_SEPARATOR + section.text if chunk_text else section.text
            )
            link_offsets[curr_offset_len] = section.link
        else:
            chunks.append(
                DocAwareChunk(
                    source_document=document,
                    chunk_id=len(chunks),
                    blurb=extract_blurb(chunk_text, blurb_len),
                    content=chunk_text,
                    source_links=link_offsets,
                    section_continuation=False,
                )
            )
            link_offsets = {0: section.link}
            chunk_text = section.text

    # Once we hit the end, if we're still in the process of building a chunk, add what we have
    if chunk_text:
        chunks.append(
            DocAwareChunk(
                source_document=document,
                chunk_id=len(chunks),
                blurb=extract_blurb(chunk_text, blurb_len),
                content=chunk_text,
                source_links=link_offsets,
                section_continuation=False,
            )
        )
    return chunks


class Chunker:
    @abc.abstractmethod
    def chunk(self, document: Document) -> list[DocAwareChunk]:
        raise NotImplementedError


class DefaultChunker(Chunker):
    def chunk(self, document: Document) -> list[DocAwareChunk]:
        return chunk_document(document)
