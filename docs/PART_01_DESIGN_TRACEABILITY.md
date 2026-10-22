# ParkEazy — Part 01: Design Inventory & Screen Traceability Matrix

> **Authoritative Source**: `https://github.com/akc-26/ParkEazy-Web-Design` (Commit: `0881328`)  
> **Total Inspected Screen Directories**: **111 Screens** + 1 Design System (`parkeazy_design_system/DESIGN.md`)  
> **Customer Website Screens (`pe_uw_*`)**: **54 Screens**  
> **Host Portal Screens (`pe_hw_*` & `pe_hp_*`)**: **57 Screens**  
> **Admin Panel Screens (`pe_aw_*`)**: **0 Screens (DESIGN GAP REPORTED)**

---

## 1. Traceability Matrix Architecture

Every screen is traced along the standardized engineering contract:
`Original Design Source → Screen → User Role → Proposed Route → API Capability → Domain Entity → Validation → Test Type → Implementation Status`

Status Codes:
- `PARTIAL`: Scaffold entry point active in monorepo; full business logic & forms deferred to target phase.
- `NOT IMPLEMENTED`: Screen audited and mapped; implementation deferred to designated future phase.
- `GAP — PENDING DESIGN`: Required capability identified; authoritative design export missing from repository.

---

## 2. Customer Website (`apps/website`) — 54 Screens

### Group 1: Landing & Discovery (Phase 06 & Phase 09)

| Screen Name | Original Source Directory | Proposed Route | Primary API Endpoint | Domain Entity | Status | Target Phase |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| User Website Landing Page | `user_website_landing_page_pe_uw_01_01` | `/` | `GET /api/v1/facilities/featured` | `Facility` | PARTIAL | Part 00 / 09 |
| Explore Parking Catalog | `explore_parking_pe_uw_03_01` | `/explore` | `GET /api/v1/search/explore` | `Facility`, `ParkingSpace` | NOT IMPLEMENTED | Part 06 |
| Location Search Suggestions | `location_search_suggestions_pe_uw_03_02` | `/search/suggestions` | `GET /api/v1/search/suggestions` | `GeoLocation` | NOT IMPLEMENTED | Part 06 |
| Search Filters & Preferences | `search_filters_preferences_pe_uw_03_03` | `/search/filters` | `GET /api/v1/facilities/amenities` | `SpaceAmenity` | NOT IMPLEMENTED | Part 06 |
| Search Results List & Map Split | `search_results_list_map_pe_uw_03_04` | `/search` | `POST /api/v1/search/query` | `ParkingSpace` | NOT IMPLEMENTED | Part 06 |
| Search Results List View | `search_results_list_view_pe_uw_03_05` | `/search/list` | `POST /api/v1/search/query` | `ParkingSpace` | NOT IMPLEMENTED | Part 06 |
| Search Results Map View | `search_results_map_view_pe_uw_03_06` | `/search/map` | `POST /api/v1/search/query` | `ParkingSpace` | NOT IMPLEMENTED | Part 06 |
| No Results & Suggestions | `no_results_alternative_suggestions_pe_uw_03_07` | `/search/empty` | `GET /api/v1/search/fallback` | `GeoLocation` | NOT IMPLEMENTED | Part 06 |
| Location Permission & Errors | `search_loading_error_location_permission_states_pe_uw_03_08` | `/search/permission`| Client Browser API | `Session` | NOT IMPLEMENTED | Part 06 |

### Group 2: Customer Authentication & Onboarding (Phase 04)

