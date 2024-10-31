import asyncio
import signal
import sys
import threading
import time
from threading import Event
from typing import Dict
from typing import Set

from prometheus_client import Gauge
from prometheus_client import start_http_server
from slack_sdk.socket_mode.aiohttp import SocketModeClient
from slack_sdk.web.async_client import AsyncWebClient

from danswer.danswerbot.slack.listener import _get_socket_client
from danswer.danswerbot.slack.tokens import fetch_tokens
from danswer.db.engine import CURRENT_TENANT_ID_CONTEXTVAR
from danswer.db.engine import get_all_tenant_ids
from danswer.db.engine import get_session_with_tenant
from danswer.db.search_settings import get_current_search_settings
from danswer.key_value_store.interface import KvKeyNotFoundError
from danswer.natural_language_processing.search_nlp_models import EmbeddingModel
from danswer.natural_language_processing.search_nlp_models import warm_up_bi_encoder
from danswer.redis.redis_pool import get_redis_client
from danswer.utils.logger import setup_logger
from shared_configs.configs import MODEL_SERVER_HOST
from shared_configs.configs import MODEL_SERVER_PORT

logger = setup_logger()

# Prometheus metric for HPA
active_tenants_gauge = Gauge(
    "active_tenants", "Number of active tenants handled by this pod"
)

# Configuration constants
TENANT_LOCK_EXPIRATION = 300  # seconds
TENANT_HEARTBEAT_INTERVAL = 60  # seconds
TENANT_HEARTBEAT_EXPIRATION = 180  # seconds
TENANT_ACQUISITION_INTERVAL = 60  # seconds


