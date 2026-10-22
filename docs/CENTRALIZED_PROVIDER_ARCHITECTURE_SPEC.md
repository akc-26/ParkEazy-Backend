# ParkEazy — Centralized Third-Party Configuration & Provider Management Architecture Specification

**Status:** APPROVED & IMPLEMENTED  
**Version:** 1.0.0  
**Phase:** HP-05 Pricing & Policies + HP-06 Availability & Calendar + Foundation for Future Admin Panel  
**Date:** 2026-10-19  

---

## 1. Directive & Context

In accordance with the **Mandatory Architecture Directive — Centralized Third-Party Configuration and Future Admin Panel**:
- No third-party credentials, API keys, access tokens, account identifiers, sender details, or provider-specific operational settings may be hardcoded in application source code.
- Developers must never be repeatedly asked to supply credentials to start the application, run unit tests, or build the project.
- Development must proceed seamlessly using the application's internal database, business logic, and transparent development mocks.
- All third-party providers are centralized into a single server-side configuration management service (`IntegrationsService`) and accessible via secure Admin APIs.

---

## 2. Configuration Classification & Storage Boundaries

### Category A — Non-Secret Operational Settings
Operational settings that do not contain cryptographic keys or authentication secrets:
- Sender email address (`fromEmail`), sender display name (`fromName`).
- Sender phone number (`fromNumber`).
- Custom API endpoint URLs (`apiUrl`).
- Outbound network request timeouts (`timeoutMs`).
- Default geocoding region bias (`region`).
- Storage bucket names (`bucketName`).
- Provider mode (`test` vs `live`) and enabled status (`true` vs `false`).

**Storage:** Persisted server-side in `.data/integrations.operational.json`. Validated on input and editable by authorized administrators.

### Category B — Provider Credentials and Secrets
High-sensitivity secrets required for third-party service communication:
- SendGrid API Key (`apiKey`).
- Twilio Account SID (`accountSid`) and Auth Token (`authToken`).
- Stripe Secret Key (`secretKey`) and Webhook Secret (`webhookSecret`).
- Razorpay Key Secret (`secretKey`) and Webhook Secret (`webhookSecret`).
- Cloud storage secret keys (`secretAccessKey`).

**Storage & Security Guarantees:**
1. **Authenticated Encryption at Rest:** Encrypted with AES-256-GCM using an authenticated initialization vector (IV) and 128-bit authentication tag, persisted in `.data/integrations.vault.enc.json` with mode `0600`.
2. **Zero API Leakage:** Public administrative endpoints (`GET /api/v1/admin/integrations`, `GET /api/v1/admin/integrations/:id`) return only masked representations (e.g., `sk_test_••••••••1234`) or presence indicators.
3. **Safe Secret Replacement:** Authorized admins can replace secrets without retrieving or transmitting the existing secret value.
4. **Log & Audit Redaction:** Raw secrets are strictly barred from system logs, console output, audit records, and error messages.

### Category C — Bootstrap Secrets
Minimal credentials required to boot the application container before the Admin Panel is accessible:
- `DATABASE_URL`: PostgreSQL connection string (masked when logged).
- `REDIS_URL`: Redis connection string (masked when logged).
- `JWT_SECRET`: Authentication token signing key (min 32 characters in production).
- `CONFIG_ENCRYPTION_KEY`: Master key for the AES-256-GCM provider vault (derived via scrypt, fallback to JWT secret in development).

---

## 3. Development Mocks vs Live Provider Behavior

1. **Non-Blocking Startup:** The application boots in development mode without any third-party credentials.
2. **Mock Notification Provider (`MockNotificationAdapter`):**
   - Outbound emails and SMS are captured in-memory for inspectability.
   - **Critical Invariant:** `delivered` is strictly `false`. Simulated results include an explicit disclosure message:
     `"[SIMULATED_MOCK] Notification captured in-memory for testing/development. No external carrier dispatch performed."`
   - Mock providers never falsely claim delivery over real telecom or email carriers.
3. **Live Mode Fail-Safe:**
   - If an integration is enabled in `live` mode but lacks credentials, it returns an explicit `CONFIGURATION_ERROR` and `success: false`.
   - Live providers never produce false success responses when unconfigured.
4. **Sandbox Payment Simulator (`MockPaymentAdapter`):**
   - Processes complete reservation hold authorizations and double-entry ledger records with 0ms latency and zero fees.
   - Real Stripe/Razorpay adapters are only activated when selected by an admin.

---

## 4. Connection Probing & Health Invariants

The `POST /api/v1/admin/integrations/:id/test` endpoint enforces strict honesty:
- **Unconfigured Provider:** Returns `success: false`, `status: NOT_CONFIGURED`, and an honest diagnostic message. It **never fabricates a successful connection**.
- **Internal Simulator (`mock_payment`):** Returns `success: true`, `testType: "SIMULATED"`, `isSimulation: true`.
- **Configured Live Provider:** Probes real network endpoints (e.g. `https://api.sendgrid.com/v3/scopes`, `https://api.stripe.com/v1/balance`, Twilio account API) and reports real round-trip latency and HTTP status.

---

## 5. Audit Logging Architecture

Every mutation to provider configurations or secrets generates an immutable audit record:
- `action`: `UPDATE_INTEGRATION_CONFIG`
- `actorId`: Authenticated administrator ID
- `provider`: Provider identifier
- `details.changedSecretFields`: Names of replaced secrets (`['apiKey']`, values redacted)
- `details.changedOperationalFields`: Names of changed operational settings (`['fromEmail']`)
- `createdAtUtc`: ISO-8601 timestamp

Audits are queryable via `GET /api/v1/admin/integrations/audit-history`.

---

## 6. Future Admin Panel Management Pages Plan

| Management Page Route | Provider | Configurable Settings | Actions |
|---|---|---|---|
| `/admin/integrations/sendgrid_email` | SendGrid Email | API Key (Secret), From Email (Op), From Name (Op), API URL (Op) | Test Probe, Replace Key, Toggle Live/Test |
| `/admin/integrations/twilio_sms` | Twilio SMS | Account SID (Secret), Auth Token (Secret), From Number (Op) | Test Probe, Replace Secrets, Toggle Live/Test |
| `/admin/integrations/stripe` | Stripe Payments | Secret Key (Secret), Publishable Key (Op), Webhook Secret (Secret) | Test Probe, Replace Keys, Toggle Active |
| `/admin/integrations/razorpay` | Razorpay Gateway | Key ID (Op), Key Secret (Secret), Webhook Secret (Secret) | Test Probe, Replace Keys, Toggle Active |
| `/admin/integrations/google_maps` | Google Maps | API Key (Secret), Geocoding Region (Op) | Test Probe, Replace Key |
| `/admin/integrations/s3_storage` | Cloud Storage | Access Key ID (Secret), Secret Access Key (Secret), Bucket Name (Op) | Test Probe, Replace Keys |

---

## 7. Automated Test Suite Results

Test suite: `tests/centralized-configuration.test.ts` (17 tests)  
Total project test suite: **200 tests across 41 suites, 0 failures, 0 regressions.**
All invariants (startup independence, secret redaction, honest probing, mock delivery safety, RBAC) are verified on every build.
