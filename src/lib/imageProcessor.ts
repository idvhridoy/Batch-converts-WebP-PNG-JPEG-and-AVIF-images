import { ConversionConfig, FormatCapability, ImageDimensions, SupportedFormat } from '../types';

export const SUPPORTED_FORMATS: { format: SupportedFormat; label: string; extension: string; mimeType: string; description: string }[] = [
  {
    format: 'image/webp',
    label: 'WebP',
    extension: 'webp',
    mimeType: 'image/webp',
    description: 'High compression, modern web standard, supports transparency.',
  },
  {
    format: 'image/avif',
    label: 'AVIF',
    extension: 'avif',
    mimeType: 'image/avif',
    description: 'Next-gen compression with superior quality at lower bitrates.',
  },
  {
    format: 'image/jpeg',
    label: 'JPEG',
    extension: 'jpg',
    mimeType: 'image/jpeg',
    description: 'Universally compatible photography standard, no alpha channel.',
  },
  {
    format: 'image/png',
    label: 'PNG',
    extension: 'png',
    mimeType: 'image/png',
    description: 'Lossless quality with full 32-bit alpha transparency support.',
  },
];

/**
 * Detect browser encoding capabilities for WebP, AVIF, JPEG, PNG
 */
export async function detectFormatCapabilities(): Promise<Record<SupportedFormat, FormatCapability>> {
  const testCanvas = document.createElement('canvas');
  testCanvas.width = 4;
  testCanvas.height = 4;
  const ctx = testCanvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 4, 4);
  }

  const results: Partial<Record<SupportedFormat, FormatCapability>> = {};

  for (const item of SUPPORTED_FORMATS) {
    let supported = false;
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        testCanvas.toBlob((b) => resolve(b), item.format, 0.8);
      });
      // A browser that does not support the requested format returns either null or falls back to 'image/png'
      supported = Boolean(blob && blob.type === item.format);
    } catch {
      supported = false;
    }

    results[item.format] = {
      ...item,
      isSupported: supported,
    };
  }

  return results as Record<SupportedFormat, FormatCapability>;
}

/**
 * Load an image from URL / Object URL and retrieve natural dimensions
 */
export function loadImageDimensions(url: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
    };
    img.onerror = (e) => reject(new Error('Failed to load image metadata. ' + e));
    img.src = url;
  });
}

/**
 * Calculate target output dimensions based on scaling mode and constraints
 */
export function calculateTargetDimensions(
  original: ImageDimensions,
  config: ConversionConfig
): ImageDimensions {
  const origW = Math.max(1, original.width);
  const origH = Math.max(1, original.height);

  if (config.scaleMode === 'original') {
    return { width: origW, height: origH };
  }

  if (config.scaleMode === 'percentage') {
    const factor = Math.max(0.01, config.percentage / 100);
    return {
      width: Math.max(1, Math.round(origW * factor)),
      height: Math.max(1, Math.round(origH * factor)),
    };
  }

  // Custom scale mode
  const targetW = config.customWidth && config.customWidth > 0 ? config.customWidth : origW;
  const targetH = config.customHeight && config.customHeight > 0 ? config.customHeight : origH;

  if (config.maintainAspectRatio) {
    const origRatio = origW / origH;

    if (config.customWidth && !config.customHeight) {
      return {
        width: targetW,
        height: Math.max(1, Math.round(targetW / origRatio)),
      };
    }
    if (!config.customWidth && config.customHeight) {
      return {
        width: Math.max(1, Math.round(targetH * origRatio)),
        height: targetH,
      };
    }
    if (config.customWidth && config.customHeight) {
      // Fit within bounds
      if (config.fitMode === 'contain') {
        const scale = Math.min(targetW / origW, targetH / origH);
        return {
          width: Math.max(1, Math.round(origW * scale)),
          height: Math.max(1, Math.round(origH * scale)),
        };
      } else if (config.fitMode === 'cover') {
        const scale = Math.max(targetW / origW, targetH / origH);
        return {
          width: Math.max(1, Math.round(origW * scale)),
          height: Math.max(1, Math.round(origH * scale)),
        };
      }
    }
  }

  return {
    width: Math.max(1, Math.round(targetW)),
    height: Math.max(1, Math.round(targetH)),
  };
}

/**
 * Execute client-side image conversion using Canvas 2D
 */
export async function convertImage(
  sourceUrl: string,
  originalDims: ImageDimensions,
  config: ConversionConfig,
  onProgress?: (progress: number) => void
): Promise<{ blob: Blob; dimensions: ImageDimensions; executionTimeMs: number }> {
  const startTime = performance.now();
  onProgress?.(15);

  const img = new Image();
  img.crossOrigin = 'anonymous';
  
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to read source image into memory.'));
    img.src = sourceUrl;
  });

  onProgress?.(40);

  const targetDims = calculateTargetDimensions(originalDims, config);

  // Setup canvas with high-performance 2D context
  const canvas = document.createElement('canvas');
  canvas.width = targetDims.width;
  canvas.height = targetDims.height;

  const ctx = canvas.getContext('2d', {
    alpha: config.format !== 'image/jpeg',
    willReadFrequently: false,
  });

  if (!ctx) {
    throw new Error('Canvas 2D context initialization failed.');
  }

  // Smoothing configuration
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = config.smoothingQuality;

  // If output is JPEG, fill background with user selected background color to prevent black transparency
  if (config.format === 'image/jpeg') {
    ctx.fillStyle = config.backgroundColor || '#FFFFFF';
    ctx.fillRect(0, 0, targetDims.width, targetDims.height);
  } else {
    ctx.clearRect(0, 0, targetDims.width, targetDims.height);
  }

  onProgress?.(70);

  // Render transformed image
  ctx.drawImage(img, 0, 0, targetDims.width, targetDims.height);

  onProgress?.(85);

  // Convert to Blob with quality parameter (0.01 - 1.0)
  // Note: PNG format ignores quality parameter in canvas.toBlob
  const normalizedQuality = Math.max(0.01, Math.min(1.0, config.quality / 100));

  const outputBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          // Fallback if specific format encoder is missing (e.g. AVIF on older safari)
          canvas.toBlob(
            (fallbackBlob) => {
              if (fallbackBlob) resolve(fallbackBlob);
              else reject(new Error(`Failed to encode image to ${config.format}.`));
            },
            'image/webp',
            normalizedQuality
          );
        }
      },
      config.format,
      normalizedQuality
    );
  });

  onProgress?.(100);
  const executionTimeMs = Math.round(performance.now() - startTime);

  return {
    blob: outputBlob,
    dimensions: targetDims,
    executionTimeMs,
  };
}

