# ParkEazy Architecture Decision Record (ADR)
**Date:** October 2026  
**Status:** Approved for Stage 1 Implementation  
**Project:** ParkEazy Parking Marketplace Platform  

---

## 1. Context & Scope
ParkEazy is a peer-to-peer parking marketplace connecting drivers needing parking with parking-space hosts.
The platform architecture encompasses:
1. **User Website**: Public-facing parking marketplace for discovery, booking, and navigation.
2. **Host Portal**: Dedicated workspace for parking hosts to manage locations, physical bays, pricing, and payouts.
3. **Admin Panel**: Restricted management portal for platform operations, financial ledger auditing, dispute resolution, and security oversight.
4. **Shared Backend API**: Centralized REST API (/api/v1) supporting all web applications and future hybrid mobile applications.
*(Note: Mobile applications are separate hybrid projects and their source code is strictly excluded from this web repository).*

---

## 2. Key Architecture Decisions

### 2.1 Backend Architecture
- **Framework & Runtime**: Node.js with TypeScript and Express. Modular structure organized into clear technical and domain boundaries (`config`, `middleware`, `database`, `services`, `controllers`, `docs`).
- **API Convention**: RESTful standard under `/api/v1` prefix.
- **Request Correlation**: All requests receive or generate an `X-Correlation-Id` passed through all logs and error responses.
- **Error Response Standard**: Guaranteed envelope:
  ```json
  {
    "success": false,
    "error": {
      "code": "ERROR_CODE",
      "message": "Human readable summary",
      "details": [],
      "correlationId": "req-xyz",
      "timestamp": "2026-10-16T..."
    }
  }
  ```

### 2.2 Database & Migration Strategy
- **Engine**: PostgreSQL with standard ANSI SQL migrations.
- **Migration Discipline**: Strict migration-first approach. Schema auto-synchronization (`synchronize: true`) is strictly banned to prevent accidental production data loss.
- **Entity Separation**: A Parking Location and a Physical Parking Bay are distinct entities with independent identifiers and statuses.
- **Temporal Invariants**: All timestamps stored in UTC (`TIMESTAMPTZ`), with explicit location timezone stored per facility.

### 2.3 Frontend & Design System Architecture
- **Framework**: React 19 with Vite, TypeScript, and Tailwind CSS v4.
- **Design Tokens**:
  - **User Website**: Parking teal (`#087E8A`), deep teal (`#075762`), soft neutral canvas (`#F4F8F7`), dark text (`#162A2D`).
  - **Host Portal**: Action green (`#22C55E`), deep teal (`#0F766E`), neutral canvas (`#E7ECEB`), dark surface (`#12211C`). Modeled structurally on VoiceCloud Creator Studio.
  - **Admin Panel**: Admin blue (`#2563EB`), navy blue (`#0F4C81`), light canvas (`#F4F8FC`), dark text/navy (`#10233F`). Modeled structurally on VoiceCloud Admin.
- **Anti-Slop Design Constitution**:
  - No static pill capsules or candy badges for metadata.
  - Clean typographic hierarchy with Plus Jakarta Sans and JetBrains Mono tabular numerals.
  - No code comments in headers (`// 01 ARCHITECTURE` banned).
  - No fake telemetry tickers or pulse dots on static elements.

### 2.4 Authentication & Authorization
- **Separation**: Decoupled authentication (token verification) from authorization (server-side RBAC).
- **Roles**: `CUSTOMER`, `HOST`, `ADMIN`, `SUPER_ADMIN`.
- **Enforcement**: Server-side `authGuard` verifies bearer tokens and user roles. Frontend role checks are treated as convenience navigation hints only.

### 2.5 Business Invariant Accommodations
- **10-Minute Hold**: Server-enforced persistent hold on parking bays. Refreshing does not reset the hold timer.
- **Duration Boundaries**: Minimum 1 hour, maximum 72 continuous hours, scheduled in 30-minute intervals.
- **Transition Buffer**: 15 minutes between consecutive bookings, calculated separately from holds.
- **Append-Only Financial Ledger**: Double-entry ledger where transactions are immutable. Security deposits are escrowed separately from platform commission and host revenue.
- **Provider Switching**: Future payment provider migrations (Stripe, Razorpay) retain the original provider on historical transaction records.

### 2.6 Admin-Managed Integrations & Zero-Credential Stage 1 Baseline
- **Zero Third-Party Dependency for Stage 1**: Third-party credentials (Stripe, Razorpay, Google Maps, Twilio, S3) are not required to boot or execute Stage 1.
- **Internal Sandbox Simulator (Mock Adapter)**: Active by default, allowing local development and reservation testing without third-party accounts or processing fees.
- **Admin Configuration (Settings -> Integrations)**:
  - Stripe and Razorpay are selectable and configurable directly from the authenticated Admin Panel.
  - Active provider routing: Platform payment provider can be toggled between `MOCK_PAYMENT`, `STRIPE`, and `RAZORPAY` on the server without rebuilding the frontend.
  - Test/Live mode toggles and on-demand connection diagnostic probes reporting latency.
  - Masked credentials in all API responses (`sk_••••••••••••3a9f`).
  - Safe credential replacement: Secrets are encrypted and stored exclusively on the backend server vault.
  - Auditing without secret leaks: All configuration changes create immutable audit log entries recording changed fields while strictly omitting secret values.
- **Deployment Secrets Boundary**: Only `DATABASE_URL` and `JWT_SECRET` remain deployment-level environment variables. `REDIS_URL` is optional. All payment and service integrations are managed dynamically via the Admin Panel.

---

## 3. Rejected Alternatives & Rationale
1. **Microservices Architecture**: Rejected for Stage 1. A modular monolith avoids network overhead and distributed transaction complexities during early marketplace development.
2. **Frontend-Only Role Checks**: Rejected as a security vulnerability. All administrative actions require server-side token validation.
3. **Single Collapsed Interface**: Rejected. Blending host/admin tools into the consumer marketplace degrades UX and increases permission leakage risks.
4. **Auto-syncing ORM schemas in production**: Rejected. Explicit version-controlled SQL migrations ensure predictable deployments.

---

## 4. Unresolved Decisions (Deferred to Future Stages)
- Exact production OTP / SMS verification vendor selection (Twilio vs MessageBird vs AWS SNS).
- Specific dispute resolution arbitration SLA timeframes.
- Hardware gate controller protocols (MQTT vs BLE Beacon vs Cloud API).
