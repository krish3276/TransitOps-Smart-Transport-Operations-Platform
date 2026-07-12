# 🚌 TransitOps — Smart Fleet Management Platform

A full-stack **MERN** application for managing transit fleets — vehicles, drivers, routes, trips, and maintenance.

---

## Tech Stack

| Layer     | Technology                                  |
|-----------|---------------------------------------------|
| Frontend  | React 19 + Vite, React Router v6, Zustand   |
| Backend   | Node.js + Express 4, express-async-errors   |
| Database  | MongoDB + Mongoose 8                        |
| Auth      | JWT (jsonwebtoken) + bcryptjs               |
| HTTP      | Axios + TanStack React Query                |
| Charts    | Recharts                                    |
| Icons     | Lucide React                                |
| Toasts    | react-hot-toast                             |

---

## Project Structure

```
TransitOps-Smart-Transport-Operations-Platform/
├── client/                      # React (Vite) frontend
│   ├── src/
│   │   ├── assets/              # Static assets
│   │   ├── components/
│   │   │   ├── common/          # Reusable UI components
│   │   │   └── layout/          # Layout (Sidebar, Header)
│   │   ├── context/             # Zustand stores
│   │   ├── hooks/               # Custom React hooks
│   │   ├── pages/               # Route-level pages
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Vehicles.jsx
│   │   │   ├── Drivers.jsx
│   │   │   ├── Routes.jsx
│   │   │   ├── Trips.jsx
│   │   │   ├── Maintenance.jsx
│   │   │   ├── Login.jsx
│   │   │   └── NotFound.jsx
│   │   ├── services/            # Axios instance & API calls
│   │   ├── utils/               # Frontend helpers
│   │   ├── App.jsx              # Root router + providers
│   │   └── main.jsx             # ReactDOM.createRoot
│   ├── .env.example
│   ├── vite.config.js
│   └── package.json
│
├── server/                      # Express + MongoDB backend
│   ├── config/
│   │   └── db.js                # Mongoose connection
│   ├── controllers/
│   │   ├── authController.js
│   │   └── vehicleController.js
│   ├── middleware/
│   │   ├── authMiddleware.js    # JWT protect + authorize
│   │   └── errorMiddleware.js  # Global error handler
│   ├── models/
│   │   ├── User.js
│   │   ├── Vehicle.js
│   │   ├── Driver.js
│   │   ├── Route.js
│   │   ├── Trip.js
│   │   └── Maintenance.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── vehicleRoutes.js
│   │   ├── driverRoutes.js
│   │   ├── routeRoutes.js
│   │   ├── tripRoutes.js
│   │   └── maintenanceRoutes.js
│   ├── services/                # Business logic layer
│   ├── utils/
│   │   └── helpers.js           # generateToken, generateTripId, paginate
│   ├── .env.example
│   ├── index.js                 # Express entry point
│   └── package.json
│
├── package.json                 # Root: `npm run dev` starts both
└── .gitignore
```

---

## Getting Started

### 1. Clone & install

```bash
git clone <repo-url>
cd TransitOps-Smart-Transport-Operations-Platform

# Install all dependencies at once
npm run install:all
```

### 2. Configure environment

```bash
# Server
cp server/.env.example server/.env
# Edit MONGO_URI and JWT_SECRET

# Client
cp client/.env.example client/.env
```

### 3. Start development servers

```bash
npm run dev          # Runs both concurrently
# OR individually:
npm run start:server # Express on :5000
npm run start:client # Vite on :5173
```

---

## API Endpoints

| Method | Endpoint                  | Description              | Auth |
|--------|---------------------------|--------------------------|------|
| POST   | `/api/auth/register`      | Register user            | No   |
| POST   | `/api/auth/login`         | Login                    | No   |
| GET    | `/api/auth/me`            | Current user profile     | Yes  |
| GET    | `/api/vehicles`           | List vehicles            | Yes  |
| POST   | `/api/vehicles`           | Create vehicle           | Admin/Dispatcher |
| GET    | `/api/vehicles/stats`     | Fleet status summary     | Yes  |
| GET    | `/api/drivers`            | List drivers             | Yes  |
| GET    | `/api/routes`             | List routes              | Yes  |
| GET    | `/api/trips`              | List trips               | Yes  |
| POST   | `/api/trips`              | Dispatch a trip          | Admin/Dispatcher |
| GET    | `/api/maintenance`        | Maintenance records      | Yes  |
| GET    | `/api/health`             | Health check             | No   |

---

## User Roles

| Role         | Permissions                          |
|--------------|--------------------------------------|
| `admin`      | Full CRUD on all resources           |
| `dispatcher` | Create/edit vehicles, drivers, trips |
| `driver`     | Read-only + report maintenance       |
| `viewer`     | Read-only access                     |