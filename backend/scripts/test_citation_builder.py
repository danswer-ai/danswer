import os
import sys

from sqlalchemy import delete
from sqlalchemy.orm import Session

# Modify sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)


print(os.listdir("."))
from danswer.configs.constants import DocumentSource
import re
from collections.abc import Iterator
from danswer.llm.answering.stream_processing.citation_processing import extract_citations_from_stream 

from danswer.chat.models import AnswerQuestionStreamReturn
from danswer.chat.models import CitationInfo
from danswer.chat.models import DanswerAnswerPiece
from danswer.chat.models import LlmDoc
from danswer.configs.chat_configs import STOP_STREAM_PAT
from danswer.llm.answering.models import StreamProcessor
from danswer.llm.answering.stream_processing.utils import map_document_id_order
from danswer.prompts.constants import TRIPLE_BACKTICK
from danswer.utils.logger import setup_logger
import argparse



from datetime import datetime
# from typing import List, Iterator
from pydantic import BaseModel
from enum import Enum
import pytest

# class DocumentSource(Enum):
#     WEB = 'web'
#     FILE = 'file'

# class LlmDoc(BaseModel):
#     document_id: str
#     content: str
#     blurb: str
#     semantic_identifier: str
#     source_type: DocumentSource
#     metadata: dict[str, str | list[str]]
#     updated_at: datetime | None
#     link: str | None
#     source_links: dict[int, str] | None

# class DanswerAnswerPiece(BaseModel):
#     answer_piece: str | None

# class CitationInfo(BaseModel):
#     citation_num: int
#     document_id: str


def create_mock_llm_docs(num_docs: int) -> list[LlmDoc]:
    mock_docs = []
    for i in range(num_docs):
        mock_docs.append(
            LlmDoc(
                document_id=f"doc_{i}",
                content=f"This is the content of document {i}",
                blurb=f"Blurb for document {i}",
                semantic_identifier=f"Document {i}",
                source_type=DocumentSource.WEB if i % 2 == 0 else DocumentSource.FILE,
                metadata={},
                updated_at=datetime.now(),
                link=f"https://example.com/doc_{i}" if i % 2 == 0 else None,
                source_links={0: f"https://example.com/doc_{i}"} if i % 2 == 0 else None
            )
        )
    return mock_docs

def create_mock_tokens(text: str) -> list[str]:
    return text.split()

def create_mock_doc_id_to_rank_map(num_docs: int) -> dict[str, int]:
    return {f"doc_{i}": i + 1 for i in range(num_docs)}

import pytest
from typing import List, Iterator, Union

# ... [Previous class definitions remain the same] ...

def create_mock_llm_docs_for_tests() -> List[LlmDoc]:
    return [
        LlmDoc(
            document_id="doc_0",
            content="Information about redirects and broken links in Mintlify",
            blurb="Mintlify documentation",
            semantic_identifier="Mintlify Docs",
            source_type=DocumentSource.WEB,
            metadata={},
            updated_at=datetime.now(),
            link="https://mintlify.com/docs/settings/broken-links",
            source_links={0: "https://mintlify.com/docs/settings/broken-links"}
        ),
        LlmDoc(
            document_id="doc_1",
            content="Tasks for today: catch up with people, update software, schedule the week",
            blurb="To-do list",
            semantic_identifier="Tasks",
            source_type=DocumentSource.FILE,
            metadata={},
            updated_at=datetime.now(),
            link=None,
            source_links=None
        ),
        LlmDoc(
            document_id="doc_2",
            content="The Egg by Andy Weir: A story about the universe as an egg for the protagonist's maturation",
            blurb="The Egg - Short Story",
            semantic_identifier="The Egg",
            source_type=DocumentSource.WEB,
            metadata={},
            updated_at=datetime.now(),
            link="https://eyeofmidas.com/scifi/Weir_Egg.pdf",
            source_links={0: "https://eyeofmidas.com/scifi/Weir_Egg.pdf"}
        )
    ]

def create_mock_doc_id_to_rank_map_for_tests() -> dict[str, int]:
    return {"doc_0": 1, "doc_1": 2, "doc_2": 3}

@pytest.fixture
def mock_data():
    return create_mock_llm_docs_for_tests(), create_mock_doc_id_to_rank_map_for_tests()

