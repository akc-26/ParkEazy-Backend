# ParkEazy — Part 01: Functional Requirements Blueprint

> **Status**: APPROVED ARCHITECTURAL BLUEPRINT (Part 01)  
> **Application Repository**: `https://github.com/akc-26/ParkEazy-Backend`  
> **Authoritative Design Repository**: `https://github.com/akc-26/ParkEazy-Web-Design` (Commit: `0881328`)  
> **Continuity Baseline**: Part 00 Foundation (Git commit: `3238969` on `feature/part-00-project-foundation`)

---

## 1. Project Context and Continuity

ParkEazy is a white-label, multi-tenant urban parking marketplace designed to eliminate urban congestion, street circling, and parking friction by connecting commercial and residential parking space hosts with vehicle drivers in high-density metropolitan sectors.

This blueprint builds directly upon the validated **Part 00 foundation**, which established:
1. An npm workspaces monorepo housing three independent React 19 web applications (`apps/website`, `apps/host`, `apps/admin`) and a NestJS REST API backend (`services/api`).
2. Centralized white-label branding (`branding/` and `@parkeazy/branding`) grounded in `parkeazy_design_system/DESIGN.md`.
3. Reusable design system primitives (`@parkeazy/shared-ui`) and typed client infrastructure (`@parkeazy/api-client`, `@parkeazy/shared-types`).
4. Inspection of all 111 exported Stitch design screens in `ParkEazy-Web-Design`.

### 1.1 Requirements Classification Taxonomy
To preserve architectural integrity and avoid speculative implementation, all statements in this document are strictly classified as:
- **[VERIFIED IMPLEMENTATION]**: Code and configurations currently present, passing tests, and compiling in `ParkEazy-Backend`.
- **[VERIFIED DESIGN REQUIREMENT]**: Explicitly depicted in the 111 Stitch HTML exports, screenshot assets, or `DESIGN.md`.
- **[INFERRED REQUIREMENT]**: Logically necessary system capability required to fulfill a verified design flow (e.g., hold timers, database locks).
- **[PROPOSED ARCHITECTURE]**: Recommended technical blueprint for subsequent implementation phases.
- **[UNRESOLVED DECISION]**: Commercial or policy choice requiring stakeholder/business sign-off before code execution.
- **[FUTURE SCOPE]**: Capabilities scheduled for subsequent phased delivery (e.g., mobile apps, payment gateways).

---

## 2. Customer Booking Journey (End-to-End Specification)

The customer booking journey spans 18 distinct functional stages, mapping directly to 54 verified customer screens (`pe_uw_*`).

### Stage 1: Discovery & Entry
- **Screen**: `user_website_landing_page_pe_uw_01_01`
- **Classification**: `[VERIFIED DESIGN REQUIREMENT]`
- **Entry Conditions**: Anonymous or authenticated visitor lands on customer web URL.
- **User Actions**: Views real-time metro telemetry headline ("Park smart. Arrive easy."), selects vehicle category chip, inputs destination, reviews "How It Works".
- **Data Requirements**: Active city hubs, supported vehicle types (`bike`, `auto`, `car`), featured verified facilities.
- **Validation**: Vehicle type must be in `['car', 'bike', 'auto']`. Destination string min length 3 characters.
- **Expected Result**: Integrated search dock updates state and transitions user to search results.
- **Acceptance Criteria**: Hero dock matches Plus Jakarta Sans 56px typography, primary emerald `#0F766E` styling, and 8pt grid spacing.

### Stage 2: Location Autocomplete & Geo-Suggestions
- **Screen**: `location_search_suggestions_pe_uw_03_02`
- **Classification**: `[VERIFIED DESIGN REQUIREMENT]`
- **Entry Conditions**: User focuses or types into destination search dock.
- **User Actions**: Enters area/landmark query (e.g., "Anna Nagar", "T. Nagar").
- **Expected Result**: Instant dropdown suggestions showing neighborhood name, city sector, distance, and historical popularity badge.
- **API Dependencies**: `GET /api/v1/search/suggestions?q={query}`.
- **Failure & Recovery**: Zero match triggers fallback suggestion list with popular commercial hubs.

### Stage 3: Search Results & Split-Screen Map View
- **Screens**: `search_results_list_map_pe_uw_03_04`, `search_results_list_view_pe_uw_03_05`, `search_results_map_view_pe_uw_03_06`
- **Classification**: `[VERIFIED DESIGN REQUIREMENT]`
- **User Actions**: Toggles between 55/45 split view, full list feed, and fullscreen map canvas. Clicks pins or listing cards.
- **Data Requirements**: Facility geo-coordinates, available slot counts, walking distance in minutes, hourly pricing (`₹/hr`), rating badge.
- **Acceptance Criteria**: Listing cards follow pure white surface, 16px radius, tabular numeral pricing, and restrained gold star (`#D6A84F`).

