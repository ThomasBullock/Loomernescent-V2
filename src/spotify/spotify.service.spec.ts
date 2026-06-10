import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SpotifyService } from './spotify.service';

const CLIENT_ID = 'test-client-id';
const CLIENT_SECRET = 'test-client-secret';

function makeTokenResponse(expiresIn = 3600) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({ access_token: 'test-token', expires_in: expiresIn }),
  } as Response;
}

function makeSearchResponse(artists: Array<{ id: string; spotify: string }>) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        artists: {
          items: artists.map((a) => ({
            id: a.id,
            external_urls: { spotify: a.spotify },
          })),
        },
      }),
  } as Response;
}

function makeAlbumsResponse(
  albums: Array<{ id: string; name: string; spotify: string }>,
) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        items: albums.map((a) => ({
          id: a.id,
          name: a.name,
          external_urls: { spotify: a.spotify },
        })),
      }),
  } as Response;
}

function makeTracksResponse(trackNames: string[]) {
  return {
    ok: true,
    json: () =>
      Promise.resolve({ items: trackNames.map((name) => ({ name })) }),
  } as Response;
}

function errorResponse(status = 500) {
  return { ok: false, status } as Response;
}

async function createService(): Promise<SpotifyService> {
  const moduleRef = await Test.createTestingModule({
    providers: [
      SpotifyService,
      {
        provide: ConfigService,
        useValue: {
          getOrThrow: (key: string) => {
            if (key === 'SPOTIFY_CLIENT_ID') return CLIENT_ID;
            if (key === 'SPOTIFY_CLIENT_SECRET') return CLIENT_SECRET;
            throw new Error(`Unknown config key: ${key}`);
          },
        },
      },
    ],
  }).compile();
  return moduleRef.get(SpotifyService);
}

describe('SpotifyService', () => {
  let service: SpotifyService;
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    service = await createService();
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getAccessToken', () => {
    it('fetches a token using Basic auth and client_credentials grant', async () => {
      fetchSpy.mockResolvedValueOnce(makeTokenResponse());

      const token = await service.getAccessToken();

      expect(token).toBe('test-token');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://accounts.spotify.com/api/token');
      expect(options.method).toBe('POST');
      const expectedCredentials = Buffer.from(
        `${CLIENT_ID}:${CLIENT_SECRET}`,
      ).toString('base64');
      expect((options.headers as Record<string, string>)['Authorization']).toBe(
        `Basic ${expectedCredentials}`,
      );
      expect(options.body).toBe('grant_type=client_credentials');
    });

    it('returns cached token on second call before expiry', async () => {
      fetchSpy.mockResolvedValue(makeTokenResponse(3600));

      await service.getAccessToken();
      await service.getAccessToken();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('re-fetches when cached token is within 60s of expiry', async () => {
      // First call: token expires in 30s (within buffer)
      fetchSpy.mockResolvedValueOnce(makeTokenResponse(30));
      await service.getAccessToken();

      // Second call: should fetch again
      fetchSpy.mockResolvedValueOnce(makeTokenResponse(3600));
      await service.getAccessToken();

      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('throws when token endpoint returns an error', async () => {
      fetchSpy.mockResolvedValueOnce(errorResponse(401));

      await expect(service.getAccessToken()).rejects.toThrow(
        'Spotify token request failed: 401',
      );
    });
  });

  describe('searchArtist', () => {
    beforeEach(() => {
      // Pre-load token cache so tests focus on the search call
      fetchSpy.mockResolvedValueOnce(makeTokenResponse());
    });

    it('returns spotifyId and spotifyUrl for first search result', async () => {
      fetchSpy.mockResolvedValueOnce(
        makeSearchResponse([
          {
            id: 'artist-id-1',
            spotify: 'https://open.spotify.com/artist/artist-id-1',
          },
          {
            id: 'artist-id-2',
            spotify: 'https://open.spotify.com/artist/artist-id-2',
          },
        ]),
      );

      const result = await service.searchArtist('Slowdive');

      expect(result).toEqual({
        spotifyId: 'artist-id-1',
        spotifyUrl: 'https://open.spotify.com/artist/artist-id-1',
      });
      const searchCall = fetchSpy.mock.calls[1] as [string, RequestInit];
      expect(searchCall[0]).toContain('search');
      expect(searchCall[0]).toContain('Slowdive');
      expect(searchCall[0]).toContain('type=artist');
    });

    it('returns null when the search results are empty', async () => {
      fetchSpy.mockResolvedValueOnce(makeSearchResponse([]));

      const result = await service.searchArtist('UnknownBand99999');

      expect(result).toBeNull();
    });

    it('returns null when the search endpoint returns an error', async () => {
      fetchSpy.mockResolvedValueOnce(errorResponse(500));

      const result = await service.searchArtist('Slowdive');

      expect(result).toBeNull();
    });

    it('returns null when fetch throws (network error)', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('network error'));

      const result = await service.searchArtist('Slowdive');

      expect(result).toBeNull();
    });
  });

  describe('getArtistAlbums', () => {
    beforeEach(() => {
      fetchSpy.mockResolvedValueOnce(makeTokenResponse());
    });

    it('returns mapped album list with id, name and spotifyUrl', async () => {
      fetchSpy.mockResolvedValueOnce(
        makeAlbumsResponse([
          {
            id: 'album-1',
            name: 'Souvlaki',
            spotify: 'https://open.spotify.com/album/album-1',
          },
          {
            id: 'album-2',
            name: 'Just for a Day',
            spotify: 'https://open.spotify.com/album/album-2',
          },
        ]),
      );

      const result = await service.getArtistAlbums('artist-id-1');

      expect(result).toEqual([
        {
          id: 'album-1',
          name: 'Souvlaki',
          spotifyUrl: 'https://open.spotify.com/album/album-1',
        },
        {
          id: 'album-2',
          name: 'Just for a Day',
          spotifyUrl: 'https://open.spotify.com/album/album-2',
        },
      ]);
      const call = fetchSpy.mock.calls[1] as [string, RequestInit];
      expect(call[0]).toContain('/artists/artist-id-1/albums');
      expect(call[0]).toContain('include_groups=album');
    });

    it('returns empty array when endpoint returns an error', async () => {
      fetchSpy.mockResolvedValueOnce(errorResponse(404));

      const result = await service.getArtistAlbums('bad-id');

      expect(result).toEqual([]);
    });

    it('returns empty array when fetch throws', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('network error'));

      const result = await service.getArtistAlbums('artist-id-1');

      expect(result).toEqual([]);
    });
  });

  describe('getAlbumTracks', () => {
    beforeEach(() => {
      fetchSpy.mockResolvedValueOnce(makeTokenResponse());
    });

    it('returns array of track names', async () => {
      fetchSpy.mockResolvedValueOnce(
        makeTracksResponse(['Alison', 'Machine Gun', 'Sing']),
      );

      const result = await service.getAlbumTracks('album-id-1');

      expect(result).toEqual(['Alison', 'Machine Gun', 'Sing']);
      const call = fetchSpy.mock.calls[1] as [string, RequestInit];
      expect(call[0]).toContain('/albums/album-id-1/tracks');
    });

    it('returns empty array when endpoint returns an error', async () => {
      fetchSpy.mockResolvedValueOnce(errorResponse(404));

      const result = await service.getAlbumTracks('bad-id');

      expect(result).toEqual([]);
    });

    it('returns empty array when fetch throws', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('network error'));

      const result = await service.getAlbumTracks('album-id-1');

      expect(result).toEqual([]);
    });
  });
});
