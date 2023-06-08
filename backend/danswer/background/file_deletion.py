from danswer.background.utils import interval_run_job
from danswer.connectors.file.utils import clean_temp_files


if __name__ == "__main__":
    interval_run_job(clean_temp_files, 30 * 60)  # run every 30 minutes
