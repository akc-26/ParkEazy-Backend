# ParkEazy Design-Source Mapping & Screen Inventory

## 1. Authoritative Design Source Information

- **Authoritative Design Repository URL**: `https://github.com/akc-26/ParkEazy-Web-Design`
- **Source Platform**: Google Stitch Website Design Export
- **Repository Access Status**: **ACCESSED & VERIFIED** (Repository was cloned and inspected during Part 00 initialization)
- **Latest Commit Inspected**: `0881328 docs: add ParkEazy Stitch website design` (Branch: `main`)
- **Inspection Date**: October 2026
- **Total Screen Folders Inspected**: **111 exported screen directories** plus 1 central design system directory (`parkeazy_design_system/`)

---

## 2. Inspected Design System & Token Specifications

Source File: `stitch-export/parkeazy_design_system/DESIGN.md`

### 2.1 Brand Identity & Color Tokens

The visual system implements a combination of **Airbnb marketplace elegance**, **Booking.com transactional clarity**, and **SaaS operational rigor**:

| Token Name | Hex Code | Semantic Role |
| :--- | :--- | :--- |
| **Primary Emerald** | `#0F766E` | Anchors primary conversion points, verified host seals, primary navigation, confirm triggers |
| **Bright Mint** | `#14B8A6` | Forward dynamic accent, active path selections, live availability rings, progressive timeline bars |
| **Pale Emerald** | `#E6F7F4` | Context-aware background fills behind active selections, operational shifts, verified status banners |
| **Restrained Gold** | `#D6A84F` | Reserved exclusively for trust validation, star ratings, premium tier badges |
| **Deep Ink** | `#101828` / `#141B2C` | Semantic primary typography, high-contrast display text |
| **Slate** | `#344054` | Secondary text, input labels, metadata |
| **Muted Slate** | `#667085` | Tertiary metadata, micro-labels, structural timestamps, inactive icons |
| **Soft Surface** | `#F8FAFC` | Base floor canvas Level 0 |
| **Pure White** | `#FFFFFF` | Elevated card & row surfaces Level 1 |
| **Hairline Border** | `#E4E7EC` | Crisp containment boundaries, subtle card borders |
| **Status Success** | `#12B76A` | Space occupied, revenue deposited, gate opened |
| **Status Warning** | `#F79009` | Grace period running, lot approaching 90% capacity, expiring reservation |
| **Status Danger** | `#F04438` | Overstay violation, access denied, payment failed |

### 2.2 Typography Scale

- **Display & Headings**: `Plus Jakarta Sans` (weights: 600 SemiBold, 700 Bold, 800 ExtraBold)
  - `display-hero`: 56px / 64px line-height, letter-spacing: -0.03em
  - `headline-xl`: 36px / 44px line-height, letter-spacing: -0.02em
  - `headline-lg`: 28px / 36px line-height, letter-spacing: -0.015em
  - `headline-md`: 22px / 28px line-height, letter-spacing: -0.01em
  - `headline-sm`: 18px / 24px line-height, letter-spacing: -0.005em
- **Body & Data Tables**: `Inter` (weights: 400 Regular, 500 Medium, 600 SemiBold)
  - `body-lg`: 16px / 24px line-height
  - `body-md`: 14px / 20px line-height
  - `body-sm`: 13px / 18px line-height
  - `label-md`: 12px / 16px line-height, uppercase, letter-spacing: 0.02em
  - `label-sm`: 11px / 14px line-height, uppercase, letter-spacing: 0.04em
  - `data-tabular`: 14px / 20px line-height with `font-feature-settings: "tnum" 1`

### 2.3 Curvature and Radii Profile
- Base Components (buttons, inputs, dropdowns): `rounded` (8px / `0.5rem`)
- Cards & Data Modules (parking lot cards, checkout summaries, host KPI widgets): `rounded-lg` (16px / `1rem`)
- Floating Overlays & Search Docks (omnibar search docks, sticky mobile bars): `rounded-xl` (24px / `1.5rem`)
- Status Pills (availability badges, verified host tags, vehicle chips): `rounded-full` (9999px)

---

## 3. Screen Inventory & Application Classification

The 111 exported screen directories are classified by their established functional prefix and target application:

### 3.1 Customer Marketplace Website (`apps/website/`) — Prefix: `pe_uw_*` (54 Screens)

#### Group 1: Landing & Discovery (Phase 1-2)
- `user_website_landing_page_pe_uw_01_01` — Main marketing landing page with integrated search dock
- `explore_parking_pe_uw_03_01` — Discovery catalog and nearby parking list
- `location_search_suggestions_pe_uw_03_02` — Autocomplete location search suggestions
- `search_filters_preferences_pe_uw_03_03` — Advanced filter modal (EV, covered, height clearance)
- `search_results_list_map_pe_uw_03_04` — Split-screen 55/45 interactive map and list view
- `search_results_list_view_pe_uw_03_05` — Pure listing feed view
- `search_results_map_view_pe_uw_03_06` — Fullscreen interactive map view
- `no_results_alternative_suggestions_pe_uw_03_07` — Empty search state with fallback areas
- `search_loading_error_location_permission_states_pe_uw_03_08` — Geolocation permission prompt & errors

