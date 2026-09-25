# MIS Invoicing System

A web-based **Management Information System (MIS) & Invoice Generation System** developed as part of the **IT Vedant Internship Project**.

---

## Project Overview

The **MIS Invoicing System** is a web-based application designed to help organizations manage clients, invoices, payments, estimates, users, and other business-related information through a centralized system.

The project follows a **frontend-backend architecture** using REST APIs.

### Architecture

* **Frontend:** HTML, CSS, JavaScript
* **Backend:** Java Spring Boot
* **Database:** MySQL
* **API:** REST APIs
* **Build Tool:** Maven
* **Backend Deployment:** Railway
* **Database Hosting:** Aiven MySQL
* **Version Control:** Git & GitHub

---

## Main Features

### User Management

* User registration
* User login
* Role-based access
* Admin and Sales Person roles
* Active/Inactive user status
* Session management
* Logout functionality

### Client Management

* Add new clients
* View client list
* View client details
* Manage client information
* Store client information in MySQL database

### Invoice Management

* Create invoices
* Add invoice items
* View invoices
* Manage invoice information
* Track invoice status

### Payment Management

* Record payments
* View payment information
* Track payment status
* Update invoice payment status

### Other Modules

* Groups
* Chains
* Brands
* Subzones
* Estimates

---

## Technology Stack

| Layer            | Technology            |
| ---------------- | --------------------- |
| Frontend         | HTML, CSS, JavaScript |
| Backend          | Java, Spring Boot     |
| Database         | MySQL                 |
| API              | REST API              |
| Build Tool       | Maven                 |
| Deployment       | Railway               |
| Database Hosting | Aiven MySQL           |
| IDE              | Visual Studio Code    |
| Version Control  | Git & GitHub          |

---

## Project Structure

```text
MIS-Invoicing-System/
│
├── backend/
│   ├── src/
│   ├── pom.xml
│   ├── railway.json
│   └── ...
│
├── frontend/
│   ├── index.html
│   ├── script.js
│   ├── style.css
│   └── ...
│
├── database/
│   └── ...
│
├── docs/
│   └── USER_GUIDE.md
│
├── .gitignore
└── README.md
```

---

# Backend Setup

## Requirements

Install the following software before running the backend locally:

* Java JDK
* Maven
* MySQL
* Git

## Database Configuration

The application uses **MySQL** as its database.

Database credentials are configured using environment variables.

Example:

```text
DB_USERNAME=root
DB_PASSWORD=your_password
DB_URL=jdbc:mysql://localhost:3306/ims_db
```

> **Security:** Never upload `.env` files, database passwords, API keys, or other secrets to GitHub.

The project uses environment variables so that sensitive database credentials are not stored directly in the source code.

---

## Run Backend Locally

Open Command Prompt inside the `backend` folder:

```cmd
mvn spring-boot:run
```

The backend runs locally on:

```text
http://localhost:8080
```

---

# Frontend Setup

Open Command Prompt inside the `frontend` folder and run:

```cmd
python -m http.server 5500
```

Then open:

```text
http://localhost:5500
```

The frontend communicates with the backend through REST APIs.

---

# API Examples

## Client API

### Get All Clients

```text
GET /api/v1/clients
```

### Get Client By ID

```text
GET /api/v1/clients/{id}
```

### Create Client

```text
POST /api/v1/clients
```

---

# Live Deployment

The application has been deployed using **Railway**.

The production database is hosted using **Aiven MySQL**.

## Live Frontend

**Frontend URL:**

https://frontend-production-267e4.up.railway.app

## Live Backend

**Backend URL:**

https://mis-invoicing-system-production-c653.up.railway.app

## Live Client API

```text
https://mis-invoicing-system-production-c653.up.railway.app/api/v1/clients
```

## GitHub Repository

https://github.com/manishabhar280/MIS-Invoicing-System-ITVedant

---

# Production Architecture

```text
User
  │
  ▼
Railway Frontend
  │
  │ REST API
  ▼
Railway Spring Boot Backend
  │
  │ JDBC / JPA
  ▼
Aiven MySQL Database
```

The frontend and backend are deployed as separate Railway services.

The backend connects to the hosted Aiven MySQL database using environment variables.

---

# Testing

The following functionality has been tested successfully:

### Backend

* Spring Boot application startup
* Railway deployment
* MySQL database connection
* REST API functionality
* Client API
* Invoice functionality
* Payment functionality

### Frontend

* Live frontend loading
* Client creation
* Invoice generation
* Payment processing
* Frontend-to-backend communication
* Database data persistence

### Production Testing

The live application was tested using the deployed Railway frontend and backend.

Data created through the application was successfully stored and retrieved from the MySQL database.

---

# Local URLs

### Frontend

```text
http://localhost:5500
```

### Backend

```text
http://localhost:8080
```

### Client API

```text
http://localhost:8080/api/v1/clients
```

---

# Security

Sensitive configuration is handled using environment variables.

The project follows these basic security practices:

* Database credentials are not stored in source code.
* `.env` files are excluded using `.gitignore`.
* Passwords and other secrets should not be committed to GitHub.
* Production database credentials are configured through Railway environment variables.
* Environment-specific configuration is separated from application code.

---

# Documentation

Detailed end-user instructions are available in:

```text
docs/USER_GUIDE.md
```

The user guide covers:

* System requirements
* Application startup
* User registration
* Login
* Role-based access
* Client management
* Invoice generation
* Payment management
* Estimates
* Other modules
* Logout
* Troubleshooting

---

# Internship Project

This project is developed as part of the **IT Vedant Internship Program**.

The project demonstrates practical implementation of:

* Frontend development
* Backend development
* REST API integration
* Database management
* Git & GitHub
* Cloud deployment
* Environment variable configuration
* End-to-end application testing

---

# Developer

**Manisha Bhardwaj**

BTech Computer Science and Engineering

---

# Repository

GitHub Repository:

https://github.com/manishabhar280/MIS-Invoicing-System-ITVedant

---

## Project Status

**Development:** Completed for the current module

**Deployment:** Live

**Frontend:** Live on Railway

**Backend:** Live on Railway

**Database:** Aiven MySQL

**Testing:** Completed

**Documentation:** Available in `docs/USER_GUIDE.md`
