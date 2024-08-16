# __init__.py

# Specify the directory where your JavaScript files are located
WEB_DIRECTORY = "."

# Optionally, you can also define node class mappings and display name mappings
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

# These need to be included in the __all__ list so that ComfyUI recognizes them
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]