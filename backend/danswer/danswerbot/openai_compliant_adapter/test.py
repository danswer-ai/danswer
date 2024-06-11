from danswer.danswerbot.openai_compliant_adapter.translator import translate_danswer_to_openai
import unittest
from unittest.mock import patch


class TestTranslateDanswerToOpenAI(unittest.TestCase):
    """Test translation from Danswer API response to OPENAI API response."""
    def setUp(self):
        """Set up testing variables."""
        self.danswer_response = {
            "answer": "This is a sample answer.",
            "answer_citationless": "Sample citationless answer.",
            "simple_search_docs": [
                {
                    "semantic_identifier": "Doc1",
                    "link": "http://example.com/doc1",
                    "blurb": "This is a blurb for doc1.",
                    "match_highlights": ["highlight1", "highlight2"],
                    "source_type": "ingestion_api"
                }
            ],
            "error_msg": ""
        }

    @patch('translator.uuid.uuid4')
    @patch('translator.time.time')
    def test_translate_danswer_to_openai(self, mock_time, mock_uuid):
        """Test translate_danswer_to_openai() with expected result."""
        # Mock the time and uuid functions to return consistent values
        mock_time.return_value = 1677652288
        mock_uuid.return_value = "12345"

        expected_response = {
            "id": "chatcmpl-12345",
            "object": "chat.completion",
            "created": 1677652288,
            "model": "gpt-3.5-turbo",
            "system_fingerprint": "fp_44709d6fcb",
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": "This is a sample answer.\nSample citationless answer."
                },
                "logprobs": None,
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": 0,
                "completion_tokens": 11,
                "total_tokens": 11
            }
        }

        result = translate_danswer_to_openai(self.danswer_response)
        self.assertEqual(result, expected_response)

if __name__ == "__main__":
    unittest.main()
