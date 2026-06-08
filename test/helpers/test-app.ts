import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/configure-app';
import { ImageKitService } from '../../src/common/images/image-kit.service';

export interface FakeImageKit {
  upload: jest.Mock;
  delete: jest.Mock;
  buildUrl: jest.Mock;
}

export interface TestAppHandle {
  app: NestExpressApplication;
  dataSource: DataSource;
  imageKit: FakeImageKit;
}

export async function createTestApp(): Promise<TestAppHandle> {
  const imageKit: FakeImageKit = {
    upload: jest.fn(
      ({ filenameHint, folder }: { filenameHint: string; folder: string }) =>
        Promise.resolve({
          fileId: 'test-file-id',
          filePath: `/${folder}/${filenameHint}.jpg`,
        }),
    ),
    delete: jest.fn(() => Promise.resolve()),
    buildUrl: jest.fn((path: string) => `https://img.test${path}`),
  };

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ImageKitService)
    .useValue(imageKit)
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();

  const dataSource = app.get(DataSource);
  return { app, dataSource, imageKit };
}

export async function truncate(
  ds: DataSource,
  ...tables: string[]
): Promise<void> {
  if (tables.length === 0) return;
  const quoted = tables.map((t) => `"${t}"`).join(', ');
  await ds.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
}
