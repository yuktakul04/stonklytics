import React from "react";

export default function SummaryModal({ open, onClose, symbol, summary, source, loading, error }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative z-10 w-[min(860px,94vw)] overflow-hidden rounded-xl border border-[#27272a] bg-[#0f0f12] shadow-large animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#27272a] bg-[#18181b] px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#27272a]">
                <svg className="h-5 w-5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a10.86 10.86 0 01-4.558-.97L3 20l1.3-3.9A7.67 7.67 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-white truncate">AI Summary</h2>
                <p className="text-sm text-zinc-500 truncate">{symbol}</p>
              </div>
            </div>
          </div>

          <button 
            className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-[#27272a] transition-colors" 
            onClick={onClose} 
            aria-label="Close summary"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 bg-[#09090b] ui-scrollbar">
          {loading && (
            <div className="flex items-center gap-3 text-sm text-zinc-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400" />
              <span>Generating summary…</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {String(error)}
            </div>
          )}

        {!loading && !error && (
          <>
              <div className="prose prose-invert max-w-none">
                <p className="whitespace-pre-wrap leading-relaxed text-zinc-300 text-sm">{summary}</p>
              </div>

            {source && (
                <div className="mt-5 flex items-center justify-between gap-3 pt-4 border-t border-[#27272a]">
                  <span className="text-xs text-zinc-600">Source</span>
                <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                    source === "cache"
                        ? "bg-amber-500/10 text-amber-500"
                        : "bg-green-500/10 text-green-500"
                  }`}
                  title={source === "cache" ? "Served from cache" : "Freshly generated"}
                >
                  {source === "cache" ? "cached" : "live"}
                </span>
              </div>
            )}
          </>
        )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-[#27272a] bg-[#18181b] px-6 py-4">
          <button 
            className="px-5 py-2 bg-[#27272a] hover:bg-[#3f3f46] text-white text-sm font-medium rounded-lg transition-colors" 
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
