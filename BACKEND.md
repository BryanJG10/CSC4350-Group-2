## Backend / Database Setup
The Spring Boot backend lives in `app/` and connects to PostgreSQL through Spring Data JPA / Hibernate. Connection details are read from environment variables, so no credentials are committed to the repository.

1.  Create a Postgres database with your provider (Neon, Supabase, etc.) and copy its host, port, database name, username, and password.
2.  Copy `app/.env.example` to `app/.env` and fill in those values. The file is git-ignored.
3.  Start the backend from the `app/` directory:

    ```powershell
    ./gradlew bootRun
    ```

    If you prefer real environment variables over `.env`, set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_SSLMODE` in your shell or IDE run configuration. Environment variables take precedence over `.env`.

| Variable | Default | Purpose |
|----------|---------|---------|
| `DB_HOST` | `localhost` | Postgres host |
| `DB_PORT` | `5432` | Postgres port |
| `DB_NAME` | `dining_hall_review` | Database name |
| `DB_USERNAME` | `postgres` | Database user |
| `DB_PASSWORD` | *(empty)* | Database password |
| `DB_SSLMODE` | `require` | `require` for managed Postgres, `disable` for a local server |
| `DB_POOL_SIZE` | `5` | HikariCP connection pool size |
| `JPA_DDL_AUTO` | `update` | Hibernate schema handling; use `validate` once the schema is stable |
| `JPA_SHOW_SQL` | `false` | Log generated SQL |

`./gradlew test` runs against an in-memory H2 database (see `app/src/test/resources/application-test.yaml`), so tests do not require the Postgres instance.