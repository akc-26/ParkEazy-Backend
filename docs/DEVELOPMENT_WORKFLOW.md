# ParkEazy Local Development & Git Workflow Guide

This document provides step-by-step instructions for downloading, installing, running, and contributing to the ParkEazy monorepo from **Windows PowerShell**.

---

## 1. Prerequisites & Supported Environment

Before starting, ensure your local development workstation satisfies the verified runtime baseline:

- **Node.js**: v20.x or v22.x LTS (Tested & Recommended: **Node 22 LTS**)
- **npm**: v10.x or higher (npm workspaces enabled)
- **Git**: v2.40 or higher
- **PowerShell**: Windows PowerShell 5.1 or PowerShell 7+ (Core)
- **OS**: Windows 10/11, macOS, or Linux

Verify your environment by running in PowerShell:
```powershell
node -v
npm -v
git --version
```

---

## 2. Initial Setup on Windows

### 2.1 Download or Clone the Repository
Download and extract the zip archive from Google AI Studio or clone the repository:
```powershell
# Navigate to your development workspace
cd C:\Development

# If cloning directly:
git clone https://github.com/akc-26/ParkEazy-Backend.git
cd ParkEazy-Backend
```

### 2.2 Configure Environment Variables
Copy the template environment file:
```powershell
Copy-Item .env.example .env
```

### 2.3 Install Workspace Dependencies
Install all workspace dependencies from the monorepo root:
```powershell
npm install
```
This configures npm workspaces across `apps/*`, `services/*`, and `packages/*` with a single, consolidated `node_modules` directory and synchronized `package-lock.json`.

---

## 3. Running the Applications Locally

Each application is configured to run on an isolated development port to prevent collisions:

| Component | Directory | Port | Command |
| :--- | :--- | :--- | :--- |
| **All Apps & API** | Root | Various | `npm run dev:all` |
| **Monorepo Preview Navigator** | Root | `3000` | `npm run dev` |
| **Customer Website** | `apps/website` | `3001` | `npm run dev:website` |
| **Host Operations Portal** | `apps/host` | `3002` | `npm run dev:host` |
| **Platform Admin Panel** | `apps/admin` | `3003` | `npm run dev:admin` |
| **NestJS Backend REST API** | `services/api` | `4000` | `npm run dev:api` |

### 3.1 Running Individual Services in PowerShell
Open separate PowerShell tabs for each service you wish to run:

**Tab 1 — NestJS Backend API:**
```powershell
npm run dev:api
# Output: [ParkEazy API] Server is listening at http://localhost:4000
# Output: [ParkEazy API] Health check available at: http://localhost:4000/health
# Output: [ParkEazy API] API prefix active: http://localhost:4000/api/v1
```

**Tab 2 — Customer Marketplace Website:**
```powershell
npm run dev:website
# Available at http://localhost:3001
```

**Tab 3 — Host Operations Portal:**
```powershell
npm run dev:host
# Available at http://localhost:3002
```

**Tab 4 — Platform Admin Panel:**
```powershell
npm run dev:admin
# Available at http://localhost:3003
```

---

## 4. Code Quality, Testing, and Verification

Run the following verified commands from the repository root:

### 4.1 Type Checking
```powershell
npm run typecheck
```
Verifies TypeScript compilation across all packages, apps, and backend services without emitting files.

### 4.2 Automated Testing
```powershell
npm run test
```
Executes the Vitest test suite in `tests/` verifying token compliance, schema validation, API client fallback contracts, and NestJS `HealthService` execution.

### 4.3 Production Build
```powershell
npm run build
```
Builds all applications and packages for production deployment via Vite.

---

## 5. Consolidated Verification Script (Planned for Part 02)

To streamline developer onboarding on Windows and continuous integration in GitHub Actions, a unified single-command verification script is planned:

`node scripts/verify-local.mjs`

### Implementation Status:
- **Part 01 Status**: **PLANNED & DOCUMENTED (Target: Part 02)**.
- In strict adherence to Section 19, this script is scheduled for implementation, hardening, and multi-platform testing in **Part 02: Development-Tooling Hardening and Consolidated Verification Script**.
- For Part 01 verification, developers should execute the active commands (`npm run typecheck`, `npm run test`, `npm run build`) listed in Section 4.

When delivered in Part 02, the script will execute in a single step:
1. Workspace lockfile and dependency consistency checks.
2. Root typecheck across apps, services, and packages.
3. Automated test execution.
4. Production bundle builds for website, host, admin, and API.
5. Exit with explicit `PASS`/`FAIL` metrics without modifying source code or initiating uncontrolled background processes.

---

## 6. Git Feature-Branch & Contribution Workflow

All Git operations (branch creation, commits, pushes, and merges) are performed locally by the developer from Windows PowerShell. Google AI Studio never executes Git push or branch operations directly.

### 6.1 Check Working Directory
```powershell
git status
```

### 6.2 Feature Branching Convention
Branch naming follows the pattern: `<type>/<phase-or-feature>-<description>`
Examples:
- `feature/part-00-project-foundation` (Completed: Commit `3238969`)
- `feature/part-01-design-audit-blueprint` (Active Part 01)
- `feature/part-02-verification-tooling`
- `feature/part-03-database-contracts`

```powershell
git checkout -b feature/part-01-design-audit-blueprint
```

### 6.3 Commit Messages
Follow the Conventional Commits specification:
- `feat(blueprint): complete 111-screen design inventory and traceability matrix`
- `docs(roadmap): establish 15-phase implementation sequence`
- `refactor(config): centralize workspace port constants`

```powershell
git add .
git commit -m "docs(part-01): finalize authoritative design audit and implementation blueprint"
```

### 6.4 Push to GitHub
```powershell
git push -u origin feature/part-01-design-audit-blueprint
```
Open a Pull Request on GitHub against `main` for team code review and CI verification.
