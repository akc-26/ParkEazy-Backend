import { describe, it, expect } from 'vitest';
import { DEFAULT_TENANT_CONFIG, PARKEAZY_DESIGN_TOKENS } from '../packages/branding/src/tokens';
import { validateTenantConfig, isValidEmail, isValidVehiclePlate } from '../packages/validation/src';
import { HealthApiClient } from '../packages/api-client/src';
import { WORKSPACE_PORTS, API_CONFIG } from '../packages/config/src';
import { HealthService } from '../services/api/src/health/health.service';

describe('ParkEazy Monorepo Foundation & Workspace Tooling', () => {
  it('should verify workspace port allocations without conflicts', () => {
    const ports = [
      WORKSPACE_PORTS.preview,
      WORKSPACE_PORTS.website,
      WORKSPACE_PORTS.host,
      WORKSPACE_PORTS.admin,
      WORKSPACE_PORTS.api,
    ];
    const uniquePorts = new Set(ports);
    expect(uniquePorts.size).toBe(5);
    expect(WORKSPACE_PORTS.website).toBe(3001);
    expect(WORKSPACE_PORTS.host).toBe(3002);
    expect(WORKSPACE_PORTS.admin).toBe(3003);
    expect(WORKSPACE_PORTS.api).toBe(4000);
  });

  it('should validate the default tenant configuration against the schema rules', () => {
    const result = validateTenantConfig(DEFAULT_TENANT_CONFIG);
    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.data?.displayName).toBe('ParkEazy');
    expect(result.data?.colors.primary).toBe('#0F766E');
    expect(result.data?.colors.accent).toBe('#D6A84F');
  });

  it('should verify design tokens match the authoritative Stitch specification', () => {
    expect(PARKEAZY_DESIGN_TOKENS.colors.primaryEmerald).toBe('#0F766E');
    expect(PARKEAZY_DESIGN_TOKENS.colors.brightMint).toBe('#14B8A6');
    expect(PARKEAZY_DESIGN_TOKENS.colors.restrainedGold).toBe('#D6A84F');
    expect(PARKEAZY_DESIGN_TOKENS.colors.deepInk).toBe('#101828');
  });

  it('should test validation utilities for emails and vehicle plates', () => {
    expect(isValidEmail('driver@parkeazy.com')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);

    // Indian license plate format validation
    expect(isValidVehiclePlate('TN01AB1234')).toBe(true);
    expect(isValidVehiclePlate('TN-01-AB-1234')).toBe(true);
    expect(isValidVehiclePlate('123456')).toBe(false);
  });

  it('should verify health client offline snapshot matches API contract', () => {
    const client = new HealthApiClient();
    const snapshot = client.getOfflineHealthSnapshot();
    expect(snapshot.status).toBe('ok');
    expect(snapshot.service).toBe(API_CONFIG.serviceName);
    expect(snapshot.details?.monorepoMode).toBe(true);
  });

  it('should verify NestJS HealthService directly generates healthy status', () => {
    const service = new HealthService();
    const health = service.getHealth();
    expect(health.status).toBe('ok');
    expect(health.service).toBe(API_CONFIG.serviceName);
    expect(health.version).toBe(API_CONFIG.version);
    expect(health.details?.apiPrefix).toBe('/api/v1');
    expect(health.details?.plannedDatabase).toBe('PostgreSQL');
    expect(health.details?.database?.engine).toBe('PostgreSQL');
  });

  it('should verify HealthService database health readiness method', () => {
    const service = new HealthService();
    const dbHealth = service.getDatabaseHealth();
    expect(dbHealth.engine).toBe('PostgreSQL');
  });
});
