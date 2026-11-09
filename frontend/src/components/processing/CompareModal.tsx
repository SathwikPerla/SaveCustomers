import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Sliders, SplitSquareVertical, Eye } from 'lucide-react';
import { ImageItem } from '../../types';
import { api } from '../../services/api';

interface CompareModalProps {
  image: ImageItem;
  projectId: string;
  onClose: () => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  image,
  projectId,
  onClose,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const beforeUrl = image.url;
  const afterUrl = image.processed_url || image.url;

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pos = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(pos);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/90 backdrop-blur-md animate-in fade-in">
      <div className="bg-charcoal-200 border border-surface-border rounded-3xl w-full max-w-4xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-savecus-500/15 border border-savecus-500/30 text-savecus-400 flex items-center justify-center shadow-inner">
              <SplitSquareVertical className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Before & After Comparison</span>
                <span className="text-xs text-slate-300 bg-charcoal-400 border border-surface-border px-2.5 py-0.5 rounded-full font-mono">
                  {image.original_filename}
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Drag the divider handle horizontally to inspect background inpainting and branding fidelity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {image.processed_url && (
              <a
                href={api.getImageDownloadUrl(projectId, image.id)}
                download
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-savecus-500 hover:bg-savecus-400 text-charcoal-900 text-xs font-extrabold shadow-md shadow-savecus-500/20 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download Photo</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-charcoal-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Split Comparison Viewer */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          className="relative flex-1 min-h-[420px] bg-charcoal-400 flex items-center justify-center overflow-hidden cursor-ew-resize select-none"
        >
          {/* After Image (Background full) */}
          <img
            src={afterUrl}
            alt="Rebranded Result"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />

          {/* Before Image (Clipped overlay) */}
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ width: `${sliderPosition}%` }}
          >
            <img
              src={beforeUrl}
              alt="Original Image"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{
                width: containerRef.current?.offsetWidth || '100%',
                maxWidth: 'none',
              }}
            />
          </div>

          {/* Slider Line & Handle */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-savecus-500 shadow-2xl z-20 flex items-center justify-center pointer-events-none"
            style={{ left: `${sliderPosition}%` }}
          >
            <div
              onMouseDown={() => setIsDragging(true)}
              onTouchStart={() => setIsDragging(true)}
              className="pointer-events-auto w-9 h-9 rounded-full bg-savecus-500 text-charcoal-900 shadow-xl flex items-center justify-center cursor-ew-resize active:scale-110 transition-transform"
            >
              <SplitSquareVertical className="w-5 h-5" />
            </div>
          </div>

          {/* Labels */}
          <div className="absolute bottom-4 left-4 z-10 px-3 py-1.5 rounded-xl bg-charcoal-900/90 backdrop-blur-sm border border-surface-border text-xs font-bold text-slate-200">
            Original (Before)
          </div>
          <div className="absolute bottom-4 right-4 z-10 px-3 py-1.5 rounded-xl bg-charcoal-900/90 backdrop-blur-sm border border-savecus-500/50 text-xs font-bold text-savecus-400">
            Rebranded (After)
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-surface-border bg-charcoal-300 flex items-center justify-between text-xs text-slate-300">
          <span>Dimensions: <strong className="text-white">{image.width} × {image.height}px</strong></span>
          <span className="font-semibold text-emerald-400">
            {image.status === 'completed' ? '✓ Successfully Rebranded' : 'Unprocessed'}
          </span>
        </div>
      </div>
    </div>
  );
};

