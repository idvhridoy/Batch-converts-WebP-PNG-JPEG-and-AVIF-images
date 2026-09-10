import {
  ArrowLeftRight,
  Check,
  Columns,
  Copy,
  Download,
  Eye,
  Maximize,
  Minimize2,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { calculateSavings, formatBytes } from '../lib/imageProcessor';
import { downloadBlob, getExtensionForFormat } from '../lib/zipExporter';
import { ImageItem } from '../types';

interface ComparisonViewerProps {
  item: ImageItem | null;
  onConvertSingle: (item: ImageItem) => void;
  onShowToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => void;
}

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  item,
  onConvertSingle,
  onShowToast,
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'side-by-side'>('split');
  const [sliderPosition, setSliderPosition] = useState(50); // percentage (0 - 100)
  const [zoomLevel, setZoomLevel] = useState(1); // 1x, 1.5x, 2x
  const [isCopied, setIsCopied] = useState(false);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom on item change
  useEffect(() => {
    setZoomLevel(1);
    setSliderPosition(50);
  }, [item?.id]);

  if (!item) {
    return (
      <div
        id="empty-comparison-viewer"
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center flex flex-col items-center justify-center min-h-[360px] shadow-xs"
      >
        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
          <Eye className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
          No image selected for preview
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
          Select any queued image from the list below to inspect before/after visual quality and compare compression metrics.
        </p>
      </div>
    );
  }

  const isConverted = item.status === 'completed' && Boolean(item.convertedBlob && item.convertedUrl);
  const savings =
    isConverted && item.convertedSize
      ? calculateSavings(item.originalSize, item.convertedSize)
      : null;

  const handleSliderMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clampedPercentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(clampedPercentage);
  };

  const handleMouseDown = () => setIsDraggingSlider(true);
  const handleTouchStart = () => setIsDraggingSlider(true);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingSlider) {
      handleSliderMove(e.clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDraggingSlider && e.touches[0]) {
      handleSliderMove(e.touches[0].clientX);
    }
  };

  const handleMouseUp = () => setIsDraggingSlider(false);

  const handleCopyToClipboard = async () => {
    if (!item.convertedBlob) return;
    try {
      // In modern browsers, ClipboardItem supports image/png and some browsers support image/webp
      // To ensure maximum browser compatibility, we copy the blob or convert to image/png for clipboard
      if (item.convertedBlob.type === 'image/png') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': item.convertedBlob }),
        ]);
      } else {
        // Render to canvas to produce clipboard-compatible PNG
        const img = new Image();
        img.src = item.convertedUrl!;
        await new Promise((res) => { img.onload = res; });
        const c = document.createElement('canvas');
        c.width = img.naturalWidth || img.width;
        c.height = img.naturalHeight || img.height;
        const ctx = c.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        const pngBlob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
        if (pngBlob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': pngBlob }),
          ]);
        }
      }

      setIsCopied(true);
      onShowToast('success', 'Copied to Clipboard', 'Converted image raster data copied.');
      setTimeout(() => setIsCopied(false), 2200);
    } catch (err) {
      console.warn('Clipboard write error:', err);
      onShowToast(
        'warning',
        'Clipboard Limitation',
        'Browser clipboard permissions or format compatibility restricted direct copy. Try downloading instead.'
      );
    }
  };

  const handleDownloadSingle = () => {
    if (!item.convertedBlob) return;
    const baseName = item.name.replace(/\.[^/.]+$/, '');
    const ext = getExtensionForFormat(item.convertedFormat || 'image/webp');
    downloadBlob(item.convertedBlob, `${baseName}-converted.${ext}`);
    onShowToast('success', 'Download Started', `${baseName}-converted.${ext}`);
  };

  return (
    <div
      id="comparison-viewer-panel"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col"
    >
      {/* Viewer Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm text-slate-900 dark:text-white truncate max-w-[220px] sm:max-w-xs">
            {item.name}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
            {item.originalDimensions.width}×{item.originalDimensions.height}
          </span>
        </div>

        {/* View Mode & Zoom Controls */}
        <div className="flex items-center gap-2">
          {isConverted && (
            <>
              {/* Split vs Side-by-side */}
              <div className="flex items-center p-0.5 bg-slate-200/70 dark:bg-slate-800 rounded-lg text-xs">
                <button
                  id="viewer-mode-split"
                  type="button"
                  onClick={() => setViewMode('split')}
                  title="Interactive Split Slider"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    viewMode === 'split'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Split Slider</span>
                </button>
                <button
                  id="viewer-mode-sidebyside"
                  type="button"
                  onClick={() => setViewMode('side-by-side')}
                  title="Side by Side Panes"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    viewMode === 'side-by-side'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Dual Pane</span>
                </button>
              </div>

              {/* Zoom In/Out */}
              <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg p-0.5 text-xs">
                <button
                  id="zoom-out-button"
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(0.5, parseFloat((z - 0.25).toFixed(2))))}
                  disabled={zoomLevel <= 0.5}
                  className="p-1 rounded text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 min-w-[38px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  id="zoom-in-button"
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(3, parseFloat((z + 0.25).toFixed(2))))}
                  disabled={zoomLevel >= 3}
                  className="p-1 rounded text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                {zoomLevel !== 1 && (
                  <button
                    id="zoom-reset-button"
                    type="button"
                    onClick={() => setZoomLevel(1)}
                    className="text-[10px] px-1.5 py-0.5 text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Copy to Clipboard */}
              <button
                id="copy-image-clipboard-button"
                type="button"
                onClick={handleCopyToClipboard}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                title="Copy converted image to clipboard"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">{isCopied ? 'Copied' : 'Copy'}</span>
              </button>

              {/* Download Converted */}
              <button
                id="download-single-image-button"
                type="button"
                onClick={handleDownloadSingle}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shadow-xs"
                title="Download this converted file"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>
            </>
          )}

          {!isConverted && item.status !== 'processing' && (
            <button
              id="convert-single-now-button"
              type="button"
              onClick={() => onConvertSingle(item)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shadow-xs"
            >
              Convert Now
            </button>
          )}
        </div>
      </div>

      {/* Metrics Banner */}
      {isConverted && savings && item.convertedDimensions && item.convertedSize && (
        <div
          id="metrics-comparison-banner"
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-3 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs"
        >
          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
              Original
            </span>
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              {formatBytes(item.originalSize)}
            </div>
            <div className="text-[11px] text-slate-500">
              {item.originalDimensions.width}×{item.originalDimensions.height} px
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
              Converted
            </span>
            <div className="font-semibold text-indigo-600 dark:text-indigo-400">
              {formatBytes(item.convertedSize)}
            </div>
            <div className="text-[11px] text-slate-500">
              {item.convertedDimensions.width}×{item.convertedDimensions.height} px
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
              Size Differential
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                  savings.isSmaller
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                }`}
              >
                {savings.isSmaller ? `-${savings.savingsPercentage}%` : `+${Math.abs(savings.savingsPercentage)}%`}
              </span>
              <span className="text-slate-500 text-[11px]">
                ({savings.isSmaller ? '-' : '+'}{formatBytes(Math.abs(savings.savedBytes))})
              </span>
            </div>
          </div>

          <div>
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
              Client Engine Time
            </span>
            <div className="font-mono text-slate-700 dark:text-slate-300">
              {item.processingTimeMs || 15} ms
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
              Zero Network Latency
            </div>
          </div>
        </div>
      )}

      {/* Main Visual Stage */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        className="relative w-full h-[440px] md:h-[500px] overflow-hidden select-none bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4"
      >
        {item.status === 'processing' && (
          <div className="flex flex-col items-center justify-center gap-3 z-20">
            <div className="w-10 h-10 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin" />
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Encoding in browser memory ({item.progress}%)...
            </div>
          </div>
        )}

        {/* Not yet converted state: Show Original with overlay prompt */}
        {!isConverted && item.status !== 'processing' && (
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            <img
              src={item.originalUrl}
              alt="Original preview"
              className="max-w-full max-h-[420px] object-contain rounded-lg shadow-sm border border-slate-200 dark:border-slate-800"
              style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.1s ease-out' }}
            />
            <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] rounded-lg flex flex-col items-center justify-center p-4 text-center">
              <button
                type="button"
                onClick={() => onConvertSingle(item)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-lg transition-transform hover:scale-105 cursor-pointer"
              >
                Click to Convert & Compare
              </button>
            </div>
          </div>
        )}

        {/* Converted: Split Slider Mode */}
        {isConverted && viewMode === 'split' && (
          <div
            id="split-comparison-container"
            className="relative w-full h-full max-w-full max-h-full flex items-center justify-center overflow-hidden"
          >
            {/* Wrapper that bounds image aspect ratio */}
            <div
              className="relative max-w-full max-h-full flex items-center justify-center"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: isDraggingSlider ? 'none' : 'transform 0.1s ease-out',
              }}
            >
              {/* After / Converted Image (Base Layer) */}
              <img
                src={item.convertedUrl}
                alt="Converted Preview"
                className="max-w-full max-h-[440px] object-contain rounded-lg pointer-events-none shadow-md"
              />

              {/* Before / Original Image (Clipped Overlay Layer) */}
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none rounded-lg"
                style={{
                  clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
                }}
              >
                <img
                  src={item.originalUrl}
                  alt="Original Preview"
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>

              {/* Draggable Divider Line */}
              <div
                id="split-handle"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className="absolute top-0 bottom-0 z-20 w-1 bg-white dark:bg-slate-100 shadow-[0_0_10px_rgba(0,0,0,0.5)] cursor-ew-resize flex items-center justify-center group"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-600 text-slate-800 dark:text-slate-100 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                </div>
              </div>
            </div>

            {/* Labels in Corners */}
            <div className="absolute top-3 left-3 z-10 pointer-events-none px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-semibold tracking-wide">
              Original ({getExtensionForFormat(item.originalFormat).toUpperCase()})
            </div>
            <div className="absolute top-3 right-3 z-10 pointer-events-none px-2.5 py-1 rounded-md bg-indigo-600/90 backdrop-blur-xs text-white text-[11px] font-semibold tracking-wide">
              Converted ({getExtensionForFormat(item.convertedFormat || 'image/webp').toUpperCase()})
            </div>
          </div>
        )}

        {/* Converted: Side-by-Side Dual Pane Mode */}
        {isConverted && viewMode === 'side-by-side' && (
          <div
            id="side-by-side-comparison-container"
            className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-full overflow-auto p-2"
          >
            {/* Left: Original */}
            <div className="relative flex flex-col items-center justify-center bg-slate-100/50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
              <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-slate-900/80 text-white text-[10px] font-semibold">
                Original • {formatBytes(item.originalSize)}
              </span>
              <img
                src={item.originalUrl}
                alt="Original side preview"
                className="max-w-full max-h-[360px] object-contain rounded"
                style={{ transform: `scale(${zoomLevel})` }}
              />
            </div>

            {/* Right: Converted */}
            <div className="relative flex flex-col items-center justify-center bg-slate-100/50 dark:bg-slate-900/50 rounded-xl p-3 border border-indigo-200 dark:border-indigo-900/50">
              <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-semibold">
                Converted • {formatBytes(item.convertedSize || 0)}
              </span>
              <img
                src={item.convertedUrl}
                alt="Converted side preview"
                className="max-w-full max-h-[360px] object-contain rounded"
                style={{ transform: `scale(${zoomLevel})` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
