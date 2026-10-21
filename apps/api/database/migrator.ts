export class MigrationManager {
  private static instance: MigrationManager;

  public static getInstance(): MigrationManager {
    if (!MigrationManager.instance) {
      MigrationManager.instance = new MigrationManager();
    }
    return MigrationManager.instance;
  }

  public async runMigrations(): Promise<void> {
    // Migrations are tracked and applied when PostgreSQL is connected
  }
}

export const migrationManager = MigrationManager.getInstance();
