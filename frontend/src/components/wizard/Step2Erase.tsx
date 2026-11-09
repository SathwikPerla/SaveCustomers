import React, { useState } from 'react';
import { Eraser, Wand2, ArrowRight, ArrowLeft, CheckCircle2, RotateCcw, AlertCircle, Eye, Check } from 'lucide-react';
import { ImageItem, MaskRegion } from '../../types';
import { StudioCanvas } from '../editor/StudioCanvas';

interface Step2EraseProps {
  currentImage: ImageItem;
  images: ImageItem[];
  onSelectImage: (img: ImageItem) => void;
  maskRegions: MaskRegion[];
  onAddMaskRegion: (region: MaskRegion) => void;
  onClearMasks: () => void;
  onAutoDetectLogo: () => Promise<void>;
  isDetectingLogo: boolean;
  onInpaint: (method: string) => Promise<void>;
  isInpainting: boolean;
  onNext: () => void;
  onBack: () => void;
}

export const Step2Erase: React.FC<Step2EraseProps> = ({
  currentImage,
  images,
  onSelectImage,
  maskRegions,
  onAddMaskRegion,
  onClearMasks,
  onAutoDetectLogo,
  isDetectingLogo,
  onInpaint,
  isInpainting,
  onNext,
  onBack,
}) => {
  const [applyToAll, setApplyToAll] = useState(true);
  const [inpaintSuccess, setInpaintSuccess] = useState(false);

  const handleRunInpaint = async () => {
    try {
      await onInpaint('telea');
      setInpaintSuccess(true);
      setTimeout(() => setInpaintSuccess(false), 3000);
    } catch {}
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-savecus-500/10 border border-savecus-500/30 text-savecus-400 text-sm font-semibold">
          <Eraser className="w-4 h-4" />
          <span>Step 2 of 4</span>
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Erase Old Watermark or Logo
        </h2>
        <p className="text-base text-slate-300 max-w-xl mx-auto">
          If your photos have an existing logo or watermark, click "Auto-Detect" or draw a red box over it to erase it cleanly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 cols: Canvas Viewer */}
        <div className="lg:col-span-3 flex flex-col space-y-3">
          <div className="relative h-[480px] rounded-3xl overflow-hidden bg-charcoal-400 border border-surface-border shadow-2xl">
            <StudioCanvas
              image={currentImage}
              logo={null}
              placement={{
                x: 0.5,
                y: 0.5,
                scale: 0.2,
                rotation: 0,
                opacity: 1,
                blend_mode: 'normal',
                shadow: false,
                shadow_blur: 8,
                shadow_opacity: 0.4,
                shadow_offset_x: 4,
                shadow_offset_y: 4,
                lock_aspect_ratio: true,
              }}
              onChangePlacement={() => {}}
              editorMode="mask"
              maskRegions={maskRegions}
              onAddMaskRegion={onAddMaskRegion}
            />
          </div>

          {/* Image thumbnail selector strip below canvas */}
          {images.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto py-2 px-1">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => onSelectImage(img)}
                  className={`relative w-20 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                    img.id === currentImage.id
                      ? 'border-savecus-500 scale-105 shadow-md'
                      : 'border-surface-border opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img.processed_url || img.thumbnail_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 bg-charcoal-900/80 text-[10px] text-white px-1 rounded">
                    #{idx + 1}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 col: Simple Action Controls */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-3xl bg-charcoal-200 border border-surface-border p-5 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Eraser className="w-5 h-5 text-savecus-500" />
              <span>Removal Tools</span>
            </h3>

            {/* 1-Click Auto-Detect Button */}
            <button
              onClick={onAutoDetectLogo}
              disabled={isDetectingLogo}
              className="w-full py-3.5 px-4 rounded-2xl bg-charcoal-100 hover:bg-charcoal-50 border border-savecus-500/50 hover:border-savecus-400 text-savecus-400 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Wand2 className={`w-4 h-4 ${isDetectingLogo ? 'animate-spin' : ''}`} />
              <span>{isDetectingLogo ? 'Finding Watermarks...' : '✨ 1-Click Auto-Detect'}</span>
            </button>

            <div className="text-xs text-slate-400 text-center">
              or click and drag directly on the photo to draw a red box over the old logo.
            </div>

            {/* Selected Areas Status */}
            <div className="pt-2 border-t border-surface-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Selected Areas:</span>
                <span className="font-mono text-savecus-400 font-bold">{maskRegions.length} marked</span>
              </div>

              {maskRegions.length > 0 && (
                <button
                  onClick={onClearMasks}
                  className="w-full py-1.5 px-3 rounded-xl bg-charcoal-300 hover:bg-rose-950/40 border border-surface-border hover:border-rose-500/40 text-xs text-rose-300 transition-colors"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {/* Erase Action Button */}
            <button
              onClick={handleRunInpaint}
              disabled={isInpainting || maskRegions.length === 0}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-savecus-600 to-savecus-500 hover:from-savecus-500 hover:to-savecus-400 disabled:opacity-40 text-charcoal-900 font-extrabold text-sm shadow-lg shadow-savecus-500/25 transition-all flex items-center justify-center gap-2"
            >
              <Eraser className={`w-4 h-4 ${isInpainting ? 'animate-spin' : ''}`} />
              <span>{isInpainting ? 'Reconstructing Photo...' : 'Erase Old Logo Now'}</span>
            </button>

            {inpaintSuccess && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 justify-center">
                <CheckCircle2 className="w-4 h-4" />
                <span>Old logo erased successfully!</span>
              </div>
            )}

            {/* Apply to All Photos in Batch Checkbox */}
            <label className="flex items-start gap-2.5 pt-3 border-t border-surface-border cursor-pointer">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded bg-charcoal-300 border-surface-border text-savecus-500 focus:ring-savecus-500"
              />
              <span className="text-xs text-slate-300 font-medium">
                Erase watermark in this area on all photos in this batch
              </span>
            </label>
          </div>

          {/* Tip card */}
          <div className="rounded-2xl bg-charcoal-300/80 border border-surface-border p-4 text-xs text-slate-300 space-y-1">
            <span className="font-bold text-savecus-400">Father's Tip:</span>
            <p>
              If your photos don't have any old watermarks to remove, simply click <span className="font-semibold text-white">Next: Place Savecus Logo</span> to continue!
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-surface-border">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-charcoal-200 hover:bg-charcoal-100 border border-surface-border text-slate-300 text-sm font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Photos</span>
        </button>

        <button
          onClick={onNext}
          className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-savecus-500 hover:bg-savecus-400 text-charcoal-900 font-extrabold text-base shadow-xl shadow-savecus-500/25 transition-all transform active:scale-95"
        >
          <span>Next: Place Savecus Logo</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