/**
 * Format bytes into human readable string (e.g., 2.45 MB, 320 KB)
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Calculate size difference and compression savings percentage
 */
export function calculateSavings(originalBytes: number, convertedBytes: number): {
  savedBytes: number;
  savingsPercentage: number;
  isSmaller: boolean;
} {
  const savedBytes = originalBytes - convertedBytes;
  const savingsPercentage = originalBytes > 0 ? (savedBytes / originalBytes) * 100 : 0;
  return {
    savedBytes,
    savingsPercentage: parseFloat(savingsPercentage.toFixed(1)),
    isSmaller: savedBytes > 0,
  };
}

/**
 * Generate synthetic high-resolution sample images for immediate testing
 */
export async function createSampleImages(): Promise<File[]> {
  const samples = [
    {
      name: 'architecture_sample.png',
      width: 1400,
      height: 900,
      render: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        // Architectural gradient landscape
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(0.5, '#1e293b');
        grad.addColorStop(1, '#334155');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Geometric glass structures
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.beginPath();
        ctx.moveTo(w * 0.2, h);
        ctx.lineTo(w * 0.45, h * 0.2);
        ctx.lineTo(w * 0.7, h);
        ctx.fill();

        ctx.fillStyle = 'rgba(129, 140, 248, 0.3)';
        ctx.beginPath();
        ctx.moveTo(w * 0.4, h);
        ctx.lineTo(w * 0.65, h * 0.35);
        ctx.lineTo(w * 0.9, h);
        ctx.fill();

        // Sun / Glow
        const sunGrad = ctx.createRadialGradient(w * 0.75, h * 0.3, 10, w * 0.75, h * 0.3, 160);
        sunGrad.addColorStop(0, 'rgba(251, 191, 36, 0.9)');
        sunGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(w * 0.75, h * 0.3, 160, 0, Math.PI * 2);
        ctx.fill();

        // Typography text element
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText('Sample Architecture Asset', 60, 90);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '20px sans-serif';
        ctx.fillText('1400 × 900 • 32-bit Alpha PNG', 60, 130);
      },
      type: 'image/png',
    },
    {
      name: 'vibrant_nature_photo.jpeg',
      width: 1600,
      height: 1000,
      render: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        // Sunset sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.7);
        skyGrad.addColorStop(0, '#f97316');
        skyGrad.addColorStop(0.4, '#e11d48');
        skyGrad.addColorStop(0.8, '#4f46e5');
        skyGrad.addColorStop(1, '#090d16');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Mountain silhouettes
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 40) {
          const y = h * 0.65 + Math.sin(x * 0.005) * 80 + Math.cos(x * 0.015) * 40;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.fill();

        // Water reflection
        const waterGrad = ctx.createLinearGradient(0, h * 0.75, 0, h);
        waterGrad.addColorStop(0, '#1e1b4b');
        waterGrad.addColorStop(1, '#020617');
        ctx.fillStyle = waterGrad;
        ctx.fillRect(0, h * 0.75, w, h * 0.25);

        // Heading
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 40px sans-serif';
        ctx.fillText('Alpine Sunset Scenery', 70, 90);
        ctx.fillStyle = '#fed7aa';
        ctx.font = '20px sans-serif';
        ctx.fillText('1600 × 1000 • High Color Depth JPEG', 70, 130);
      },
      type: 'image/jpeg',
    },
    {
      name: 'app_icon_transparent.webp',
      width: 800,
      height: 800,
      render: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        // Transparent badge icon with soft shadow
        ctx.clearRect(0, 0, w, h);
        
        // Rounded badge
        const r = 160;
        const cx = w / 2;
        const cy = h / 2;
        
        const badgeGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        badgeGrad.addColorStop(0, '#0284c7');
        badgeGrad.addColorStop(1, '#4338ca');
        
        ctx.fillStyle = badgeGrad;
        ctx.beginPath();
        ctx.roundRect(cx - r, cy - r, r * 2, r * 2, 64);
        ctx.fill();

        // Inner camera / image lens vector
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 14;
        ctx.strokeRect(cx - 70, cy - 50, 140, 110);
        
        ctx.beginPath();
        ctx.arc(cx, cy + 5, 32, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(cx + 40, cy - 25, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Vector Icon Element', cx, cy + 180);
      },
      type: 'image/webp',
    },
  ];

  const files: File[] = [];

  for (const s of samples) {
    const canvas = document.createElement('canvas');
    canvas.width = s.width;
    canvas.height = s.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      s.render(ctx, s.width, s.height);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, s.type, 0.95));
      if (blob) {
        files.push(new File([blob], s.name, { type: s.type }));
      }
    }
  }

  return files;
}
