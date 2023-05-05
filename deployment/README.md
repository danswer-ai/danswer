This serves as an example for how to deploy everything on a single machine. This is
not optimal, but can get you started easily and cheaply. To run:

1. Set up a `.env` + `.env.nginx` file in this directory with relevant environment variables
  a. TODO: add description of required variables
2. `chmod +x init-letsencrypt.sh` + `./init-letsencrypt.sh` to setup https certificate
2. `docker compose up -d --build` to start nginx, postgres, web/api servers, and the background indexing job
