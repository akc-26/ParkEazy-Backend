# ParkEazy Local Infrastructure Scaffold

This directory provides optional container definitions for developers who wish to spin up a local PostgreSQL database or Redis instance when implementing future phases (Parts 01-05).

## Usage (Windows PowerShell)

```powershell
docker compose -f infrastructure/docker-compose.yml up -d
```

> **Part 00 Policy**: The database and cache services are **not required or initialized** for Part 00 verification.
