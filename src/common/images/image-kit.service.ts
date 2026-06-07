import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ImageKit from 'imagekit';
import slugify from 'slugify';

export interface UploadInput {
  buffer: Buffer;
  filenameHint: string;
  folder: string;
}

export interface UploadResult {
  fileId: string;
  filePath: string;
}

export interface UrlTransforms {
  w?: number;
  h?: number;
  /** ImageKit focus mode, e.g. 'auto' or a named crop focus. */
  fo?: string;
}

@Injectable()
export class ImageKitService {
  private readonly client: ImageKit;
  private readonly urlEndpoint: string;

  constructor(private readonly config: ConfigService) {
    this.urlEndpoint = this.config.getOrThrow<string>('IMAGEKIT_URL_ENDPOINT');
    this.client = new ImageKit({
      publicKey: this.config.getOrThrow<string>('IMAGEKIT_PUBLIC_KEY'),
      privateKey: this.config.getOrThrow<string>('IMAGEKIT_PRIVATE_KEY'),
      urlEndpoint: this.urlEndpoint,
    });
  }

  async upload(input: UploadInput): Promise<UploadResult> {
    const fileName = `${slugify(input.filenameHint, {
      lower: true,
      strict: true,
    })}-${randomUUID()}.jpg`;
    const res = await this.client.upload({
      file: input.buffer,
      fileName,
      folder: input.folder,
    });
    return { fileId: res.fileId, filePath: res.filePath };
  }

  async delete(fileId: string): Promise<void> {
    try {
      await this.client.deleteFile(fileId);
    } catch (err: unknown) {
      if (isNotFound(err)) return;
      throw err;
    }
  }

  buildUrl(filePath: string, transforms?: UrlTransforms): string {
    const base = `${this.urlEndpoint}${filePath}`;
    if (!transforms) return base;
    const parts: string[] = [];
    if (transforms.w != null) parts.push(`w-${transforms.w}`);
    if (transforms.h != null) parts.push(`h-${transforms.h}`);
    if (transforms.fo != null) parts.push(`fo-${transforms.fo}`);
    if (parts.length === 0) return base;
    return `${base}?tr=${parts.join(',')}`;
  }
}

function isNotFound(err: unknown): boolean {
  const e = err as {
    httpStatusCode?: number;
    statusCode?: number;
    $ResponseMetadata?: { statusCode?: number };
  };
  return (
    e?.httpStatusCode === 404 ||
    e?.statusCode === 404 ||
    e?.$ResponseMetadata?.statusCode === 404
  );
}
