import { Module, Global } from '@nestjs/common';
import { DatabaseConfigService } from './database.config';
import { DatabaseService } from './database.service';
import { SeedService } from './seed.service';

@Global()
@Module({
  providers: [DatabaseConfigService, DatabaseService, SeedService],
  exports: [DatabaseConfigService, DatabaseService, SeedService],
})
export class DatabaseModule {}
