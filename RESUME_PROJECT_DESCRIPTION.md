# GreenGrid — Resume Project Description

### Project Title
**GreenGrid — Smart Energy Monitoring & Facility Management Platform**

### One-Line Description
A full-stack multi-tenant MERN platform for real-time smart meter energy telemetry, automated progressive slab utility billing, maintenance ticketing, and financial analytics.

### Technology Stack
- **Frontend**: React 18, Vite, React Router 6, Recharts, Lucide Icons, Vanilla CSS Design System
- **Backend**: Node.js, Express.js, JWT (HTTP-only cookies), Node-Cron, Nodemailer
- **Database**: MongoDB Atlas, Mongoose ODM
- **Testing & Security**: Custom Automated Test Suite, Express Rate Limiting, RBAC Middleware, Immutable Audit Trail

---

### Resume Bullet Points (Ready to Copy)

#### Option A: Full-Stack Developer Focus
- **Architected and developed GreenGrid**, a scalable multi-tenant SaaS energy monitoring and utility billing platform using React 18, Node.js, Express, and MongoDB Atlas.
- **Engineered a deterministic progressive tiered billing engine** supporting customizable rate slabs, fixed charges, and tax calculations, eliminating manual utility computation errors.
- **Implemented fine-grained Role-Based Access Control (RBAC)** across 5 distinct user roles with HTTP-only JWT authentication, multi-tenant resource isolation, and immutable audit logging.
- **Developed real-time analytics and reporting dashboards** featuring Recharts visualizations for power consumption trends, revenue reconciliation, and CSV export capabilities.
- **Built an automated background scheduler** with node-cron for idempotent periodic billing cycles, payment due reminders, and maintenance alert notifications.

#### Option B: Backend & Cloud Focus
- **Built a high-performance RESTful API in Express and Node.js** backed by MongoDB Atlas, serving sub-meter telemetry, billing calculations, and maintenance ticket lifecycles.
- **Designed an idempotent utility billing system** that automatically calculates consumption deltas from consecutive meter readings and generates itemized invoices with duplicate prevention.
- **Hardened application security** by implementing central error handling, Express rate limiting, strict CORS whitelisting, and tamper-proof audit trails for all sensitive operations.
- **Implemented a full automated test suite (46+ assertions)** validating data integrity, mathematical calculation accuracy (250 kWh slab verification), and cross-tenant access denial.

#### Option C: Concise 3-Bullet Summary
- **GreenGrid (Full-Stack Energy SaaS Platform)**: Developed a MERN application for smart meter tracking, progressive slab tariff billing, and facility maintenance management.
- **Billing Engine & Analytics**: Engineered a tiered tariff calculation engine with 100% mathematical accuracy, automated invoice generation, and Recharts financial analytics.
- **Security & RBAC**: Implemented 5-tier role-based access control with HTTP-only cookies, tenant data isolation, rate limiting, and immutable audit logging.
