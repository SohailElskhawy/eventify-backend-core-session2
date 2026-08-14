  ### Current Status

   Service                      | Status                     | Port Mapping               | Health
  ------------------------------|----------------------------|----------------------------|-----------------------------------
   db (PostgreSQL 16)           | Up                         | 0.0.0.0:5432 -> 5432       | Healthy (pg_isready check passed)
   app (Node 24 TypeScript API) | Up                         | 0.0.0.0:3000 -> 3000       | Running (/health returned 200 OK)
  ──────
  ### What was configured:

  1. **Dockerfile**: Created using Node 24 Alpine, pre-generating the Prisma Client and running the app with native TypeScript
  watch (node --watch src/server.ts).
  2. **.dockerignore**: Created to prevent uploading local node_modules into the Docker build context.
  3. **docker-compose.yml**:
      • Synchronized passwords between POSTGRES_PASSWORD and DATABASE_URL.
      • Added container health check on Postgres so app only starts when the database is ready to accept connections.
      • Mounted ./src:/app/src so edits on your host machine will hot-reload automatically inside the container.

  ──────
  ### Useful Commands

  • Stop containers:
    docker compose down

  • Start containers in background:
    docker compose up -d

  • View live container logs:
    docker compose logs -f

  • Run Prisma migrations against the running container:
    npx prisma migrate dev --name init