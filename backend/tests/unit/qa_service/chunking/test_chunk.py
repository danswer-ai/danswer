import unittest

from danswer.chunking.chunk import chunk_document
from danswer.chunking.chunk import chunk_large_section
from danswer.configs.constants import DocumentSource
from danswer.connectors.models import Document
from danswer.connectors.models import Section


WAR_AND_PEACE = (
    "Well, Prince, so Genoa and Lucca are now just family estates of the Buonapartes. But I warn you, "
    "if you don’t tell me that this means war, if you still try to defend the infamies and horrors perpetrated by "
    "that Antichrist—I really believe he is Antichrist—I will have nothing more to do with you and you are no longer "
    "my friend, no longer my ‘faithful slave,’ as you call yourself! But how do you do? I see I have frightened "
    "you—sit down and tell me all the news."
)


class TestDocumentChunking(unittest.TestCase):
    def setUp(self) -> None:
        self.large_section = Section(text=WAR_AND_PEACE, link="https://www.test.com/")
        self.large_unbroken_section = Section(
            text="0123456789" * 40, link="https://www.test.com/"
        )
        self.document = Document(
            id="test_document",
            sections=[
                Section(
                    text="Here is some testing text", link="https://www.test.com/0"
                ),
                Section(
                    text="Some more text, still under 100 chars",
                    link="https://www.test.com/1",
                ),
                Section(
                    text="Now with this section it's longer than the chunk size",
                    link="https://www.test.com/2",
                ),
                self.large_section,
                Section(text="These last 2 sections", link="https://www.test.com/4"),
                Section(
                    text="should be combined into one", link="https://www.test.com/5"
                ),
            ],
            source=DocumentSource.WEB,  # arbitrary picking web, doens't matter for this test
            semantic_identifier="Whatever",
            metadata={},
        )

    def test_chunk_large_section(self) -> None:
        chunks = chunk_large_section(
            section=self.large_section,
            document=self.document,
            start_chunk_id=5,
            chunk_size=100,
            word_overlap=3,
        )
        contents = [chunk.content for chunk in chunks]

        self.assertEqual(len(contents), 5)
        self.assertEqual(contents[0], WAR_AND_PEACE[:100])
        self.assertEqual(
            contents[-2], WAR_AND_PEACE[-172:-62]
        )  # slightly longer than 100 due to overlap
        self.assertEqual(
            contents[-1], WAR_AND_PEACE[-125:]
        )  # large overlap with second to last segment
        self.assertFalse(chunks[0].section_continuation)
        self.assertTrue(chunks[1].section_continuation)
        self.assertTrue(chunks[-1].section_continuation)

    def test_chunk_max_overflow(self) -> None:
        chunks = chunk_large_section(
            section=self.large_unbroken_section,
            document=self.document,
            start_chunk_id=5,
            chunk_size=100,
            word_overlap=3,
        )
        contents = [chunk.content for chunk in chunks]

        self.assertEqual(len(contents), 4)
        self.assertEqual(contents[0], self.large_unbroken_section.text[:150])
        self.assertEqual(contents[1], self.large_unbroken_section.text[50:250])
        self.assertEqual(contents[2], self.large_unbroken_section.text[150:350])
        # Last chunk counts back from the end, full chunk size (100) + 50 overlap => 400 - 150 = 250
        self.assertEqual(contents[3], self.large_unbroken_section.text[250:])

    def test_chunk_document(self) -> None:
        chunks = chunk_document(self.document, chunk_size=100, subsection_overlap=3)
        self.assertEqual(len(chunks), 8)
        self.assertEqual(
            chunks[0].content,
            self.document.sections[0].text + "\n\n" + self.document.sections[1].text,
        )
        self.assertEqual(
            chunks[0].source_links,
            {0: "https://www.test.com/0", 21: "https://www.test.com/1"},
        )
        self.assertEqual(
            chunks[-1].source_links,
            {0: "https://www.test.com/4", 18: "https://www.test.com/5"},
        )
        self.assertEqual(chunks[5].chunk_id, 5)
        self.assertEqual(chunks[6].source_document, self.document)


if __name__ == "__main__":
    unittest.main()
