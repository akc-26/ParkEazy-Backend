# ParkEazy — Part 01: REST API Blueprint & Contract Specification

> **Base URL Convention**: `http://localhost:4000/api/v1`  
> **Global Prefix**: `/api/v1`  
> **Standard Headers**: `Content-Type: application/json`, `X-Tenant-ID: <tenantId>`, `Authorization: Bearer <jwt>`  
> **Existing Verified Endpoint**: `GET /health` (`services/api/src/health/health.controller.ts`)

---

## 1. API Status & Classification Taxonomy

- **[EXISTING VERIFIED]**: Currently implemented in `services/api`, verified with live HTTP curl tests (`GET /health` and `GET /api/v1/health`).
- **[PROPOSED CONTRACT]**: Conceptual REST contracts planned for future phased delivery. These endpoints are NOT implemented in Part 01.
- **[PROPOSED — REQUIRES REVIEW]**: Administrative, fee-calculation, or policy-dependent endpoints requiring stakeholder sign-off in `PART_01_DECISIONS_REGISTER.md`. All fee percentages, commission numbers, and penalty amounts shown are unapproved placeholders.

---

## 2. Health & System Diagnostics Domain

### 1. Root & Prefixed Health Check [EXISTING VERIFIED]
- **Route**: `GET /health` and `GET /api/v1/health`
- **Purpose**: Real-time service uptime, version, and tenant status check.
- **Authorized Roles**: Public / Anonymous.
- **Request**: None.
- **Response**: `200 OK`
```json
{
  "status": "ok",
  "service": "parkeazy-backend-api",
  "version": "0.1.0",
  "timestamp": "2026-10-09T15:27:11.941Z",
  "uptimeSeconds": 120,
  "environment": "development",
  "details": {
    "apiPrefix": "/api/v1",
    "plannedDatabase": "PostgreSQL",
    "monorepoMode": true
  }
}
```

---

## 3. Authentication & User Identity Domain [PROPOSED CONTRACT]

### 2. Customer & Host Login
- **Route**: `POST /api/v1/auth/login`
- **Purpose**: Authenticate user via email/password or mobile OTP.
- **Authorized Roles**: Public / Anonymous.
- **Request Body**:
```json
{
  "identifier": "driver@parkeazy.com",
  "password": "SecurePassword123!",
  "portal": "website" // "website" | "host" | "admin"
}
```
- **Response**: `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
  "refreshToken": "d7a8f9e0-...",
  "user": {
    "id": "u-9481a8c0",
    "email": "driver@parkeazy.com",
    "roles": ["customer"],
    "tenantId": "default"
  }
}
```
- **Error Codes**: `401 Unauthorized` (invalid credentials), `429 Too Many Requests` (rate limited).

### 3. Mobile OTP Request & Verify
- **Routes**: `POST /api/v1/auth/otp/send`, `POST /api/v1/auth/otp/verify`
- **Request (`verify`)**:
```json
{
  "phone": "+919840123456",
  "otp": "489201"
}
```
- **Response**: `200 OK` (returns JWT session tokens).

---

## 4. Search & Discovery Domain [PROPOSED CONTRACT]

### 4. Geo-Spatial Radius Search
- **Route**: `POST /api/v1/search/query`
- **Purpose**: Query available parking facilities and spaces within geographical radius.
- **Authorized Roles**: Public / Anonymous.
- **Request Body**:
```json
{
  "latitude": 13.0827,
  "longitude": 80.2707,
  "radiusKm": 3.0,
  "vehicleCategory": "car", // "car" | "bike" | "auto"
  "arrivalTime": "2026-10-15T10:00:00Z",
  "durationMinutes": 120,
  "filters": {
    "hasEvCharger": false,
    "isCovered": true
  }
}
```
- **Response**: `200 OK`
```json
{
  "results": [
    {
      "facilityId": "fac-0104",
      "facilityName": "Anna Nagar Plaza Parking",
      "distanceMeters": 450,
      "walkingMinutes": 6,
      "coordinates": { "latitude": 13.0841, "longitude": 80.2719 },
      "hourlyRateInr": 40.0,
      "totalEstimatedInr": 80.0,
      "availableSpacesCount": 6,
      "rating": 4.8,
      "photos": ["/assets/spaces/anna-plaza-1.webp"]
    }
  ],
  "totalMatches": 14,
  "appliedRadiusKm": 3.0
}
```

---