| Screen Name | Original Source Directory | Proposed Route | Primary API Endpoint | Domain Entity | Status | Target Phase |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| User Login | `user_login_pe_uw_02_01` | `/auth/login` | `POST /api/v1/auth/login` | `User`, `Identity` | NOT IMPLEMENTED | Part 04 |
| User Signup | `user_signup_pe_uw_02_02` | `/auth/signup` | `POST /api/v1/auth/signup` | `User`, `Profile` | NOT IMPLEMENTED | Part 04 |
| Verify Email | `verify_email_pe_uw_02_03` | `/auth/verify-email` | `POST /api/v1/auth/verify-email` | `User` | NOT IMPLEMENTED | Part 04 |
| Verify Mobile OTP | `verify_mobile_otp_pe_uw_02_04` | `/auth/verify-otp` | `POST /api/v1/auth/verify-otp` | `User`, `OtpChallenge`| NOT IMPLEMENTED | Part 04 |
| Forgot Password | `forgot_password_pe_uw_02_05` | `/auth/forgot-password` | `POST /api/v1/auth/forgot-pwd` | `User` | NOT IMPLEMENTED | Part 04 |
| Reset Password | `reset_password_pe_uw_02_06` | `/auth/reset-password` | `POST /api/v1/auth/reset-pwd` | `User` | NOT IMPLEMENTED | Part 04 |
| Verification Required Gate | `verification_required_pe_uw_02_07` | `/auth/verification-gate`| `GET /api/v1/users/me/status` | `User` | NOT IMPLEMENTED | Part 04 |
| Authentication Error States | `authentication_error_states_pe_uw_02_08` | `/auth/error` | Client Form Error Handler | `User` | NOT IMPLEMENTED | Part 04 |
| Session Expired Modal | `session_expired_pe_uw_02_09` | `/auth/session-expired` | `POST /api/v1/auth/refresh` | `Session` | NOT IMPLEMENTED | Part 04 |
| Account Access Success | `account_access_success_pe_uw_02_10` | `/auth/welcome` | Client Redirect Handler | `User` | NOT IMPLEMENTED | Part 04 |

### Group 3: Parking Space Details & Booking Flow (Phase 07)

| Screen Name | Original Source Directory | Proposed Route | Primary API Endpoint | Domain Entity | Status | Target Phase |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| Parking Details & Summary | `parking_details_booking_summary_pe_uw_04_01` | `/spaces/:spaceId` | `GET /api/v1/spaces/:id` | `ParkingSpace`, `Facility`| NOT IMPLEMENTED | Part 07 |
| Select Date & Duration | `select_parking_date_duration_pe_uw_04_02` | `/spaces/:spaceId/duration`| `GET /api/v1/spaces/:id/slots` | `OperatingSchedule` | NOT IMPLEMENTED | Part 07 |
| Availability Space Selection | `availability_space_selection_pe_uw_04_03` | `/spaces/:spaceId/select` | `POST /api/v1/spaces/:id/check`| `ParkingSpace` | NOT IMPLEMENTED | Part 07 |
| Booking Details & Vehicle | `booking_details_vehicle_pe_uw_04_04` | `/checkout/vehicle` | `GET /api/v1/users/me/vehicles`| `UserVehicle` | NOT IMPLEMENTED | Part 07 |
| Review Price Breakdown | `review_booking_price_breakdown_pe_uw_04_05` | `/checkout/review` | `POST /api/v1/bookings/calculate`| `FeeRule`, `Booking` | NOT IMPLEMENTED | Part 07 |
| Booking Processing State | `booking_processing_pe_uw_04_06` | `/checkout/processing` | `POST /api/v1/bookings/hold` | `ReservationHold` | NOT IMPLEMENTED | Part 07 |
| Booking Confirmed & Pass | `booking_confirmed_pe_uw_04_07` | `/bookings/:id/confirmed` | `GET /api/v1/bookings/:id/pass` | `Booking`, `QrPass` | NOT IMPLEMENTED | Part 07 |
| Space Unavailable Recovery | `booking_unavailable_recovery_pe_uw_04_08` | `/checkout/unavailable` | `GET /api/v1/spaces/alternatives`| `ParkingSpace` | NOT IMPLEMENTED | Part 07 |
| Hold Validation & Expiry | `booking_validation_expiry_states_pe_uw_04_09` | `/checkout/expired` | `POST /api/v1/bookings/renew-hold`| `ReservationHold` | NOT IMPLEMENTED | Part 07 |

### Group 4: Payments & Checkout (Phase 08)

