import base64


def get_image_type(raw_b64_string: str) -> str:
    binary_data = base64.b64decode(raw_b64_string)
    magic_number = binary_data[:4]

    if magic_number.startswith(b"\x89PNG"):
        mime_type = "image/png"
    elif magic_number.startswith(b"\xFF\xD8"):
        mime_type = "image/jpeg"
    elif magic_number.startswith(b"GIF8"):
        mime_type = "image/gif"
    elif magic_number.startswith(b"RIFF") and binary_data[8:12] == b"WEBP":
        mime_type = "image/webp"
    else:
        raise ValueError(
            f"Unsupported image format - only PNG, JPEG, "
            f"GIF, and WEBP are supported. Found '{magic_number}'"
        )

    return mime_type


def format_b64_string_for_img_display(raw_b64_string: str) -> str:
    # Decode the base64 string
    binary_data = base64.b64decode(raw_b64_string)

    # Inspect the first few bytes
    magic_number = binary_data[:4]

    if magic_number.startswith(b"\x89PNG"):
        mime_type = "image/png"
    elif magic_number.startswith(b"\xFF\xD8"):
        mime_type = "image/jpeg"
    elif magic_number.startswith(b"GIF8"):
        mime_type = "image/gif"
    elif magic_number.startswith(b"RIFF") and binary_data[8:12] == b"WEBP":
        mime_type = "image/webp"
    else:
        raise ValueError(
            f"Unsupported image format - only PNG, JPEG, "
            f"GIF, and WEBP are supported. Found '{magic_number}'"
        )

    return f"data:{mime_type};base64,{raw_b64_string}"
