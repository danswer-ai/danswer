import time

from danswer.server.features.document_set.models import DocumentSetCreationRequest
from tests.integration.common.seed_documents import seed_documents
from tests.integration.document_set.utils import create_document_set
from tests.integration.document_set.utils import fetch_document_sets


def test_multiple_document_sets_syncing_same_connnector() -> None:
    # Seed documents
    seed_result = seed_documents(num_docs=500)
    cc_pair_id = seed_result.cc_pair_id

    try:
        # Create first document set
        doc_set_1_id = create_document_set(
            DocumentSetCreationRequest(
                name="Test Document Set 1",
                description="First test document set",
                cc_pair_ids=[cc_pair_id],
                is_public=True,
                users=[],
                groups=[],
            )
        )

        doc_set_2_id = create_document_set(
            DocumentSetCreationRequest(
                name="Test Document Set 2",
                description="Second test document set",
                cc_pair_ids=[cc_pair_id],
                is_public=True,
                users=[],
                groups=[],
            )
        )

        # wait for syncing to be complete
        max_delay = 600
        start = time.time()
        while True:
            doc_sets = fetch_document_sets()
            doc_set_1 = next(
                (doc_set for doc_set in doc_sets if doc_set.id == doc_set_1_id), None
            )
            doc_set_2 = next(
                (doc_set for doc_set in doc_sets if doc_set.id == doc_set_2_id), None
            )

            if not doc_set_1 or not doc_set_2:
                raise RuntimeError("Document set not found")

            if doc_set_1.is_up_to_date and doc_set_2.is_up_to_date:
                assert [ccp.id for ccp in doc_set_1.cc_pair_descriptors] == [
                    ccp.id for ccp in doc_set_2.cc_pair_descriptors
                ]
                print("HELLO")
                break

            if time.time() - start > max_delay:
                raise TimeoutError("Document sets were not synced within the max delay")

            time.sleep(5)
            print("Waiting for document sets to sync...")

    except Exception as e:
        print(f"Something failed: {e}")
        raise e

    finally:
        # Clean up
        seed_result.cleanup_func()
