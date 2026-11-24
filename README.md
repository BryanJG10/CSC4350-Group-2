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
The frontend handles the user interface and sends requests to the backend. The backend handles business logic, authentication, reviews, search/filtering, saved items, Heads-Up notifications, and communication with the database. The PostgreSQL database stores users, dining halls, stations, menu items, reviews, ratings, dietary/allergen tags, saved items, and notifications. Each dining hall's weekly schedule is stored as JSON, using a structure defined by the application. Each menu item also has separate availability start and end time columns, which the application uses to determine when an item is scheduled to be available. Doppler provides each team member with the database credentials needed to connect to the shared development database; credentials are supplied to the backend as environment variables and are not committed to Git.

## Technology Stack
*   **Language(s)**: Java, Javascript/Typescript, HTML, CSS, PostgreSQL
*   **Frontend**: React + JavaScript/TypeScript + HTML/CSS + Vite
*   **Backend**: Java + Spring Boot + Spring MVC / Rest API + Gradle wrapper
*   **Cloud/Deployment**: Cloud-hosted Spring Boot backend + PostgreSQL
*   **Notifications**: Email/browser notification service for the Heads-Up feature
*   **Frontend Tests**: Vitest + Testing Library + Playwright
*   **Backend Tests**: Spring Dara JPA / Hibernate
*   **Database Connection**: Spring Dara JPA / Hibernate
*   **Database**: PostgreSQL, JSON storage
*   **Secret Management**: Doppler
*   **IDE**: IntelliJ IDEA

## Database 
### PreRequisites
1. Git
2. JDK 17
3. Node.js 22.12.0+
4. pnpm 10.34.9
5. Doppler CLI
**Use bash below to verify installed versions**
```bash
java -version
node --version
pnpm --version
doppler --version
```

### Frontend Setup
for more information, go to [FRONTEND.md](FRONTEND.md)
**Make sure to cd into /frontend before installing pnpm**
### Backend Setup
for more information, go to [BACKEND.md](BACKEND.md)

## Running The Application
Run the backend and frontend in two separate terminals. Start the backend first so the API is available when the frontend needs it.

<br>

**Terminal 1**
Enter the following code after navigating to the repo root

*MacOS/Linux*
```bash
doppler run -- ./app/gradlew -p app bootRun
```

*Windows*
```bash
doppler run -- .\app\gradlew.bat -p app bootRun
```
<br>

**Terminal 2**
Enter the following code after navigating to the repo root
```bash
cd frontend
pnpm dev
```
Vite is configured to bind to 127.0.0.1. Open the local URL printed in the terminal (normally http://127.0.0.1:5173/) in your browser.

<br>
**to stop either server, go to its terminal and type [ Ctrl + C ]**

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