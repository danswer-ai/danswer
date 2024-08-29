from ee.enmedd.connectors.confluence.perm_sync import confluence_update_db_group
from ee.enmedd.connectors.confluence.perm_sync import confluence_update_index_acl
from enmedd.configs.constants import DocumentSource


CONNECTOR_PERMISSION_FUNC_MAP = {
    DocumentSource.CONFLUENCE: (confluence_update_db_group, confluence_update_index_acl)
}
