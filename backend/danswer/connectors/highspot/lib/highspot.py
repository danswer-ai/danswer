from typing import Optional
from datetime import datetime
from requests import Response

from .http.session import HighSpotSession
from .http.decorators import json
from .http.decorators import json_object
from .http.decorators import add_type
from .http.utils import get_query
from .models.enums import PermRole
from .models.enums import PermRight
from .models.enums import ObjectTypes as Types


class HighSpot:
    HIGHSPOT_API_URL = "https://api-su3.highspot.com/v1.0"

    def __init__(self, key: str, secret: str, server: str = ""):
        """Initialize a new HighSpot API client.

        Parameters:
            - key: API key from your HighSpot account.
            - secret: API secret from your HighSpot account.
            - server [optional] - Base URL for the HighSpot API. Defaults to `api-su3.highspot.com/v.1.0' api.
        """
        self.server = server if server else self.HIGHSPOT_API_URL
        self.hss = HighSpotSession(key, secret, self.server)
        self.session = self.hss.session

    """ Spots """

    @add_type(Types.SPOT_LIST)
    @json_object
    def list_spots(
        self,
        right: Optional[PermRight] = PermRight.VIEW,
        role: Optional[PermRole] = None,
        is_official: Optional[bool] = None,
    ) -> dict:
        """List all spots in your HighSpot account."""
        query = get_query(right=right, role=role, is_official=is_official)
        return self.hss.get("/spots", params=query)

    @add_type(Types.SPOT)
    @json_object
    def get_spot(self, spot_id: str) -> dict:
        """Get a specific spot by ID."""
        return self.hss.get(f"/spots/{spot_id}")

    """ Items """

    @add_type(Types.ITEM_LIST)
    @json_object
    def list_items(
        self,
        spot_id: str,
        start: Optional[datetime] = None,
        end: Optional[datetime] = None,
    ) -> dict:
        """List all items in a spot.

        Parameters:
            - spot_id - ID of the spot to list items from.
            - start [optional] - Start date to filter items from (last updated date).
            - end [optional] - End date to filter items (last updated date).
        """
        query = get_query(spot=spot_id)
        return self.hss.get("/items", params=query)

    @add_type(Types.ITEM)
    @json_object
    def get_item(self, item_id: str) -> dict:
        """Get a specific item by ID."""
        return self.hss.get(f"/items/{item_id}")

    def get_item_content(self, item_id: str) -> Response:
        """Get a specific item by ID."""
        return self.hss.get(f"/items/{item_id}/content")

    @add_type(Types.USER)
    @json_object
    def get_user(self, user_id: str) -> dict:
        """Get a specific user by ID."""
        return self.hss.get(f"/users/{user_id}")
