def dummy_node(state):
    """
    This node is a dummy node that does not change the state but allows to inspect the state.
    """
    print(f"doc_reranking state: {state.keys()}")

    state["verified_documents"]

    return {}
