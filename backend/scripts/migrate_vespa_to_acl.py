"""Script which updates Vespa to align with the access described in Postgres.
Should be run when a user who has docs already indexed switches over to the new
access control system. This allows them to not have to re-index all documents.
NOTE: this is auto-run on server startup, so should not be necessary in most cases."""
from danswer.utils.acl import set_acl_for_vespa


if __name__ == "__main__":
    set_acl_for_vespa()