| Screen Name | Original Source Directory | Proposed Route | Primary API Endpoint | Domain Entity | Status | Target Phase |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| Choose Payment Method | `choose_payment_method_pe_uw_05_01` | `/checkout/payment` | `GET /api/v1/payments/methods` | `PaymentMethod` | NOT IMPLEMENTED | Part 08 |
| Payment Review Authorization | `payment_review_authorization_pe_uw_05_02` | `/checkout/authorize` | `POST /api/v1/payments/initiate`| `PaymentAttempt` | NOT IMPLEMENTED | Part 08 |
| Payment Gateway Processing | `payment_processing_pe_uw_05_03` | `/checkout/gateway` | `GET /api/v1/payments/:id/status`| `PaymentAttempt` | NOT IMPLEMENTED | Part 08 |
| Payment Successful & Receipt | `payment_successful_pe_uw_05_04` | `/checkout/success` | `GET /api/v1/payments/:id/receipt`| `PaymentTransaction` | NOT IMPLEMENTED | Part 08 |
| Payment Failed & Retry | `payment_failed_pe_uw_05_05` | `/checkout/failed` | `POST /api/v1/payments/retry` | `PaymentAttempt` | NOT IMPLEMENTED | Part 08 |
| Payment Pending Polling | `payment_pending_status_check_pe_uw_05_06` | `/checkout/pending` | `GET /api/v1/payments/:id/poll` | `PaymentAttempt` | NOT IMPLEMENTED | Part 08 |
| Payment Cancelled | `payment_cancelled_pe_uw_05_07` | `/checkout/cancelled` | Client Checkout State | `PaymentAttempt` | NOT IMPLEMENTED | Part 08 |
| Payment Reconciliation States | `payment_recovery_reconciliation_states_pe_uw_05_08`| `/checkout/reconcile` | `POST /api/v1/payments/verify-debit`| `PaymentTransaction`| NOT IMPLEMENTED | Part 08 |

### Group 5: Active Booking, Parking Sessions & Receipts (Phase 07 & 09)

| Screen Name | Original Source Directory | Proposed Route | Primary API Endpoint | Domain Entity | Status | Target Phase |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| My Bookings Overview | `my_bookings_overview_pe_uw_06_01` | `/bookings` | `GET /api/v1/bookings/my` | `Booking` | NOT IMPLEMENTED | Part 07 |
| Upcoming Booking Details | `upcoming_booking_details_pe_uw_06_02` | `/bookings/:id` | `GET /api/v1/bookings/:id` | `Booking`, `Facility` | NOT IMPLEMENTED | Part 07 |
| Active Parking Session | `active_parking_session_pe_uw_06_03` | `/bookings/:id/active` | `GET /api/v1/bookings/:id/live` | `BookingSession` | NOT IMPLEMENTED | Part 07 |
| Extend Parking Duration | `extend_parking_duration_pe_uw_06_04` | `/bookings/:id/extend` | `POST /api/v1/bookings/:id/extend`| `BookingExtension` | NOT IMPLEMENTED | Part 07 |
| Cancel Booking Review | `cancel_booking_review_pe_uw_06_05` | `/bookings/:id/cancel` | `POST /api/v1/bookings/:id/cancel-preview`| `RefundRecord` | NOT IMPLEMENTED | Part 07 |
| Booking Cancelled | `booking_cancelled_pe_uw_06_06` | `/bookings/:id/cancelled`| `POST /api/v1/bookings/:id/cancel` | `Booking` | NOT IMPLEMENTED | Part 07 |
| Booking History & Receipts | `booking_history_receipts_pe_uw_06_07` | `/bookings/receipts` | `GET /api/v1/bookings/receipts`| `TaxInvoice` | NOT IMPLEMENTED | Part 07 |
| Booking Issue & Support | `booking_issue_support_pe_uw_06_08` | `/bookings/:id/support`| `POST /api/v1/support/tickets` | `SupportTicket` | NOT IMPLEMENTED | Part 12 |
| Booking Exceptions & Overstay | `booking_changes_exception_states_pe_uw_06_09` | `/bookings/:id/overstay` | `GET /api/v1/bookings/:id/penalties`| `OverstayRecord` | NOT IMPLEMENTED | Part 07 |

### Group 6: Profile, Vehicles & Settings (Phase 04)

