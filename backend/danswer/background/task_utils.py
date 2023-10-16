def name_cc_cleanup_task(connector_id: int, credential_id: int) -> str:
    return f"cleanup_connector_credential_pair_{connector_id}_{credential_id}"


def name_document_set_sync_task(document_set_id: int) -> str:
    return f"sync_doc_set_{document_set_id}"
