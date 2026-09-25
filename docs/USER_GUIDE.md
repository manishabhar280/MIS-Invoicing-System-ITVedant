\# MIS Invoicing System — User Guide



\## 1. Introduction



The MIS Invoicing System is a web-based application developed for managing users, clients, invoices, estimates, payments, and other business information.



This guide explains how an end user can run and use the system.



\---



\## 2. System Requirements



The following software is required:



\* Windows operating system

\* Java JDK

\* Maven

\* MySQL

\* Python

\* Modern web browser such as Google Chrome or Microsoft Edge



\---



\## 3. Starting the System



The application has two parts:



1\. Backend — Spring Boot

2\. Frontend — HTML, CSS and JavaScript



Both the backend and frontend must be running to use the complete application.



\---



\## 4. Starting the Backend



Open Command Prompt and navigate to the backend folder.



Run:



```cmd

cd /d "D:\\Intership task\\IT Vedent\\MIS-Invoicing-System\\backend"

```



Start the Spring Boot application:



```cmd

mvn spring-boot:run

```



After successful startup, the backend will be available at:



```text

http://localhost:8080

```



\---



\## 5. Starting the Frontend



Open another Command Prompt window.



Navigate to the frontend folder:



```cmd

cd /d "D:\\Intership task\\IT Vedent\\MIS-Invoicing-System\\frontend"

```



Start the frontend server:



```cmd

python -m http.server 5500

```



Open the application in a web browser:



```text

http://localhost:5500

```



\---



\## 6. User Registration



1\. Open the application in the browser.

2\. On the login page, select \*\*Register Here\*\*.

3\. Enter the required user information.

4\. Select the appropriate user role.

5\. Submit the registration form.

6\. After successful registration, return to the login page.



\---



\## 7. User Login



1\. Open the login page.

2\. Enter the registered email/username.

3\. Enter the password.

4\. Click \*\*Sign In\*\*.

5\. After successful authentication, the user can access the available features according to their role.



\---



\## 8. User Roles



The system supports role-based access.



\### Admin



Admin users can manage administrative functions such as:



\* Users

\* Clients

\* Invoices

\* Payments

\* Other available management modules



\### Sales Person / Non-Admin



Sales users have restricted access based on their assigned permissions and can use the invoicing-related functionality provided to them.



\---



\## 9. Client Management



The client module is used to maintain customer/client information.



Users with appropriate access can:



\* Add a new client

\* View the client list

\* View client details

\* Manage client information



The client REST API is:



```text

http://localhost:8080/api/v1/clients

```



\---



\## 10. Invoice Management



The invoice module is used to create and manage invoices.



Typical operations include:



\* Creating an invoice

\* Adding invoice items

\* Viewing invoices

\* Checking invoice status

\* Managing invoice information



\---



\## 11. Payment Management



The payment module is used to record and manage invoice payments.



Typical operations include:



\* Recording payments

\* Viewing payment information

\* Checking payment status

\* Updating payment-related information



\---



\## 12. Estimates



The estimate module can be used to manage estimates before generating invoices.



Users can create and manage estimate information according to their assigned access.



\---



\## 13. Other Modules



The system also contains business management modules for:



\* Groups

\* Chains

\* Brands

\* Subzones



These modules help organize business and client-related information.



\---



\## 14. Logout



After completing work:



1\. Open the user/account menu if available.

2\. Select \*\*Logout\*\*.

3\. The current session will be ended.

4\. The user can log in again when required.



\---



\## 15. Troubleshooting



\### Backend does not start



Check that:



\* Java is installed correctly.

\* Maven is installed correctly.

\* MySQL is running.

\* Database credentials are correctly configured.

\* Port `8080` is not being used by another application.



\### Frontend does not open



Check that:



\* Python is installed.

\* The frontend server is running.

\* Port `5500` is available.

\* The correct URL is being used:



```text

http://localhost:5500

```



\### Database connection error



Check that:



\* MySQL server is running.

\* Database `ims\_db` exists.

\* Database username and password are correctly configured.

\* Environment variables are available to the backend.



Do not share database passwords publicly.



\---



\## 16. Important URLs



\### Frontend



```text

http://localhost:5500

```



\### Backend



```text

http://localhost:8080

```



\### Client API



```text

http://localhost:8080/api/v1/clients

```



\---



\## 17. Security Guidelines



\* Never share database passwords.

\* Never upload `.env` files to GitHub.

\* Use environment variables for sensitive configuration.

\* Always log out after completing work on a shared computer.

\* Use appropriate user roles and permissions.



\---



\## 18. Support



For project-related technical issues, check:



1\. Backend console for Spring Boot errors.

2\. Browser Developer Tools for frontend errors.

3\. MySQL server status.

4\. GitHub repository source code and documentation.



\---



\## 19. Project Repository



GitHub Repository:



```text

https://github.com/manishabhar280/MIS-Invoicing-System-ITVedant

```



\---



\## 20. Project Information



\*\*Project:\*\* MIS Invoicing System



\*\*Organization/Program:\*\* IT Vedant Internship



\*\*Developer:\*\* Manisha Bhardwaj



\*\*Technology:\*\* HTML, CSS, JavaScript, Java Spring Boot, MySQL



