from update import update__main
from prometheus_client import start_http_server
from threading import Thread

def start_metrics_server():
    # Start up the server to expose the metrics.
    start_http_server(8899)


if __name__ == "__main__":
    metrics_thread = Thread(target=start_metrics_server)
    metrics_thread.start()
    update__main()