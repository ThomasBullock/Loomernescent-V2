import { Test } from "@nestjs/testing";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DataSource } from "typeorm";
import { AppModule } from "../../src/app.module";
import { configureApp } from "../../src/configure-app";
import { ImageKitService } from "../../src/common/images/image-kit.service";
import { SpotifyService } from "../../src/spotify/spotify.service";

export interface FakeImageKit {
  upload: jest.Mock;
  delete: jest.Mock;
  buildUrl: jest.Mock;
}

export interface FakeSpotify {
  searchArtist: jest.Mock;
  getArtistAlbums: jest.Mock;
  getAlbumTracks: jest.Mock;
}

export interface TestAppHandle {
  app: NestExpressApplication;
  dataSource: DataSource;
  imageKit: FakeImageKit;
  spotify: FakeSpotify;
}

export async function createTestApp(): Promise<TestAppHandle> {
  const imageKit: FakeImageKit = {
    upload: jest.fn(({ filenameHint, folder }: { filenameHint: string; folder: string }) =>
      Promise.resolve({
        fileId: "test-file-id",
        filePath: `/${folder}/${filenameHint}.jpg`,
      }),
    ),
    delete: jest.fn(() => Promise.resolve()),
    buildUrl: jest.fn((path: string) => `https://img.test${path}`),
  };

  const spotify: FakeSpotify = {
    searchArtist: jest.fn(() =>
      Promise.resolve({
        spotifyId: "sp-artist-1",
        spotifyUrl: "https://open.spotify.com/artist/sp-artist-1",
      }),
    ),
    getArtistAlbums: jest.fn(() => Promise.resolve([])),
    getAlbumTracks: jest.fn(() => Promise.resolve([])),
  };

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ImageKitService)
    .useValue(imageKit)
    .overrideProvider(SpotifyService)
    .useValue(spotify)
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();

  const dataSource = app.get(DataSource);
  return { app, dataSource, imageKit, spotify };
}

export async function truncate(ds: DataSource, ...tables: string[]): Promise<void> {
  if (tables.length === 0) {
    return;
  }
  const quoted = tables.map((t) => `"${t}"`).join(", ");
  await ds.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
}
