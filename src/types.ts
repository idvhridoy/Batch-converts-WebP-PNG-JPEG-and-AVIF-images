export type SupportedFormat = 'image/webp' | 'image/png' | 'image/jpeg' | 'image/avif';

export type ScaleMode = 'original' | 'percentage' | 'custom';

export type FitMode = 'contain' | 'cover' | 'fill';

export interface ConversionConfig {
  format: SupportedFormat;
  quality: number; // 1 - 100
  scaleMode: ScaleMode;
  percentage: number; // 10 - 200
  customWidth?: number;
  customHeight?: number;
  maintainAspectRatio: boolean;
  fitMode: FitMode;
  backgroundColor: string; // Used when converting transparent images to JPEG (e.g. #FFFFFF)
  smoothingQuality: 'low' | 'medium' | 'high';
  stripMetadata: boolean;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageItem {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  originalFormat: string;
  originalDimensions: ImageDimensions;
  originalUrl: string;
  
  // Custom per-item overrides (optional)
  customConfig?: Partial<ConversionConfig>;

  // Status & output
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number; // 0 - 100
  error?: string;
  
  convertedBlob?: Blob;
  convertedUrl?: string;
  convertedSize?: number;
  convertedDimensions?: ImageDimensions;
  convertedFormat?: SupportedFormat;
  processingTimeMs?: number;
}

export interface FormatCapability {
  format: SupportedFormat;
  label: string;
  extension: string;
  isSupported: boolean;
  mimeType: string;
  description: string;
}

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
}
