from enum import Enum


class PermRole(Enum):
    EDITOR = 'editor'
    VIEWER = 'viewer'
    OWNER = 'owner'
    MANAGER = 'manager'


class PermRight(Enum):
    EDIT = 'edit'
    VIEW = 'view'
    MANAGE = 'manage'


class ObjectTypes:
    SPOT_LIST = 'SpotList'
    SPOT = 'Spot'
    ITEM_LIST = 'ItemList'
    ITEM = 'Item'
    USER = 'User'


class ContentTypes:
    PRESENTATION = 'Presentation'
    HS_PAGE = 'PageDesign'
    PDF = 'PDF'
    VIDEO = 'Video'
    WEB_LINK = 'WebLink'
    CONTENT_LINK = 'ContentLink'  # Item that has a link to another item
    SPREADSHEET = 'Spreadsheet'
    COURSE = 'Course'
    DOCUMENT = 'Document'
    IMAGE = 'Image'
    RUBRIC = 'Rubric'