### Stage 4: Search Filters & Preferences
- **Screen**: `search_filters_preferences_pe_uw_03_03`
- **Classification**: `[VERIFIED DESIGN REQUIREMENT]`
- **User Actions**: Filters by EV charging, covered/indoor roof, height clearance (>2.1m), CCTV surveillance, 24/7 access, instant booking.
- **Validation**: Multi-select filter flags combined with AND logic for space matching.

### Stage 5: Empty Search States & Recovery
- **Screens**: `no_results_alternative_suggestions_pe_uw_03_07`, `search_loading_error_location_permission_states_pe_uw_03_08`
- **Classification**: `[VERIFIED DESIGN REQUIREMENT]`
- **User Actions**: Views radius expansion suggestions (+2km, +5km) or enables location permissions after browser prompt denial.
- **Recovery Workflow**: Automatically expands bounding box query when primary radius returns 0 matches.

### Stage 6: Facility Details & Space Overview
- **Screen**: `parking_details_booking_summary_pe_uw_04_01`
- **Classification**: `[VERIFIED DESIGN REQUIREMENT]`
- **User Actions**: Reviews facility photo carousel, entrance gate navigation directions, amenities checklist, operating hours, and host badge.
- **Data Requirements**: Facility ID, physical entrance coordinates, security guard presence, overstay grace period notice.

### Stage 7: Date, Duration & Arrival Selection
- **Screen**: `select_parking_date_duration_pe_uw_04_02`
- **Classification**: `[VERIFIED DESIGN REQUIREMENT]`
- **User Actions**: Selects arrival date, arrival time, and duration slider (1h, 2h, 4h, full day, monthly).
- **Validation**: Start time cannot be in the past; duration must satisfy facility minimum and maximum booking duration rules.

### Stage 8: Real-Time Space Availability & Revalidation
- **Screen**: `availability_space_selection_pe_uw_04_03`
- **Classification**: `[VERIFIED DESIGN REQUIREMENT]` & `[INFERRED REQUIREMENT]`
- **System Invariant**: **Search results are informational; authoritative availability must be revalidated by the backend before checkout initiation.**
- **User Actions**: Selects specific bay/zone (e.g., "Ground Floor - Bay B-04") or allows system auto-assignment.
- **Backend Safeguard**: API executes optimistic lock check against active reservations.

### Stage 9: Vehicle Registration & Details
- **Screen**: `booking_details_vehicle_pe_uw_04_04`
- **Classification**: `[VERIFIED DESIGN REQUIREMENT]`
- **User Actions**: Selects from saved vehicles or enters new license plate number (e.g., `TN01AB1234`).
- **Validation**: Vehicle category must match space compatibility (`car`, `bike`, `auto`). License plate must conform to standard Indian format via `@parkeazy/validation`.

### Stage 10: Price Breakdown & Commercial Terms
- **Screen**: `review_booking_price_breakdown_pe_uw_04_05`
- **Classification**: `[VERIFIED DESIGN REQUIREMENT]`
- **Data Requirements**: Base parking fee, duration multiplier, platform convenience fee, applicable GST (18%), total payable.
- **Policy Disclosure**: Cancellation cutoff window and overstay hourly surcharge clearly presented.

### Stage 11: Customer Authentication Gate
- **Screens**: `user_login_pe_uw_02_01`, `user_signup_pe_uw_02_02`, `verify_mobile_otp_pe_uw_02_04`
- **Classification**: `[VERIFIED DESIGN REQUIREMENT]`
- **Workflow**: If unauthenticated, user completes seamless inline mobile OTP or email login.
- **State Preservation**: Active booking draft state is cached in local session storage and restored upon authentication redirect.

### Stage 12: Temporary Hold Reservation Creation
- **Screens**: `booking_processing_pe_uw_04_06`, `booking_validation_expiry_states_pe_uw_04_09`
- **Classification**: `[INFERRED REQUIREMENT]` & `[VERIFIED DESIGN REQUIREMENT]`
- **Concurrency Control**: Backend creates a temporary reservation hold record with a **10-minute TTL countdown**. The slot is marked unavailable to other drivers during this window.
- **Recovery Workflow**: If timer expires prior to payment authorization, user is presented with `booking_validation_expiry_states_pe_uw_04_09` with a one-click hold renewal button.

