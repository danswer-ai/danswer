#!/bin/bash

python danswer/background/update.py &

python danswer/background/file_deletion.py &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?
