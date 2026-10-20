# ParkEazy — Centralized Third-Party Configuration Inventory

**Directive Compliance:** Mandatory Architecture Directive — Centralized Third-Party Configuration and Future Admin Panel  
**Audit Date:** 2026-10-19  
**Monorepo Version:** v1.0.0 (Phase HP-05 & HP-06 Active)  

---

## 1. Executive Summary & Configuration Classification

All third-party integrations across the ParkEazy monorepo are governed by a centralized, secure, server-side configuration architecture managed via `IntegrationsService` (`apps/api/services/integrations.service.ts`). 

Configuration is strictly partitioned into three security categories:
1. **Category A — Non-Secret Operational Settings**: Configured in plain text on server, editable via Admin API, persisted in `.data/integrations.operational.json`.
2. **Category B — Provider Credentials & Secrets**: Stored encrypted at rest using AES-256-GCM authenticated encryption in `.data/integrations.vault.enc.json`. Raw secrets are NEVER exposed in API responses, logs, or audit events.
3. **Category C — Bootstrap Secrets**: Strictly limited to initial environment setup (Database URL, Redis URL, JWT Secret, Master Config Encryption Key). Development fallbacks guarantee the application boots and runs unit tests with zero third-party dependencies.

---

## 2. Configuration Inventory Matrix

