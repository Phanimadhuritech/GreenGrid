# GreenGrid — Project Presentation & Viva Defense Guide

**Project Title**: GreenGrid — Smart Energy Monitoring & Facility Management Platform  
**Architecture**: MERN Stack (MongoDB, Express, React, Node.js) with Progressive Tiered Billing Engine  

---

## Slide 1: Title & Executive Summary
- **Title**: GreenGrid — Enterprise Smart Energy & Facility Management
- **Presenter**: Project Team
- **One-Line Pitch**: A multi-tenant SaaS platform delivering end-to-end electrical consumption telemetry, automated progressive slab billing, maintenance lifecycle tracking, and financial analytics.

---

## Slide 2: Problem Statement & Industry Need
- **Sub-metering Gaps**: In residential communities and commercial complexes, power billing is often based on rough floor-area approximations rather than actual sub-meter telemetry.
- **Manual Billing Errors**: Calculating progressive tiered tariffs manually leads to mathematical discrepancies, delayed invoicing, and reconciliation issues.
- **Disjointed Facility Ops**: Resident utility issues, meter faults, and maintenance requests are managed across disparate channels with zero accountability.
- **Lack of Visibility**: Managers lack real-time visibility into peak energy demand, uncollected receivables, and meter health.

---

## Slide 3: Proposed Solution — GreenGrid
- **Automated Telemetry**: Direct ingestion of smart meter delta readings with consumption indexing.
- **Deterministic Billing Engine**: Mathematical tiered billing engine supporting progressive slabs, fixed demand charges, and statutory tax calculations.
- **Role-Based Isolation**: Strict multi-tenant RBAC segregating Platform Admins, Facility Managers, Finance Officers, Technicians, and Residents.
- **Integrated Operations**: End-to-end maintenance ticketing, automated payment settlement, and real-time notification alerts.

---

## Slide 4: System Architecture
```text
┌────────────────────────────────────────────────────────┐
│                   React 18 + Vite SPA                  │
│       (Tailored Green Theme, Recharts, Context API)    │
└───────────────────────────┬────────────────────────────┘
                            │ REST / JSON (HTTP-Only JWT)
┌───────────────────────────▼────────────────────────────┐
│                  Express.js API Gateway                │
│    ├─ RBAC / Auth Guard      ├─ Rate Limiting          │
│    ├─ Centralized Errors     ├─ Audit Logger           │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Business Services                   │
│   ├─ Billing Engine         ├─ Analytics Service       │
│   ├─ Notification Dispatcher├─ Scheduled Billing Jobs  │
└───────────────────────────┬────────────────────────────┘
                            │ Mongoose ODM
┌───────────────────────────▼────────────────────────────┐
│                      MongoDB Atlas                     │
│  (Indexed Organizations, Units, Readings, Ledger)      │
└────────────────────────────────────────────────────────┘
```

---

## Slide 5: User Roles & Permissions
1. **Platform Admin**: Global tenant governance, system-wide power load, immutable audit trail.
2. **Facility Manager**: Multi-building oversight, meter registration, technician dispatching.
3. **Finance Officer**: Tariff configuration, invoice auditing, payment ledger reconciliation.
4. **Technician**: Ticket triage, maintenance status updates, meter fault diagnostics.
5. **Resident (Unit User)**: Consumption telemetry, invoice history, payment settlement, maintenance booking.

---

## Slide 6: The Tiered Billing Engine in Depth
- **Formula**: $Total = \sum (\text{Tier Units} \times \text{Tier Rate}) + \text{Fixed Charge} + \text{Tax}$
- **Standard Verification Example**:
  - Consumption: **250 kWh**
  - Slabs: 0–100 @ ₹3.00, 101–200 @ ₹5.00, 201+ @ ₹7.00
  - Fixed Charge: ₹100.00 | Tax: 18%
  - Calculation:
    - Tier 1: $100 \times 3 = ₹300$
    - Tier 2: $100 \times 5 = ₹500$
    - Tier 3: $50 \times 7 = ₹350$
    - Energy Charges: $₹1,150$ | Subtotal: $₹1,250$ | Tax (18%): $₹225$
    - **Total Invoiced**: **₹1,475.00**

---

## Slide 7: Maintenance Lifecycle & Workflows
```text
[ Resident Creates Ticket ]
            │ (Status: OPEN)
            ▼
[ Facility Manager Assigns ]
            │ (Status: ASSIGNED)
            ▼
[ Technician Begins Work ]
            │ (Status: IN_PROGRESS)
            ▼
[ Technician Completes & Notes ]
            │ (Status: RESOLVED)
            ▼
[ Resident / Manager Closes ]
            │ (Status: CLOSED)
```

---

## Slide 8: Security & Reliability Engineering
- **HTTP-Only Cookies**: Total protection against Cross-Site Scripting (XSS) token exfiltration.
- **Resource Isolation**: Zero cross-tenant or cross-unit data leakage enforced at controller query level.
- **Immutable Audit Logging**: Every administrative action, billing event, and status transition is recorded in `AuditLog`.
- **Scheduled Billing Idempotency**: Scheduled billing cycles prevent duplicate invoice creation for identical billing periods.

---

## Slide 9: Automated Testing & Verification
- **Automated Test Suite**: 46 integration and regression test assertions executed against live MongoDB.
- **Regression Pass Rate**: 100% (46/46 Passed).
- **Frontend Production Build**: Vite build optimized in < 350ms with zero errors.

---

## Slide 10: Future Roadmap & Enhancements
- **IoT Smart Meter MQTT/LoRaWAN Gateway**: Ingest real-time meter pulses every 60 seconds over MQTT.
- **Automated Payment Gateway Integration**: Webhook-based settlements via Stripe / Razorpay.
- **AI-Powered Anomaly Detection**: ML models detecting sudden voltage spikes, leakage, or meter tampering.
