# beat_app.py
from typing import Any

from celery import Celery
from celery import signals
from celery.signals import beat_init

import danswer.background.celery.apps.app_base as app_base
from danswer.background.celery.custom_scheduler import DynamicTenantScheduler
from danswer.configs.constants import POSTGRES_CELERY_BEAT_APP_NAME
from danswer.db.engine import SqlEngine
from danswer.utils.logger import setup_logger

# Import the custom scheduler

logger = setup_logger(__name__)

celery_app = Celery(__name__)
celery_app.config_from_object("danswer.background.celery.configs.beat")

# Set the custom scheduler to the imported class
celery_app.conf.beat_scheduler = DynamicTenantScheduler


@beat_init.connect
def on_beat_init(sender: Any, **kwargs: Any) -> None:
    logger.info("beat_init signal received.")

    # Celery beat shouldn't touch the db at all. But just setting a low minimum here.
    SqlEngine.set_app_name(POSTGRES_CELERY_BEAT_APP_NAME)
    SqlEngine.init_engine(pool_size=2, max_overflow=0)
    app_base.wait_for_redis(sender, **kwargs)


@signals.setup_logging.connect
def on_setup_logging(
    loglevel: Any, logfile: Any, format: Any, colorize: Any, **kwargs: Any
) -> None:
    app_base.on_setup_logging(loglevel, logfile, format, colorize, **kwargs)