| Screen Name | Original Source Directory | Proposed Route | Primary API Endpoint | Domain Entity | Status | Target Phase |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| User Profile Overview | `user_profile_overview_pe_uw_07_01` | `/account/profile` | `GET /api/v1/users/me` | `UserProfile` | NOT IMPLEMENTED | Part 04 |
| Edit Personal Details | `edit_personal_details_pe_uw_07_02` | `/account/profile/edit` | `PUT /api/v1/users/me` | `UserProfile` | NOT IMPLEMENTED | Part 04 |
| My Vehicles List | `my_vehicles_pe_uw_07_03` | `/account/vehicles` | `GET /api/v1/users/me/vehicles`| `UserVehicle` | NOT IMPLEMENTED | Part 04 |
| Add/Edit Vehicle Modal | `add_edit_vehicle_pe_uw_07_04` | `/account/vehicles/add` | `POST /api/v1/users/me/vehicles`| `UserVehicle` | NOT IMPLEMENTED | Part 04 |
| Saved Places & Favorites | `saved_places_favorites_pe_uw_07_05` | `/account/favorites` | `GET /api/v1/users/me/favorites`| `FavoritePlace` | NOT IMPLEMENTED | Part 04 |
| Notifications Centre | `notifications_centre_pe_uw_07_06` | `/account/notifications`| `GET /api/v1/notifications` | `NotificationRecord` | NOT IMPLEMENTED | Part 12 |
| Notification Preferences | `notification_preferences_pe_uw_07_07` | `/account/notifications/settings`| `PUT /api/v1/notifications/prefs`| `NotificationPref` | NOT IMPLEMENTED | Part 12 |
| Account Security & Sessions | `account_security_sessions_pe_uw_07_08` | `/account/security` | `GET /api/v1/auth/sessions` | `UserSession` | NOT IMPLEMENTED | Part 04 |
| Privacy & Account Closure | `privacy_consents_account_closure_pe_uw_07_09` | `/account/closure` | `POST /api/v1/users/me/close` | `User` | NOT IMPLEMENTED | Part 04 |

---

## 3. Host Portal (`apps/host`) — 57 Screens

### Group 1: Host Onboarding & Registration (Phase 04 & Phase 05)

| Screen Name | Original Source Directory | Proposed Route | Primary API Endpoint | Domain Entity | Status | Target Phase |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| Host Login | `host_login_pe_hw_01_01` | `/host/login` | `POST /api/v1/auth/host/login` | `HostProfile` | NOT IMPLEMENTED | Part 04 |
| Host Account Registration | `host_account_registration_pe_hw_01_02` | `/host/register` | `POST /api/v1/auth/host/register`| `HostProfile` | NOT IMPLEMENTED | Part 04 |
| Host Email/Mobile Verification | `host_email_mobile_verification_pe_hw_01_03` | `/host/verify` | `POST /api/v1/auth/host/verify` | `HostProfile` | NOT IMPLEMENTED | Part 04 |
| Host Password Recovery | `host_password_recovery_pe_hw_01_04` | `/host/forgot-password` | `POST /api/v1/auth/host/forgot` | `User` | NOT IMPLEMENTED | Part 04 |
| Host Onboarding Overview | `host_onboarding_overview_pe_hw_01_05` | `/host/onboarding` | `GET /api/v1/hosts/me/onboarding`| `HostProfile` | NOT IMPLEMENTED | Part 05 |
| Host Profile & Contact Details | `host_profile_contact_details_pe_hw_01_06` | `/host/onboarding/contact`| `PUT /api/v1/hosts/me/contact` | `HostProfile` | NOT IMPLEMENTED | Part 05 |
| Host Eligibility Requirements | `host_eligibility_required_information_pe_hw_01_07`| `/host/onboarding/eligibility`| `POST /api/v1/hosts/me/kyc` | `KycDocument` | NOT IMPLEMENTED | Part 05 |
| Host Application Status | `host_application_setup_status_pe_hw_01_08` | `/host/onboarding/status` | `GET /api/v1/hosts/me/status` | `HostProfile` | NOT IMPLEMENTED | Part 05 |
| Host Access Exception States | `host_access_onboarding_exception_states_pe_hw_01_09`| `/host/onboarding/exceptions`| `GET /api/v1/hosts/me/appeals` | `KycDocument` | NOT IMPLEMENTED | Part 05 |

### Group 2: Host Operations Dashboard & Metrics (Phase 10)

| Screen Name | Original Source Directory | Proposed Route | Primary API Endpoint | Domain Entity | Status | Target Phase |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| Host Operations Dashboard | `host_operations_dashboard_pe_hp_02_01` | `/host/dashboard` | `GET /api/v1/hosts/me/dashboard`| `Facility`, `Booking` | PARTIAL | Part 00 / 10 |
| Host Booking Operations Manifest| `host_booking_operations_pe_hp_07_01` | `/host/operations` | `GET /api/v1/hosts/me/manifest` | `Booking` | NOT IMPLEMENTED | Part 10 |
| Host Spaces Inventory Visualizer| `host_spaces_inventory_management_pe_hp_04_01` | `/host/spaces/matrix` | `GET /api/v1/facilities/:id/matrix`| `ParkingSpace` | NOT IMPLEMENTED | Part 10 |

