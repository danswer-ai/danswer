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


@pytest.fixture
def mock_data():
    mock_docs = [
        LlmDoc(
            document_id="doc_0", link="https://mintlify.com/docs/settings/broken-links"
        ),
        LlmDoc(
            document_id="doc_1", link="https://mintlify.com/docs/settings/broken-links"
        ),
        LlmDoc(document_id="doc_2", link="https://eyeofmidas.com/scifi/Weir_Egg.pdf"),
    ]
    mock_doc_id_to_rank_map = {"doc_0": 1, "doc_1": 2, "doc_2": 3, "doc_2": 4}
    return mock_docs, mock_doc_id_to_rank_map


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
                source_links=(
                    {0: f"https://example.com/doc_{i}"} if i % 2 == 0 else None
                ),
            )
        )
    return mock_docs


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


def create_mock_llm_docs_for_tests() -> List[LlmDoc]:
    initial = [
        LlmDoc(
            document_id="doc_0",
            content="Information about redirects and broken links in Mintlify",
            blurb="Mintlify documentation",
            semantic_identifier="Mintlify Docs",
            source_type=DocumentSource.WEB,
            metadata={},
            updated_at=datetime.now(),
            link="https://mintlify.com/docs/settings/broken-links",
            source_links={0: "https://mintlify.com/docs/settings/broken-links"},
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
            source_links=None,
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
            source_links={0: "https://eyeofmidas.com/scifi/Weir_Egg.pdf"},
        ),
    ]
    base = [
        LlmDoc(
            document_id=f"doc_{id}",
            content="Document is a doc",
            blurb=f"Document #{id}",
            semantic_identifier="Mintlify Docs",
            source_type=DocumentSource.WEB,
            metadata={},
            updated_at=datetime.now(),
            link="https://mintlify.com/docs/settings/broken-links",
            source_links={0: "https://mintlify.com/docs/settings/broken-links"},
        )
        for id in range(4, 10)
    ]
    initial.extend(base)
    return initial


def create_mock_doc_id_to_rank_map_for_tests() -> dict[str, int]:
    return {
        "doc_0": 1,
        "doc_1": 2,
        "doc_2": 3,
        "doc_3": 4,
        "doc_4": 5,
        "doc_5": 6,
        "doc_6": 7,
        "doc_7": 8,
        "doc_8": 9,
    }


@pytest.fixture
def mock_data():
    return create_mock_llm_docs_for_tests(), create_mock_doc_id_to_rank_map_for_tests()


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
        print("Length")
        return False
    for item1, item2 in zip(output1, output2):
        print(item1, item2)
        print("\n\n")
        if type(item1) != type(item2):
            print("different types")
            return False
        if isinstance(item1, DanswerAnswerPiece):
            if item1.answer_piece.strip() != item2.answer_piece.strip():
                print(item1)
                print(item2)
                return False
        elif isinstance(item1, CitationInfo):
            if (
                item1.citation_num != item2.citation_num
                or item1.document_id != item2.document_id
            ):
                print("citations")
                return False
    return True


def test_extract_citations_from_stream_case1(mock_data):
    mock_docs, mock_doc_id_to_rank_map = mock_data

    mock_tokens = create_mock_tokens(
        """"The Egg" is a short story by Andy Weir. The story begins with the protagonist dying and meeting God. The protagonist learns that the universe is an "egg" created for their maturation. The protagonist is every human who has ever lived and will ever live. Each life is an opportunity for the protagonist to grow and mature. After each life, the protagonist is reincarnated into a new life, continuing this cycle of growth [1]."""
    )

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

    # Expected output
    expected_text = """"The Egg" is a short story by Andy Weir. The story begins with the protagonist dying and meeting God. The protagonist learns that the universe is an "egg" created for their maturation. The protagonist is every human who has ever lived and will ever live. Each life is an opportunity for the protagonist to grow and mature. After each life, the protagonist is reincarnated into a new life, continuing this cycle of growth [[1]](https://mintlify.com/docs/settings/broken-links)."""
    expected_citations = [CitationInfo(citation_num=1, document_id="doc_0")]

    # Assertions
    assert (
        final_answer_text.strip() == expected_text.strip()
    ), "Final answer text does not match expected output"
    assert citations == expected_citations, "Citations do not match expected output"

    print("All assertions passed. Test successful!")


