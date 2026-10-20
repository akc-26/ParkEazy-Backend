# ParkEazy — Part 01: Decisions Register & Product Governance

> **Status**: ACTIVE GOVERNANCE REGISTER — ALL ENTRIES ARE UNAPPROVED PROPOSALS PENDING FORMAL SIGN-OFF  
> **Mandatory Policy Rule**: Architectural models, API blueprints, and code implementation MUST NOT treat these values as confirmed requirements or production defaults. All financial rates, commission cuts, cancellation tiers, overstay penalties, hold timeouts, KYC rules, payout schedules, and third-party vendor choices remain strictly unapproved until signed off by designated decision-makers.

---

## 1. Commercial & Operational Decisions Register (Unapproved Proposals)

| ID | Decision Title | Context & Trade-Off | Unapproved Proposed Value | Impact | Priority | Required Approver | Status |
| :---: | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **DEC-01** | **Platform Commission Split** | Market rates range from 10% to 20% of gross parking fees. | Conceptual proposal: 12% fee + 18% GST (Unapproved placeholder) | Revenue model, host retention, checkout calculation. | High | Finance Director / CEO | UNAPPROVED |
| **DEC-02** | **Cancellation & Refund Policy** | Balancing customer flexibility with host income security. | Conceptual proposal: 100% >2h; 50% <2h; 0% post-start (Unapproved placeholder) | Customer trust, host booking stability, refunds. | High | Product Lead & Legal | UNAPPROVED |
| **DEC-03** | **Overstay Penalties & Grace Period** | Handling vehicles that do not vacate by scheduled departure time. | Conceptual proposal: 15m grace, 1.5x hourly surcharge (Unapproved placeholder) | Host slot collisions, attendant conflict escalation. | High | Operations Head | UNAPPROVED |
| **DEC-04** | **Reservation Hold Lease TTL** | Lock duration while customer inputs payment details. | Conceptual proposal: 10 minutes / 600s TTL (Unapproved placeholder) | Prevents slot lockouts from abandoned carts vs. 3DS. | Medium | Tech Lead | UNAPPROVED |
| **DEC-05** | **Host Settlement Cycle & Minimums** | Frequency of automated bank transfers to hosts. | Conceptual proposal: Weekly Friday payout for >₹500 (Unapproved placeholder) | Working capital, bank payout transaction costs. | Medium | Finance Lead | UNAPPROVED |
| **DEC-06** | **Host KYC Documentation Requirements**| Regulatory anti-fraud compliance for listing real estate. | Conceptual proposal: Trade license + GSTIN + Property tax receipt (Unapproved placeholder) | Onboarding drop-off vs. fraudulent listings. | High | Compliance & Legal | UNAPPROVED |

---

## 2. Technical & Integration Decisions Register

| ID | Decision Title | Options Under Review | Recommended Approach | Technical Impact | Priority | Required Approver |
| :---: | :--- | :--- | :--- | :--- | :---: | :---: |
| **DEC-07** | **Authoritative Admin UI Design Assets** | (A) Await design team export to `ParkEazy-Web-Design`. (B) Commission custom admin design export. | Option A: Await authoritative Stitch export; maintain foundation placeholder in Part 01. | Prevents unapproved UI redesign while fulfilling Part 00/01 contracts. | Critical | Product Owner |
| **DEC-08** | **SMS / OTP Provider Selection** | (A) Firebase Phone Auth. (B) Twilio Verify. (C) Fast2SMS / MSG91 (Indian DLT compliant). | Option C/A: Firebase Phone Auth for dev; MSG91 for Indian DLT production delivery. | OTP delivery latency in India, transactional costs per verification. | High | Tech Lead |
| **DEC-09** | **Primary Payment Gateway Selection** | (A) Razorpay (India-focused UPI/Netbanking). (B) Stripe (Global cards). | Primary: Razorpay (for UPI AutoPay & Indian QR). Secondary: Stripe (international tourists). | Webhook schemas, settlement split rails, merchant account KYC. | High | Product Lead |
| **DEC-10** | **Media Storage & CDN Strategy** | (A) AWS S3 + CloudFront. (B) Google Cloud Storage + Cloud CDN. | Option A: S3 private bucket with pre-signed upload URLs and CloudFront image optimization. | Facility photo upload speeds, storage egress costs. | Medium | DevOps Lead |
| **DEC-11** | **Consolidated Verification Script** | Implementation timing for `node scripts/verify-local.mjs`. | Scheduled for implementation and hardening in Part 02. | Windows developer experience, CI reproducibility. | High | Monorepo Architect |

---

## 3. Approval Sign-Off Workflow

Before transitioning any decision from `PROPOSED` to `APPROVED`:
1. Decision champion documents financial, technical, or legal impact in this register.
2. Formal review meeting held with designated approver.
3. Once approved, the corresponding constants are migrated from placeholder defaults into `@parkeazy/config` and applied across domain models.