#### Group 2: Customer Authentication & Verification (Phase 1)
- `user_login_pe_uw_02_01` — Email/password & Google login screen
- `user_signup_pe_uw_02_02` — Driver registration form
- `verify_email_pe_uw_02_03` — Email verification link prompt
- `verify_mobile_otp_pe_uw_02_04` — 6-digit SMS OTP verification
- `forgot_password_pe_uw_02_05` — Password reset request form
- `reset_password_pe_uw_02_06` — New password creation screen
- `verification_required_pe_uw_02_07` — Mandatory verification gate
- `authentication_error_states_pe_uw_02_08` — Auth validation and rate-limiting alerts
- `session_expired_pe_uw_02_09` — Re-authentication session timeout prompt
- `account_access_success_pe_uw_02_10` — Post-auth onboarding success redirect

#### Group 3: Space Details & Booking Flow (Phase 2-3)
- `parking_details_booking_summary_pe_uw_04_01` — Facility overview, amenities, photos, host badge
- `select_parking_date_duration_pe_uw_04_02` — Calendar date picker and hourly slider
- `availability_space_selection_pe_uw_04_03` — Real-time slot selector
- `booking_details_vehicle_pe_uw_04_04` — Vehicle plate entry and saved vehicle selector
- `review_booking_price_breakdown_pe_uw_04_05` — Price breakdown (base rate, tax, service fee)
- `booking_processing_pe_uw_04_06` — Payment submission loading state
- `booking_confirmed_pe_uw_04_07` — Reservation success with QR token pass
- `booking_unavailable_recovery_pe_uw_04_08` — Concurrency collision recovery state
- `booking_validation_expiry_states_pe_uw_04_09` — Hold-timer countdown expiry notification

#### Group 4: Payment & Checkout (Phase 4)
- `choose_payment_method_pe_uw_05_01` — UPI, credit/debit card, netbanking selector
- `payment_review_authorization_pe_uw_05_02` — Gateway 3DS authorization screen
- `payment_processing_pe_uw_05_03` — Payment gateway webhook waiting screen
- `payment_successful_pe_uw_05_04` — Receipt and invoice generation confirmation
- `payment_failed_pe_uw_05_05` — Card decline / UPI timeout retry view
- `payment_pending_status_check_pe_uw_05_06` — Asynchronous bank polling status
- `payment_cancelled_pe_uw_05_07` — User-aborted checkout feedback screen
- `payment_recovery_reconciliation_states_pe_uw_05_08` — Partial debit resolution screen

#### Group 5: Active Booking, Parking Sessions & Receipts (Phase 3)
- `my_bookings_overview_pe_uw_06_01` — Active, upcoming, and past booking list
- `upcoming_booking_details_pe_uw_06_02` — Directions, entry code, host contact
- `active_parking_session_pe_uw_06_03` — Live countdown timer, bay number, extend button
- `extend_parking_duration_pe_uw_06_04` — Quick 30m/1h session extension drawer
- `cancel_booking_review_pe_uw_06_05` — Cancellation policy and refund calculation
- `booking_cancelled_pe_uw_06_06` — Cancellation confirmation and credit receipt
- `booking_history_receipts_pe_uw_06_07` — Downloadable PDF receipt archive
- `booking_issue_support_pe_uw_06_08` — Dispute entry (gate closed, space blocked)
- `booking_changes_exception_states_pe_uw_06_09` — Overstay alerts and late fee invoices

#### Group 6: Customer Profile, Vehicles & Settings (Phase 1-2)
- `user_profile_overview_pe_uw_07_01` — Driver account dashboard
- `edit_personal_details_pe_uw_07_02` — Name, phone, email, emergency contact
- `my_vehicles_pe_uw_07_03` — Saved vehicles list (license plates, vehicle type)
- `add_edit_vehicle_pe_uw_07_04` — Add vehicle modal with type chips
- `saved_places_favorites_pe_uw_07_05` — Bookmarked regular parking spots
- `notifications_centre_pe_uw_07_06` — Push/SMS notification timeline
- `notification_preferences_pe_uw_07_07` — Delivery channel toggles
- `account_security_sessions_pe_uw_07_08` — Active device sessions and password change
- `privacy_consents_account_closure_pe_uw_07_09` — Account deletion and GDPR data download

---

