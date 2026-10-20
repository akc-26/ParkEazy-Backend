# ParkEazy Backend API — Future Feature Modules

This directory reserves space for future business domain modules planned for subsequent implementation phases.

## Planned Modules

| Module | Responsibility | Target Phase |
| :--- | :--- | :--- |
| `auth/` | JWT issuance, refresh tokens, role-based access control (RBAC), multi-tenant scopes | Part 01 |
| `users/` | Customer drivers, facility hosts, and platform admin profile management | Part 01 |
| `facilities/` | Parking lots, garages, geolocations, entrance gates, operating hours | Part 02 |
| `spaces/` | Individual parking slots, vehicle compatibility, EV chargers, slot status | Part 02 |
| `bookings/` | Reservation engine, check-in QR, overstay telemetry, duration extension | Part 03 |
| `pricing/` | Dynamic rates, weekend rules, hourly tiers, commercial commission calculation | Part 03 |
| `payments/` | Escrow handling, host payouts, automated split settlement, invoice generation | Part 04 |
| `notifications/`| Transactional SMS, push notifications, reservation reminders | Part 05 |
| `storage/` | Secure media storage for facility photos and bay diagrams | Part 05 |

> **Note**: In Part 00, no database connections (PostgreSQL/Redis), payment processors (Stripe/Razorpay), SMS gateways (Twilio/Firebase), or cloud storage (AWS S3) are initialized.
