import sharp from 'sharp';

const DEFAULT_MAX_DIMENSION = 2000;
const DEFAULT_QUALITY = 85;

export interface ProcessImageOptions {
  /** Largest allowed edge in pixels. Default 2000 (2026 sweet spot for ImageKit-derived web display at retina 2x). */
  maxDimension?: number;
  /** When set, output is cropped (cover, centre) to exactly this ratio. */
  aspectRatio?: { w: number; h: number };
  /** Output format. Default 'jpeg'. */
  format?: 'jpeg' | 'png';
  /** JPEG quality 1–100. Default 85. Ignored for PNG. */
  quality?: number;
}

export interface ProcessedImage {
  buffer: Buffer;
  format: 'jpeg' | 'png';
  width: number;
  height: number;
  bytes: number;
}

export async function processImage(
  input: Buffer,
  opts: ProcessImageOptions = {},
): Promise<ProcessedImage> {
  const maxDimension = opts.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = opts.quality ?? DEFAULT_QUALITY;
  const format = opts.format ?? 'jpeg';

  let pipeline = sharp(input);

  if (opts.aspectRatio) {
    //
    const { width, height } = await pipeline.metadata();
    if (!width || !height) {
      throw new Error('Unable to read image dimensions');
    }
    const { w: rw, h: rh } = opts.aspectRatio;

    //scale factor — a single number that answers "how much do I multiply the ratio dimensions by to get the actual pixel size?"

    // Say the ratio is 16:9 and you want the target to be as large as possible without:

    // Either edge exceeding maxDimension
    // Sharp having to upscale (the output must fit within the source pixel budget)
    // Each of those constraints gives you a maximum k:

    // maxDimension / Math.max(rw, rh) — k limited by the max-dimension cap
    // width / rw — k limited by the source width
    // height / rh — k limited by the source height
    const scaleFactor = Math.min(
      maxDimension / Math.max(rw, rh),
      width / rw,
      height / rh,
    );

    // Largest box fitting the ratio within both maxDimension and the source (no upscale).
    const targetW = Math.max(1, Math.round(rw * scaleFactor));
    const targetH = Math.max(1, Math.round(rh * scaleFactor));
    pipeline = sharp(input).resize({
      width: targetW,
      height: targetH,
      fit: 'cover',
      position: 'centre',
    });
  } else {
    // ✕ scales 4000x3000 down to 2000x1500 at maxDimension 2000 (long edge wins) (111 ms)
    pipeline = pipeline.resize({
      width: maxDimension,
      height: maxDimension,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  pipeline = format === 'png' ? pipeline.png() : pipeline.jpeg({ quality });

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    format,
    width: info.width,
    height: info.height,
    bytes: info.size,
  };
}
