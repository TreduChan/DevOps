# DevOps
VAMK

Framework: React 19

Language: TypeScript

Build Tool: Vite

Styling: Tailwind CSS v4


# Frontend - React + TypeScript + Tailwind CSS

This is the frontend application built with React, TypeScript, Vite, and Tailwind CSS v4.

---

## 🛠️ Prerequisites

Ensure you have the following installed locally:

* **Node.js** (v18 or higher recommended)

---

## 🚀 Getting Started

Follow these steps to set up and run the development environment on your machine:

### 1. Clone the Repository
```
git clone <repository-url>
cd DevOps
```
### 2. Frontend
```
cd frontend
npm install
npm run dev
```
The frontend runs at http://localhost:xxxx

# Backend

### 1. Go to the backend folder
```
cd DevOps/backend
```
### 2. Install Dependencies
```
npm install
```
### 3. get the `.env` file

Super secret

### 4. Start the Backend Server
```
node --env-file=.env server.js
```
Requires Node !!!

### Notes
- Start the backend before using the frontend.
- Works only in school network
- Super secrets !!!

## Run with Docker

Docker Desktop is required. The Compose setup builds the application image,
starts MariaDB, initializes the schema, and serves the application at
http://localhost:3000.

```powershell
docker compose up --build
```

Stop the containers with `docker compose down`. See
[docs/docker-report.md](docs/docker-report.md) for the Docker Hub workflow and
the team participation report.