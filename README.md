\# MIS Invoicing System



A web-based \*\*Management Information System (MIS) \& Invoice Generation System\*\* developed as part of the IT Vedant internship project.



\## Project Overview



The MIS Invoicing System is designed to help organizations manage clients, invoices, payments, users, and other business-related information through a centralized system.



The project follows a frontend-backend architecture with:



\* Frontend: HTML, CSS, JavaScript

\* Backend: Java Spring Boot

\* Database: MySQL

\* API: REST APIs

\* Build Tool: Maven



\## Main Features



\### User Management



\* User registration

\* User login

\* Role-based access

\* Admin and Sales Person roles

\* Active/Inactive user status

\* Session and logout functionality



\### Client Management



\* Add clients

\* View client list

\* View client details

\* Manage client information



\### Invoice Management



\* Create invoices

\* Manage invoice items

\* View invoices

\* Track invoice status



\### Payment Management



\* Record payments

\* View payment information

\* Track payment status



\### Other Modules



\* Groups

\* Chains

\* Brands

\* Subzones

\* Estimates



\## Technology Stack



| Layer           | Technology            |

| --------------- | --------------------- |

| Frontend        | HTML, CSS, JavaScript |

| Backend         | Java, Spring Boot     |

| Database        | MySQL                 |

| API             | REST API              |

| Build Tool      | Maven                 |

| IDE             | Visual Studio Code    |

| Version Control | Git \& GitHub          |



\## Project Structure



```text

MIS-Invoicing-System/

│

├── backend/

│   ├── src/

│   ├── pom.xml

│   └── ...

│

├── frontend/

│   ├── index.html

│   ├── css/

│   ├── js/

│   └── ...

│

├── database/

│   └── ...

│

├── docs/

│   └── ...

│

├── .gitignore

└── README.md

```



\## Backend Setup



\### Requirements



Install the following software before running the project:



\* Java JDK

\* Maven

\* MySQL

\* Git



\### Database Setup



Create the MySQL database:



```sql

CREATE DATABASE ims\_db;

```



Configure the database credentials using environment variables.



Example:



```text

DB\_USERNAME=root

DB\_PASSWORD=your\_password

```



Do not upload `.env` files or database passwords to GitHub.



\### Run Backend



Open Command Prompt inside the `backend` folder and run:



```cmd

mvn spring-boot:run

```



The backend runs on:



```text

http://localhost:8080

```



\## Frontend Setup



Open Command Prompt inside the `frontend` folder and run:



```cmd

python -m http.server 5500

```



Then open:



```text

http://localhost:5500

```



\## API Examples



\### Client API



Get all clients:



```text

GET /api/v1/clients

```



Get a client by ID:



```text

GET /api/v1/clients/{id}

```



Create a client:



```text

POST /api/v1/clients

```



\## Security



Sensitive configuration such as database credentials is stored using environment variables.



The `.gitignore` file prevents sensitive `.env` files and build-related files from being committed to the repository.



\## Testing



The following functionality has been tested locally:



\* Backend startup

\* MySQL database connection

\* Client API

\* User registration

\* User login

\* Frontend and backend communication



\## Local URLs



Frontend:



```text

http://localhost:5500

```



Backend:



```text

http://localhost:8080

```



Client API:



```text

http://localhost:8080/api/v1/clients

```



\## Internship Project



This project is developed as part of the \*\*IT Vedant Internship Program\*\*.



\## Developer



\*\*Manisha Bhardwaj\*\*



BTech Computer Science and Engineering



\## Repository



GitHub Repository:



https://github.com/manishabhar280/MIS-Invoicing-System-ITVedant



