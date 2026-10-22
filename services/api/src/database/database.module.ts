import { Module } from '@nestjs/common';
import { DatabaseConfigService } from './database.config.js';
import { DatabaseService } from './database.service.js';
@Module({ providers: [DatabaseConfigService, DatabaseService], exports: [DatabaseConfigService, DatabaseService] })
export class DatabaseModule {}