def print_output(output: List[Union[DanswerAnswerPiece, CitationInfo]]):
    for item in output:
        if isinstance(item, DanswerAnswerPiece):
            print(f"DanswerAnswerPiece: {item.answer_piece}")
        elif isinstance(item, CitationInfo):
            print(f"CitationInfo: citation_num={item.citation_num}, document_id={item.document_id}")

def are_outputs_equivalent(output1, output2):
    if len(output1) != len(output2):
        print("LENGTH")
        return False
    for item1, item2 in zip(output1, output2):
        if type(item1) != type(item2):
            print("DIFF")
            return False
        if isinstance(item1, DanswerAnswerPiece):
            if item1.answer_piece.strip() != item2.answer_piece.strip():
                print(item1.answer_piece)
                print(item2.answer_piece)
                print("F")
                return False
        elif isinstance(item1, CitationInfo):
            if item1.citation_num != item2.citation_num or item1.document_id != item2.document_id:
                print("N")
                return False
    return True

def test_extract_citations_from_stream_case1(mock_data):
    mock_docs, mock_doc_id_to_rank_map = mock_data
    mock_tokens = create_mock_tokens("I'm sorry, but the documents provided do not contain any information about \"mintlify + tasks\". The term \"mintlify\" appears in a document about redirects and broken links, but it does not mention anything about tasks [1]. The term \"tasks\" appears in a couple of documents that list various tasks for the day, but these do not mention \"mintlify\" [2][3]. Therefore, I cannot provide a definitive answer to your query based on the provided documents.")
    
    result = list(extract_citations_from_stream(
        tokens=iter(mock_tokens),
        context_docs=mock_docs,
        doc_id_to_rank_map=mock_doc_id_to_rank_map,
        stop_stream=None
    ))

    new_result = [result[0]]
    for piece in result[1:]:
        if (isinstance(piece, DanswerAnswerPiece) and isinstance(new_result[-1], DanswerAnswerPiece)):
            new_result[-1].answer_piece += " " +piece.answer_piece
        else:
            new_result.append(piece)
    

    
    expected_output = [
        DanswerAnswerPiece(answer_piece="I'm sorry, but the documents provided do not contain any information about \"mintlify + tasks\". The term \"mintlify\" appears in a document about redirects and broken links, but it does not mention anything about tasks "),
        CitationInfo(citation_num=1, document_id="doc_0"),
        DanswerAnswerPiece(answer_piece="[[1]](https://mintlify.com/docs/settings/broken-links). The term \"tasks\" appears in a couple of documents that list various tasks for the day, but these do not mention \"mintlify\" "),
        CitationInfo(citation_num=2, document_id="doc_1"),
        DanswerAnswerPiece(answer_piece="[2][3]. Therefore, I cannot provide a definitive answer to your query based on the provided documents."),
    ]

    
    assert are_outputs_equivalent(new_result, expected_output)

    
    # assert combined_result == expected_output
# if __name__ == "__main__":
#     mock_data = create_mock_llm_docs_for_tests(), create_mock_doc_id_to_rank_map_for_tests()
#     test_extract_citations_from_stream_case1(mock_data)


# def test_extract_citations_from_stream_case2(mock_data):
#     mock_docs, mock_doc_id_to_rank_map = mock_data
#     mock_tokens = create_mock_tokens("\"The purpose of this cycle of life, death, and rebirth is for the protagonist to grow, mature, and become a larger and greater intellect [1][2][3][5].\"")
    
#     result = list(extract_citations_from_stream(
#         tokens=iter(mock_tokens),
#         context_docs=mock_docs,
#         doc_id_to_rank_map=mock_doc_id_to_rank_map,
#         stop_stream=None
#     ))
#     new_result = [result[0]]
#     for piece in result[1:]:
#         if (isinstance(piece, DanswerAnswerPiece) and isinstance(new_result[-1], DanswerAnswerPiece)):
#             new_result[-1].answer_piece += " " +piece.answer_piece
#         else:
#             new_result.append(piece)
    

    
#     expected_output = [
#         DanswerAnswerPiece(answer_piece="\"The purpose of this cycle of life, death, and rebirth is for the protagonist to grow, mature, and become a larger and greater intellect "),
#         CitationInfo(citation_num=3, document_id="doc_2"),
#         CitationInfo(citation_num=3, document_id="doc_2"),
#         CitationInfo(citation_num=3, document_id="doc_2"),
#         CitationInfo(citation_num=3, document_id="doc_2"),
#         DanswerAnswerPiece(answer_piece="[[3]](https://eyeofmidas.com/scifi/Weir_Egg.pdf)[[3]](https://eyeofmidas.com/scifi/Weir_Egg.pdf)[[3]](https://eyeofmidas.com/scifi/Weir_Egg.pdf)[[3]](https://eyeofmidas.com/scifi/Weir_Egg.pdf).\""),
#     ]
    

