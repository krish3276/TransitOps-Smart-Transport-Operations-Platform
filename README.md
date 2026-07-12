# TransitOps — Smart Transport Operations Platform 🚌

> **A comprehensive Fleet, Driver, and Trip Management Platform built for an 8-hour Hackathon (Solo Project).**

TransitOps is a full-stack logistics management system designed to streamline fleet operations, automate status transitions, enforce safety and compliance, and provide real-time analytics for transport organizations. 

## 🛠️ Tech Stack

*   **Frontend:** React (Vite), CSS/Tailwind, Recharts, Zustand (State Management)
*   **Backend:** Node.js, Express.js
*   **Database:** MongoDB Atlas, Mongoose
*   **Authentication & Security:** JWT Auth, bcryptjs, Helmet, Express Rate Limit
*   **Other Tools:** Nodemailer, node-cron, jsPDF, Multer

---

## ✨ Features Implemented

The platform strictly implements all 8 core modules required by the specification, alongside several high-impact bonus features.

### Core Modules
1.  **Auth & RBAC:** Secure JWT login with strict Role-Based Access Control enforcing permissions at both the UI routing level and the Backend API level.
2.  **Vehicle Registry:** Full CRUD operations for fleet vehicles, tracking capacity, acquisition costs, and odometer readings.
3.  **Driver Management:** Driver profiles tracking license categories, expiry dates, and real-time safety scores.
4.  **Trip Management (Dispatch):** Intelligent trip creation linking drivers to vehicles with strict capacity validation and atomic state transitions (Draft -> Dispatched -> Completed/Cancelled).
5.  **Maintenance Logging:** Tracking repair costs and shop time to accurately calculate fleet operational expenses.
6.  **Fuel & Expenses:** Logging daily operational expenses (fuel, tolls, etc.) linked to specific trips and vehicles.
7.  **Real-Time Dashboard:** Live KPI cards calculating fleet utilization, active trips, and available resources dynamically.
8.  **Reports & Analytics:** Financial insights, Monthly Revenue charts, Vehicle ROI percentage, and Top Costliest Vehicles analysis.

### Bonus Features
*   **Document Export:** One-click CSV and PDF report generation (`jspdf`).
*   **Automated Email Reminders:** Scheduled cron job tracking drivers with licenses expiring within 7 days. *Note: Configured with a `console.log` interceptor fallback for reliable live demonstration without SMTP dependencies.*
*   **Document Uploads:** Local file attachment storage (`multer`) for Vehicle registration certificates.
*   **Dynamic UI:** Built-in Dark Mode, dynamic data sorting, live search bars, and filter pills.

---

## 🛡️ Business Rules Enforced

The platform is designed to be fool-proof and adheres to strict logistical constraints:
*   **Unique Identities:** Strict uniqueness constraints on Vehicle Registration Numbers and Driver License Numbers.
*   **Dispatch Blocking:** Vehicles with an `In Shop` or `Retired` status are completely hidden from the dispatcher.
*   **Safety Compliance:** Drivers with an expired license or `Suspended` status are hard-blocked from being assigned to any new trips.
*   **Cargo Limits:** The dispatch system aggressively rejects any trip where the `Cargo Weight` exceeds the assigned vehicle's `Max Load Capacity`.
*   **Atomic Transitions:** Trip completion utilizes MongoDB Transactions to simultaneously update the Trip status, free up the Vehicle, free up the Driver, and update the vehicle's odometer without risk of race conditions.
*   **Role Enforcement:** Fleet Managers, Drivers, Safety Officers, and Financial Analysts are restricted to interacting only with data relevant to their specific role.

---

## 🚀 Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd TransitOps-Smart-Transport-Operations-Platform
```

### 2. Install Dependencies
You will need to install packages for both the client and the server.
```bash
# Install Server Dependencies
cd server
npm install

# Install Client Dependencies
cd ../client
npm install
```

### 3. Environment Variables
Create a `.env` file in the `server` directory and configure the following variables (see `.env.example` if provided):
```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

# Optional SMTP for Email Alerts (Will fallback to console.log if empty)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

### 4. Run the Application
Start both the backend server and frontend client simultaneously.
```bash
# In the /server directory
npm run dev

# In the /client directory (in a separate terminal)
npm run dev
```

---

## 🔑 Demo Credentials

The database comes pre-seeded with test accounts mapped to the 4 strict RBAC roles. Evaluators can use the following credentials to test system boundaries:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Fleet Manager (Admin)** | `manager@test.com` | `test1234` |
| **Safety Officer** | `safety@test.com` | `test1234` |
| **Financial Analyst** | `finance@test.com` | `test1234` |
| **Driver** | `driver@test.com` | `test1234` |

*(An additional super-admin account `admin@transitops.com` with password `admin1234` is also available).*

---

## 📁 Project Structure

A clean, modern separation of concerns utilizing the MERN stack.

```
TransitOps/
├── client/                 # React Frontend (Vite)
│   ├── src/
│   │   ├── components/     # Reusable UI elements (Layout, Modals)
│   │   ├── context/        # Zustand global state (AuthStore)
│   │   ├── pages/          # Primary route views (Dashboard, Vehicles, etc.)
│   │   ├── services/       # Axios API interceptors
│   │   └── styles/         # Global CSS variables and component styles
│   └── package.json
│
└── server/                 # Node/Express Backend
    ├── config/             # DB connection logic
    ├── controllers/        # Core business logic and route handlers
    ├── jobs/               # Background tasks (node-cron)
    ├── middleware/         # Auth, RBAC, Error handling, Multer config
    ├── models/             # Mongoose schemas (Vehicle, Driver, Trip, etc.)
    ├── routes/             # API endpoint definitions
    ├── utils/              # Helper functions (emailService)
    ├── uploads/            # Local document storage directory
    └── package.json
```

---

## ⚠️ Known Limitations
*   **Advanced Document Management:** While local file upload via `multer` was implemented as a bonus for vehicle documents, integration with highly scalable cloud storage (like AWS S3) was omitted due to time constraints.