| Provider / Integration | Current Settings | Classification | Current Usage | Startup Dependency | Target Admin Page | Required Action | Verification Check |
|---|---|---|---|---|---|---|---|
| **SendGrid Email Delivery** | `apiKey` (`SENDGRID_API_KEY`) | Category B — Provider Secret | `EmailProviderAdapter`, `NotificationAdapterFactory` | **Optional** (defaults to internal mock in dev/test) | Admin Panel > Email Delivery (`/admin/integrations/sendgrid_email`) | **Centralize & Secure** (AES-256-GCM encrypted, masked in API) | `tests/centralized-configuration.test.ts` (Subtest 4.2), `testConnection()` probe |
| | `fromEmail` (`SENDGRID_FROM_EMAIL`) | Category A — Operational | `EmailProviderAdapter` | **Optional** (defaults to `noreply@parkeazy.internal`) | Admin Panel > Email Delivery | **Centralize** (Editable operational setting) | Unit tests, schema validation |
| | `fromName` (`SENDGRID_FROM_NAME`) | Category A — Operational | `EmailProviderAdapter` | **Optional** (defaults to `ParkEazy Notifications`) | Admin Panel > Email Delivery | **Centralize** | Schema validation |
| | `apiUrl` (`SENDGRID_API_URL`) | Category A — Operational | `EmailProviderAdapter` | **Optional** (defaults to `https://api.sendgrid.com/v3/mail/send`) | Admin Panel > Email Delivery | **Centralize** | Schema validation |
| | `timeoutMs` | Category A — Operational | `EmailProviderAdapter` | **Optional** (defaults to `8000ms`) | Admin Panel > Email Delivery | **Centralize** | Schema validation |
| **Twilio SMS Gateway** | `accountSid` (`TWILIO_ACCOUNT_SID`) | Category B — Provider Secret | `SmsProviderAdapter`, `NotificationAdapterFactory` | **Optional** (defaults to internal mock in dev/test) | Admin Panel > SMS Delivery (`/admin/integrations/twilio_sms`) | **Centralize & Secure** (AES-256-GCM encrypted, masked) | `tests/centralized-configuration.test.ts` (Subtest 3.3, 4.3) |
| | `authToken` (`TWILIO_AUTH_TOKEN`) | Category B — Provider Secret | `SmsProviderAdapter`, `NotificationAdapterFactory` | **Optional** | Admin Panel > SMS Delivery | **Centralize & Secure** | `tests/centralized-configuration.test.ts` |
| | `fromNumber` (`TWILIO_FROM_NUMBER`) | Category A — Operational | `SmsProviderAdapter` | **Optional** (defaults to `+15557275329`) | Admin Panel > SMS Delivery | **Centralize** | Schema validation |
| | `timeoutMs` | Category A — Operational | `SmsProviderAdapter` | **Optional** (defaults to `8000ms`) | Admin Panel > SMS Delivery | **Centralize** | Schema validation |
| **Stripe Payments** | `secretKey` (`STRIPE_SECRET_KEY`) | Category B — Provider Secret | `StripePaymentAdapter`, `PaymentAdapterFactory` | **Optional** (defaults to Sandbox Simulator in dev/test) | Admin Panel > Payment Gateways (`/admin/integrations/stripe`) | **Centralize & Secure** (AES-256-GCM encrypted, masked) | `tests/adapters.test.ts`, `tests/centralized-configuration.test.ts` |
| | `apiKey` / `publishableKey` | Category A — Operational | Client checkout initiation | **Optional** | Admin Panel > Payment Gateways | **Centralize** | Schema validation |
| | `webhookSecret` (`STRIPE_WEBHOOK_SECRET`) | Category B — Provider Secret | Webhook signature verification | **Optional** | Admin Panel > Payment Gateways | **Centralize & Secure** | Webhook verification test |
| **Razorpay Gateway** | `apiKey` / `keyId` (`RAZORPAY_KEY_ID`) | Category A — Operational | Public key ID for checkout | **Optional** | Admin Panel > Payment Gateways (`/admin/integrations/razorpay`) | **Centralize** | Schema validation |
| | `secretKey` (`RAZORPAY_KEY_SECRET`) | Category B — Provider Secret | `RazorpayPaymentAdapter`, `PaymentAdapterFactory` | **Optional** | Admin Panel > Payment Gateways | **Centralize & Secure** | Real API probe check |
| | `webhookSecret` (`RAZORPAY_WEBHOOK_SECRET`) | Category B — Provider Secret | Webhook signature verification | **Optional** | Admin Panel > Payment Gateways | **Centralize & Secure** | Webhook verification test |
| **ParkEazy Sandbox Simulator** | `mode` | Category A — Operational | `MockPaymentAdapter`, zero external keys required | **Default** | Admin Panel > Payment Gateways (`/admin/integrations/mock_payment`) | **Preserve & Disclose** (Explicitly marked as `SIMULATED`) | `tests/adapters.test.ts` |
| **Google Maps & Geocoding** | `apiKey` (`GOOGLE_MAPS_API_KEY`) | Category B — Provider Secret | Map tiles & geocoding | **Optional** (client fallback in dev) | Admin Panel > Maps & Geo (`/admin/integrations/google_maps`) | **Centralize & Secure** | Schema validation |
| | `region` | Category A — Operational | Geocoding bias ccTLD | **Optional** (defaults to `us`) | Admin Panel > Maps & Geo | **Centralize** | Schema validation |
| **Object Storage (S3 / Cloud)** | `accessKeyId` (`AWS_ACCESS_KEY_ID`) | Category B — Provider Secret | Facility image uploads | **Optional** (local curated fallback in dev) | Admin Panel > Storage (`/admin/integrations/s3_storage`) | **Centralize & Secure** | Schema validation |
| | `secretAccessKey` (`AWS_SECRET_ACCESS_KEY`) | Category B — Provider Secret | Facility image uploads | **Optional** | Admin Panel > Storage | **Centralize & Secure** | Schema validation |
| | `bucketName` (`S3_BUCKET_NAME`) | Category A — Operational | Target storage bucket | **Optional** (defaults to `parkeazy-assets-dev`) | Admin Panel > Storage | **Centralize** | Schema validation |
| | `region` (`AWS_REGION`) | Category A — Operational | S3 / Cloud bucket region | **Optional** (defaults to `us-west-2`) | Admin Panel > Storage | **Centralize** | Schema validation |
| **PostgreSQL Database** | `DATABASE_URL` | Category C — Bootstrap Secret | `DatabaseManager`, Pg Pool, Migrator | **Mandatory in Production Only** (In-memory fallback in dev/test) | Deployment Environment / Secret Manager | **Preserve** (Sanitized URL logging) | `tests/readiness.test.ts`, `tests/database.test.ts` |
| **Redis Cache** | `REDIS_URL` | Category C — Bootstrap Secret | `RedisManager`, session cache | **Mandatory in Production Only** (In-memory fallback in dev/test) | Deployment Environment / Secret Manager | **Preserve** (Sanitized URL logging) | `tests/redis.test.ts`, `tests/readiness.test.ts` |
| **JWT & Master Encryption** | `JWT_SECRET`, `CONFIG_ENCRYPTION_KEY` | Category C — Bootstrap Secret | Token signing, scrypt key derivation for AES-256-GCM vault | **Mandatory in Production Only** (Dev fallback key for development/test) | Deployment Environment / Secret Manager | **Secure Bootstrap** (Min 32 chars in production) | `tests/config.test.ts`, `tests/centralized-configuration.test.ts` |

---

## 3. Security Boundary & Anti-Leakage Verifications

1. **Zero Secret Leakage in REST APIs**:
   - `GET /api/v1/admin/integrations` and `GET /api/v1/admin/integrations/:id` mask all secret strings (e.g., `"sk_test_••••••••1234"`).
   - Raw credentials are never returned in JSON payloads.
2. **Immutable Audit History**:
   - `GET /api/v1/admin/integrations/audit-history` records changes with actor ID, timestamp, and field names. Raw values are strictly omitted from audit logs.
3. **Honest Connection Probing**:
   - Testing an unconfigured provider returns honest `NOT_CONFIGURED` failure and `success: false`.
   - Simulated sandbox adapters explicitly return `testType: "SIMULATED"` and `isSimulation: true`.
4. **Mock Provider Safety**:
   - Mock notification adapter captures messages in-memory and explicitly returns `delivered: false`, preventing any false claim of telecom or email carrier delivery.
