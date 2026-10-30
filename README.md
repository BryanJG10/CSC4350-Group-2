# Dining Hall Review App

## Project Overview
Dining Hall Review is a web application built for Georgia State University's PantherDining system. Students on a GSU meal plan can rate and review individual stations and menu items at Patton Dining Hall, Piedmont Central Dining Hall, and Piedmont North Dining Hall in real time. Reviews are backed by a relational database schema (dining halls, stations, menu items, reviews, users, allergen tags) so ratings aggregate meaningfully over the semester and support search and filtering by dietary need, station, dining hall, and meal period. 

## Features
*   **Station- and item-level ratings and reviews across Patton, Piedmont Central, and Piedmont North**: help students choose where to eat before they walk in, and help PantherDining see exactly which item or station needs attention. 

*   **Dietary/allergen tagging and filtering**: lets students with restrictions quickly filter to items and stations that are reliably safe or well-suited to them, campus-wide. 

*   **Search and sort by dining hall, station, meal period, and rating**: reduces the time students spend guessing or walking between Patton, Piedmont Central, and Piedmont North (which is especially relevant since Piedmont Central runs 24-hour service). 

*   **Review history and trends over the semester**: gives PantherDining a structured, ongoing feedback signal that is far more actionable than the static Nutrislice menu. 

*   **User accounts tied to reviews**: prevents spam/duplicate reviews and lets the system weight or verify reviews (e.g., one review per student per visit). 

## System Architecture
The Dining Hall Review App follows a three-tier web architecture
**Frontend -> Backend -> Database**
The frontend handles the user interface and sends requests to the backend. The backend handles business logic, authentication, reviews, search/filtering, saved items, Heads-Up notifications, and communication with the database. The PostgreSQL database stores users, dining halls, stations, menu items, reviews, ratings, dietary/allergen tags, saved items, and notifications. Each dining hall's weekly schedule is stored as JSON, using a structure defined by the application. Each menu item also has separate availability start and end time columns, which the application uses to determine when an item is scheduled to be available.

## Technology Stack
*   **Language(s)**: Java, Javascript/Typescript, HTML, CSS, PostgreSQL
*   **Frontend** React + Javascript/HTML/CSS
*   **Backend**: Java + Spring Boot + Rest API
*   **Cloud/Deployment**: Cloud-hosted Spring Boot backend + PostgreSQL
*   **Notifications**: Email/browser notification service for the Heads-Up feature
*   **Database Connection**: Spring Dara JPA / Hibernate
*   **Database**: PostgreSQL, JSON storage
*   **IDE**: IntelliJ IDEA

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
|---|---|---|
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

## Team Members
*   Bryan Gilles
*   Janiya Green 
*   Wilder Edwards
*   Jalen Kelsey
## Primary Work Distribution
| # | Name | Focus | Backup Reviewer |
|---|------|-------|------------|
| 1 | Bryan | Frontend + GUI | Janiya |
| 2 | Janiya | SWDD + SRS + UML / Wireframes + Project Coordination / Final Packagaging | Wilder |
| 3 | Wilder | Databases + Cloud based integration + Record all meetings and drop in summary channel | Jalen |
| 4 | Jalen | Backend Development + Integration & Testing | Bryan |