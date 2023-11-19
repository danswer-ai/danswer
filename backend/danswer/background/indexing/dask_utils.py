import time

import psutil
from dask.distributed import WorkerPlugin
from distributed import Worker

from danswer.utils.logger import setup_logger

logger = setup_logger()


class ResourceLogger(WorkerPlugin):
    def __init__(self, log_interval: int = 60 * 5):
        self.log_interval = log_interval

    def setup(self, worker: Worker) -> None:
        """This method will be called when the plugin is attached to a worker."""
        self.worker = worker
        worker.loop.add_callback(self.log_resources)

    def log_resources(self) -> None:
        """Periodically log CPU and memory usage."""
        while True:
            cpu_percent = psutil.cpu_percent(interval=None)
            memory_available_gb = psutil.virtual_memory().available / (1024.0**3)
            # You can now log these values or send them to a monitoring service
            logger.debug(
                f"Worker {self.worker.address}: CPU usage {cpu_percent}%, Memory available {memory_available_gb}GB"
            )
            time.sleep(self.log_interval)
