#!/bin/bash

# Start supervisord
/usr/bin/supervisord &

# touch files to avoid error about `tail: cannot open '/var/log/update.log' for reading: No such file or directory`
touch /var/log/update.log /var/log/connector_deletion.log /var/log/file_deletion.log /var/log/slack_bot_listener.log
# Tail the logs to stdout, needs to be kept up to date with supervisord.conf
tail -qF /var/log/update.log /var/log/connector_deletion.log /var/log/file_deletion.log /var/log/slack_bot_listener.log
