import datetime


def dummy_node(state):
    """
    This node is a dummy node that does not change the state but allows to inspect the state.
    """
    print(f"DUMMY NODE: {datetime.datetime.now()}")

    return {}
