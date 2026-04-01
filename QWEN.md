# Project Kel 5 - Context Documentation

## Project Overview

**Project Kel 5** is a personal finance management web application built with **Node.js** and **Express.js**. It allows users to track their income and expenses, view financial reports, and manage their budget. The application includes an admin dashboard for user and transaction management.

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Runtime** | Node.js |
| **Framework** | Express.js 4.16.x |
| **View Engine** | EJS 2.6.x |
| **Database** | MySQL (via mysql2 3.16.3) |
| **Authentication** | bcrypt 6.0.0 + express-session |
| **Middleware** | cookie-parser, morgan, http-errors |

---

## Project Structure

```
ProjectKel5/
├── bin/
│   └── www              # Application entry point
├── config/
│   └── database.js      # MySQL connection configuration
├── public/
│   ├── css/             # Static CSS files
│   ├── images/          # Static images
│   └── javascripts/     # Client-side JS
├── routes/
│   ├── index.js         # Dashboard routing (protected)
│   ├── auth.js          # Login/Register/Logout
│   ├── admin.js         # Admin dashboard (role-based)
│   ├── transactions.js  # Transaction CRUD
│   ├── reports.js       # Financial reports
│   ├── dashboard.js     # Dashboard page
│   └── users.js         # User routes
├── views/
│   ├── landing.ejs      # Landing page
│   ├── about.ejs        # About Us page
│   ├── login.ejs        # Login form
│   ├── register.ejs     # Registration form
│   ├── dashboard.ejs    # User dashboard
│   ├── admin.ejs        # Admin dashboard
│   ├── transactions.ejs # Transaction list
│   ├── budget.ejs       # Budget page
│   ├── reports.ejs      # Financial reports
│   └── error.ejs        # Error page
├── app.js               # Main application configuration
└── package.json
```

---

## Database Schema

### Database Name
`projectkel5`

### Tables

#### `users`
| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Auto-increment user ID |
| `nama` | VARCHAR | User's full name |
| `email` | VARCHAR | User's email (must be @gmail.com) |
| `password` | VARCHAR | Bcrypt-hashed password |
| `role` | VARCHAR | User role: `'user'` or `'admin'` |

#### `transactions`
| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Auto-increment transaction ID |
| `user_id` | INT (FK) | References `users.id` |
| `type` | VARCHAR | `'income'` or `'expense'` |
| `category` | VARCHAR | Transaction category |
| `description` | TEXT | Transaction description |
| `amount` | DECIMAL | Transaction amount |
| `date` | DATETIME | Transaction date |

---



### Public Routes
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/` | Landing page |
| GET | `/about` | About Us page |
| GET | `/auth/login` | Login page |
| GET | `/auth/register` | Registration page |
| POST | `/auth/register` | Process registration |
| POST | `/auth/login` | Process login |
| GET | `/auth/logout` | Logout user |

### Protected Routes (Require Authentication)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/dashboard` | User dashboard |
| GET | `/budget` | Budget management |
| GET | `/transactions` | View transactions |
| POST | `/transactions/add` | Add new transaction |
| GET | `/reports` | Financial reports |

### Admin Routes (Require Admin Role)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin` | Admin dashboard with stats |

---

## Authentication & Authorization

### Session Configuration
```javascript
{
  secret: 'cekuangku_secret',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 } // 1 hour
}
```

### Password Requirements
- Passwords are hashed using **bcrypt** with salt rounds of 10
- Email must end with `@gmail.com`
- All fields (nama, email, password) are required

### Role-Based Access
- **user**: Can access dashboard, transactions, budget, reports
- **admin**: Can access admin dashboard with statistics
- Auto-login after successful registration

---

## Key Features

1. **User Authentication**
   - Registration with email validation (@gmail.com only)
   - Secure password hashing with bcrypt
   - Session-based authentication (1-hour expiry)

2. **Transaction Management**
   - Add income/expense transactions
   - Categorize transactions
   - View transaction history

3. **Financial Reports**
   - View financial summaries
   - Track income vs expenses

4. **Admin Dashboard**
   - Total user count
   - Total transaction count
   - Total balance calculation (income - expense)

---

## Running the Application

### Prerequisites
- Node.js installed
- MySQL server running
- Database `projectkel5` created with required tables

### Installation
```bash
npm install
```

### Start Server
```bash
npm start
```
Application runs on: `http://localhost:3000` (default Express port)

---

## Database Configuration

Edit `config/database.js` if needed:
```javascript
{
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'projectkel5'
}
```

---

## Development Notes

- **View Engine**: EJS templates with layout in `views/`
- **Static Files**: Served from `public/` directory
- **Error Handling**: 404 and 500 error pages configured
- **Logging**: Morgan logger in development mode
- **404 Handler**: Catches undefined routes
- **Error Handler**: Renders error.ejs with error details

---

## Coding Conventions

- **Route Pattern**: Express Router in separate files under `routes/`
- **Middleware**: Custom middleware for authentication (`cekLogin`) and authorization (`cekAdmin`)
- **Database Queries**: Callback-based mysql2 queries
- **Session Access**: `req.session.user` contains authenticated user data
- **View Data**: Always pass `user` object to views for UI personalization

---

## Security Considerations

- Passwords are hashed before storage
- Session-based authentication protects routes
- Role-based access control for admin features
- SQL injection prevention via parameterized queries (`?` placeholders)
- Cookie parser enabled for session management

---

## Known Limitations

- Email validation only checks for `@gmail.com` suffix
- Session stored in memory (not persistent across restarts)
- No CSRF protection configured
- No input sanitization beyond trimming whitespace
- Database connection not using connection pooling

---

## File: `app.js` - Routing Summary

```
/ → Landing Page
/about → About Page
/budget → Budget Page (protected)
/admin → Admin Dashboard (admin only)
/auth/* → Authentication routes
/dashboard/* → User Dashboard (protected)
/transactions/* → Transaction management (protected)
/reports/* → Financial reports (protected)
```
