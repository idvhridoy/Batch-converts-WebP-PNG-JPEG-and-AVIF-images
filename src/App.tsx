import React, { useEffect, useState } from 'react';
import { BatchActionBar } from './components/BatchActionBar';
import { ComparisonViewer } from './components/ComparisonViewer';
import { DropZone } from './components/DropZone';
import { GlobalControls } from './components/GlobalControls';
import { Header } from './components/Header';
import { QueueList } from './components/QueueList';
import { ToastContainer } from './components/ToastContainer';
import {
  calculateSavings,
  convertImage,
  createSampleImages,
  detectFormatCapabilities,
  formatBytes,
  loadImageDimensions,
} from './lib/imageProcessor';
import { downloadBlob, exportBatchAsZip } from './lib/zipExporter';
import {
  ConversionConfig,
  FormatCapability,
  ImageItem,
  SupportedFormat,
  ToastMessage,
} from './types';

export default function App() {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<Record<SupportedFormat, FormatCapability> | null>(
    null
  );
  const [isConvertingAll, setIsConvertingAll] = useState(false);
  const [zipProgress, setZipProgress] = useState<number | null>(null);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Default conversion configuration
  const [config, setConfig] = useState<ConversionConfig>({
    format: 'image/webp',
    quality: 85,
    scaleMode: 'original',
    percentage: 100,
    maintainAspectRatio: true,
    fitMode: 'contain',
    backgroundColor: '#FFFFFF',
    smoothingQuality: 'high',
    stripMetadata: true,
  });

  // Detect browser format support on mount
  useEffect(() => {
    detectFormatCapabilities().then((caps) => {
      setCapabilities(caps);
    });
  }, []);

  const showToast = (
    type: 'info' | 'success' | 'warning' | 'error',
    title: string,
    message?: string
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Ingest new files
  const handleFilesSelected = async (newFiles: File[]) => {
    const newItems: ImageItem[] = [];

    for (const file of newFiles) {
      const url = URL.createObjectURL(file);
      try {
        const dims = await loadImageDimensions(url);
        newItems.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          file,
          name: file.name,
          originalSize: file.size,
          originalFormat: file.type || 'image/png',
          originalDimensions: dims,
          originalUrl: url,
          status: 'idle',
          progress: 0,
        });
      } catch (err) {
        console.error('Error loading image dimensions:', err);
        URL.revokeObjectURL(url);
      }
    }

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
      if (!selectedItemId) {
        setSelectedItemId(newItems[0].id);
      }
      showToast(
        'info',
        `Added ${newItems.length} image${newItems.length > 1 ? 's' : ''}`,
        'Ready for batch or individual conversion.'
      );
    }
  };

  // Load built-in sample test images
  const handleLoadSamples = async () => {
    setIsLoadingSamples(true);
    try {
      const sampleFiles = await createSampleImages();
      await handleFilesSelected(sampleFiles);
      showToast('success', 'Sample Images Loaded', 'Loaded 3 test images in different formats.');
    } catch (err) {
      showToast('error', 'Failed to generate samples', String(err));
    } finally {
      setIsLoadingSamples(false);
    }
  };

  // Convert a single image
  const handleConvertSingle = async (targetItem: ImageItem) => {
    // Determine configuration (per-item override takes priority over global)
    const effectiveConfig: ConversionConfig = {
      ...config,
      ...(targetItem.customConfig || {}),
    };

    setItems((prev) =>
      prev.map((i) =>
        i.id === targetItem.id ? { ...i, status: 'processing', progress: 10, error: undefined } : i
      )
    );

    try {
      const result = await convertImage(
        targetItem.originalUrl,
        targetItem.originalDimensions,
        effectiveConfig,
        (prog) => {
          setItems((prev) =>
            prev.map((i) => (i.id === targetItem.id ? { ...i, progress: prog } : i))
          );
        }
      );

      // Clean up previous converted URL if any
      if (targetItem.convertedUrl) {
        URL.revokeObjectURL(targetItem.convertedUrl);
      }

      const convertedUrl = URL.createObjectURL(result.blob);

      setItems((prev) =>
        prev.map((i) =>
          i.id === targetItem.id
            ? {
                ...i,
                status: 'completed',
                progress: 100,
                convertedBlob: result.blob,
                convertedUrl,
                convertedSize: result.blob.size,
                convertedDimensions: result.dimensions,
                convertedFormat: effectiveConfig.format,
                processingTimeMs: result.executionTimeMs,
              }
            : i
        )
      );

      const savings = calculateSavings(targetItem.originalSize, result.blob.size);
      showToast(
        'success',
        `Converted ${targetItem.name}`,
        savings.isSmaller
          ? `Saved ${savings.savingsPercentage}% space (${formatBytes(savings.savedBytes)})`
          : `Size: ${formatBytes(result.blob.size)}`
      );
    } catch (err) {
      console.error('Conversion failed for item:', targetItem.name, err);
      setItems((prev) =>
        prev.map((i) =>
          i.id === targetItem.id
            ? { ...i, status: 'error', progress: 0, error: (err as Error).message }
            : i
        )
      );
      showToast('error', `Failed to convert ${targetItem.name}`, (err as Error).message);
    }
  };

  // Convert all queue items sequentially
  const handleConvertAll = async () => {
    if (items.length === 0 || isConvertingAll) return;

    setIsConvertingAll(true);
    let successCount = 0;

    for (const item of items) {
      try {
        const effectiveConfig: ConversionConfig = {
          ...config,
          ...(item.customConfig || {}),
        };

        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: 'processing', progress: 15 } : i
          )
        );

        const result = await convertImage(
          item.originalUrl,
          item.originalDimensions,
          effectiveConfig,
          (prog) => {
            setItems((prev) =>
              prev.map((i) => (i.id === item.id ? { ...i, progress: prog } : i))
            );
          }
        );

        if (item.convertedUrl) {
          URL.revokeObjectURL(item.convertedUrl);
        }

        const convertedUrl = URL.createObjectURL(result.blob);

        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'completed',
                  progress: 100,
                  convertedBlob: result.blob,
                  convertedUrl,
                  convertedSize: result.blob.size,
                  convertedDimensions: result.dimensions,
                  convertedFormat: effectiveConfig.format,
                  processingTimeMs: result.executionTimeMs,
                }
              : i
          )
        );
        successCount++;
      } catch (err) {
        console.error('Batch convert failure on item:', item.name, err);
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: 'error', progress: 0, error: (err as Error).message }
              : i
          )
        );
      }
    }

    setIsConvertingAll(false);
    showToast(
      'success',
      'Batch Conversion Completed',
      `Processed ${successCount} of ${items.length} images successfully.`
    );
  };

  // Re-apply global settings to all items
  const handleReapplyGlobalToAll = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        customConfig: undefined,
        status: 'idle',
        progress: 0,
      }))
    );
    showToast(
      'info',
      'Settings Updated for All Items',
      'All queued items will use the updated global configuration.'
    );
  };

  // Download all completed files as ZIP
  const handleDownloadZip = async () => {
    const completedItems = items.filter((i) => i.status === 'completed' && i.convertedBlob);
    if (completedItems.length === 0) {
      showToast('warning', 'No Converted Files', 'Convert at least one image before downloading ZIP.');
      return;
    }

    setZipProgress(0);
    try {
      const zipBlob = await exportBatchAsZip(items, (progress) => {
        setZipProgress(progress);
      });
      downloadBlob(zipBlob, `batch-converted-images-${Date.now()}.zip`);
      showToast(
        'success',
        'ZIP Archive Ready',
        `Downloaded ${completedItems.length} converted images in ZIP.`
      );
    } catch (err) {
      console.error('ZIP generation error:', err);
      showToast('error', 'ZIP Export Failed', (err as Error).message);
    } finally {
      setZipProgress(null);
    }
  };

  // Remove individual item
  const handleRemoveItem = (id: string) => {
    const target = items.find((i) => i.id === id);
    if (target) {
      URL.revokeObjectURL(target.originalUrl);
      if (target.convertedUrl) URL.revokeObjectURL(target.convertedUrl);
    }
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    if (selectedItemId === id) {
      setSelectedItemId(updated.length > 0 ? updated[0].id : null);
    }
  };

  // Clear all items
  const handleClearAll = () => {
    items.forEach((i) => {
      URL.revokeObjectURL(i.originalUrl);
      if (i.convertedUrl) URL.revokeObjectURL(i.convertedUrl);
    });
    setItems([]);
    setSelectedItemId(null);
    showToast('info', 'Queue Cleared', 'All images removed from memory.');
  };

  // Clear only completed items
  const handleClearCompleted = () => {
    const completed = items.filter((i) => i.status === 'completed');
    completed.forEach((i) => {
      URL.revokeObjectURL(i.originalUrl);
      if (i.convertedUrl) URL.revokeObjectURL(i.convertedUrl);
    });
    const remaining = items.filter((i) => i.status !== 'completed');
    setItems(remaining);
    if (selectedItemId && completed.some((i) => i.id === selectedItemId)) {
      setSelectedItemId(remaining.length > 0 ? remaining[0].id : null);
    }
    showToast('info', 'Cleared Completed Items');
  };

  // Update specific item override
  const handleUpdateItemConfig = (id: string, customConfig: Partial<ConversionConfig>) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, customConfig, status: 'idle', progress: 0 } : i))
    );
  };

  const selectedItem = items.find((i) => i.id === selectedItemId) || (items.length > 0 ? items[0] : null);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Navigation */}
      <Header capabilities={capabilities} />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* If no images uploaded yet, show prominent DropZone */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[520px] max-w-2xl mx-auto w-full gap-6">
            <DropZone
              onFilesSelected={handleFilesSelected}
              onLoadSamples={handleLoadSamples}
              isLoadingSamples={isLoadingSamples}
            />

            {/* Quick feature overview pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-center text-xs text-slate-600 dark:text-slate-400">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="font-semibold text-slate-900 dark:text-white mb-0.5">
                  Privacy-Guaranteed
                </div>
                <div>Zero server upload. All pixels processed in browser memory.</div>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="font-semibold text-slate-900 dark:text-white mb-0.5">
                  Next-Gen Formats
                </div>
                <div>Convert between WebP, AVIF, JPEG, and PNG in batch.</div>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="font-semibold text-slate-900 dark:text-white mb-0.5">
                  Real-Time Diff
                </div>
                <div>Interactive split slider to compare quality and byte savings.</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Top compact drop banner so user can easily append more images */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <DropZone
                  onFilesSelected={handleFilesSelected}
                  onLoadSamples={handleLoadSamples}
                  isLoadingSamples={isLoadingSamples}
                />
              </div>
            </div>

            {/* Main Dual-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Global Parameters & Queue List */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <GlobalControls
                  config={config}
                  onChange={setConfig}
                  capabilities={capabilities}
                  onApplyToAll={handleReapplyGlobalToAll}
                  isProcessing={isConvertingAll}
                />

                <QueueList
                  items={items}
                  selectedItemId={selectedItemId}
                  onSelectItem={setSelectedItemId}
                  onRemoveItem={handleRemoveItem}
                  onConvertItem={handleConvertSingle}
                  onUpdateItemConfig={handleUpdateItemConfig}
                  onClearCompleted={handleClearCompleted}
                />
              </div>

              {/* Right Column: Interactive Editor & Comparison Viewer */}
              <div className="lg:col-span-7 flex flex-col gap-6 sticky top-20">
                <ComparisonViewer
                  item={selectedItem}
                  onConvertSingle={handleConvertSingle}
                  onShowToast={showToast}
                />
              </div>
            </div>

            {/* Sticky Batch Actions Toolbar */}
            <BatchActionBar
              items={items}
              isConvertingAll={isConvertingAll}
              zipProgress={zipProgress}
              onConvertAll={handleConvertAll}
              onDownloadZip={handleDownloadZip}
              onClearAll={handleClearAll}
            />
          </div>
        )}
      </main>

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
