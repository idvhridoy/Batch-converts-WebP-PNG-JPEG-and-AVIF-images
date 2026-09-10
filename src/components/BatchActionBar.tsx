import {
  Archive,
  CheckCircle2,
  FileCheck,
  FolderArchive,
  Layers,
  Play,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import React from 'react';
import { calculateSavings, formatBytes } from '../lib/imageProcessor';
import { ImageItem } from '../types';

interface BatchActionBarProps {
  items: ImageItem[];
  isConvertingAll: boolean;
  zipProgress: number | null; // 0 - 100 or null when not exporting
  onConvertAll: () => void;
  onDownloadZip: () => void;
  onClearAll: () => void;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  items,
  isConvertingAll,
  zipProgress,
  onConvertAll,
  onDownloadZip,
  onClearAll,
}) => {
  if (items.length === 0) return null;

  const completedItems = items.filter((i) => i.status === 'completed' && i.convertedBlob);
  const totalOriginalBytes = items.reduce((acc, curr) => acc + curr.originalSize, 0);
  const totalConvertedBytes = completedItems.reduce(
    (acc, curr) => acc + (curr.convertedSize || curr.originalSize),
    0
  );

  const completedOriginalBytes = completedItems.reduce((acc, curr) => acc + curr.originalSize, 0);
  const aggregateSavings =
    completedItems.length > 0
      ? calculateSavings(completedOriginalBytes, totalConvertedBytes)
      : null;

  const isZipExporting = zipProgress !== null;

  return (
    <div
      id="batch-actions-sticky-bar"
      className="sticky bottom-4 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800/90 p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2"
    >
      {/* Metrics breakdown */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            {completedItems.length}/{items.length}
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white">Batch Status</div>
            <div className="text-slate-500 dark:text-slate-400 text-[11px]">
              {completedItems.length === items.length
                ? 'All images converted'
                : `${items.length - completedItems.length} pending conversion`}
            </div>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

        {/* Space Saved stats */}
        {aggregateSavings && aggregateSavings.isSmaller && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              -{aggregateSavings.savingsPercentage}% space saved
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              ({formatBytes(aggregateSavings.savedBytes)} reduced)
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
        {/* Clear Button */}
        <button
          id="clear-all-queue-button"
          type="button"
          disabled={isConvertingAll || isZipExporting}
          onClick={onClearAll}
          className="px-3 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </button>

        {/* Convert All Button */}
        <button
          id="convert-all-queue-button"
          type="button"
          disabled={isConvertingAll || isZipExporting}
          onClick={onConvertAll}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-2xs"
        >
          {isConvertingAll ? (
            <>
              <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-900 dark:border-white border-t-transparent animate-spin" />
              <span>Processing Queue...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Convert All ({items.length})</span>
            </>
          )}
        </button>

        {/* Download ZIP Button */}
        <button
          id="download-all-zip-button"
          type="button"
          disabled={completedItems.length === 0 || isConvertingAll || isZipExporting}
          onClick={onDownloadZip}
          className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-2 shadow-md hover:shadow-lg"
        >
          {isZipExporting ? (
            <>
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>Building ZIP ({zipProgress}%)...</span>
            </>
          ) : (
            <>
              <FolderArchive className="w-4 h-4" />
              <span>Download ZIP ({completedItems.length})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
