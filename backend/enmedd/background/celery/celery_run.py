"""Entry point for running celery worker / celery beat."""
from enmedd.utils.variable_functionality import fetch_versioned_implementation
from enmedd.utils.variable_functionality import set_is_ee_based_on_env_variable


set_is_ee_based_on_env_variable()
celery_app = fetch_versioned_implementation(
    "enmedd.background.celery.celery_app", "celery_app"
)
