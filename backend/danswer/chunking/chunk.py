import abc
import re
from collections.abc import Callable

from danswer.chunking.models import IndexChunk
from danswer.configs.app_configs import BLURB_LENGTH
from danswer.configs.app_configs import CHUNK_OVERLAP
from danswer.configs.app_configs import CHUNK_SIZE
from danswer.connectors.models import Document
from danswer.connectors.models import Section
from danswer.utils.text_processing import shared_precompare_cleanup

SECTION_SEPARATOR = "\n\n"
ChunkFunc = Callable[[Document], list[IndexChunk]]


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
    word_overlap: int = CHUNK_OVERLAP,
    blurb_len: int = BLURB_LENGTH,
) -> list[IndexChunk]:
    section_text = section.text
    blurb = extract_blurb(section_text, blurb_len)
    char_count = len(section_text)
    chunk_strs: list[str] = []
    start_pos = segment_start_pos = 0
    while start_pos < char_count:
        back_count_words = 0
        end_pos = segment_end_pos = min(start_pos + chunk_size, char_count)
        while not section_text[segment_end_pos - 1].isspace():
            if segment_end_pos >= char_count:
                break
            segment_end_pos += 1
        while back_count_words <= word_overlap:
            if segment_start_pos == 0:
                break
            if section_text[segment_start_pos].isspace():
                back_count_words += 1
            segment_start_pos -= 1
        if segment_start_pos != 0:
            segment_start_pos += 2
        chunk_str = section_text[segment_start_pos:segment_end_pos]
        if chunk_str[-1].isspace():
            chunk_str = chunk_str[:-1]
        chunk_strs.append(chunk_str)
        start_pos = segment_start_pos = end_pos

    # Last chunk should be as long as possible, overlap favored over tiny chunk with no context
    if len(chunk_strs) > 1:
        chunk_strs.pop()
        back_count_words = 0
        start_pos = char_count - chunk_size
        while back_count_words <= word_overlap:
            if section_text[start_pos].isspace():
                back_count_words += 1
            start_pos -= 1
        chunk_strs.append(section_text[start_pos + 2 :])

    chunks = []
    for chunk_ind, chunk_str in enumerate(chunk_strs):
        chunks.append(
            IndexChunk(
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
    subsection_overlap: int = CHUNK_OVERLAP,
    blurb_len: int = BLURB_LENGTH,
) -> list[IndexChunk]:
    chunks: list[IndexChunk] = []
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
                    IndexChunk(
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
                IndexChunk(
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
            IndexChunk(
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
    def chunk(self, document: Document) -> list[IndexChunk]:
        raise NotImplementedError


class DefaultChunker(Chunker):
    def chunk(self, document: Document) -> list[IndexChunk]:
        return chunk_document(document)