def test_extract_citations_from_stream_case2():
    mock_docs, mock_doc_id_to_rank_map = (
        create_mock_llm_docs_for_tests(),
        create_mock_doc_id_to_rank_map_for_tests(),
    )

    mock_tokens = create_mock_tokens(
        """
        Based on the documents provided, here are some examples of tasks:
        1. Fixing a branch's merge with Regenerate [1].
        2. Updating documentation, which includes figuring out what needs updating and updating the Contributing Guide [1].
        3. Writing up the first draft of a plan for a redesign [1].
        4. Fixing the UI, including the sidebar and mobile version [1].
        5. Gathering feedback on work [1].
        6. Catching up with people [2].
        7. Updating on a project called Tango [2].
        8. Finding promising real estate spots [2].
        9. Scheduling the week [2].
        10. Documenting everything and comparing pull requests [3].
        11. Wrapping up the "continue" functionality [3].
        12. Cleaning up backend source code [3].
        13. Refactoring the UI to be clearer/better [3].
        14. Commuting and scheduling sleep [4].
        15. Figuring out how to get into angel investing [4].
        16. Checking emails [4].
        17. Walking 15k steps [4].
        18. Wrapping up UI updates [6].
        19. Wrapping up Regeneration with API [6].
        20. Wrapping up the Continue block [6].
        21. Small improvements like autocomplete and arrow selection [7].
        22. Cleaning up and submitting Assistants [8].
        23. Cleaning up and submitting Regenerate [8].
        24. Documenting and fixing edge cases in Scroll [8].
        """
    )

    result = list(
        extract_citations_from_stream(
            tokens=iter(mock_tokens),
            context_docs=mock_docs,
            doc_id_to_rank_map=mock_doc_id_to_rank_map,
            stop_stream=None,
        )
    )
    print(mock_doc_id_to_rank_map)
    print(mock_docs)

    # print("||RESULT||")
    # print(mock_docs)
    # print("||RESULT||")

    final_answer_text = ""
    citations = []
    for piece in result:
        if isinstance(piece, DanswerAnswerPiece):
            final_answer_text += piece.answer_piece
        elif isinstance(piece, CitationInfo):
            citations.append(piece)

    print("Final Answer Text:")
    print(final_answer_text)
    # print("\nCitations:")
    # for citation in citations:
    #     print(f"Citation {citation.citation_num}: Document ID {citation.document_id}")

    # # Expected output
    # expected_text = """I'm sorry, but the documents provided do not contain any information about "mintlify + tasks". The term "mintlify" appears in a document about redirects and broken links, but it does not mention anything about tasks [1]. The term "tasks" appears in a couple of documents that list various tasks for the day, but these do not mention "mintlify" [2][3]. Therefore, I cannot provide a definitive answer to your query based on the provided documents."""
    # expected_citations = [
    #     CitationInfo(citation_num=1, document_id="doc_0"),
    #     CitationInfo(citation_num=2, document_id="doc_1"),
    #     CitationInfo(citation_num=3, document_id="doc_2"),
    # ]

    # # Assertions
    # assert (
    #     final_answer_text.strip() == expected_text.strip()
    # ), "Final answer text does not match expected output"
    # assert citations == expected_citations, "Citations do not match expected output"

    # print("All assertions passed. Test successful!")


if __name__ == "__main__":

    test_extract_citations_from_stream_case2()


def run_test(mock_data, input_text, expected_text, expected_citations):
    mock_docs, mock_doc_id_to_rank_map = mock_data
    mock_tokens = create_mock_tokens(input_text)
    print(mock_doc_id_to_rank_map)

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

    # print("Final Answer Text:")
    # print(final_answer_text)
    # print("\nCitations:")
    # for citation in citations:
    #     print(f"Citation {citation.citation_num}: Document ID {citation.document_id}")

    # assert (
    #     final_answer_text.strip() == expected_text.strip()
    # ), "Final answer text does not match expected output"
    # assert citations == expected_citations, "Citations do not match expected output"

    # print("All assertions passed. Test successful!")
