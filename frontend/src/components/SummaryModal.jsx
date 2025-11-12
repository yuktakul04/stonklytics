import React from "react";

export default function SummaryModal({ open, onClose, symbol, summary, source, loading, error }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-[min(820px,92vw)] rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">AI Summary — {symbol}</h2>
          <button className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50" onClick={onClose}>
            Close
          </button>
        </div>

        {loading && <p className="text-gray-600">Generating summary…</p>}
        {error && <p className="text-red-600">{String(error)}</p>}

        {!loading && !error && (
          <>
            <p className="whitespace-pre-wrap leading-relaxed text-gray-800">{summary}</p>
            {source && (
              <div className="mt-4">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    source === "cache"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-emerald-100 text-emerald-700"
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
    </div>
  );
}
