import { Cpu, FileCheck, Layers, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import React from 'react';
import { FormatCapability, SupportedFormat } from '../types';

interface HeaderProps {
  capabilities: Record<SupportedFormat, FormatCapability> | null;
}

export const Header: React.FC<HeaderProps> = ({ capabilities }) => {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Batch Image Converter
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Client-Side Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              WebP • PNG • JPEG • AVIF with custom quality & resolution scaling
            </p>
          </div>
        </div>

        {/* Browser capabilities & Privacy Pill */}
        <div className="flex items-center gap-2 text-xs">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">100% In-Browser & Private</span>
          </div>

          {capabilities && (
            <div className="flex items-center gap-1">
              {(['image/webp', 'image/avif', 'image/jpeg', 'image/png'] as SupportedFormat[]).map(
                (fmt) => {
                  const cap = capabilities[fmt];
                  const label = cap?.extension.toUpperCase() || fmt;
                  return (
                    <span
                      key={fmt}
                      title={cap?.isSupported ? `Native ${label} encoding supported` : `${label} fallback active`}
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold border ${
                        cap?.isSupported
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200'
                      }`}
                    >
                      {label}
                    </span>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