## 5. Spaces, Availability & Holds Domain [PROPOSED CONTRACT]

### 5. Create Temporary Reservation Hold (Anti-Collision)
- **Route**: `POST /api/v1/bookings/hold`
- **Purpose**: Atomically lock slot for 10 minutes during checkout.
- **Authorized Roles**: Authenticated Customer.
- **Request Body**:
```json
{
  "spaceId": "spc-882109",
  "startsAt": "2026-10-15T10:00:00Z",
  "endsAt": "2026-10-15T12:00:00Z",
  "vehiclePlate": "TN01AB1234"
}
```
- **Response**: `201 Created`
```json
{
  "holdId": "hld-7741",
  "spaceId": "spc-882109",
  "expiresAt": "2026-10-09T10:24:58Z",
  "ttlSecondsRemaining": 600,
  "pricing": {
    "baseAmountInr": 80.0,
    "platformFeeInr": 12.0,
    "gstInr": 16.56,
    "totalPayableInr": 108.56
  }
}
```
- **Error Codes**: `409 Conflict` (Space already held or booked for this period).

---

## 6. Payments & Webhooks Domain [PROPOSED CONTRACT]

### 6. Initiate Payment Order
- **Route**: `POST /api/v1/payments/initiate`
- **Purpose**: Create server-authoritative payment order with provider (Razorpay/Stripe).
- **Authorized Roles**: Authenticated Customer.
- **Request Body**:
```json
{
  "holdId": "hld-7741",
  "paymentMethod": "upi"
}
```
- **Response**: `200 OK`
```json
{
  "paymentOrderId": "order_PKZ88219",
  "amountInr": 108.56,
  "currency": "INR",
  "gatewayProvider": "razorpay",
  "keyId": "rzp_test_public_key"
}
```

### 7. Asynchronous Payment Webhook (Server-to-Server)
- **Route**: `POST /api/v1/payments/webhooks`
- **Purpose**: Cryptographically confirm payment and transition booking to `CONFIRMED`.
- **Authorized Roles**: External Payment Gateway (HMAC signature verified).
- **Headers**: `X-Razorpay-Signature: <hmac_hex>`
- **Response**: `200 OK` `{ "status": "acknowledged" }`
- **System Invariant**: Idempotent processing. Duplicate webhook deliveries return 200 without duplicate database mutations.

---

## 7. Gate Operations & Check-In Domain [PROPOSED CONTRACT]

### 8. Gate QR Scan Check-In
- **Route**: `POST /api/v1/gate/check-in`
- **Purpose**: Facility attendant scans driver QR pass at arrival.
- **Authorized Roles**: Host, Attendant, Superadmin.
- **Request Body**:
```json
{
  "facilityId": "fac-0104",
  "qrAccessToken": "pkz_jwt_token_payload",
  "verifiedLicensePlate": "TN01AB1234"
}
```
- **Response**: `200 OK`
```json
{
  "status": "check_in_approved",
  "bookingReference": "#PKZ-2026-9481",
  "allocatedBay": "B-04",
  "driverName": "Ashok Kumar",
  "checkInTimestamp": "2026-10-15T09:58:12Z",
  "scheduledDeparture": "2026-10-15T12:00:00Z"
}
```

---

## 8. Host Earnings & Settlements Domain [PROPOSED CONTRACT]

### 9. Host Earnings Summary
- **Route**: `GET /api/v1/hosts/me/earnings`
- **Purpose**: Get real-time gross revenue, platform deductions, and net pending payouts.
- **Authorized Roles**: Host.
- **Response**: `200 OK`
```json
{
  "todayEarningsInr": 4820.0,
  "monthEarningsInr": 78400.0,
  "pendingSettlementInr": 28450.0,
  "platformCommissionPercent": 12.0,
  "nextSettlementDate": "2026-10-16T00:00:00Z"
}
```

---

## 9. Platform Administration Domain [PROPOSED — REQUIRES REVIEW]

### 10. Audit Host KYC Application
- **Route**: `POST /api/v1/admin/hosts/:id/kyc-decision`
- **Purpose**: Superadmin approves or rejects property ownership documents.
- **Authorized Roles**: Superadmin, Compliance Officer.
- **Request Body**:
```json
{
  "decision": "approved", // "approved" | "rejected"
  "notes": "Verified against Greater Chennai Corporation property tax records."
}
```
- **Side Effects**: Emits immutable administrative audit event and sends push/SMS notification to host.
