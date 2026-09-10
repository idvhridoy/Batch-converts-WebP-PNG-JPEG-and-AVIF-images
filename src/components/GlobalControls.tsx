import {
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Info,
  Maximize2,
  Percent,
  RefreshCw,
  Sliders,
  Sparkles,
} from 'lucide-react';
import React, { useState } from 'react';
import { SUPPORTED_FORMATS } from '../lib/imageProcessor';
import { ConversionConfig, FormatCapability, ScaleMode, SupportedFormat } from '../types';

interface GlobalControlsProps {
  config: ConversionConfig;
  onChange: (newConfig: ConversionConfig) => void;
  capabilities: Record<SupportedFormat, FormatCapability> | null;
  onApplyToAll?: () => void;
  isProcessing?: boolean;
}

const QUALITY_PRESETS = [
  { label: '50% (Economy)', value: 50 },
  { label: '75% (Compact)', value: 75 },
  { label: '85% (Balanced)', value: 85 },
  { label: '92% (High-Def)', value: 92 },
  { label: '100% (Max)', value: 100 },
];

const PERCENTAGE_PRESETS = [25, 50, 75, 100, 150];

export const GlobalControls: React.FC<GlobalControlsProps> = ({
  config,
  onChange,
  capabilities,
  onApplyToAll,
  isProcessing = false,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateConfig = (updates: Partial<ConversionConfig>) => {
    onChange({
      ...config,
      ...updates,
    });
  };

  const isPng = config.format === 'image/png';
  const isJpeg = config.format === 'image/jpeg';

  return (
    <div
      id="global-conversion-controls"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 shadow-xs flex flex-col gap-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Conversion Parameters
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Apply globally across all queued images or override per image
            </p>
          </div>
        </div>

        {onApplyToAll && (
          <button
            id="apply-settings-to-all-button"
            type="button"
            disabled={isProcessing}
            onClick={onApplyToAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Re-apply to All Items
          </button>
        )}
      </div>

      {/* Target Format Selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
          Target Output Format
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {SUPPORTED_FORMATS.map((f) => {
            const isSelected = config.format === f.format;
            const capability = capabilities ? capabilities[f.format] : null;
            const isSupported = capability ? capability.isSupported : true;

            return (
              <button
                key={f.format}
                id={`format-select-${f.extension}`}
                type="button"
                onClick={() => updateConfig({ format: f.format })}
                className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-100 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="w-full flex items-center justify-between mb-1">
                  <span className="font-bold text-sm tracking-tight">{f.label}</span>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                  {f.description}
                </span>

                {capability && !isSupported && (
                  <span className="mt-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    Fallback to WebP
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quality Control Slider */}
      <div className="flex flex-col gap-2.5 pt-1">
        <div className="flex items-center justify-between">
          <label
            htmlFor="global-quality-slider"
            className="text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5"
          >
            Encoding Quality
            {isPng && (
              <span className="normal-case font-normal text-[11px] text-slate-400">
                (PNG is inherently lossless)
              </span>
            )}
          </label>
          <div className="flex items-center gap-2">
            <span
              id="quality-display-badge"
              className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                isPng
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
              }`}
            >
              {isPng ? 'Lossless (100%)' : `${config.quality}%`}
            </span>
          </div>
        </div>

        <div className="relative">
          <input
            id="global-quality-slider"
            type="range"
            min={5}
            max={100}
            step={1}
            disabled={isPng}
            value={config.quality}
            onChange={(e) => updateConfig({ quality: parseInt(e.target.value, 10) })}
            className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-40"
          />
        </div>

        {/* Quality presets */}
        {!isPng && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] text-slate-400 mr-1">Presets:</span>
            {QUALITY_PRESETS.map((preset) => (
              <button
                key={preset.value}
                id={`quality-preset-${preset.value}`}
                type="button"
                onClick={() => updateConfig({ quality: preset.value })}
                className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  config.quality === preset.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Resolution & Scaling Controls */}
      <div className="flex flex-col gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
        <label className="text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase flex items-center justify-between">
          <span>Resolution Scaling</span>
          <span className="font-normal text-[11px] text-slate-400">
            {config.scaleMode === 'original' && 'Original 1:1 pixel dimensions'}
            {config.scaleMode === 'percentage' && `Rescaled to ${config.percentage}%`}
            {config.scaleMode === 'custom' && 'Constrained dimensions'}
          </span>
        </label>

        {/* Scaling Mode Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
          <button
            id="scale-mode-original"
            type="button"
            onClick={() => updateConfig({ scaleMode: 'original' })}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              config.scaleMode === 'original'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Original (100%)
          </button>
          <button
            id="scale-mode-percentage"
            type="button"
            onClick={() => updateConfig({ scaleMode: 'percentage' })}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              config.scaleMode === 'percentage'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Percentage Scale
          </button>
          <button
            id="scale-mode-custom"
            type="button"
            onClick={() => updateConfig({ scaleMode: 'custom' })}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              config.scaleMode === 'custom'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Custom Bounds
          </button>
        </div>

        {/* Percentage Options */}
        {config.scaleMode === 'percentage' && (
          <div className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Scale Ratio</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {config.percentage}%
              </span>
            </div>
            <input
              id="scale-percentage-slider"
              type="range"
              min={10}
              max={200}
              step={5}
              value={config.percentage}
              onChange={(e) => updateConfig({ percentage: parseInt(e.target.value, 10) })}
              className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex items-center gap-1.5 mt-1">
              {PERCENTAGE_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => updateConfig({ percentage: p })}
                  className={`text-[11px] px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                    config.percentage === p
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Dimensions Options */}
        {config.scaleMode === 'custom' && (
          <div className="flex flex-col gap-3 p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                  Max Width (px)
                </label>
                <input
                  id="custom-width-input"
                  type="number"
                  placeholder="Auto (original)"
                  min={1}
                  max={8192}
                  value={config.customWidth || ''}
                  onChange={(e) =>
                    updateConfig({
                      customWidth: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                  Max Height (px)
                </label>
                <input
                  id="custom-height-input"
                  type="number"
                  placeholder="Auto (original)"
                  min={1}
                  max={8192}
                  value={config.customHeight || ''}
                  onChange={(e) =>
                    updateConfig({
                      customHeight: e.target.value ? parseInt(e.target.value, 10) : undefined,
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800">
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  id="maintain-aspect-ratio-toggle"
                  type="checkbox"
                  checked={config.maintainAspectRatio}
                  onChange={(e) => updateConfig({ maintainAspectRatio: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Maintain Aspect Ratio
              </label>

              {config.maintainAspectRatio && (
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-slate-400">Fit:</span>
                  <select
                    id="fit-mode-select"
                    value={config.fitMode}
                    onChange={(e) => updateConfig({ fitMode: e.target.value as any })}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-slate-800 dark:text-slate-200 text-xs"
                  >
                    <option value="contain">Contain (Fit within)</option>
                    <option value="cover">Cover (Crop to fill)</option>
                    <option value="fill">Stretch / Fill</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Advanced Drawer: Background Color & Canvas Smoothing */}
      <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
        <button
          id="toggle-advanced-controls"
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white py-1 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            Advanced Engine & Color Settings
          </span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="mt-3 flex flex-col gap-3.5 p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
            {/* Background Color for JPEG */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Background Color (for JPEG conversions)
                </label>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-4 h-4 rounded border border-slate-300 dark:border-slate-700"
                    style={{ backgroundColor: config.backgroundColor }}
                  />
                  <span className="text-[11px] font-mono text-slate-500">
                    {config.backgroundColor}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateConfig({ backgroundColor: '#FFFFFF' })}
                  className="px-2 py-1 text-[11px] rounded bg-white border border-slate-200 text-slate-700 shadow-2xs cursor-pointer"
                >
                  White
                </button>
                <button
                  type="button"
                  onClick={() => updateConfig({ backgroundColor: '#000000' })}
                  className="px-2 py-1 text-[11px] rounded bg-slate-900 border border-slate-800 text-white cursor-pointer"
                >
                  Black
                </button>
                <input
                  id="bg-color-picker"
                  type="color"
                  value={config.backgroundColor}
                  onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                  className="w-7 h-7 p-0 border border-slate-300 dark:border-slate-700 rounded cursor-pointer"
                  title="Pick custom background color"
                />
              </div>
            </div>

            {/* Smoothing Quality */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <div>
                <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Resampling Interpolation
                </div>
                <div className="text-[10px] text-slate-400">Bicubic smoothing quality</div>
              </div>
              <select
                id="smoothing-quality-select"
                value={config.smoothingQuality}
                onChange={(e) => updateConfig({ smoothingQuality: e.target.value as any })}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-slate-800 dark:text-slate-200 text-xs"
              >
                <option value="high">High (Lanczos/Bicubic)</option>
                <option value="medium">Medium (Bilinear)</option>
                <option value="low">Low (Nearest Neighbor)</option>
              </select>
            </div>

            {/* Privacy indicator */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>
                <strong>Zero Server Transmission:</strong> Images are processed entirely in browser
                memory. EXIF camera geolocation and metadata are automatically scrubbed.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
