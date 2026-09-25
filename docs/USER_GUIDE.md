# MIS Invoicing System — User Guide

## 1. Introduction

The **MIS Invoicing System** is a web-based application developed as part of the **IT Vedant Internship Project**.

The system provides functionality for managing:

* Users
* Clients
* Invoices
* Payments
* Estimates
* Groups
* Chains
* Brands
* Subzones

The application uses a frontend-backend architecture with a MySQL database.

This guide explains how to access, run, and use the application.

---

## 2. Technology Used

| Component        | Technology            |
| ---------------- | --------------------- |
| Frontend         | HTML, CSS, JavaScript |
| Backend          | Java, Spring Boot     |
| Database         | MySQL                 |
| API              | REST API              |
| Build Tool       | Maven                 |
| Deployment       | Railway               |
| Database Hosting | Aiven MySQL           |
| Version Control  | Git & GitHub          |

---

# 3. Live Application

The application is deployed and available online.

### Live Frontend

```text
https://frontend-production-267e4.up.railway.app
```

Open the above URL in a modern web browser to access the application.

### Live Backend

```text
https://mis-invoicing-system-production-c653.up.railway.app
```

### Live Client API

```text
https://mis-invoicing-system-production-c653.up.railway.app/api/v1/clients
```

### GitHub Repository

```text
https://github.com/manishabhar280/MIS-Invoicing-System-ITVedant
```

---

# 4. System Requirements

For local development, the following software is required:

* Windows operating system
* Java JDK
* Maven
* MySQL
* Python
* Git
* Modern web browser such as Google Chrome or Microsoft Edge
* Visual Studio Code or another suitable IDE

For using the **live application**, Java, Maven, MySQL, and Python are not required on the user's computer. A modern web browser and internet connection are sufficient.

---

# 5. Application Architecture

The application follows this architecture:

```text
User
  |
  v
Railway Frontend
  |
  | REST API
  v
Railway Spring Boot Backend
  |
  | JDBC / JPA
  v
Aiven MySQL Database
```

The frontend and backend are deployed as separate services.

The backend communicates with the production MySQL database hosted on Aiven.

---

# 6. Using the Live Application

## Step 1 — Open the Application

Open a modern web browser.

Visit:

```text
https://frontend-production-267e4.up.railway.app
```

The application login page will open.

---

# 7. User Registration

To register a new user:

1. Open the application.
2. Select **Register Here**.
3. Enter the required user information.
4. Select the appropriate user role.
5. Submit the registration form.
6. After successful registration, return to the login page.

Use valid information while creating an account.

---

# 8. User Login

To log in:

1. Open the login page.
2. Enter the registered email/username.
3. Enter the password.
4. Click **Sign In**.
5. After successful authentication, the user will be able to access the available features according to their assigned role.

---

# 9. User Roles

The system supports role-based access.

## Admin

Admin users can access administrative and management functionality such as:

* User management
* Client management
* Invoice management
* Payment management
* Other available management modules

## Sales Person / Non-Admin

Sales users have restricted access based on their assigned permissions.

They can use the invoicing-related functionality available to their role.

---

# 10. Client Management

The Client module is used to maintain customer/client information.

Users with appropriate access can:

* Add a new client
* View the client list
* View client details
* Manage client information

### Client API

```text
GET https://mis-invoicing-system-production-c653.up.railway.app/api/v1/clients
```

The API returns the client information stored in the database.

---

# 11. Adding a New Client

To add a client:

1. Open the Client section.
2. Select **Add New Client**.
3. Enter the required client information.
4. Enter organization details if required.
5. Enter GST information if required.
6. Click **Save Client**.
7. The client will be stored in the database.
8. Refreshing the client list should display the newly added client.

---

# 12. Invoice Management

The Invoice module is used to create and manage invoices.

Typical operations include:

* Creating an invoice
* Selecting a client
* Adding invoice items
* Entering invoice information
* Viewing invoices
* Checking invoice status
* Managing invoice information

To create an invoice:

1. Open the Invoice section.
2. Select the required client.
3. Add the required invoice items.
4. Enter the necessary invoice information.
5. Generate/save the invoice.
6. Verify the invoice in the invoice list.

---

# 13. Payment Management

The Payment module is used to record and manage invoice payments.

Typical operations include:

* Recording payments
* Viewing payment information
* Checking payment status
* Updating payment-related information

To process a payment:

1. Open the Payment section.
2. Select the required invoice.
3. Enter the payment information.
4. Submit the payment.
5. Verify the updated payment/invoice status.

---

# 14. Estimates

The Estimate module can be used to manage estimates before generating invoices.

Users with appropriate access can:

* Create estimates
* View estimates
* Manage estimate information

Estimates can be used as a preliminary step before invoice generation.

---

# 15. Other Modules

