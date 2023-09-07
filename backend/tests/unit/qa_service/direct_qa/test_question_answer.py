import textwrap
import unittest

from danswer.chunking.models import InferenceChunk
from danswer.direct_qa.qa_utils import match_quotes_to_docs
from danswer.direct_qa.qa_utils import separate_answer_quotes


class TestQAPostprocessing(unittest.TestCase):
    def test_separate_answer_quotes(self) -> None:
        test_answer = textwrap.dedent(
            """
            It seems many people love dogs
            Quote: A dog is a man's best friend
            Quote: Air Bud was a movie about dogs and people loved it
            """
        ).strip()
        answer, quotes = separate_answer_quotes(test_answer)
        self.assertEqual(answer, "It seems many people love dogs")
        self.assertEqual(quotes[0], "A dog is a man's best friend")  # type: ignore
        self.assertEqual(
            quotes[1], "Air Bud was a movie about dogs and people loved it"  # type: ignore
        )

        # Lowercase should be allowed
        test_answer = textwrap.dedent(
            """
            It seems many people love dogs
            quote: A dog is a man's best friend
            Quote: Air Bud was a movie about dogs and people loved it
            """
        ).strip()
        answer, quotes = separate_answer_quotes(test_answer)
        self.assertEqual(answer, "It seems many people love dogs")
        self.assertEqual(quotes[0], "A dog is a man's best friend")  # type: ignore
        self.assertEqual(
            quotes[1], "Air Bud was a movie about dogs and people loved it"  # type: ignore
        )

        # No Answer
        test_answer = textwrap.dedent(
            """
            Quote: This one has no answer
            """
        ).strip()
        answer, quotes = separate_answer_quotes(test_answer)
        self.assertIsNone(answer)
        self.assertIsNone(quotes)

        # Multiline Quote
        test_answer = textwrap.dedent(
            """
            It seems many people love dogs
            quote: A well known saying is:
            A dog is a man's best friend
            Quote: Air Bud was a movie about dogs and people loved it
            """
        ).strip()
        answer, quotes = separate_answer_quotes(test_answer)
        self.assertEqual(answer, "It seems many people love dogs")
        self.assertEqual(
            quotes[0], "A well known saying is:\nA dog is a man's best friend"  # type: ignore
        )
        self.assertEqual(
            quotes[1], "Air Bud was a movie about dogs and people loved it"  # type: ignore
        )

        # Random patterns not picked up
        test_answer = textwrap.dedent(
            """
            It seems many people love quote: dogs
            quote: Quote: A well known saying is:
            A dog is a man's best friend
            Quote: Answer: Air Bud was a movie about dogs and quote: people loved it
            """
        ).strip()
        answer, quotes = separate_answer_quotes(test_answer)
        self.assertEqual(answer, "It seems many people love quote: dogs")
        self.assertEqual(
            quotes[0], "Quote: A well known saying is:\nA dog is a man's best friend"  # type: ignore
        )
        self.assertEqual(
            quotes[1],  # type: ignore
            "Answer: Air Bud was a movie about dogs and quote: people loved it",
        )

    def test_fuzzy_match_quotes_to_docs(self) -> None:
        chunk_0_text = textwrap.dedent(
            """
            Here's a doc with some LINK embedded in the text
            THIS SECTION IS A LINK
            Some more text
            """
        ).strip()
        chunk_1_text = textwrap.dedent(
            """
            Some completely different text here
            ANOTHER LINK embedded in this text
            ending in a DIFFERENT-LINK
            """
        ).strip()
        test_chunk_0 = InferenceChunk(
            document_id="test doc 0",
            source_type="testing",
            chunk_id=0,
            content=chunk_0_text,
            source_links={
                0: "doc 0 base",
                23: "first line link",
                49: "second line link",
            },
            blurb="anything",
            semantic_identifier="anything",
            section_continuation=False,
            boost=0,
            score=1,
            metadata={},
            match_highlights=[],
        )
        test_chunk_1 = InferenceChunk(
            document_id="test doc 1",
            source_type="testing",
            chunk_id=0,
            content=chunk_1_text,
            source_links={0: "doc 1 base", 36: "2nd line link", 82: "last link"},
            blurb="whatever",
            semantic_identifier="whatever",
            section_continuation=False,
            boost=0,
            score=1,
            metadata={},
            match_highlights=[],
        )

        test_quotes = [
            "a doc with some",  # Basic case
            "a doc with some LINK",  # Should take the start of quote, even if a link is in it
            "a doc with some \nLINK",  # Requires a newline deletion fuzzy match
            "a doc with some link",  # Capitalization insensitive
            "embedded in this text",  # Fuzzy match to first doc
            "SECTION IS A LINK",  # Match exact link
            "some more text",  # Match the end, after every link offset
            "different taxt",  # Substitution
            "embedded in this texts",  # Cannot fuzzy match to first doc, fuzzy match to second doc
            "DIFFERENT-LINK",  # Exact link match at the end
            "Some complitali",  # Too many edits, shouldn't match anything
        ]
        results = match_quotes_to_docs(
            test_quotes, [test_chunk_0, test_chunk_1], fuzzy_search=True
        )
        self.assertEqual(
            results,
            {
                "a doc with some": {"document": "test doc 0", "link": "doc 0 base"},
                "a doc with some LINK": {
                    "document": "test doc 0",
                    "link": "doc 0 base",
                },
                "a doc with some \nLINK": {
                    "document": "test doc 0",
                    "link": "doc 0 base",
                },
                "a doc with some link": {
                    "document": "test doc 0",
                    "link": "doc 0 base",
                },
                "embedded in this text": {
                    "document": "test doc 0",
                    "link": "first line link",
                },
                "SECTION IS A LINK": {
                    "document": "test doc 0",
                    "link": "second line link",
                },
                "some more text": {
                    "document": "test doc 0",
                    "link": "second line link",
                },
                "different taxt": {"document": "test doc 1", "link": "doc 1 base"},
                "embedded in this texts": {
                    "document": "test doc 1",
                    "link": "2nd line link",
                },
                "DIFFERENT-LINK": {"document": "test doc 1", "link": "last link"},
            },
        )


if __name__ == "__main__":
    unittest.main()
