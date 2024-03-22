import json
import unittest
from datetime import datetime
from unittest.mock import MagicMock
from unittest.mock import patch

from danswer.configs.constants import ENABLE_TOKEN_BUDGET
from danswer.configs.constants import TOKEN_BUDGET
from danswer.configs.constants import TOKEN_BUDGET_TIME_PERIOD
from danswer.server.query_and_chat.token_budget import is_under_token_budget


class TestTokenBudget(unittest.TestCase):
    def setUp(self):
        # Mock the dynamic config store
        self.mock_get_dynamic_config_store = patch(
            "danswer.server.query_and_chat.token_budget.get_dynamic_config_store"
        ).start()
        self.mock_dynamic_config_store = self.mock_get_dynamic_config_store.return_value
        self.mock_dynamic_config_store.load.return_value = json.dumps(
            {
                ENABLE_TOKEN_BUDGET: True,
                TOKEN_BUDGET: 10,  # 10,000 tokens
                TOKEN_BUDGET_TIME_PERIOD: 12,  # 12 hours
            }
        )

        # Mock datetime
        self.mock_datetime = patch(
            "danswer.server.query_and_chat.token_budget.datetime", wraps=datetime
        ).start()
        self.mock_datetime.now.return_value = datetime(2024, 3, 10, 12, 0, 0)

        # This setup can be adjusted based on actual db_session use
        self.mock_db_session = MagicMock()
        self.mock_db_session.query.return_value.filter.return_value.scalar.return_value = (
            5000  # 5,000 tokens used
        )

    def tearDown(self):
        patch.stopall()

    def test_is_under_token_budget_enabled_and_under_limit(self):
        # Token budget feature is enabled and usage is under the limit
        self.assertTrue(is_under_token_budget(self.mock_db_session))

    def test_is_under_token_budget_enabled_and_exceeded(self):
        # Adjust mock to simulate token usage exceeding the budget
        self.mock_db_session.query.return_value.filter.return_value.scalar.return_value = (
            15000  # 15,000 tokens used
        )
        self.assertFalse(is_under_token_budget(self.mock_db_session))

    def test_is_under_token_budget_disabled(self):
        # Adjust mock to disable the token budget feature
        self.mock_dynamic_config_store.load.return_value = json.dumps(
            {ENABLE_TOKEN_BUDGET: False}
        )
        self.assertTrue(is_under_token_budget(self.mock_db_session))

    def test_is_under_token_budget_no_limit(self):
        # Adjust mock for no budget limit scenario
        self.mock_dynamic_config_store.load.return_value = json.dumps(
            {ENABLE_TOKEN_BUDGET: True, TOKEN_BUDGET: -1}  # No limit
        )
        self.assertTrue(is_under_token_budget(self.mock_db_session))


if __name__ == "__main__":
    unittest.main()
