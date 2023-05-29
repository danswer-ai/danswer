This serves as an example for how to deploy everything on a single machine. This is
not optimal, but can get you started easily and cheaply. To run:


1. Run one of the docker compose commands below depending on your environment:
   - For Local:
     - `docker compose -f docker-compose.dev.yml -p danswer-stack up -d --build`
     - This will start Web/API servers, Postgres (backend DB), Qdrant (vector DB), and the background indexing job.
     - Downloading packages/requirements may take 20+ minutes depending on your internet connection.


2. To shut down the deployment run (use stop to stop containers, down to remove containers):
   - For Local:
     - `docker compose -f docker-compose.dev.yml -p danswer-stack stop`


3. To completely remove Danswer (**WARNING, this will also erase your indexed data and all users**) run:
   - For Local:
     - `docker compose -f docker-compose.dev.yml -p danswer-stack down -v`


Additional steps for setting up for Prod:

1. Set up a `.env` file in this directory with relevant environment variables.
   - Refer to env.dev.template and env.prod.template


2. Set up https:
   - Set up a `.env.nginx` file in this directory based on `env.nginx.template`.
   - `chmod +x init-letsencrypt.sh` + `./init-letsencrypt.sh` to set up https certificate.

3. Follow the above steps but replacing dev with prod.
