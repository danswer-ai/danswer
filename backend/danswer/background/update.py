import time
from typing import cast

from danswer.connectors.slack.config import get_pull_frequency
from danswer.connectors.slack.pull import SlackPullLoader
from danswer.dynamic_configs import get_dynamic_config_store
from danswer.dynamic_configs.interface import ConfigNotFoundError
from danswer.utils.logging import setup_logger

logger = setup_logger()

LAST_PULL_KEY_TEMPLATE = "last_pull_{}"


def _check_should_run(current_time: int, last_pull: int, pull_frequency: int) -> bool:
    return current_time - last_pull > pull_frequency * 60


def run_update():
    logger.info("Running update")
    # TODO (chris): implement a more generic way to run updates
    # so we don't need to edit this file for future connectors
    dynamic_config_store = get_dynamic_config_store()
    current_time = int(time.time())

    # Slack
    try:
        pull_frequency = get_pull_frequency()
    except ConfigNotFoundError:
        pull_frequency = 0
    if pull_frequency:
        last_slack_pull_key = LAST_PULL_KEY_TEMPLATE.format(SlackPullLoader.__name__)
        try:
            last_pull = cast(int, dynamic_config_store.load(last_slack_pull_key))
        except ConfigNotFoundError:
            last_pull = None

        if last_pull is None or _check_should_run(
            current_time, last_pull, pull_frequency
        ):
            logger.info(f"Running slack pull from {last_pull or 0} to {current_time}")
            for doc_batch in SlackPullLoader().load(last_pull or 0, current_time):
                print(len(doc_batch))
            dynamic_config_store.store(last_slack_pull_key, current_time)


if __name__ == "__main__":
    DELAY = 60  # 60 seconds

    while True:
        start = time.time()
        try:
            run_update()
        except Exception:
            logger.exception("Failed to run update")
        sleep_time = DELAY - (time.time() - start)
        if sleep_time > 0:
            time.sleep(sleep_time)