### Stage 13: Payment Method Selection & Authorization
- **Screens**: `choose_payment_method_pe_uw_05_01`, `payment_review_authorization_pe_uw_05_02`, `payment_processing_pe_uw_05_03`
- **Classification**: `[VERIFIED DESIGN REQUIREMENT]`
- **User Actions**: Chooses payment rail (UPI QR, UPI Autopay, Debit/Credit Card, Net Banking). Submits payment.
- **Security Rule**: **No payment secrets or raw PAN data stored in application state. Communication managed exclusively through secure provider SDK / webhook callbacks.**

### Stage 14: Payment Result Handling & Webhook Confirmation
- **Screens**: `payment_successful_pe_uw_05_04`, `payment_failed_pe_uw_05_05`, `payment_pending_status_check_pe_uw_05_06`, `payment_cancelled_pe_uw_05_07`
- **Classification**: `[VERIFIED DESIGN REQUIREMENT]`
- **System Invariant**: **Client redirect is never proof of payment. Booking is transitioned to `CONFIRMED` exclusively upon cryptographically verified server-side webhook notification from payment gateway.**
- **Edge States**: Asynchronous UPI pending states poll via `GET /api/v1/payments/{paymentId}/status` with exponential backoff.

### Stage 15: Booking Confirmation & Digital QR Pass
- **Screen**: `booking_confirmed_pe_uw_04_07`
- **Classification**: `[VERIFIED DESIGN REQUIREMENT]`
- **Deliverables**: Confirmed booking reference (`#PKZ-2026-XXXX`), dynamic cryptographic QR code for gate entry, exact facility pin, gate boom PIN code, PDF tax invoice receipt.

### Stage 16: Active Parking Session & Live Telemetry
- **Screens**: `active_parking_session_pe_uw_06_03`, `extend_parking_duration_pe_uw_06_04`
- **Classification**: `[VERIFIED DESIGN REQUIREMENT]`
- **User Actions**: Monitors live remaining duration countdown timer, bay identifier, gate assistance contact.
- **Session Extension**: User requests +30m or +1h extension. Backend verifies next slot reservation; if conflict-free, charges extension fee and updates booking end time.

### Stage 17: Booking Cancellation & Dispute Support
- **Screens**: `cancel_booking_review_pe_uw_06_05`, `booking_cancelled_pe_uw_06_06`, `booking_issue_support_pe_uw_06_08`
- **Classification**: `[VERIFIED DESIGN REQUIREMENT]`
- **User Actions**: Reviews cancellation fee tier (e.g., 100% refund >2h before arrival, 50% within 2h). Confirms cancellation.
- **Dispute Entry**: Submits ticket for blocked bay, incorrect slot allocation, or gate barrier malfunction.

### Stage 18: Account Management, Saved Vehicles & Receipts
- **Screens**: `my_bookings_overview_pe_uw_06_01`, `upcoming_booking_details_pe_uw_06_02`, `booking_history_receipts_pe_uw_06_07`, `my_vehicles_pe_uw_07_03`, `add_edit_vehicle_pe_uw_07_04`
- **Classification**: `[VERIFIED DESIGN REQUIREMENT]`
- **User Actions**: Downloads GST receipts, manages registered vehicles, edits profile, toggles notification preferences.

---

## 3. Host Operational Journey (End-to-End Specification)

The host journey spans 57 verified screens (`pe_hw_*` and `pe_hp_*`) across facility onboarding, physical slot matrix design, pricing rules, live gate control, and payout settlements.

### Stage 1: Host Onboarding & Commercial Registration
- **Screens**: `host_login_pe_hw_01_01` through `host_access_onboarding_exception_states_pe_hw_01_09`
- **User Actions**: Enters commercial entity name, GSTIN (optional for private individuals), property ownership proof, banking coordinates, and emergency phone.
- **Workflow**: Documents submitted to administrative review pipeline with status tracking (`host_application_setup_status_pe_hw_01_08`).

### Stage 2: Facility Creation & Bay Layout Matrix
- **Screens**: `host_spaces_overview_pe_hw_02_01` through `inventory_validation_publication_readiness_pe_hw_02_09`, `host_spaces_inventory_management_pe_hp_04_01`
- **User Actions**: Creates parking facility node, uploads exterior gate photos, designates entry/exit GPS coordinates, configures physical bay grid (e.g., Level G: Bay 01 to 24).
- **Attributes**: Tags specific slots with EV chargers (7kW Type 2), covered roof, compact dimensions, disabled accessibility.

### Stage 3: Availability Schedules & Dynamic Pricing
- **Screens**: `availability_pricing_overview_pe_hw_03_01` through `pricing_availability_change_history_pe_hw_03_09`
- **User Actions**: Configures weekly operating schedules (e.g., Mon–Fri 08:00–20:00), holiday override closures, minimum booking duration, hourly pricing base tiers, and weekend surge rates.
- **Validation**: System checks for overlapping existing bookings before approving schedule closures (`availability_conflict_change_review_pe_hw_03_08`).

