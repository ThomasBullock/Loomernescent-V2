import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/configure-app';

export interface TestAppHandle {
  app: NestExpressApplication;
  dataSource: DataSource;
}

export async function createTestApp(): Promise<TestAppHandle> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();

  const dataSource = app.get(DataSource);
  return { app, dataSource };
}

export async function truncate(
  ds: DataSource,
  ...tables: string[]
): Promise<void> {
  if (tables.length === 0) return;
  const quoted = tables.map((t) => `"${t}"`).join(', ');
  await ds.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
}
