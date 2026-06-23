import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface SpotifyArtistResult {
  spotifyId: string;
  spotifyUrl: string;
}

export interface SpotifyAlbumResult {
  id: string;
  name: string;
  spotifyUrl: string;
}

interface TokenCache {
  token: string;
  expiresAt: number;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

interface ArtistSearchResponse {
  artists?: {
    items: Array<{
      id: string;
      external_urls: { spotify: string };
    }>;
  };
}

interface ArtistAlbumsResponse {
  items: Array<{
    id: string;
    name: string;
    external_urls: { spotify: string };
  }>;
}

interface AlbumTracksResponse {
  items: Array<{ name: string }>;
}

const TOKEN_EXPIRY_BUFFER_MS = 60_000;
const SPOTIFY_ACCOUNTS_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

@Injectable()
export class SpotifyService {
  private readonly logger = new Logger(SpotifyService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private tokenCache: TokenCache | null = null;

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.getOrThrow<string>("SPOTIFY_CLIENT_ID");
    this.clientSecret = this.config.getOrThrow<string>("SPOTIFY_CLIENT_SECRET");
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt - now > TOKEN_EXPIRY_BUFFER_MS) {
      return this.tokenCache.token;
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const res = await fetch(SPOTIFY_ACCOUNTS_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!res.ok) {
      throw new Error(`Spotify token request failed: ${res.status}`);
    }

    const body = (await res.json()) as TokenResponse;
    this.tokenCache = {
      token: body.access_token,
      expiresAt: now + body.expires_in * 1000,
    };
    return this.tokenCache.token;
  }

  async searchArtist(name: string): Promise<SpotifyArtistResult | null> {
    try {
      const token = await this.getAccessToken();
      const url = `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(name)}&type=artist&limit=5`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        this.logger.warn(`Spotify artist search failed: ${res.status}`);
        return null;
      }

      const body = (await res.json()) as ArtistSearchResponse;
      const first = body.artists?.items?.[0];
      if (!first) {
        return null;
      }

      return {
        spotifyId: first.id,
        spotifyUrl: first.external_urls.spotify,
      };
    } catch (err) {
      this.logger.error("searchArtist error", err);
      return null;
    }
  }

  async getArtistAlbums(artistId: string): Promise<SpotifyAlbumResult[]> {
    try {
      const token = await this.getAccessToken();
      const url = `${SPOTIFY_API_BASE}/artists/${encodeURIComponent(artistId)}/albums?include_groups=album&limit=10`;
      console.log("URL|||", url);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const detail = await res.text();
        this.logger.warn(`Spotify artist albums failed: ${res.status} ${detail}`);
        return [];
      }

      const body = (await res.json()) as ArtistAlbumsResponse;
      return body.items.map((item) => ({
        id: item.id,
        name: item.name,
        spotifyUrl: item.external_urls.spotify,
      }));
    } catch (err) {
      this.logger.error("getArtistAlbums error", err);
      return [];
    }
  }

  async getAlbumTracks(albumId: string): Promise<string[]> {
    try {
      const token = await this.getAccessToken();
      const url = `${SPOTIFY_API_BASE}/albums/${encodeURIComponent(albumId)}/tracks`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        this.logger.warn(`Spotify album tracks failed: ${res.status}`);
        return [];
      }

      const body = (await res.json()) as AlbumTracksResponse;
      return body.items.map((t) => t.name);
    } catch (err) {
      this.logger.error("getAlbumTracks error", err);
      return [];
    }
  }
}
