import os
import subprocess
import threading


def monitor_process(process_name: str, process: subprocess.Popen) -> None:
    assert process.stdout is not None

    while True:
        output = process.stdout.readline()

        if output:
            print(f"{process_name}: {output.strip()}")

        if process.poll() is not None:
            break


def run_jobs() -> None:
    cmd_worker = [
        "celery",
        "-A",
        "danswer.background.celery",
        "worker",
        "--pool=threads",
        "--autoscale=3,10",
        "--loglevel=INFO",
        "--concurrency=1",
    ]

    cmd_beat = ["celery", "-A", "danswer.background.celery", "beat", "--loglevel=INFO"]

    update_env = os.environ.copy()
    update_env["PYTHONPATH"] = "."
    update_env["DYNAMIC_CONFIG_DIR_PATH"] = "./dynamic_config_storage"
    update_env["FILE_CONNECTOR_TMP_STORAGE_PATH"] = "./dynamic_config_storage"
    cmd_indexing = ["python", "danswer/background/update.py"]

    # Redirect stderr to stdout for all processes
    indexing_process = subprocess.Popen(
        cmd_indexing,
        env=update_env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    worker_process = subprocess.Popen(
        cmd_worker, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )
    beat_process = subprocess.Popen(
        cmd_beat, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )

    # Monitor outputs using threads
    indexing_thread = threading.Thread(
        target=monitor_process, args=("INDEXING", indexing_process)
    )
    worker_thread = threading.Thread(
        target=monitor_process, args=("WORKER", worker_process)
    )
    beat_thread = threading.Thread(target=monitor_process, args=("BEAT", beat_process))

    indexing_thread.start()
    worker_thread.start()
    beat_thread.start()

    # Wait for threads to finish
    indexing_thread.join()
    worker_thread.join()
    beat_thread.join()


if __name__ == "__main__":
    run_jobs()
