import re


def _remove_null_values(data):
    """
    Recursively remove all None values from a nested dictionary or list.
    """
    if isinstance(data, dict):
        cleaned_dict = {}
        for key, value in data.items():
            if isinstance(value, (dict, list)):
                cleaned_value = _remove_null_values(value)
                if cleaned_value:  # Only add non-empty dictionaries or lists
                    cleaned_dict[key] = cleaned_value
            elif value is not None:
                cleaned_dict[key] = value
        return cleaned_dict
    elif isinstance(data, list):
        cleaned_list = []
        for item in data:
            if isinstance(item, (dict, list)):
                cleaned_item = _remove_null_values(item)
                if cleaned_item:  # Only add non-empty dictionaries or lists
                    cleaned_list.append(cleaned_item)
            elif item is not None:
                cleaned_list.append(item)
        return cleaned_list
    else:
        return data


def _remove_empty_dicts_and_lists(data):
    """
    Recursively remove all empty dictionaries and lists from a nested dictionary or list.
    """
    if isinstance(data, dict):
        cleaned_dict = {}
        for key, value in data.items():
            if isinstance(value, (dict, list)):
                cleaned_value = _remove_empty_dicts_and_lists(value)
                if cleaned_value:  # Only add non-empty dictionaries or lists
                    cleaned_dict[key] = cleaned_value
            else:
                cleaned_dict[key] = value
        return cleaned_dict
    elif isinstance(data, list):
        cleaned_list = []
        for item in data:
            if isinstance(item, (dict, list)):
                cleaned_item = _remove_empty_dicts_and_lists(item)
                if cleaned_item:  # Only add non-empty dictionaries or lists
                    cleaned_list.append(cleaned_item)
            else:
                cleaned_list.append(item)
        return cleaned_list
    else:
        return data


def _filter_out_booleans_dates_and_ids(data):
    if isinstance(data, dict):
        filtered_dict = {}
        for key, value in data.items():
            if not re.search(r"Id$|Date$|Is|Has|stamp|url", key, re.IGNORECASE):
                if "__c" in key:
                    key = key[:-3]
                if isinstance(value, (dict, list)):
                    filtered_value = _filter_out_booleans_dates_and_ids(value)
                    if filtered_value:  # Only add non-empty dictionaries or lists
                        filtered_dict[key] = filtered_value
                else:
                    filtered_dict[key] = value
        return filtered_dict
    elif isinstance(data, list):
        filtered_list = []
        for item in data:
            filtered_item = _filter_out_booleans_dates_and_ids(item)
            if filtered_item:  # Only add non-empty dictionaries or lists
                filtered_list.append(filtered_item)
        return filtered_list
    else:
        return data


def _remove_record_nesting(given_dict):
    for key, value in given_dict.items():
        if isinstance(value, dict):
            if "records" in value:
                given_dict[key] = value["records"]
    return given_dict


def clean_data(data):
    """
    Recursively remove all None values and empty dictionaries/lists from a nested dictionary or list.
    """
    # First, remove all None values
    data = _remove_null_values(data)
    # Then, remove all empty dictionaries and lists
    data = _remove_empty_dicts_and_lists(data)

    data = _remove_record_nesting(data)

    data = _filter_out_booleans_dates_and_ids(data)
    return data


def json_to_natural_language(data, indent=0):
    result = []
    indent_str = " " * indent

    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, (dict, list)):
                result.append(f"{indent_str}{key}:")
                result.append(json_to_natural_language(value, indent + 2))
            else:
                result.append(f"{indent_str}{key}: {value}")
    elif isinstance(data, list):
        for item in data:
            result.append(json_to_natural_language(item, indent))
    else:
        result.append(f"{indent_str}{data}")

    return "\n".join(result)