### Group 3: Facility Setup & Physical Spaces (Phase 05)

| Screen Name | Original Source Directory | Proposed Route | Primary API Endpoint | Domain Entity | Status | Target Phase |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| Host Spaces Overview | `host_spaces_overview_pe_hw_02_01` | `/host/spaces` | `GET /api/v1/hosts/me/spaces` | `ParkingSpace` | NOT IMPLEMENTED | Part 05 |
| Add Parking Facility Wizard | `add_parking_facility_pe_hw_02_02` | `/host/facilities/new` | `POST /api/v1/facilities` | `ParkingFacility` | NOT IMPLEMENTED | Part 05 |
| Facility Details & Entrance | `facility_details_entrance_pe_hw_02_03` | `/host/facilities/:id/gate`| `PUT /api/v1/facilities/:id/gate`| `ParkingFacility` | NOT IMPLEMENTED | Part 05 |
| Physical Inventory Bay Layout | `physical_inventory_bay_layout_pe_hw_02_04` | `/host/facilities/:id/layout`| `POST /api/v1/facilities/:id/bays`| `ParkingSpace` | NOT IMPLEMENTED | Part 05 |
| Add/Edit Individual Space | `add_edit_parking_space_pe_hw_02_05` | `/host/spaces/:id/edit` | `PUT /api/v1/spaces/:id` | `ParkingSpace` | NOT IMPLEMENTED | Part 05 |
| Vehicle Compatibility & Restrictions| `vehicle_compatibility_restrictions_pe_hw_02_06`| `/host/spaces/:id/restrictions`| `PUT /api/v1/spaces/:id/rules`| `VehicleRestriction`| NOT IMPLEMENTED | Part 05 |
| Space Amenities & Instructions | `space_amenities_access_instructions_pe_hw_02_07`| `/host/spaces/:id/amenities`| `PUT /api/v1/spaces/:id/amenities`| `SpaceAmenity` | NOT IMPLEMENTED | Part 05 |
| Photos & Listing Preview | `photos_listing_preview_pe_hw_02_08` | `/host/facilities/:id/preview`| `POST /api/v1/facilities/:id/photos`| `SpaceMedia` | NOT IMPLEMENTED | Part 05 |
| Publication Readiness Audit | `inventory_validation_publication_readiness_pe_hw_02_09`| `/host/facilities/:id/publish`| `POST /api/v1/facilities/:id/publish`| `ParkingFacility`| NOT IMPLEMENTED | Part 05 |

### Group 4: Availability Schedules & Space Pricing (Phase 05 & 06)

| Screen Name | Original Source Directory | Proposed Route | Primary API Endpoint | Domain Entity | Status | Target Phase |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| Availability & Pricing Overview | `availability_pricing_overview_pe_hw_03_01` | `/host/pricing` | `GET /api/v1/hosts/me/pricing` | `PricingTier` | NOT IMPLEMENTED | Part 05 |
| Space Pricing Configuration | `space_pricing_configuration_pe_hw_03_02` | `/host/pricing/rates` | `PUT /api/v1/facilities/:id/rates`| `PricingTier` | NOT IMPLEMENTED | Part 05 |
| Weekly Operating Hours | `operating_hours_weekly_schedule_pe_hw_03_03` | `/host/pricing/schedule` | `PUT /api/v1/facilities/:id/hours`| `OperatingSchedule`| NOT IMPLEMENTED | Part 05 |
| Date-Specific Closures | `date_specific_availability_closures_pe_hw_03_04`| `/host/pricing/closures` | `POST /api/v1/facilities/:id/closures`| `ClosureInterval` | NOT IMPLEMENTED | Part 05 |
| Duration & Advance Booking Rules| `booking_duration_advance_booking_rules_pe_hw_03_05`| `/host/pricing/rules` | `PUT /api/v1/facilities/:id/limits`| `BookingRule` | NOT IMPLEMENTED | Part 05 |
| Earnings Preview & Calculator | `pricing_preview_earnings_estimate_pe_hw_03_06` | `/host/pricing/estimate`| `POST /api/v1/pricing/simulate`| `FeeRule` | NOT IMPLEMENTED | Part 05 |
| Bulk Pricing Updates | `bulk_pricing_schedule_updates_pe_hw_03_07` | `/host/pricing/bulk` | `PATCH /api/v1/spaces/bulk-pricing`| `PricingTier` | NOT IMPLEMENTED | Part 05 |
| Availability Conflict Review | `availability_conflict_change_review_pe_hw_03_08`| `/host/pricing/conflicts`| `POST /api/v1/facilities/check-conflicts`| `Booking` | NOT IMPLEMENTED | Part 05 |
| Pricing Change History Audit | `pricing_availability_change_history_pe_hw_03_09`| `/host/pricing/history` | `GET /api/v1/facilities/:id/audit-log`| `PricingAudit` | NOT IMPLEMENTED | Part 05 |