### 3.2 Host Operations Portal (`apps/host/`) — Prefixes: `pe_hw_*` & `pe_hp_*` (57 Screens)

#### Group 1: Host Onboarding & Registration
- `host_login_pe_hw_01_01` — Dedicated host login portal
- `host_account_registration_pe_hw_01_02` — Host account creation form
- `host_email_mobile_verification_pe_hw_01_03` — Host multi-factor verification
- `host_password_recovery_pe_hw_01_04` — Host password recovery flow
- `host_onboarding_overview_pe_hw_01_05` — Getting started guide for new space owners
- `host_profile_contact_details_pe_hw_01_06` — Host contact and emergency contacts
- `host_eligibility_required_information_pe_hw_01_07` — Commercial eligibility checklist
- `host_application_setup_status_pe_hw_01_08` — Verification review progress tracker
- `host_access_onboarding_exception_states_pe_hw_01_09` — Rejection and document resubmission view

#### Group 2: Host Operations Dashboard & Metrics
- `host_operations_dashboard_pe_hp_02_01` — Core operational dashboard (Anna Nagar Plaza reference)
- `host_booking_operations_pe_hp_07_01` — Day-of operations booking manifest
- `host_spaces_inventory_management_pe_hp_04_01` — Interactive space layout and slot manager

#### Group 3: Facility & Physical Space Configuration
- `host_spaces_overview_pe_hw_02_01` — Facility list and quick status toggles
- `add_parking_facility_pe_hw_02_02` — Multi-step wizard to create a new facility
- `facility_details_entrance_pe_hw_02_03` — GPS pin, entrance photo, gate instructions
- `physical_inventory_bay_layout_pe_hw_02_04` — Grid bay configuration (A-01, B-02)
- `add_edit_parking_space_pe_hw_02_05` — Slot details: covered, EV, compact, disabled
- `vehicle_compatibility_restrictions_pe_hw_02_06` — Height clearance and vehicle restrictions
- `space_amenities_access_instructions_pe_hw_02_07` — Boom barrier PIN, security guard instructions
- `photos_listing_preview_pe_hw_02_08` — Photo gallery uploader and marketplace preview
- `inventory_validation_publication_readiness_pe_hw_02_09` — Pre-publish checklist and live audit

#### Group 4: Availability Schedules & Pricing Rules
- `availability_pricing_overview_pe_hw_03_01` — Calendar overview of active rates and open hours
- `space_pricing_configuration_pe_hw_03_02` — Base hourly, daily, and monthly rate configuration
- `operating_hours_weekly_schedule_pe_hw_03_03` — Monday–Sunday open/closed time blocks
- `date_specific_availability_closures_pe_hw_03_04` — Holiday overrides and maintenance closures
- `booking_duration_advance_booking_rules_pe_hw_03_05` — Min/max duration and advance reservation limits
- `pricing_preview_earnings_estimate_pe_hw_03_06` — Projected earnings calculator
- `bulk_pricing_schedule_updates_pe_hw_03_07` — Bulk slot rate modifier
- `availability_conflict_change_review_pe_hw_03_08` — Conflict detection when altering operating hours
- `pricing_availability_change_history_pe_hw_03_09` — Audit log of pricing adjustments

#### Group 5: Arrivals, Check-in & Gate Operations
- `host_booking_operations_overview_pe_hw_04_01` — Manifest summary of today's expected vehicles
- `booking_list_search_pe_hw_04_02` — Filter by vehicle plate, booking ref, or driver name
- `booking_details_commercial_terms_pe_hw_04_03` — Customer reservation detail card
- `arrival_check_in_operations_pe_hw_04_04` — Gate QR scanner check-in confirmation
- `active_parking_occupancy_pe_hw_04_05` — Live visual occupancy bay map
- `departure_check_out_operations_pe_hw_04_06` — Check-out timestamp recording
- `extension_requests_decisions_pe_hw_04_07` — Host approval for customer overtime extensions
- `booking_exceptions_conflict_resolution_pe_hw_04_08` — Duplicate plate / unauthorized entry handling
- `operational_activity_booking_audit_pe_hw_04_09` — Shift handover and daily gate log

#### Group 6: Host Earnings, Financials & Payouts
- `host_earnings_financial_overview_pe_hw_05_01` — Gross revenue, platform fees, net payout dashboard
- `booking_level_earnings_transaction_ledger_pe_hw_05_02` — Transaction-level breakdown
- `platform_commission_fee_breakdown_pe_hw_05_03` — Commission transparency schedule
- `payout_account_settlement_settings_pe_hw_05_04` — Bank account details (IFSC, NEFT/IMPS)
- `payout_schedule_upcoming_settlements_pe_hw_05_05` — Weekly settlement projection
- `payout_history_settlement_details_pe_hw_05_06` — Disbursed payout receipts with UTR numbers
- `refunds_adjustments_disputed_transactions_pe_hw_05_07` — Host deductions and chargeback reviews
- `earnings_reports_export_centre_pe_hw_05_08` — CSV / PDF report exporter
- `financial_exceptions_reconciliation_states_pe_hw_05_09` — Payout failure alerts and bank re-validation

