import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module.js';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1', { exclude: [{ path: 'health', method: RequestMethod.ALL }] });
  const port = Number(process.env.API_PORT || 4000);
  await app.listen(port, process.env.HOST || '0.0.0.0');
}
void bootstrap();
