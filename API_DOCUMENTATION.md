# GreenGrid — REST API Documentation

Comprehensive reference documentation for the **GreenGrid** smart energy monitoring, billing, and facility management backend REST API.

---

## Base URL & Authentication

- **Development Base URL**: `http://localhost:5000/api`
- **Production Base URL**: `https://<deployed-domain>/api`
- **Authentication**: JWT stored in HTTP-only `token` cookie or Bearer header (`Authorization: Bearer <jwt_token>`).
- **Response Format**: All responses return standardized JSON payloads:
  ```json
  {
    "success": true,
    "data": { ... },
    "message": "Optional status message"
  }
  ```

---

## User Roles (RBAC Matrix)

| Role Code | Description | Allowed Scope |
| :--- | :--- | :--- |
| `PLATFORM_ADMIN` | Global super administrator | Full system access across all organizations |
| `FACILITY_MANAGER` | Multi-tenant organization manager | Scoped to assigned organization buildings & units |
| `FINANCE_OFFICER` | Financial & Billing auditor | Invoices, payments, financial ledger, billing calculations |
| `UNIT_USER` | Resident / Tenant | Scoped to own unit readings, invoices, tickets |
| `TECHNICIAN` | Field engineer | Assigned maintenance requests and meter diagnostics |

---

## 1. System Health & Authentication

