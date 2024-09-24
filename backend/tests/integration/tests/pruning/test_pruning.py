import http
import os
import shutil
import tempfile
import threading
from collections.abc import Generator
from contextlib import contextmanager
from datetime import datetime
from datetime import timezone
from time import sleep

from danswer.server.documents.models import DocumentSource
from danswer.utils.logger import setup_logger
from tests.integration.common_utils.managers.api_key import APIKeyManager
from tests.integration.common_utils.managers.cc_pair import CCPairManager
from tests.integration.common_utils.managers.user import UserManager
from tests.integration.common_utils.test_models import TestUser
from tests.integration.common_utils.vespa import TestVespaClient


logger = setup_logger()


@contextmanager
def http_server_context(
    directory: str, port: int = 8000
) -> Generator[http.server.HTTPServer, None, None]:
    # Create a handler that serves files from the specified directory
    def handler_class(*args, **kwargs):
        return http.server.SimpleHTTPRequestHandler(
            *args, directory=directory, **kwargs
        )

    # Create an HTTPServer instance
    httpd = http.server.HTTPServer(("", port), handler_class)

    # Define a thread that runs the server in the background
    server_thread = threading.Thread(target=httpd.serve_forever)
    server_thread.daemon = (
        True  # Ensures the thread will exit when the main program exits
    )

    try:
        # Start the server in the background
        server_thread.start()
        yield httpd
    finally:
        # Shutdown the server and wait for the thread to finish
        httpd.shutdown()
        httpd.server_close()
        server_thread.join()


# def test_web_pruning() -> None:
def test_web_pruning(reset: None, vespa_client: TestVespaClient) -> None:
    # Creating an admin user (first user created is automatically an admin)
    admin_user: TestUser = UserManager.create(name="admin_user")

    # add api key to user
    APIKeyManager.create(
        user_performing_action=admin_user,
    )

    test_filename = os.path.realpath(__file__)
    test_directory = os.path.dirname(test_filename)
    with tempfile.TemporaryDirectory() as temp_dir:
        website_src = os.path.join(test_directory, "website")
        website_tgt = os.path.join(temp_dir, "website")
        shutil.copytree(website_src, website_tgt)
        with http_server_context(os.path.join(temp_dir, "website"), 8888):
            sleep(1)  # sleep a tiny bit before starting everything

            config = {
                "base_url": "http://localhost:8888/",
                "web_connector_type": "recursive",
            }

            # store the time before we create the connector so that we know after
            # when the indexing should have started
            now = datetime.now(timezone.utc)

            # create connector
            cc_pair_1 = CCPairManager.create_from_scratch(
                source=DocumentSource.WEB,
                connector_specific_config=config,
                user_performing_action=admin_user,
            )

            CCPairManager.wait_for_indexing(
                cc_pair_1, now, timeout=60, user_performing_action=admin_user
            )

            selected_cc_pair = CCPairManager.get_one(
                cc_pair_1.id, user_performing_action=admin_user
            )
            assert selected_cc_pair is not None, "cc_pair not found after indexing!"
            assert selected_cc_pair.docs_indexed == 15

            logger.info("Removing about.html.")
            os.remove(os.path.join(website_tgt, "about.html"))
            logger.info("Removing courses.html.")
            os.remove(os.path.join(website_tgt, "courses.html"))

            # store the time again as a reference for the pruning timestamps
            now = datetime.now(timezone.utc)

            CCPairManager.prune(cc_pair_1, user_performing_action=admin_user)
            CCPairManager.wait_for_prune(
                cc_pair_1, now, timeout=60, user_performing_action=admin_user
            )

            selected_cc_pair = CCPairManager.get_one(
                cc_pair_1.id, user_performing_action=admin_user
            )
            assert selected_cc_pair is not None, "cc_pair not found after pruning!"
            assert selected_cc_pair.docs_indexed == 13

            # check vespa
            index_id = "http://localhost:8888/index.html"
            about_id = "http://localhost:8888/about.html"
            courses_id = "http://localhost:8888/courses.html"

            doc_ids = [index_id, about_id, courses_id]
            retrieved_docs_dict = vespa_client.get_documents_by_id(doc_ids)["documents"]
            retrieved_docs = {
                doc["fields"]["document_id"]: doc["fields"]
                for doc in retrieved_docs_dict
            }

            # verify index.html exists in Vespa
            retrieved_doc = retrieved_docs.get(index_id)
            assert retrieved_doc

            # verify about and courses do not exist
            retrieved_doc = retrieved_docs.get(about_id)
            assert not retrieved_doc

            retrieved_doc = retrieved_docs.get(courses_id)
            assert not retrieved_doc
