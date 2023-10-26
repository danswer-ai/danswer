# This file is purely for development use, not included in any builds
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


def run_celery() -> None:
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

    # Redirect stderr to stdout for both processes
    worker_process = subprocess.Popen(
        cmd_worker, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )
    beat_process = subprocess.Popen(
        cmd_beat, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )

    # Monitor outputs using threads
    worker_thread = threading.Thread(
        target=monitor_process, args=("WORKER", worker_process)
    )
    beat_thread = threading.Thread(target=monitor_process, args=("BEAT", beat_process))

    worker_thread.start()
    beat_thread.start()

    # Wait for threads to finish
    worker_thread.join()
    beat_thread.join()


if __name__ == "__main__":
    run_celery()
