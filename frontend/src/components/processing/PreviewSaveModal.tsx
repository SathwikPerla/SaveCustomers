import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Download,
  FileArchive,
  Share2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { ImageItem } from '../../types';
import { api } from '../../services/api';

interface Props {
  images: ImageItem[];
  projectId: string;
  projectName: string;
  isProcessing: boolean;
  progress: { current: number; total: number; pct: number };
  needsProcessing: boolean;
  onReprocess: () => void;
  onClose: () => void;
  startIndex?: number | null;
  onEdit?: (idx: number) => void;
}

const finalUrl = (img: ImageItem) => img.processed_url || img.url;

const fileNameFor = (img: ImageItem, idx: number) => {
  const stem = (img.original_filename || `photo_${idx + 1}`).replace(/\.[^.]+$/, '');
  return `${String(idx + 1).padStart(2, '0')}_${stem}_rebranded.jpg`;
};

export const PreviewSaveModal: React.FC<Props> = ({
  images,
  projectId,
  projectName,
  isProcessing,
  progress,
  needsProcessing,
  onReprocess,
  onClose,
  startIndex = null,
  onEdit,
}) => {
  const single = startIndex !== null;
  const [viewIdx, setViewIdx] = useState<number | null>(startIndex);
  const [files, setFiles] = useState<File[] | null>(null);
  const [prepError, setPrepError] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);

  const ready = !isProcessing && !needsProcessing;
  const closeViewer = () => (single ? onClose() : setViewIdx(null));
  const canShareFiles =
    typeof navigator !== 'undefined' &&
    typeof (navigator as any).canShare === 'function' &&
    typeof navigator.share === 'function';

  // Pre-fetch final images as File objects so the share sheet can open instantly on tap
  // (mobile browsers require share() to be called right after the user's tap).
  useEffect(() => {
    if (!ready || !canShareFiles) return;
    let cancelled = false;
    setFiles(null);
    setPrepError(false);
    (async () => {
      try {
        const out: File[] = [];
        for (let i = 0; i < images.length; i++) {
          const res = await fetch(finalUrl(images[i]));
          const blob = await res.blob();
          out.push(new File([blob], fileNameFor(images[i], i), { type: blob.type || 'image/jpeg' }));
        }
        if (!cancelled) setFiles(out);
      } catch {
        if (!cancelled) setPrepError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, images.map((i) => i.processed_url).join('|')]);

  const downloadZip = () => {
    const a = document.createElement('a');
    a.href = api.getZipExportUrl(projectId);
    a.download = `${projectName || 'photos'}_rebranded.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const saveToPhone = async () => {
    if (!files || !(navigator as any).canShare?.({ files })) {
      downloadZip();
      return;
    }
    try {
      await navigator.share({ files });
      setShareMsg('Choose "Save Images" / "Save to Gallery" in the menu that opened.');
    } catch (e: any) {
      if (e?.name !== 'AbortError') downloadZip();
    }
  };

  const go = (d: number) =>
    setViewIdx((i) => (i === null ? i : (i + d + images.length) % images.length));

  return (
    <div className="fixed inset-0 z-[60] bg-charcoal-900 flex flex-col text-white">
      {/* Header */}
      <div className="h-14 px-3 flex items-center justify-between border-b border-surface-border bg-charcoal-400 shrink-0">
        <div className="font-black text-base">Preview & Save</div>
        <button
          onClick={onClose}
          className="w-11 h-11 rounded-xl bg-charcoal-300 flex items-center justify-center active:scale-95"
          aria-label="Close preview"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      {!ready ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
          {isProcessing ? (
            <>
              <div className="w-12 h-12 border-4 border-savecus-500 border-t-transparent rounded-full animate-spin" />
              <div className="font-black text-lg">Applying to all photos…</div>
              <div className="w-full max-w-xs h-3 bg-charcoal-300 rounded-full overflow-hidden">
                <div
                  className="h-full bg-savecus-500 transition-all"
                  style={{ width: `${progress.pct}%` }}
                />
              </div>
              <div className="text-sm text-slate-300">
                {progress.current} of {progress.total} done
              </div>
            </>
          ) : (
            <>
              <div className="text-slate-300 text-sm">
                You changed something since the last preview.
              </div>
              <button
                onClick={onReprocess}
                className="min-h-[56px] px-6 rounded-2xl bg-savecus-500 text-charcoal-950 font-black flex items-center gap-2 active:scale-95"
              >
                <RefreshCw className="w-5 h-5" /> Apply to all & preview
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-2">
            <div className="flex items-center gap-2 text-emerald-300 text-sm font-bold px-1 pb-2">
              <CheckCircle2 className="w-4 h-4" />
              {images.length} photos ready — tap a photo to view it big
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setViewIdx(idx)}
                  className="relative aspect-[3/4] rounded-xl overflow-hidden bg-charcoal-300 border border-surface-border active:scale-95"
                >
                  <img
                    src={finalUrl(img)}
                    alt={`Photo ${idx + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-charcoal-950/85 text-xs font-black">
                    #{idx + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sticky save bar */}
          <div
            className="shrink-0 border-t border-surface-border bg-charcoal-400 p-3 space-y-2"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            {shareMsg && <div className="text-xs text-emerald-300 text-center">{shareMsg}</div>}
            {prepError && (
              <div className="text-xs text-amber-300 text-center">
                Could not prepare photos for gallery save — use ZIP instead.
              </div>
            )}
            <div className="flex gap-2">
              {canShareFiles && !prepError && (
                <button
                  onClick={saveToPhone}
                  disabled={!files}
                  className="flex-1 min-h-[56px] rounded-2xl bg-savecus-500 text-charcoal-950 font-black flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60"
                >
                  <Share2 className="w-5 h-5" />
                  {files ? 'Save to Phone' : 'Preparing…'}
                </button>
              )}
              <button
                onClick={downloadZip}
                className={`min-h-[56px] rounded-2xl font-black flex items-center justify-center gap-2 active:scale-95 ${
                  canShareFiles && !prepError
                    ? 'px-4 bg-charcoal-200 border border-surface-border text-white'
                    : 'flex-1 bg-savecus-500 text-charcoal-950'
                }`}
              >
                <FileArchive className="w-5 h-5" />
                {canShareFiles && !prepError ? 'ZIP' : 'Download All (ZIP)'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Full-screen viewer with swipe */}
      {viewIdx !== null && images[viewIdx] && (
        <div
          className="fixed inset-0 z-[70] bg-black flex flex-col"
          onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
          }}
        >
          <div className="h-14 px-3 flex items-center justify-between shrink-0">
            <span className="font-black">
              {viewIdx + 1} / {images.length}
            </span>
            <div className="flex gap-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(viewIdx)}
                  className="h-11 px-4 rounded-xl bg-charcoal-300 border border-surface-border text-white font-black active:scale-95"
                >
                  Edit
                </button>
              )}
              <a
                href={finalUrl(images[viewIdx])}
                download={fileNameFor(images[viewIdx], viewIdx)}
                className="h-11 px-4 rounded-xl bg-savecus-500 text-charcoal-950 font-black flex items-center gap-2 active:scale-95"
              >
                <Download className="w-4 h-4" /> Save
              </a>
              <button
                onClick={closeViewer}
                className="w-11 h-11 rounded-xl bg-charcoal-300 flex items-center justify-center active:scale-95"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 relative flex items-center justify-center">
            <img
              src={finalUrl(images[viewIdx])}
              alt={`Photo ${viewIdx + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            {!images[viewIdx].processed_url && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-500 text-charcoal-950 text-xs font-black">
                Original — not applied yet
              </div>
            )}
            <button
              onClick={() => go(-1)}
              className="absolute left-1 w-11 h-11 rounded-full bg-black/60 flex items-center justify-center active:scale-95"
              aria-label="Previous"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => go(1)}
              className="absolute right-1 w-11 h-11 rounded-full bg-black/60 flex items-center justify-center active:scale-95"
              aria-label="Next"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
          <div className="h-8 shrink-0 text-center text-[11px] text-slate-400">Swipe left / right for next photo</div>
        </div>
      )}
    </div>
  );
};
