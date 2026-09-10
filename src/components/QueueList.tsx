import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileImage,
  RefreshCw,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { calculateSavings, formatBytes } from '../lib/imageProcessor';
import { downloadBlob, getExtensionForFormat } from '../lib/zipExporter';
import { ConversionConfig, ImageItem, SupportedFormat } from '../types';

interface QueueListProps {
  items: ImageItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onConvertItem: (item: ImageItem) => void;
  onUpdateItemConfig: (id: string, config: Partial<ConversionConfig>) => void;
  onClearCompleted?: () => void;
}

export const QueueList: React.FC<QueueListProps> = ({
  items,
  selectedItemId,
  onSelectItem,
  onRemoveItem,
  onConvertItem,
  onUpdateItemConfig,
  onClearCompleted,
}) => {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  if (items.length === 0) {
    return null;
  }

  const editingItem = items.find((i) => i.id === editingItemId);

  const handleDownload = (e: React.MouseEvent, item: ImageItem) => {
    e.stopPropagation();
    if (!item.convertedBlob) return;
    const baseName = item.name.replace(/\.[^/.]+$/, '');
    const ext = getExtensionForFormat(item.convertedFormat || 'image/webp');
    downloadBlob(item.convertedBlob, `${baseName}-converted.${ext}`);
  };

  return (
    <div
      id="batch-queue-container"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col gap-4"
    >
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Queue ({items.length} {items.length === 1 ? 'file' : 'files'})
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
            {items.filter((i) => i.status === 'completed').length} converted
          </span>
        </div>

        {onClearCompleted && items.some((i) => i.status === 'completed') && (
          <button
            id="clear-completed-button"
            type="button"
            onClick={onClearCompleted}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            Clear Completed
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5 max-h-[480px] overflow-y-auto pr-1">
        {items.map((item) => {
          const isSelected = item.id === selectedItemId;
          const isCompleted = item.status === 'completed';
          const isProcessing = item.status === 'processing';
          const isError = item.status === 'error';
          const savings =
            isCompleted && item.convertedSize
              ? calculateSavings(item.originalSize, item.convertedSize)
              : null;

          return (
            <div
              key={item.id}
              id={`queue-item-${item.id}`}
              onClick={() => onSelectItem(item.id)}
              className={`group relative flex items-center justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30'
              }`}
            >
              {/* Thumbnail & Basic Info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                  <img
                    src={item.convertedUrl || item.originalUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                      {item.name}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-semibold shrink-0">
                        Inspecting
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>{formatBytes(item.originalSize)}</span>
                    <span>•</span>
                    <span>
                      {item.originalDimensions.width}×{item.originalDimensions.height}
                    </span>
                    <span>•</span>
                    <span className="uppercase text-[10px] font-bold tracking-wider">
                      {getExtensionForFormat(item.originalFormat)}
                    </span>

                    {/* Converted details */}
                    {isCompleted && item.convertedSize && (
                      <>
                        <span className="text-slate-400">→</span>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                          {formatBytes(item.convertedSize)}
                        </span>
                        {savings && (
                          <span
                            className={`font-bold px-1.5 py-0.2 rounded text-[10px] ${
                              savings.isSmaller
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {savings.isSmaller ? `-${savings.savingsPercentage}%` : `+${Math.abs(savings.savingsPercentage)}%`}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Status & Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {isProcessing && (
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full transition-all duration-150"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-slate-500">{item.progress}%</span>
                  </div>
                )}

                {item.status === 'idle' && (
                  <button
                    id={`convert-item-${item.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onConvertItem(item);
                    }}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Convert now"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}

                {isCompleted && item.convertedBlob && (
                  <button
                    id={`download-item-${item.id}`}
                    type="button"
                    onClick={(e) => handleDownload(e, item)}
                    className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                    title="Download converted file"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}

                {/* Per-item configuration override */}
                <button
                  id={`config-item-${item.id}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingItemId(item.id);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Override settings for this image"
                >
                  <Settings2 className="w-4 h-4" />
                </button>

                {/* Remove item */}
                <button
                  id={`remove-item-${item.id}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveItem(item.id);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  title="Remove from queue"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Individual Item Override Modal */}
      {editingItem && (
        <div
          id="item-override-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={() => setEditingItemId(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                  Override Settings: {editingItem.name}
                </h4>
                <p className="text-xs text-slate-500">
                  Custom parameters for this file only
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItemId(null)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4 text-xs">
              {/* Format selection */}
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Target Format
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['image/webp', 'image/avif', 'image/jpeg', 'image/png'] as SupportedFormat[]).map(
                    (fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() =>
                          onUpdateItemConfig(editingItem.id, {
                            format: fmt,
                          })
                        }
                        className={`py-1.5 rounded-lg border font-semibold text-center cursor-pointer ${
                          editingItem.customConfig?.format === fmt
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {getExtensionForFormat(fmt).toUpperCase()}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Quality override */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Quality ({editingItem.customConfig?.quality || 85}%)
                  </label>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={editingItem.customConfig?.quality || 85}
                  onChange={(e) =>
                    onUpdateItemConfig(editingItem.id, {
                      quality: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateItemConfig(editingItem.id, {});
                    setEditingItemId(null);
                  }}
                  className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Reset to Global
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingItemId(null);
                    onConvertItem(editingItem);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer"
                >
                  Save & Convert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