#### Group 7: Workspace, Team & Account Settings
- `host_account_workspace_settings_overview_pe_hw_06_01` — Business entity settings
- `host_profile_business_details_pe_hw_06_02` — GSTIN, registered company name, billing address
- `facility_preferences_operational_settings_pe_hw_06_03` — Auto-approval vs. manual request toggles
- `team_members_invitations_pe_hw_06_04` — Invite co-managers and facility attendants
- `roles_permission_management_pe_hw_06_05` — RBAC for attendants vs. account owners
- `notification_centre_activity_alerts_pe_hw_06_06` — Operational alert feed
- `notification_preferences_delivery_channels_pe_hw_06_07` — SMS/email channel preferences
- `security_sessions_account_access_pe_hw_06_08` — Active device sessions and 2FA settings
- `help_support_host_account_issues_pe_hw_06_09` — Host help desk and dedicated hotline

---

## 4. Design Source Gaps & Limitations

### 4.1 Missing Admin Panel Screens
- **Finding**: Zero screen directories with prefix `pe_aw_*` or naming matching "admin" were found in the `stitch-export` directory.
- **Action Taken**: In accordance with **Section 2.1 Rule 13**, we **did not invent replacement screens** or synthesize unapproved admin layouts.
- **Implementation Decision**: Inside `apps/admin/`, a clean architectural foundation screen has been created that uses the centralized brand tokens and documents the 6 planned governance modules (Tenant Management, Host KYC, Commission Ledger, Disputes, City Telemetry, and RBAC). The final UI implementation is deferred until admin design exports are committed to `ParkEazy-Web-Design`.

### 4.2 Asset Hosting Policy
- Design reference HTML files contain remote CDN image URLs for preview mockups.
- **Production Rule**: In accordance with the prompt guidelines, the application does not depend on fetching HTML design references from GitHub at runtime. Design tokens are extracted into `@parkeazy/branding`, and local SVG brand assets are maintained in `branding/tenants/default/assets/`.

---

## 5. Screen Implementation Sequence (15-Phase Roadmap)

For complete item-by-item traceability from original screen export to API endpoint, validation logic, and test criteria, see:
- [`docs/PART_01_DESIGN_TRACEABILITY.md`](PART_01_DESIGN_TRACEABILITY.md) (Complete 111-screen traceability matrix)
- [`docs/PART_01_REQUIREMENTS_BLUEPRINT.md`](PART_01_REQUIREMENTS_BLUEPRINT.md) (End-to-end customer & host journeys)
- [`docs/PHASE_ROADMAP.md`](PHASE_ROADMAP.md) (Complete 15-phase execution plan from Part 00 to Part 14)

| Phase | Milestone | Screens Targeted | Design References |
| :---: | :--- | :--- | :--- |
| **Part 04** | Authentication, Accounts & Roles | 19 screens | `pe_uw_02_01` to `pe_uw_02_10`, `pe_hw_01_01` to `pe_hw_01_09` |
| **Part 05** | Space Listings & Host Inventory | 18 screens | `pe_hw_02_01` to `pe_hw_02_09`, `pe_hw_03_01` to `pe_hw_03_09`, `pe_hp_04_01` |
| **Part 06** | Availability, Search & Discovery | 8 screens | `pe_uw_03_01` to `pe_uw_03_08` |
| **Part 07** | Booking Lifecycle & Concurrency | 18 screens | `pe_uw_04_01` to `pe_uw_04_09`, `pe_uw_06_01` to `pe_uw_06_09` |
| **Part 08** | Payments, Fees & Settlements | 17 screens | `pe_uw_05_01` to `pe_uw_05_08`, `pe_hw_05_01` to `pe_hw_05_09` |
| **Part 09** | Customer Marketplace Website Delivery | 54 screens | Full `pe_uw_*` customer suite audit & implementation |
| **Part 10** | Host Operations Portal Delivery | 57 screens | Full `pe_hw_*` & `pe_hp_*` host suite audit & implementation |
| **Part 11** | Admin Governance & Implementation | Gaps / Requirements | Admin governance modules in `apps/admin` |
| **Part 12** | Notifications, Support & Hardening | Cross-cutting | Alert centers, dispute desks, messaging channels |
| **Part 13** | Cross-Platform Mobile Applications | 111 screens adapted | Ionic React + Capacitor for Android and iOS |
| **Part 14** | White-Label Release Readiness & Deploy | All Portals | Security audit, multi-tenant deployment |
