from unittest.mock import patch

import pytest

from danswer.connectors.confluence.connector import ConfluenceConnector

CONFLUENCE_IMAGE_SUMMARIZATION_MULTIMODAL_ANSWERING = True


# Mocking the LLM and its methods
class MockLLM:
    def __init__(self, vision_support):
        self._vision_support = vision_support

    def vision_support(self):
        return self._vision_support


# Mocking the get_default_llms function
def mock_get_default_llms(vision_support):
    return MockLLM(vision_support), None


@pytest.mark.parametrize(
    "vision_support, expected_exception",
    [
        (True, None),  # Successful case
        (False, ValueError),  # Not multimodal
        (None, ValueError),  # vision_support not defined
    ],
)
def test_validate_llm_configuration_vision_support(vision_support, expected_exception):
    with patch("danswer.llm.factory.get_default_llms"):
        llm, _ = mock_get_default_llms(vision_support)

        # Create an instance of LLMChecker
        connector = ConfluenceConnector(wiki_base="https://example.com", is_cloud=True)

        if expected_exception:
            with pytest.raises(expected_exception) as excinfo:
                connector.validate_llm(llm)
                assert "Your default LLM seems to be not multimodal." in str(
                    excinfo.value
                )
        else:
            connector.validate_llm(llm)
