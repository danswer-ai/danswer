This serves as an example for how to deploy everything on a single machine. This is
not optimal, but can get you started easily and cheaply. To run:

1. Set up a `.env` file in this directory with relevant environment variables.
   - Use the `env.template` as a reference.
2. SKIP this step if running locally. If you are running this for production and need https do the following:
   - Set up a `.env.nginx` file in this directory based on `env.nginx.template`.
   - `chmod +x init-letsencrypt.sh` + `./init-letsencrypt.sh` to set up https certificate.
3. Run one of the docker compose commands below depending on your environment:
   - For Local:
     - `docker compose -f docker-compose.dev.yml -p danswer-stack up -d --build`
     - This will start Web/API servers, Postgres (backend DB), Qdrant (vector DB), and the background indexing job.
   - For Prod:
     - `docker compose -f docker-compose.prod.yml -p danswer-stack up -d --build`
     - This will additionally run certbot and start Nginx.
4. To pause Danswer, simply run `docker stop` on the containers in the Danswer stack.
5. To completely shut down the deployment run:
- **WARNING, running the below will also erase your indexed data and all users**
   - For Local:
     - `docker compose -f docker-compose.dev.yml -p danswer-stack down`
   - For Prod:
     - `docker compose -f docker-compose.prod.yml -p danswer-stack down`