### Stage 4: Live Host Operations & Dashboard
- **Screens**: `host_operations_dashboard_pe_hp_02_01`, `host_booking_operations_pe_hp_07_01`
- **User Actions**: Monitors real-time facility metrics:
  - Today's Revenue (`₹4,820.00`)
  - Active Occupancy (`18 / 24 Spaces Occupied — 75%`)
  - Today's Check-ins (`42 Arrivals`)
  - Pending Payout (`₹28,450.00`)
- **Live Actions**: Accesses live gate monitor feed, triggers manual barrier override, audits today's expected vehicle manifest.

### Stage 5: Gate Check-in & Departure Verification
- **Screens**: `arrival_check_in_operations_pe_hw_04_04`, `departure_check_out_operations_pe_hw_04_06`, `active_parking_occupancy_pe_hw_04_05`
- **User Actions**: Scans driver QR code using mobile device or gate terminal. Compares license plate against booking manifest. Records check-in and check-out timestamps.
- **Overstay Handling**: Flagged automatically when driver exceeds scheduled departure window.

### Stage 6: Earnings, Fee Transparency & Payout Settlement
- **Screens**: `host_earnings_financial_overview_pe_hw_05_01` through `financial_exceptions_reconciliation_states_pe_hw_05_09`
- **User Actions**: Inspects transaction-level earnings ledger, platform commission deduction (10–15%), weekly settlement schedule, and past bank transfer receipts with UTR tracking.

### Stage 7: Team Members & Security Settings
- **Screens**: `host_account_workspace_settings_overview_pe_hw_06_01` through `help_support_host_account_issues_pe_hw_06_09`
- **User Actions**: Invites facility attendants with restricted gate-only permissions (`roles_permission_management_pe_hw_06_05`), configures SMS alerts, manages active sessions.

---

## 4. Admin Panel Requirements & Missing Designs Analysis

### 4.1 Design Source Audit Findings
- **Authoritative Source**: `https://github.com/akc-26/ParkEazy-Web-Design`
- **Finding**: **Zero screen directories with prefix `pe_aw_*` or named "admin" exist in the design export.**
- **Action Taken**: In strict accordance with **Section 3.4 & Section 9**, no unapproved replacement screens were synthesized. Inside `apps/admin/`, a clean architectural foundation screen has been created that uses the centralized brand tokens and documents the 6 planned governance modules.

### 4.2 Admin Capability Matrix [PROPOSED — REQUIRES REVIEW]

| Module | Core Responsibility | Planned Operations | Required Approvals |
| :--- | :--- | :--- | :--- |
| **Tenant Governance** | Multi-tenant white-label configuration | Provision new tenant ID, bind custom host domain, override brand tokens, set regional currency (`INR`) | Product & Legal |
| **Host KYC Verification** | Compliance & vetting | Review property deeds, utility bills, trade licenses, approve/reject listing applications | Operations Head |
| **Commission & Fee Engine** | Financial split administration | Configure platform commission percentage (e.g., 10%, 12%, 15%), minimum convenience fees, GST reporting | Finance Director |
| **Dispute & Refund Arbitrage**| Conflict arbitration | Investigate driver chargebacks, gate barrier failure refunds, host overstay penalty disputes | Customer Ops Lead |
| **System Telemetry & Audit** | Operational oversight | Metro-wide heatmaps, peak demand capacity alerts, immutable administrative audit log | Security & DevOps |
| **RBAC Administration** | Platform privileges | Manage Superadmin, Financial Auditor, Support Specialist, Compliance Officer roles | Security Officer |

---

## 5. Non-Functional Requirements & System Invariants

1. **Zero Double-Booking Invariant**:
   Under no circumstances shall two overlapping confirmed bookings be created for the same physical parking space. All slot reservation operations must be executed inside database serializable transactions with pessimistic row-level locking or distributed hold locks.
2. **Payment Verification Rule**:
   Client-side callbacks or browser redirects are treated strictly as UI hints. A booking transitions to `CONFIRMED` only upon cryptographic HMAC signature validation of an asynchronous server webhook from the payment gateway.
3. **Multi-Tenant Data Isolation**:
   Every database query and API request must resolve tenant context from verified request headers or JWT tokens (`tenantId`). Cross-tenant data leakage is prevented via global NestJS interceptors and database row-level security.
4. **Sub-Second Performance**:
   Search queries within a 5km radius must return results in `<250ms` (p95) using PostGIS spatial indexing.
5. **Zero-Secret Client Policy**:
   No payment gateway secret keys, SMS provider auth tokens, database connection strings, or cloud storage credentials shall ever be accessible to client applications or bundled in client-side Vite builds.
