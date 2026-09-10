import { AlertCircle, FileImage, Sparkles, UploadCloud } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { formatBytes } from '../lib/imageProcessor';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  onLoadSamples: () => void;
  isLoadingSamples?: boolean;
  maxFileSizeMb?: number;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  onLoadSamples,
  isLoadingSamples = false,
  maxFileSizeMb = 25,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndFilterFiles = (incomingFiles: FileList | File[]): File[] => {
    const validFiles: File[] = [];
    const maxBytes = maxFileSizeMb * 1024 * 1024;
    let sizeError = 0;
    let formatError = 0;

    const filesArray = Array.from(incomingFiles);

    for (const file of filesArray) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      const isValidMime = ALLOWED_MIME_TYPES.includes(file.type);
      const isValidExt = ALLOWED_EXTENSIONS.includes(ext);

      if (!isValidMime && !isValidExt) {
        formatError++;
        continue;
      }

      if (file.size > maxBytes) {
        sizeError++;
        continue;
      }

      validFiles.push(file);
    }

    if (sizeError > 0 || formatError > 0) {
      const errs: string[] = [];
      if (formatError > 0) {
        errs.push(`${formatError} file(s) skipped (only WebP, PNG, JPEG, and AVIF supported).`);
      }
      if (sizeError > 0) {
        errs.push(`${sizeError} file(s) exceeded the ${maxFileSizeMb}MB limit.`);
      }
      setErrorMessage(errs.join(' '));
    } else {
      setErrorMessage(null);
    }

    return validFiles;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validated = validateAndFilterFiles(e.dataTransfer.files);
      if (validated.length > 0) {
        onFilesSelected(validated);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validated = validateAndFilterFiles(e.target.files);
      if (validated.length > 0) {
        onFilesSelected(validated);
      }
      // Reset input value so re-selecting same file triggers change
      e.target.value = '';
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      <div
        id="image-dropzone-container"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative rounded-2xl border-2 border-dashed p-8 md:p-10 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/20 scale-[1.005]'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-white dark:bg-slate-900/50 shadow-xs'
        }`}
      >
        <input
          ref={fileInputRef}
          id="image-file-input"
          type="file"
          multiple
          accept=".webp,.png,.jpg,.jpeg,.avif,image/webp,image/png,image/jpeg,image/avif"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center max-w-xl mx-auto pointer-events-none">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-105 ${
              isDragOver
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <UploadCloud className="w-7 h-7" />
          </div>

          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            Drop images here or <span className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2">browse files</span>
          </h3>
          
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Supports batch processing for <strong className="text-slate-700 dark:text-slate-300">WebP, PNG, JPEG, AVIF</strong> up to {maxFileSizeMb}MB each.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <FileImage className="w-3.5 h-3.5 mr-1 text-slate-400" /> WebP
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <FileImage className="w-3.5 h-3.5 mr-1 text-slate-400" /> PNG
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <FileImage className="w-3.5 h-3.5 mr-1 text-slate-400" /> JPEG / JPG
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <FileImage className="w-3.5 h-3.5 mr-1 text-slate-400" /> AVIF
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50">
              100% Client-Side
            </span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div
          id="dropzone-error-banner"
          className="flex items-center gap-2 p-3 text-xs rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Quick sample loader button for instant one-click testing */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          No files handy? Try with sample test images:
        </span>
        <button
          id="load-sample-images-button"
          type="button"
          disabled={isLoadingSamples}
          onClick={(e) => {
            e.stopPropagation();
            onLoadSamples();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/60 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          {isLoadingSamples ? 'Generating Samples...' : 'Load Sample Images'}
        </button>
      </div>
    </div>
  );
};
