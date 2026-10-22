# ParkEazy PH06 RV6 — Authentication Dependency Injection Fix

## Root cause
Registration reached `AuthController.register`, but `this.authService` was undefined, producing `Cannot read properties of undefined (reading 'register')`.

## Changes
- Added explicit NestJS `@Inject(...)` tokens to constructor dependencies across API controllers, services, and guards. This avoids relying solely on emitted constructor metadata for runtime dependency resolution in the current ESM/tsx development setup.
- Kept existing controller routes, DTO validation, service methods, database queries, authentication behavior, and frontend source unchanged.
- No database contents, environment secrets, or Git state were modified.

## Verification
The source ZIP was checked for archive integrity. This environment did not run the project's npm install, TypeScript build, test suite, or live PostgreSQL/API registration flow. Verify those locally before considering the phase complete.

## Local verification
1. Stop the existing API process with Ctrl+C in its terminal.
2. Extract this source into a separate review folder or back up the current RV6 folder before replacing files.
3. Keep your local `.env` private and do not overwrite it with `.env.example`.
4. Run `npm run typecheck`, `npm run test`, and `npm run build:api`.
5. Start one API instance with `npm run dev:api` and test registration with a fresh test email.
