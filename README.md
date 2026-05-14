
# GymTracker

React app + Node.js + SQLite + Chart.js to create gym routines, track progress stats, and share results.

## Tech stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | Vanilla JS + React (via CDN), Chart.js |
| Backend  | Node.js + Express                   |
| Database | SQLite via `better-sqlite3`         |

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (bundled with Node.js)

---

## Local setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd GymTracker
```

### 2. Install server dependencies

```bash
cd server
npm install
```

This installs:
- `express` — HTTP server
- `better-sqlite3` — SQLite driver
- `cors` — Cross-origin request handling

> `better-sqlite3` compiles a native addon. If the install fails, make sure you have Python and a C++ build toolchain available (`npm install --global windows-build-tools` on Windows, or `xcode-select --install` on macOS).

---

## Running the app

### Start the database server

```bash
cd server
npm start
```

The API will be available at `http://localhost:3001`. The SQLite database file (`gym.db`) is created automatically in the `server/` folder on first run — no manual schema setup needed.

### Open the frontend

Open `BitacoraGym.html` directly in your browser:

```bash
# macOS
open BitacoraGym.html

# Windows
start BitacoraGym.html

# Linux
xdg-open BitacoraGym.html
```

Or serve it with any static file server if you prefer (e.g. `npx serve .`).

> The frontend expects the API at `http://localhost:3001`. Make sure the server is running before opening the app.

---

## Project structure

```
GymTracker/
├── BitacoraGym.html      # Single-file frontend entry point
├── src/                  # JS/JSX source files (loaded by the HTML)
│   ├── app.jsx
│   ├── session.jsx
│   ├── sessionEditor.jsx
│   ├── views.jsx
│   ├── charts.jsx
│   ├── icons.jsx
│   └── ...
└── server/
    ├── server.js         # Express + SQLite API
    ├── package.json
    └── gym.db            # SQLite database (auto-created on first run)
```

---

## Database

The server uses **SQLite** via `better-sqlite3`. The database file lives at `server/gym.db` and is created automatically when the server starts for the first time. Tables created on startup:

- `exercises` — exercise library
- `sessions` — workout sessions
- `blocks` — exercise blocks within a session
- `sets` — individual sets within a block
- `meta` — key/value app settings

To inspect the database directly you can use the [SQLite CLI](https://sqlite.org/cli.html) or a GUI like [DB Browser for SQLite](https://sqlitebrowser.org/):

```bash
sqlite3 server/gym.db
```
