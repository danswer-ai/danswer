from danswer.utils.logger import get_log_level_from_str
from danswer.utils.logger import setup_logging_server_logger
from typing import Dict

def write_log(log: Dict):
    service_name = log.get("service_name")
    logger = setup_logging_server_logger(service_name)
    log_level = get_log_level_from_str(log.get("levelname"))

    # Avoiding logger setting values from this file by crafting 
    # the message from the passed in dict and format only with that
    asctime = log.get('asctime')
    filename = log.get('filename')
    lineno = log.get('lineno')
    message = log.get('message')
    combined_message = f"{asctime} {filename:.30s} {lineno:.4s} {message}"
    
    logger.log(log_level, combined_message)