### `GET /api`
- **Auth**: Public
- **Description**: Verifies backend server health and uptime.
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "GreenGrid API is operational",
    "timestamp": "2026-09-24T12:00:00.000Z"
  }
  ```

### `POST /api/auth/register`
- **Auth**: Public (Rate-limited)
- **Body**:
  ```json
  {
    "name": "Alex Doe",
    "email": "alex@example.com",
    "password": "Password123!",
    "role": "UNIT_USER",
    "organization": "651f8a7e9b1d2c3a4f5e6d7c"
  }
  ```
- **Response**: `201 Created`

### `POST /api/auth/login`
- **Auth**: Public (Rate-limited)
- **Body**:
  ```json
  {
    "email": "alex@example.com",
    "password": "Password123!"
  }
  ```
- **Response**: `200 OK` (Sets HTTP-only JWT cookie)

### `POST /api/auth/logout`
- **Auth**: Authenticated
- **Response**: `200 OK` (Clears JWT cookie)

### `GET /api/auth/me`
- **Auth**: Authenticated
- **Description**: Returns authenticated user profile.
- **Response**: `200 OK`

### `POST /api/auth/forgot-password`
- **Auth**: Public (Rate-limited)
- **Body**:
  ```json
  {
    "email": "alex@example.com"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "If an account exists for this email, a password reset link has been sent."
  }
  ```

### `POST /api/auth/reset-password/:token`
- **Auth**: Public (Single-use SHA256 hashed token with 1-hour expiration)
- **Body**:
  ```json
  {
    "password": "NewSecurePassword123!",
    "confirmPassword": "NewSecurePassword123!"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Password reset successful. You can now log in with your new password."
  }
  ```

---

## 2. Organization, Building & Unit Management

### `GET /api/organizations` | `POST /api/organizations`
- **Auth**: `PLATFORM_ADMIN`
- **Description**: List or create organizations.

### `GET /api/buildings` | `POST /api/buildings`
- **Auth**: `PLATFORM_ADMIN`, `FACILITY_MANAGER`
- **Query Params**: `?organization=<orgId>`
- **Description**: List or create buildings.

### `GET /api/units` | `POST /api/units`
- **Auth**: `PLATFORM_ADMIN`, `FACILITY_MANAGER`
- **Query Params**: `?building=<buildingId>&organization=<orgId>`
- **Description**: List or create residential/commercial units.

---

## 3. Meter & Meter Reading Management

### `GET /api/meters` | `POST /api/meters`
- **Auth**: `PLATFORM_ADMIN`, `FACILITY_MANAGER`
- **Description**: List or register smart energy meters.

### `GET /api/readings` | `POST /api/readings`
- **Auth**: `PLATFORM_ADMIN`, `FACILITY_MANAGER`, `TECHNICIAN`
- **Body (`POST`)**:
  ```json
  {
    "meter": "651f8a7e9b1d2c3a4f5e6d8a",
    "readingValue": 1250.5,
    "readingDate": "2026-09-24T10:00:00.000Z",
    "source": "MANUAL_ENTRY"
  }
  ```
- **Response**: `201 Created`

### `GET /api/readings/consumption/:meterId`
- **Auth**: `PLATFORM_ADMIN`, `FACILITY_MANAGER`, `UNIT_USER` (Scoped to own meter)
- **Description**: Computes consumption delta between consecutive readings.

---

## 4. Tariffs & Billing Engine

### `GET /api/tariffs` | `POST /api/tariffs`
- **Auth**: `PLATFORM_ADMIN`, `FACILITY_MANAGER`, `FINANCE_OFFICER`
- **Description**: Manage progressive slab tariffs.

### `POST /api/billing/calculate`
- **Auth**: `PLATFORM_ADMIN`, `FACILITY_MANAGER`, `FINANCE_OFFICER`, `UNIT_USER`
- **Body**:
  ```json
  {
    "consumptionUnits": 250,
    "tariffId": "651f8a7e9b1d2c3a4f5e6d9b"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "consumptionUnits": 250,
      "breakdown": [
        { "slab": "0 - 100", "units": 100, "rate": 3, "cost": 300 },
        { "slab": "101 - 200", "units": 100, "rate": 5, "cost": 500 },
        { "slab": "201+", "units": 50, "rate": 7, "cost": 350 }
      ],
      "energyCharges": 1150,
      "fixedCharge": 100,
      "subtotal": 1250,
      "taxRate": 18,
      "taxAmount": 225,
      "totalAmount": 1475
    }
  }
  ```

---

## 5. Invoices & Payments

### `GET /api/invoices` | `POST /api/invoices/generate`
- **Auth**: `PLATFORM_ADMIN`, `FACILITY_MANAGER`, `FINANCE_OFFICER`, `UNIT_USER` (Read-only own)
- **Description**: Query invoice list or trigger billing invoice generation.
- **Idempotency**: Prevent duplicate invoices for identical unit & billing period.

### `GET /api/payments` | `POST /api/payments`
- **Auth**: `PLATFORM_ADMIN`, `FACILITY_MANAGER`, `FINANCE_OFFICER`, `UNIT_USER`
- **Body (`POST`)**:
  ```json
  {
    "invoice": "651f8a7e9b1d2c3a4f5e6e11",
    "amount": 1475,
    "paymentMethod": "CARD",
    "transactionId": "TXN_99281726"
  }
  ```
- **Response**: `201 Created` (Automatically marks invoice `PAID` upon total settlement)

---

## 6. Maintenance Management

### `GET /api/maintenance` | `POST /api/maintenance`
- **Auth**: All authenticated roles
- **Body (`POST`)**:
  ```json
  {
    "title": "High voltage fluctuation in circuit breaker",
    "description": "Flickering lights observed in living area",
    "priority": "HIGH",
    "unit": "651f8a7e9b1d2c3a4f5e6d7c"
  }
  ```
- **Response**: `201 Created` (Default status: `OPEN`)

### `PUT /api/maintenance/:id/assign`
- **Auth**: `PLATFORM_ADMIN`, `FACILITY_MANAGER`
- **Body**: `{ "technicianId": "651f8a7e9b1d2c3a4f5e6d99" }` (Transitions to `ASSIGNED`)

### `PUT /api/maintenance/:id/status`
- **Auth**: `PLATFORM_ADMIN`, `FACILITY_MANAGER`, `TECHNICIAN`
- **Body**: `{ "status": "IN_PROGRESS" | "RESOLVED" | "CLOSED", "notes": "Replaced fuse switch" }`

---

## 7. Role-Based Dashboards

- `GET /api/dashboard/admin` — Global organization counts, system power load, revenue overview.
- `GET /api/dashboard/manager` — Building-level meter occupancy, active tickets, pending billing.
- `GET /api/dashboard/resident` — Current unit consumption, latest invoice, unresolved tickets.
- `GET /api/dashboard/technician` — Open dispatches, completed jobs, active diagnostic tasks.
- `GET /api/dashboard/finance` — Invoiced vs collected amounts, overdue balance, payment methods.

---

## 8. Analytics & Reports (Phase 11)

### `GET /api/analytics/energy`
- **Auth**: Admin, Manager, Finance, Resident (scoped)
- **Query Params**: `?from=YYYY-MM-DD&to=YYYY-MM-DD&building=<id>`
- **Description**: Aggregates daily and monthly kWh consumption time-series.

### `GET /api/analytics/revenue`
- **Auth**: Admin, Manager, Finance (Technician: 403 Forbidden)
- **Description**: Aggregates billed revenue, collected payments, and unpaid arrears.

### `GET /api/analytics/maintenance`
- **Auth**: Admin, Manager, Technician
- **Description**: Ticket status breakdown (`OPEN`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`).

### `GET /api/analytics/buildings`
- **Auth**: Admin, Manager, Finance
- **Description**: Comparative consumption, unit occupancy, and revenue per building.

### `GET /api/analytics/export`
- **Auth**: Admin, Manager, Finance
- **Query Params**: `?type=energy|revenue|invoices`
- **Description**: Exports real database query results as downloadable CSV.

---

## 9. Notifications (Phase 12)

### `GET /api/notifications`
- **Auth**: Authenticated (Returns caller's notifications)

### `GET /api/notifications/unread`
- **Auth**: Authenticated (Returns `{ count: N }`)

### `PUT /api/notifications/:id/read` | `PUT /api/notifications/read-all`
- **Auth**: Authenticated (Marks notification read)

---

## 10. Audit Trail (Phase 13)

### `GET /api/audit`
- **Auth**: `PLATFORM_ADMIN` (Non-admin receives `403 Forbidden`)
- **Query Params**: `?action=<action>&entityType=<type>&limit=50`
- **Description**: Returns immutable chronological audit records of administrative, financial, and security actions.
