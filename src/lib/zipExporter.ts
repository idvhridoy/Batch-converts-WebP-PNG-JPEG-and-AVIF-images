import JSZip from 'jszip';
import { ImageItem } from '../types';

export async function exportBatchAsZip(
  items: ImageItem[],
  onProgress?: (percent: number) => void
): Promise<Blob> {
  const zip = new JSZip();

  // Find all items that have convertedBlob
  const readyItems = items.filter((item) => item.status === 'completed' && item.convertedBlob);

  if (readyItems.length === 0) {
    throw new Error('No converted images ready for export.');
  }

  // Track name collisions
  const nameCounts: Record<string, number> = {};

  for (const item of readyItems) {
    if (!item.convertedBlob) continue;

    // Get original filename without extension
    const baseName = item.name.replace(/\.[^/.]+$/, '');
    const ext = getExtensionForFormat(item.convertedFormat || 'image/webp');
    let finalFileName = `${baseName}.${ext}`;

    if (nameCounts[finalFileName] !== undefined) {
      nameCounts[finalFileName] += 1;
      finalFileName = `${baseName}_(${nameCounts[finalFileName]}).${ext}`;
    } else {
      nameCounts[finalFileName] = 0;
    }

    zip.file(finalFileName, item.convertedBlob);
  }

  // Generate zip file with compression
  const content = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onProgress?.(Math.round(metadata.percent));
    }
  );

  return content;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 2000);
}

export function getExtensionForFormat(format: string): string {
  switch (format) {
    case 'image/webp':
      return 'webp';
    case 'image/avif':
      return 'avif';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    default:
      return 'webp';
  }
}
