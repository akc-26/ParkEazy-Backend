# ParkEazy Local Development & Git Workflow Guide

This document provides step-by-step instructions for downloading, installing, running, and contributing to the ParkEazy monorepo from **Windows PowerShell**.

---

## 1. Prerequisites

Before starting, ensure your local development workstation has the following installed:

- **Node.js**: v20.x or v22.x LTS (Recommended: Node 22)
- **npm**: v10.x or higher (comes with Node.js)
- **Git**: v2.40 or higher
- **PowerShell**: Windows PowerShell 5.1 or PowerShell 7 (Core)

Verify your environment by running in PowerShell:
```powershell
node -v
npm -v
git --version
```

---

## 2. Initial Setup on Windows

### 2.1 Download or Clone the Repository
Download and extract the zip archive or clone the repository:
```powershell
# Navigate to your development directory
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

### 2.3 Install Dependencies
Install all workspace dependencies from the monorepo root:
```powershell
npm install
```
This configures npm workspaces across `apps/*`, `services/*`, and `packages/*` with a single, consolidated `node_modules` directory.

---

## 3. Running the Applications Locally

Each application is configured to run on an isolated development port to prevent collisions:

| Component | Directory | Port | Command |
| :--- | :--- | :--- | :--- |
| **All Apps & API** | Root | Various | `npm run dev:all` |
| **Preview Workspace** | Root | `3000` | `npm run dev` |
| **Customer Website** | `apps/website` | `3001` | `npm run dev:website` |
| **Host Portal** | `apps/host` | `3002` | `npm run dev:host` |
| **Admin Panel** | `apps/admin` | `3003` | `npm run dev:admin` |
| **NestJS Backend API**| `services/api` | `4000` | `npm run dev:api` |

### 3.1 Running Individual Services in PowerShell
Open separate PowerShell tabs for each service you wish to run:

**Tab 1 — NestJS Backend API:**
```powershell
npm run dev:api
# Output: [ParkEazy API] Server is listening at http://localhost:4000
# Output: [ParkEazy API] Health check available at: http://localhost:4000/health
```

**Tab 2 — Customer Marketplace Website:**
```powershell
npm run dev:website
# Available at http://localhost:3001
```

**Tab 3 — Host Portal:**
```powershell
npm run dev:host
# Available at http://localhost:3002
```

**Tab 4 — Admin Panel:**
```powershell
npm run dev:admin
# Available at http://localhost:3003
```

---

## 4. Code Quality, Testing, and Verification

Run the following commands from the repository root:

### 4.1 Type Checking
```powershell
npm run typecheck
```
Verifies TypeScript compilation across all packages, apps, and backend services without emitting files.

### 4.2 Automated Testing
```powershell
npm run test
```
Executes the Vitest test suite in `tests/` verifying token compliance, schema validation, and API contracts.

### 4.3 Production Build
```powershell
npm run build
```
Builds all applications and packages for production deployment.

---

## 5. Git Feature-Branch Workflow

All Git operations are managed locally by the developer. Follow this standardized workflow when contributing features:

### 5.1 Check Repository Status
```powershell
git status
```

### 5.2 Create a Feature Branch
Branch naming convention: `<type>/<issue-or-phase>-<short-description>`
Examples:
- `scaffold/part-00-foundation`
- `feature/part-01-auth-module`
- `feature/part-02-spaces-inventory`

```powershell
git checkout -b scaffold/part-00-foundation
```

### 5.3 Commit Guidelines
Commit messages should follow the Conventional Commits format:
- `feat: add customer search dock scaffold`
- `fix: resolve port conflict in host portal config`
- `docs: update design source mapping checklist`
- `refactor: extract shared metric card to shared-ui`

```powershell
git add .
git commit -m "feat(scaffold): initialize ParkEazy Part 00 monorepo foundation"
```

### 5.4 Push to Remote Repository
```powershell
git push -u origin scaffold/part-00-foundation
```
Create a Pull Request against `main` on GitHub for code review.
