#!/bin/bash

# Configuration
LOCAL_PORT=8080
REMOTE_PORT=8080
SSH_USER=ubuntu
SSH_HOST=mir.svoi.fr
export WEB_DOMAIN=http://localhost:3000

# Check if tunnel is up by checking if anything is listening on the LOCAL_PORT
if lsof -i :$LOCAL_PORT | grep LISTEN > /dev/null
then
    echo "SSH tunnel already established."
else
    echo "Setting up SSH tunnel..."
    ssh -N -L ${LOCAL_PORT}:localhost:${REMOTE_PORT} ${SSH_USER}@${SSH_HOST} -o "ServerAliveInterval 30" -o "ServerAliveCountMax 3" &
    echo "SSH tunnel established on port ${LOCAL_PORT}."
fi

npm run dev
