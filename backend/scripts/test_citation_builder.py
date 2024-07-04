# import unittest
import os
import sys
from datetime import datetime
from typing import List
from typing import Union

import pytest


# Modify sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)


print(os.listdir("."))


# pylint: disable=E402
# flake8: noqa: E402
from danswer.configs.constants import DocumentSource
from danswer.llm.answering.stream_processing.citation_processing import (
    extract_citations_from_stream,
)

from danswer.chat.models import CitationInfo
from danswer.chat.models import DanswerAnswerPiece
from danswer.chat.models import LlmDoc

# pylint: enable=E402
# flake8: noqa: E402


import random


def create_mock_tokens(text: str) -> list[str]:
    tokens = []
    i = 0
    while i < len(text):
        # Randomly choose to split after 2, 3, or 4 characters
        split_length = random.choice([2, 3, 4])
        end = min(i + split_length, len(text))
        tokens.append(text[i:end])
        i = end
    return tokens


# def create_mock_tokens(text: str) -> list[str]:
#     return text.split()


def create_mock_doc_id_to_rank_map(num_docs: int) -> dict[str, int]:
    return {f"doc_{i}": i + 1 for i in range(num_docs)}


mock_docs = [
    LlmDoc(
        document_id=f"doc_{int(id/2)}",
        content="Document is a doc",
        blurb=f"Document #{id}",
        semantic_identifier=f"Doc {id}",
        source_type=DocumentSource.WEB,
        metadata={},
        updated_at=datetime.now(),
        link=f"https://{int(id/2)}.com" if int(id/2) % 2 == 0 else None,
        source_links={0: "https://mintlify.com/docs/settings/broken-links"},
    )
    for id in range(10)
]


mock_doc_mapping = {
    "doc_0": 0,
    "doc_1": 1,
    "doc_2": 2,
    "doc_3": 3,
    "doc_4": 4,
    "doc_5": 5,

}

@pytest.fixture
def mock_data():
    return mock_docs, mock_doc_mapping


def print_output(output: List[Union[DanswerAnswerPiece, CitationInfo]]):
    for item in output:
        if isinstance(item, DanswerAnswerPiece):
            print(f"DanswerAnswerPiece: {item.answer_piece}")
        elif isinstance(item, CitationInfo):
            print(
                f"CitationInfo: citation_num={item.citation_num}, document_id={item.document_id}"
            )


def are_outputs_equivalent(output1, output2):
    if len(output1) != len(output2):
        return False
    for item1, item2 in zip(output1, output2):
        if type(item1) != type(item2):
            return False
        if isinstance(item1, DanswerAnswerPiece):
            if item1.answer_piece.strip() != item2.answer_piece.strip():
                return False
        elif isinstance(item1, CitationInfo):
            if (
                item1.citation_num != item2.citation_num
                or item1.document_id != item2.document_id
            ):
                return False
    return True


def process_text(input_text, mock_data):
    mock_docs, mock_doc_id_to_rank_map = mock_data

    mock_tokens = create_mock_tokens(input_text)
    result = list(
        extract_citations_from_stream(
            tokens=iter(mock_tokens),
            context_docs=mock_docs,
            doc_id_to_rank_map=mock_doc_id_to_rank_map,
            stop_stream=None,
        )
    )
    final_answer_text = ""
    citations = []
    for piece in result:
        if isinstance(piece, DanswerAnswerPiece):
            final_answer_text += piece.answer_piece
        elif isinstance(piece, CitationInfo):
            citations.append(piece)
    return final_answer_text, citations



class SimpleCitationExtractionTestCase:
    def __init__(
        self,
        input_text: str,
        expected_text: str,
        expected_citations: List[str],
    ):
        self.input_text = input_text
        self.expected_text = expected_text
        self.expected_citations = [
            CitationInfo(citation_num=mock_doc_mapping[doc_id], document_id=doc_id)
            for  doc_id in expected_citations
        ]

    def run_test(self, mock_data):
        from test_citation_builder import process_text  # Import the existing function

        final_answer_text, citations = process_text(self.input_text, mock_data)
        print(final_answer_text)
        assert (
            final_answer_text.strip() == self.expected_text.strip()
        ), "Final answer text does not match expected output"
        assert (
            citations == self.expected_citations
        ), "Citations do not match expected output"

        print("Test passed successfully!")


print(mock_doc_mapping)
for dock in mock_docs:
    print(f"Doc {dock.document_id}: {dock.link}")

if __name__ == "__main__":

    print(mock_docs)
    # Create a test case
    test_case = SimpleCitationExtractionTestCase(
        input_text="""Growth! [1][3][5]""",
        expected_text="""Growth! [[1]](https://0.com).""",
        expected_citations=[("doc_1")],  # Simplified citation format
    )

    # Run the test
    test_case.run_test((mock_docs, mock_doc_mapping))

    test_case_2 = SimpleCitationExtractionTestCase(
        input_text=""""Growth! [1].""",
        expected_text=""""Growth! [[1]](https://0.com).""",
        expected_citations=[("doc_1")]  # Simplified citation format
    )


    test_case_2.run_test