### Group 5: Arrivals, Check-In & Gate Operations (Phase 10)

| Screen Name | Original Source Directory | Proposed Route | Primary API Endpoint | Domain Entity | Status | Target Phase |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| Booking Operations Overview | `host_booking_operations_overview_pe_hw_04_01` | `/host/gate` | `GET /api/v1/gate/overview` | `Booking` | NOT IMPLEMENTED | Part 10 |
| Booking Search & Plate Filter | `booking_list_search_pe_hw_04_02` | `/host/gate/search` | `GET /api/v1/gate/bookings` | `Booking` | NOT IMPLEMENTED | Part 10 |
| Booking Terms & Vehicle Card | `booking_details_commercial_terms_pe_hw_04_03`| `/host/gate/bookings/:id` | `GET /api/v1/gate/bookings/:id` | `Booking` | NOT IMPLEMENTED | Part 10 |
| Arrival Check-in Operations | `arrival_check_in_operations_pe_hw_04_04` | `/host/gate/check-in` | `POST /api/v1/gate/check-in` | `BookingSession` | NOT IMPLEMENTED | Part 10 |
| Active Parking Occupancy Map | `active_parking_occupancy_pe_hw_04_05` | `/host/gate/occupancy` | `GET /api/v1/gate/occupancy-map`| `ParkingSpace` | NOT IMPLEMENTED | Part 10 |
| Departure Check-out Operations | `departure_check_out_operations_pe_hw_04_06` | `/host/gate/check-out` | `POST /api/v1/gate/check-out` | `BookingSession` | NOT IMPLEMENTED | Part 10 |
| Extension Decisions | `extension_requests_decisions_pe_hw_04_07` | `/host/gate/extensions` | `POST /api/v1/gate/extensions/:id/decide`| `BookingExtension`| NOT IMPLEMENTED | Part 10 |
| Conflict & Duplicate Resolution | `booking_exceptions_conflict_resolution_pe_hw_04_08`| `/host/gate/conflicts` | `POST /api/v1/gate/resolve-conflict`| `GateIncident` | NOT IMPLEMENTED | Part 10 |
| Gate Activity & Shift Audit Log | `operational_activity_booking_audit_pe_hw_04_09`| `/host/gate/audit` | `GET /api/v1/gate/shift-log` | `GateLog` | NOT IMPLEMENTED | Part 10 |

### Group 6: Host Earnings, Financials & Settlements (Phase 08)