#     assert are_outputs_equivalent(new_result, expected_output)

# def test_extract_citations_from_stream_case3(mock_data):
#     mock_docs, mock_doc_id_to_rank_map = mock_data
#     mock_tokens = create_mock_tokens("\"Tasks, as outlined in the documents, are activities or pieces of work to be done or undertaken. They are often listed in a to-do format and can include a wide range of activities, from catching up with people, updating software, to scheduling the week [1][2]. On the other hand, the \"egg\" is a metaphor used in a short story by Andy Weir. In this context, the universe is described as an \"egg\" created for the maturation of the protagonist's soul. Each life the protagonist lives is an opportunity for growth and maturation, and the protagonist is reincarnated many times to gain more experiences and knowledge [4][5][6].\"")
    
#     result = list(extract_citations_from_stream(
#         tokens=iter(mock_tokens),
#         context_docs=mock_docs,
#         doc_id_to_rank_map=mock_doc_id_to_rank_map,
#         stop_stream=None
#     ))
#     new_result = [result[0]]
#     for piece in result[1:]:
#         if (isinstance(piece, DanswerAnswerPiece) and isinstance(new_result[-1], DanswerAnswerPiece)):
#             new_result[-1].answer_piece += " " +piece.answer_piece
#         else:
#             new_result.append(piece)
    

    
#     expected_output = [
#         DanswerAnswerPiece(answer_piece="\"Tasks, as outlined in the documents, are activities or pieces of work to be done or undertaken. They are often listed in a to-do format and can include a wide range of activities, from catching up with people, updating software, to scheduling the week "),
#         CitationInfo(citation_num=2, document_id="doc_1"),
#         CitationInfo(citation_num=2, document_id="doc_1"),
#         DanswerAnswerPiece(answer_piece="[2][2]. On the other hand, the \"egg\" is a metaphor used in a short story by Andy Weir. In this context, the universe is described as an \"egg\" created for the maturation of the protagonist's soul. Each life the protagonist lives is an opportunity for growth and maturation, and the protagonist is reincarnated many times to gain more experiences and knowledge "),
#         CitationInfo(citation_num=3, document_id="doc_2"),
#         CitationInfo(citation_num=3, document_id="doc_2"),
#         CitationInfo(citation_num=3, document_id="doc_2"),
#         DanswerAnswerPiece(answer_piece="[[3]](https://eyeofmidas.com/scifi/Weir_Egg.pdf)[[3]](https://eyeofmidas.com/scifi/Weir_Egg.pdf)[[3]](https://eyeofmidas.com/scifi/Weir_Egg.pdf).\""),
#     ]
    
#     assert are_outputs_equivalent(new_result, expected_output)
# #     assert result == expected_output
# test_extract_citations_from_stream_case3()
# You would need to implement the extract_citations_from_stream function here

# def test_extract_citations_from_stream():
#     num_docs = 3
#     mock_docs = create_mock_llm_docs(num_docs)
#     mock_doc_id_to_rank_map = create_mock_doc_id_to_rank_map(num_docs)
#     mock_tokens = create_mock_tokens("This is a test [1] with citations [2] and more text [3].")
    
#     result = list(extract_citations_from_stream(
#         tokens=iter(mock_tokens),
#         context_docs=mock_docs,
#         doc_id_to_rank_map=mock_doc_id_to_rank_map,
#         stop_stream=None
#     ))
    
#     expected_output = [
#         DanswerAnswerPiece(answer_piece="This is a test "),
#         CitationInfo(citation_num=1, document_id="doc_0"),
#         DanswerAnswerPiece(answer_piece="[[1]](https://example.com/doc_0) with citations "),
#         CitationInfo(citation_num=2, document_id="doc_1"),
#         DanswerAnswerPiece(answer_piece="[2] and more text "),
#         CitationInfo(citation_num=3, document_id="doc_2"),
#         DanswerAnswerPiece(answer_piece="[[3]](https://example.com/doc_2)."),
#     ]
    
#     assert result == expected_output


# test_extract_citations_from_stream()