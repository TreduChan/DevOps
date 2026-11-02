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


## Database

### Overview

This repository contains the MariaDB database for the Hotel Reservation System project.

The database is designed to manage hotel rooms, customers, user accounts and reservations. It is shared by the frontend and backend development teams.

### Database Information

Database name: hotel_reservation_db

Database management system: MariaDB

Database management tool: DBeaver

### Database Structure

The database currently contains six tables:

Table       Description

| Table | Description |
|---|---|
| `roles` | Stores user roles, such as Admin, Receptionist and Customer. |
| `users` | Stores user account and contact information. |
| `room_types` | Stores room categories, such as Single, Double and Suite. |
| `rooms` | Stores hotel room information. |
| `reservation_statuses` | Stores reservation statuses. |
| `reservations` | Stores customer reservations and booking information. |

### Database Relationships

The database uses the following relationships:

| Relationship | Type | Description |
|---|---|---|
| `roles` → `users` | One-to-Many (1:N) | One role can belong to multiple users. |
| `room_types` → `rooms` | One-to-Many (1:N) | One room type can be assigned to multiple rooms. |
| `users` → `reservations` (`customer_id`) | One-to-Many (1:N) | One customer can make multiple reservations. |
| `users` → `reservations` (`handled_by`) | One-to-Many (1:N) | One receptionist can handle multiple reservations. |
| `rooms` → `reservations` | One-to-Many (1:N) | One room can have multiple reservations over time. |
| `reservation_statuses` → `reservations` | One-to-Many (1:N) | One reservation status can be assigned to multiple reservations. |

### Requirements

To use and modify the database locally, install:

MariaDB Server

A database management tool (e.g. DBeaver, HeidiSQL or MySQL Workbench)
  
### Setup

import the database into their own local MariaDB server.

1. Install MariaDB Server.

2. Install and open DBeaver.

3. Create a connection to your local MariaDB server.

4. Create a new database named hotel_reservation_db.

5. Open the provided SQL database export file.

6. Select hotel_reservation_db as the active database.

7. Execute the SQL script.

8. Refresh the database navigator