class TenantHandler:
    def __init__(self):
        logger.info("Initializing TenantHandler")
        self.redis_client = get_redis_client(tenant_id=None)
        self.tenant_ids: Set[str] = set()
        self.socket_clients: Dict[str, SocketModeClient] = {}
        self.slack_bot_tokens: Dict[str, str] = {}
        self.running = True
        self.pod_id = self.get_pod_id()
        logger.info(f"Pod ID: {self.pod_id}")

        # Set up signal handlers for graceful shutdown
        signal.signal(signal.SIGTERM, self.shutdown)
        signal.signal(signal.SIGINT, self.shutdown)
        logger.info("Signal handlers registered")

        # Start the Prometheus metrics server
        logger.info("Starting Prometheus metrics server")
        start_http_server(8000)
        logger.info("Prometheus metrics server started")

        # Start background threads
        logger.info("Starting background threads")
        threading.Thread(target=self.acquire_tenants_loop, daemon=True).start()
        threading.Thread(target=self.heartbeat_loop, daemon=True).start()
        logger.info("Background threads started")

    def get_pod_id(self) -> str:
        import os

        pod_id = os.environ.get("HOSTNAME", "unknown_pod")
        logger.info(f"Retrieved pod ID: {pod_id}")
        return pod_id

    def acquire_tenants_loop(self):
        logger.info("Starting tenant acquisition loop")
        while self.running:
            try:
                self.acquire_tenants()
                active_tenants_gauge.set(len(self.tenant_ids))
                logger.debug(f"Current active tenants: {len(self.tenant_ids)}")
            except Exception as e:
                logger.exception(f"Error in tenant acquisition: {e}")
            Event().wait(timeout=TENANT_ACQUISITION_INTERVAL)

    def heartbeat_loop(self):
        logger.info("Starting heartbeat loop")
        while self.running:
            try:
                self.send_heartbeats()
                logger.debug(f"Sent heartbeats for {len(self.tenant_ids)} tenants")
            except Exception as e:
                logger.exception(f"Error in heartbeat loop: {e}")
            Event().wait(timeout=TENANT_HEARTBEAT_INTERVAL)

    def acquire_tenants(self):
        tenant_ids = get_all_tenant_ids()
        logger.debug(f"Found {len(tenant_ids)} total tenants in Postgres")

        for tenant_id in tenant_ids:
            with get_session_with_tenant(tenant_id) as db_session:
                try:
                    token = CURRENT_TENANT_ID_CONTEXTVAR.set(tenant_id or "public")
                    latest_slack_bot_token = fetch_tokens()
                    CURRENT_TENANT_ID_CONTEXTVAR.reset(token)

                    if not latest_slack_bot_token:
                        logger.debug(f"No Slack bot token found for tenant {tenant_id}")
                        if tenant_id in self.socket_clients:
                            asyncio.run(self.socket_clients[tenant_id].close())
                            del self.socket_clients[tenant_id]
                            del self.slack_bot_tokens[tenant_id]
                        continue

                    slack_bot_token = latest_slack_bot_token.bot_token

                    if (
                        tenant_id not in self.slack_bot_tokens
                        or slack_bot_token != self.slack_bot_tokens[tenant_id]
                    ):
                        if tenant_id in self.slack_bot_tokens:
                            logger.notice(
                                f"Slack Bot tokens have changed for tenant {tenant_id} - reconnecting"
                            )
                        else:
                            # Initial setup for this tenant
                            search_settings = get_current_search_settings(db_session)
                            embedding_model = EmbeddingModel.from_db_model(
                                search_settings=search_settings,
                                server_host=MODEL_SERVER_HOST,
                                server_port=MODEL_SERVER_PORT,
                            )
                            warm_up_bi_encoder(embedding_model=embedding_model)

                        self.slack_bot_tokens[tenant_id] = slack_bot_token

                        if tenant_id in self.socket_clients:
                            asyncio.run(self.socket_clients[tenant_id].close())

                        asyncio.run(self.start_socket_client(tenant_id))

                except KvKeyNotFoundError:
                    logger.debug(f"Missing Slack Bot tokens for tenant {tenant_id}")
                    if tenant_id in self.socket_clients:
                        asyncio.run(self.socket_clients[tenant_id].close())
                        del self.socket_clients[tenant_id]
                        del self.slack_bot_tokens[tenant_id]
                except Exception as e:
                    logger.exception(f"Error handling tenant {tenant_id}: {e}")

    def send_heartbeats(self):
        current_time = int(time.time())
        logger.debug(f"Sending heartbeats for {len(self.tenant_ids)} tenants")
        for tenant_id in self.tenant_ids:
            heartbeat_key = f"tenant_heartbeat:{tenant_id}:{self.pod_id}"
            self.redis_client.set(
                heartbeat_key, current_time, ex=TENANT_HEARTBEAT_EXPIRATION
            )

    async def start_socket_client(self, tenant_id: str):
        logger.info(f"Starting socket client for tenant {tenant_id}")
        app_token = self.slack_bot_tokens[tenant_id]
        web_client = AsyncWebClient(token=app_token)
        socket_client = SocketModeClient(app_token=app_token, web_client=web_client)

        socket_client = _get_socket_client(app_token, tenant_id)

        @socket_client.socket_mode_request_listeners.append
        async def handle_events(event):
            logger.debug(f"Received event for tenant {tenant_id}")

        logger.info(f"Connecting socket client for tenant {tenant_id}")
        await socket_client.connect()
        self.socket_clients[tenant_id] = socket_client
        self.tenant_ids.add(tenant_id)
        logger.info(f"Started SocketModeClient for tenant {tenant_id}")

    def stop_socket_clients(self):
        logger.info(f"Stopping {len(self.socket_clients)} socket clients")
        for tenant_id, client in self.socket_clients.items():
            asyncio.run(client.close())
            logger.info(f"Stopped SocketModeClient for tenant {tenant_id}")

    def shutdown(self, signum, frame):
        logger.info("Shutting down gracefully")
        self.running = False
        self.stop_socket_clients()
        logger.info("Shutdown complete")
        sys.exit(0)


if __name__ == "__main__":
    logger.info("Starting TenantHandler")
    handler = TenantHandler()
    # Keep the main thread alive
    while handler.running:
        time.sleep(1)
