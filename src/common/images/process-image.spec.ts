import sharp from 'sharp';
import { processImage } from './process-image';

// Fixtures are synthesised with sharp so no binary files are committed.
function solid(
  width: number,
  height: number,
  channels: 3 | 4 = 3,
): sharp.Sharp {
  return sharp({
    create: {
      width,
      height,
      channels,
      background: { r: 120, g: 80, b: 200, alpha: 1 },
    },
  });
}

const jpegInput = (w: number, h: number): Promise<Buffer> =>
  solid(w, h).jpeg().toBuffer();
const pngInput = (w: number, h: number): Promise<Buffer> =>
  solid(w, h, 4).png().toBuffer();
const tiffInput = (w: number, h: number): Promise<Buffer> =>
  solid(w, h).tiff().toBuffer();

describe('processImage', () => {
  describe('output format', () => {
    it('defaults to JPEG (format flag + SOI bytes)', async () => {
      const out = await processImage(await pngInput(800, 800));
      expect(out.format).toBe('jpeg');
      expect(out.buffer[0]).toBe(0xff);
      expect(out.buffer[1]).toBe(0xd8);
    });

    it('converts a PNG input buffer to JPEG by default', async () => {
      const out = await processImage(await pngInput(800, 600));
      expect(out.format).toBe('jpeg');
      expect(out.buffer[0]).toBe(0xff);
      expect(out.buffer[1]).toBe(0xd8);
    });

    it('converts a non-JPEG (TIFF) input buffer to JPEG by default', async () => {
      const out = await processImage(await tiffInput(800, 600));
      expect(out.format).toBe('jpeg');
      expect(out.buffer[0]).toBe(0xff);
      expect(out.buffer[1]).toBe(0xd8);
    });

    it("honours format: 'png' (PNG magic bytes)", async () => {
      const out = await processImage(await jpegInput(800, 800), {
        format: 'png',
      });
      expect(out.format).toBe('png');
      expect(out.buffer[0]).toBe(0x89);
      expect(out.buffer[1]).toBe(0x50);
      expect(out.buffer[2]).toBe(0x4e);
      expect(out.buffer[3]).toBe(0x47);
    });
  });

  describe('resize / max dimension', () => {
    it('scales 4000x3000 down to 2000x1500 at maxDimension 2000 (long edge wins)', async () => {
      const out = await processImage(await jpegInput(4000, 3000), {
        maxDimension: 2000,
      });
      expect(out.width).toBe(2000);
      expect(out.height).toBe(1500);
    });

    it('leaves a 1200x900 image untouched at maxDimension 2000 (no upscaling)', async () => {
      const out = await processImage(await jpegInput(1200, 900), {
        maxDimension: 2000,
      });
      expect(out.width).toBe(1200);
      expect(out.height).toBe(900);
    });

    it('honours maxDimension 800', async () => {
      const out = await processImage(await jpegInput(4000, 3000), {
        maxDimension: 800,
      });
      expect(out.width).toBe(800);
      expect(out.height).toBe(600);
    });
  });

  describe('aspect ratio crop', () => {
    it('produces a square output for aspectRatio 1:1 on a 1600x900 input', async () => {
      const out = await processImage(await jpegInput(1600, 900), {
        aspectRatio: { w: 1, h: 1 },
      });
      expect(out.width).toBe(out.height);
    });

    it('produces 800x800 for aspectRatio 1:1 + maxDimension 800', async () => {
      const out = await processImage(await jpegInput(2000, 2000), {
        aspectRatio: { w: 1, h: 1 },
        maxDimension: 800,
      });
      expect(out.width).toBe(800);
      expect(out.height).toBe(800);
    });

    it('produces 2000x1125 for aspectRatio 16:9 on 2000x2000 + maxDimension 2000', async () => {
      const out = await processImage(await jpegInput(2000, 2000), {
        aspectRatio: { w: 16, h: 9 },
        maxDimension: 2000,
      });
      expect(out.width).toBe(2000);
      expect(out.height).toBe(1125);
    });

    it('cover-crops portrait 800x1200 to 800x800 for aspectRatio 1:1', async () => {
      const out = await processImage(await jpegInput(800, 1200), {
        aspectRatio: { w: 1, h: 1 },
      });
      expect(out.width).toBe(800);
      expect(out.height).toBe(800);
    });
  });

  describe('quality', () => {
    it('quality 60 yields a strictly smaller buffer than quality 95', async () => {
      // A photographic-ish source compresses differently across quality levels;
      // noise ensures the quality knob actually changes output size.
      const noisy = await sharp({
        create: {
          width: 1000,
          height: 1000,
          channels: 3,
          noise: { type: 'gaussian', mean: 128, sigma: 60 },
        },
      })
        .jpeg()
        .toBuffer();
      const low = await processImage(noisy, { quality: 60 });
      const high = await processImage(noisy, { quality: 95 });
      expect(low.bytes).toBeLessThan(high.bytes);
    });

    it('defaults quality to 85', async () => {
      const input = await jpegInput(1000, 1000);
      const def = await processImage(input);
      const explicit = await processImage(input, { quality: 85 });
      expect(def.buffer.equals(explicit.buffer)).toBe(true);
    });

    it('ignores quality for PNG output', async () => {
      const input = await jpegInput(800, 800);
      const a = await processImage(input, { format: 'png', quality: 50 });
      const b = await processImage(input, { format: 'png', quality: 95 });
      expect(a.buffer.equals(b.buffer)).toBe(true);
    });
  });

  describe('errors', () => {
    it('rejects when input is not a decodable image', async () => {
      await expect(processImage(Buffer.from('not an image'))).rejects.toThrow();
    });
  });
});
