import unittest
import uuid
from unittest.mock import patch

from danswer.danswerbot.openai_compliant_adapter.translator import Message
from danswer.danswerbot.openai_compliant_adapter.translator import (
    translate_danswer_to_openai,
)


class TestTranslateDanswerToOpenAI(unittest.TestCase):
    """Test translation from Danswer API response to OPENAI API response."""

    def setUp(self):
        """Set up testing variables."""
        danswer_response = {
            "message_id": 123,
            "parent_message": 122,
            "latest_child_message": None,
            "message": "Mock message content",
            "rephrased_query": "mock rephrased query",
            "context_docs": {
                "top_documents": [
                    {
                        "document_id": "abc123",
                        "chunk_ind": 1,
                        "semantic_identifier": "Mock semantic identifier",
                        "link": "https://example.com",
                        "blurb": "Mock blurb content",
                        "source_type": "mock",
                        "boost": 0,
                        "hidden": False,
                        "metadata": {
                            "Tags": ["tag1", "tag2"],
                            "Select": ["id", "name", "color"],
                            "Multiselect": ["Option1"],
                        },
                        "score": 0.123,
                        "match_highlights": ["highlight1", "highlight2"],
                        "updated_at": "2024-06-09T16:34:00+00:00",
                        "primary_owners": None,
                        "secondary_owners": None,
                        "db_doc_id": 1234,
                    }
                ]
            },
            "message_type": "mock",
            "time_sent": "2024-06-10T10:03:42.799674+00:00",
            "citations": {"2": 1234},
            "files": [],
        }
        self.danswer_response = Message(**danswer_response)

    @patch("translator.uuid.uuid4")
    @patch("translator.time.time")
    def test_translate_danswer_to_openai(self, mock_time, mock_uuid):
        """Test translate_danswer_to_openai() with expected result."""
        # Mock the time and uuid functions to return consistent values
        mock_time.return_value = 1677652288
        mock_uuid.return_value = uuid.UUID("44709d6f-cb4b-4b5d-8e7a-3f4d5e1c3f1a")

        expected_response = {
            "id": "chatcmpl-44709d6f-cb4b-4b5d-8e7a-3f4d5e1c3f1a",
            "object": "chat.completion",
            "created": 1677652288,
            "model": "gpt-3.5-turbo",
            "system_fingerprint": "fp_40feeb7e086d",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": "Mock message content\n[[2]Mock semantic identifier](https://example.com)",
                    },
                    "logprobs": None,
                    "finish_reason": "stop",
                }
            ],
            "usage": {"prompt_tokens": 0, "completion_tokens": 16, "total_tokens": 16},
        }

        result = translate_danswer_to_openai(self.danswer_response)
        self.assertEqual(result, expected_response)


if __name__ == "__main__":
    unittest.main()