The application also contains business management modules for:

* Groups
* Chains
* Brands
* Subzones

These modules help organize business and client-related information.

---

# 16. Logout

After completing work:

1. Open the user/account menu if available.
2. Select **Logout**.
3. The current session will be ended.
4. The user can log in again when required.

For security, always log out when using a shared computer.

---

# 17. Local Development Setup

The application can also be run locally for development and testing.

## Backend

Navigate to the backend folder:

```cmd
cd /d "D:\Intership task\IT Vedent\MIS-Invoicing-System\backend"
```

Start the Spring Boot application:

```cmd
mvn spring-boot:run
```

The local backend runs at:

```text
http://localhost:8080
```

---

# 18. Database Configuration for Local Development

The backend uses environment variables for database configuration.

Example:

```text
DB_USERNAME=root
DB_PASSWORD=your_password
DB_URL=jdbc:mysql://localhost:3306/ims_db
```

The actual database username and password should be configured by the developer.

### Important

Never upload:

* Database passwords
* `.env` files
* API keys
* Other sensitive credentials

to GitHub.

---

# 19. Starting the Frontend Locally

Open another Command Prompt window.

Navigate to the frontend folder:

```cmd
cd /d "D:\Intership task\IT Vedent\MIS-Invoicing-System\frontend"
```

Start the frontend server:

```cmd
python -m http.server 5500
```

Open:

```text
http://localhost:5500
```

---

# 20. Local URLs

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

# 21. Production Database

The deployed application uses **Aiven MySQL** as its production database.

Database credentials are stored securely as environment variables in the Railway backend service.

Database passwords are not stored in the GitHub repository.

---

# 22. Testing

The application has been tested in both local and production environments.

### Backend Testing

* Spring Boot startup
* MySQL database connection
* REST API functionality
* Client API
* Invoice functionality
* Payment functionality

### Frontend Testing

* Application loading
* Client creation
* Invoice generation
* Payment processing
* Frontend-to-backend communication
* Data persistence

### Production Testing

The live Railway frontend was tested with the deployed Spring Boot backend.

The following operations were successfully tested:

* Adding clients
* Retrieving clients
* Generating invoices
* Processing payments
* Refreshing the application and verifying stored data

---

# 23. Troubleshooting

## Backend Does Not Start

Check that:

* Java is installed correctly.
* Maven is installed correctly.
* Database configuration is correct.
* Required environment variables are available.
* Port `8080` is not being used by another application.

---

## Frontend Does Not Open Locally

Check that:

* Python is installed.
* The frontend server is running.
* Port `5500` is available.
* The correct URL is being used.

```text
http://localhost:5500
```

---

## Database Connection Error

Check that:

* MySQL is running for local development.
* The database exists.
* Database username is correct.
* Database password is correct.
* `DB_URL` is correct.
* Required environment variables are available.

Do not share database passwords publicly.

---

## Network Error in Live Application

If the live frontend shows a network error:

1. Check the live backend URL.
2. Verify that the backend deployment is running.
3. Check the browser Developer Tools console.
4. Check the Railway deployment logs.
5. Verify that the frontend is using the correct backend API URL.

Live backend:

```text
https://mis-invoicing-system-production-c653.up.railway.app
```

---

# 24. Security Guidelines

Follow these security practices:

* Never share database passwords.
* Never upload `.env` files to GitHub.
* Use environment variables for sensitive configuration.
* Do not commit API keys or secrets.
* Always log out after completing work on a shared computer.
* Use appropriate user roles and permissions.
* Keep production credentials separate from source code.

---

# 25. Support and Troubleshooting Resources

For technical issues, check:

1. Spring Boot backend console.
2. Railway deployment logs.
3. Browser Developer Tools.
4. Database connection status.
5. GitHub repository source code.
6. Project documentation.

---

# 26. Project Documentation

Additional project documentation is available in the `docs` directory.

```text
docs/
└── USER_GUIDE.md
```

The main project README is available in the project root:

```text
README.md
```

---

# 27. Project Repository

GitHub Repository:

```text
https://github.com/manishabhar280/MIS-Invoicing-System-ITVedant
```

---

# 28. Live Application Links

### Frontend

```text
https://frontend-production-267e4.up.railway.app
```

### Backend

```text
https://mis-invoicing-system-production-c653.up.railway.app
```

### Client API

```text
https://mis-invoicing-system-production-c653.up.railway.app/api/v1/clients
```

---

# 29. Project Information

**Project:** MIS Invoicing System

**Organization/Program:** IT Vedant Internship

**Developer:** Manisha Bhardwaj

**Technology:** HTML, CSS, JavaScript, Java Spring Boot, MySQL

**Deployment:** Railway

**Production Database:** Aiven MySQL

**Version Control:** Git & GitHub

**Project Status:** Deployed and Tested
