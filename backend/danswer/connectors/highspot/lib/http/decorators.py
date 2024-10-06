from typing import Callable
from requests import Response
from ..models.simple import JsonObject

def validate_endpoint(func: Callable) -> Callable:
    """Decorator that yells at you if you try to pass an entire URL as an endpoint."""

    def wrapper(*args, **kwargs):
        if not args[1].startswith("/"):
            raise ValueError("Endpoint must start with /")
        return func(*args, **kwargs)

    return wrapper


def json(func: Callable) -> Callable:
    """Decorator that automatically converts the response to JSON."""

    def wrapper(*args, **kwargs):
        response = func(*args, **kwargs)
        try:
            return response.json()
        except Exception:
            raise ValueError("Response is not JSON")

    return wrapper


def raise_for_status(func: Callable) -> Callable:
    """Decorator that raises an exception if the response status code is not 2xx."""

    def wrapper(*args, **kwargs):
        response = func(*args, **kwargs)
        try:
            response.raise_for_status()
        except Exception as e:
            raise Exception(f"Error: {response.content}")
        return response

    return wrapper


def json_object(func):
    def _convert_to_json_object(data):
        if isinstance(data, dict):
            for key, value in data.items():
                data[key] = _convert_to_json_object(value)
            return JsonObject(**data)
        elif isinstance(data, list):
            return [_convert_to_json_object(item) for item in data]
        else:
            return data
    
    def wrapper(*args, **kwargs):
        response = func(*args, **kwargs)
        if isinstance(response, Response):
            json_data = response.json()
            return _convert_to_json_object(json_data)
        else:
            raise ValueError("The decorated function must return a Response object.")
    return wrapper


def add_type(attr_value):
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Call the original function to get the JSON object
            result = func(*args, **kwargs)
            result.type = attr_value
            return result
        return wrapper
    return decorator
