# ParkEazy — Part 02: Design-Fidelity Enforcement & Traceability Register

> **Status**: ACTIVE PHASE TRACEABILITY REGISTER (Part 02)  
> **Authoritative Design Repository**: `https://github.com/akc-26/ParkEazy-Web-Design`  
> **Verified Design Commit**: `088132819181292b46adc6df9d87e155822f79ba`  
> **Mandatory Policy Rule**: The authoritative design repository is the sole source of truth for all UI/UX. Existing designs are preserved with high fidelity. No screen is simplified or redesigned.

---

## 1. Verified Inventory of Design Source

| Category | Screen Prefix | Export Location | Screen Count | Status in Design Repo |
| :--- | :--- | :--- | :---: | :--- |
| **Customer Website** | `pe_uw_*` | `stitch-export/user_website_*` | 54 | Verified in `0881328` |
| **Host Operations Portal** | `pe_hw_*` / `pe_hp_*` | `stitch-export/host_*` | 57 | Verified in `0881328` |
| **Platform Admin Panel** | N/A | N/A | 0 | **Design Gap: Zero screens exported in repo** |

---

## 2. Part 02 Screen Traceability & Routing Integration

| Application | Active URL Path | Authoritative Design Source Path | Fidelity Verification Status | Adaptations Made in Part 02 |
| :--- | :--- | :--- | :--- | :--- |
| **Customer Website** | `http://localhost:3001/` | `stitch-export/user_website_landing_page_pe_uw_01_01` | **High Fidelity (Preserved)** | Wired same-origin client navigation from "Host Sign In" and "Host a Space" to `/host/`. No visual layout changes. |
| **Host Operations Portal** | `http://localhost:3001/host/` | `stitch-export/host_operations_dashboard_pe_hp_02_01` | **High Fidelity (Preserved)** | Wired same-origin client navigation to Customer Marketplace (`/`). Preserved facility summary, status badges, and metric cards. |
| **Platform Admin Panel** | `http://localhost:3001/admin/` | `[Design Source Gap: No admin screens in ParkEazy-Web-Design]` | **Gap Identified & Documented** | Maintained foundation layout with prominent disclosure warning. Wired links to `/` and `/host/`. No unapproved designs invented. |
| **Monorepo Developer Hub** | `http://localhost:3001/overview` | Monorepo Architectural Dashboard | **Infrastructure Only** | Centralized route bar displaying active URL path, portal switcher tabs, and live health diagnostics. |

---

## 3. Explicit Admin Panel Design Gap Register

| Gap ID | Description | Impact | Policy Action |
| :---: | :--- | :--- | :--- |
| **GAP-ADMIN-01** | Authoritative design export contains 0 screens with prefix `pe_aw_*` or admin tags. | Cannot implement production admin UX without speculative invention. | Maintain scaffolding disclosure in `apps/admin/src/App.tsx`. Request official design export before Part 11 (Admin Panel phase). Do not invent admin designs. |

---

## 4. Preservation of Authoritative Color Tokens & Typography

All portals continue to consume design tokens strictly from `@parkeazy/branding`:
- **Primary Emerald**: `#0F766E` (Deep Teal/Emerald)
- **Bright Mint**: `#14B8A6` (Active Accents)
- **Restrained Gold**: `#D6A84F` (Tier & Metric Accents)
- **Deep Ink**: `#101828` (Primary Headings & Navbars)
- **Slate Light**: `#F8FAFC` (Canvas Background)
- **Border Gray**: `#E4E7EC` (Card & Divider Outlines)
- **Typography**: Plus Jakarta Sans (Headings, 700/800) + Inter (Body Copy, 400/500).