| Screen Name | Original Source Directory | Proposed Route | Primary API Endpoint | Domain Entity | Status | Target Phase |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| Financial Overview Dashboard | `host_earnings_financial_overview_pe_hw_05_01` | `/host/earnings` | `GET /api/v1/hosts/me/earnings` | `PayoutSettlement`| NOT IMPLEMENTED | Part 08 |
| Transaction Earnings Ledger | `booking_level_earnings_transaction_ledger_pe_hw_05_02`| `/host/earnings/ledger`| `GET /api/v1/hosts/me/ledger` | `SettlementLineItem`| NOT IMPLEMENTED | Part 08 |
| Platform Commission Breakdown | `platform_commission_fee_breakdown_pe_hw_05_03`| `/host/earnings/fees` | `GET /api/v1/hosts/me/fees` | `PlatformCommission`| NOT IMPLEMENTED | Part 08 |
| Bank Account Payout Settings | `payout_account_settlement_settings_pe_hw_05_04`| `/host/earnings/account` | `PUT /api/v1/hosts/me/bank` | `HostBankAccount` | NOT IMPLEMENTED | Part 08 |
| Payout Schedule & Projections | `payout_schedule_upcoming_settlements_pe_hw_05_05`| `/host/earnings/schedule`| `GET /api/v1/hosts/me/schedule` | `PayoutSchedule` | NOT IMPLEMENTED | Part 08 |
| Payout History & UTR Details | `payout_history_settlement_details_pe_hw_05_06`| `/host/earnings/history` | `GET /api/v1/hosts/me/payouts` | `PayoutSettlement`| NOT IMPLEMENTED | Part 08 |
| Refunds & Disputed Deductions | `refunds_adjustments_disputed_transactions_pe_hw_05_07`| `/host/earnings/disputes`| `GET /api/v1/hosts/me/disputes`| `DisputeDeduction`| NOT IMPLEMENTED | Part 08 |
| Earnings Reports Export Centre | `earnings_reports_export_centre_pe_hw_05_08` | `/host/earnings/export` | `POST /api/v1/hosts/me/export` | `ReportJob` | NOT IMPLEMENTED | Part 08 |
| Financial Exception States | `financial_exceptions_reconciliation_states_pe_hw_05_09`| `/host/earnings/exceptions`| `GET /api/v1/hosts/me/settlement-alerts`| `SettlementAlert` | NOT IMPLEMENTED | Part 08 |

### Group 7: Workspace, Team & Account Settings (Phase 04 & 10)

| Screen Name | Original Source Directory | Proposed Route | Primary API Endpoint | Domain Entity | Status | Target Phase |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| Host Workspace Settings | `host_account_workspace_settings_overview_pe_hw_06_01`| `/host/settings` | `GET /api/v1/hosts/me/settings` | `HostWorkspace` | NOT IMPLEMENTED | Part 10 |
| Business & Tax Details (GSTIN)| `host_profile_business_details_pe_hw_06_02` | `/host/settings/business`| `PUT /api/v1/hosts/me/business` | `HostEntity` | NOT IMPLEMENTED | Part 10 |
| Operational Auto-Approval Rules| `facility_preferences_operational_settings_pe_hw_06_03`| `/host/settings/operations`| `PUT /api/v1/hosts/me/operational-rules`| `HostPreferences` | NOT IMPLEMENTED | Part 10 |
| Team Members & Invitations | `team_members_invitations_pe_hw_06_04` | `/host/settings/team` | `POST /api/v1/hosts/me/team/invite`| `TeamMember` | NOT IMPLEMENTED | Part 10 |
| Roles & Permissions (RBAC) | `roles_permission_management_pe_hw_06_05` | `/host/settings/roles` | `PUT /api/v1/hosts/me/team/:id/role`| `RoleAssignment` | NOT IMPLEMENTED | Part 10 |
| Notification Centre & Alerts | `notification_centre_activity_alerts_pe_hw_06_06`| `/host/settings/notifications`| `GET /api/v1/notifications/host`| `NotificationRecord`| NOT IMPLEMENTED | Part 12 |
| Notification Delivery Channels | `notification_preferences_delivery_channels_pe_hw_06_07`| `/host/settings/channels`| `PUT /api/v1/notifications/host/channels`| `NotificationChannel`| NOT IMPLEMENTED | Part 12 |
| Security Sessions & 2FA | `security_sessions_account_access_pe_hw_06_08` | `/host/settings/security`| `GET /api/v1/auth/host/sessions`| `UserSession` | NOT IMPLEMENTED | Part 04 |
| Host Help & Support Desk | `help_support_host_account_issues_pe_hw_06_09` | `/host/settings/support` | `POST /api/v1/support/host/tickets`| `SupportTicket` | NOT IMPLEMENTED | Part 12 |

---

## 4. Admin Panel Gap Report & Proposed Requirements

- **Actual Source Inventory**: 0 admin screens found in `ParkEazy-Web-Design`.
- **Engineering Contract**: No unapproved mockup screens will be generated. The platform admin capabilities are specified as pure requirements in `docs/PART_01_REQUIREMENTS_BLUEPRINT.md` and `docs/PART_01_API_BLUEPRINT.md` under `[PROPOSED — REQUIRES REVIEW]` status.
- **Phase Target**: Administrative UI implementation is scheduled for **Part 11** once authoritative design assets are exported or approved.
