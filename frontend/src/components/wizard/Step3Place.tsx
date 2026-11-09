import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Layers, 
  Play, 
  Maximize, 
  SunMedium, 
  Check, 
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { ImageItem, LogoItem, LogoPlacement } from '../../types';
import { StudioCanvas } from '../editor/StudioCanvas';

interface Step3PlaceProps {
  currentImage: ImageItem;
  images: ImageItem[];
  onSelectImage: (img: ImageItem) => void;
  logo: LogoItem | null;
  placement: LogoPlacement;
  onChangePlacement: (newPlacement: LogoPlacement) => void;
  onSwitchLogoVariant: (variant: 'black' | 'gold') => Promise<void>;
  onStartBatchProcessing: () => Promise<void>;
  isProcessingBatch: boolean;
  onBack: () => void;
}

export const Step3Place: React.FC<Step3PlaceProps> = ({
  currentImage,
  images,
  onSelectImage,
  logo,
  placement,
  onChangePlacement,
  onSwitchLogoVariant,
  onStartBatchProcessing,
  isProcessingBatch,
  onBack,
}) => {
  const [selectedVariant, setSelectedVariant] = useState<'black' | 'gold'>('black');
  const [isSwitchingVariant, setIsSwitchingVariant] = useState(false);

  const applyCompassPreset = (preset: 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right') => {
    let x = 0.5;
    let y = 0.5;
    const margin = 0.12;

    switch (preset) {
      case 'top-left':
        x = margin;
        y = margin;
        break;
      case 'top-right':
        x = 1 - margin;
        y = margin;
        break;
      case 'bottom-left':
        x = margin;
        y = 1 - margin;
        break;
      case 'bottom-right':
        x = 1 - margin;
        y = 1 - margin;
        break;
      case 'center':
      default:
        x = 0.5;
        y = 0.5;
        break;
    }

    onChangePlacement({
      ...placement,
      x,
      y,
    });
  };

  const handleVariantToggle = async (v: 'black' | 'gold') => {
    try {
      setSelectedVariant(v);
      setIsSwitchingVariant(true);
      await onSwitchLogoVariant(v);
    } finally {
      setIsSwitchingVariant(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-savecus-500/10 border border-savecus-500/30 text-savecus-400 text-sm font-semibold">
          <Sparkles className="w-4 h-4" />
          <span>Step 3 of 4</span>
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Place Your Savecus Logo
        </h2>
        <p className="text-base text-slate-300 max-w-xl mx-auto">
          Click any corner below or simply drag the logo directly onto the photo. This position will be applied across all photos in your batch.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 cols: Canvas Editor */}
        <div className="lg:col-span-3 flex flex-col space-y-3">
          <div className="relative h-[480px] rounded-3xl overflow-hidden bg-charcoal-400 border border-surface-border shadow-2xl">
            <StudioCanvas
              image={currentImage}
              logo={logo}
              placement={placement}
              onChangePlacement={onChangePlacement}
              editorMode="placement"
            />
          </div>

          {/* Quick thumbnails strip */}
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

        {/* Right 1 col: Big, Tactile Father-Friendly Controls */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-3xl bg-charcoal-200 border border-surface-border p-5 space-y-5 shadow-xl">
            {/* Quick Placement Compass */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-white flex items-center justify-between">
                <span>Where to place logo:</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => applyCompassPreset('top-left')}
                  className="py-2.5 px-3 rounded-xl bg-charcoal-100 hover:bg-charcoal-50 border border-surface-border hover:border-savecus-500 text-xs font-bold text-slate-200 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>↖ Top Left</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyCompassPreset('top-right')}
                  className="py-2.5 px-3 rounded-xl bg-charcoal-100 hover:bg-charcoal-50 border border-surface-border hover:border-savecus-500 text-xs font-bold text-slate-200 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>↗ Top Right</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyCompassPreset('bottom-left')}
                  className="py-2.5 px-3 rounded-xl bg-charcoal-100 hover:bg-charcoal-50 border border-surface-border hover:border-savecus-500 text-xs font-bold text-slate-200 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>↙ Bottom Left</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyCompassPreset('bottom-right')}
                  className="py-2.5 px-3 rounded-xl bg-savecus-500/20 hover:bg-savecus-500/30 border border-savecus-500 text-xs font-bold text-savecus-300 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>↘ Bottom Right ★</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => applyCompassPreset('center')}
                className="w-full py-2 px-3 rounded-xl bg-charcoal-100 hover:bg-charcoal-50 border border-surface-border text-xs font-semibold text-slate-300 transition-all"
              >
                ⏺ Place in Center
              </button>
            </div>

            {/* Logo Color Variant (Black vs Gold) */}
            <div className="space-y-2 pt-2 border-t border-surface-border">
              <label className="text-sm font-bold text-white">Logo Style:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleVariantToggle('black')}
                  disabled={isSwitchingVariant}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    selectedVariant === 'black'
                      ? 'bg-charcoal-900 border-white text-white shadow-md ring-2 ring-white/20'
                      : 'bg-charcoal-100 border-surface-border text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-black border border-white/50 shrink-0" />
                  <span>Black Logo</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleVariantToggle('gold')}
                  disabled={isSwitchingVariant}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    selectedVariant === 'gold'
                      ? 'bg-savecus-500 text-charcoal-900 border-savecus-400 font-extrabold shadow-md ring-2 ring-savecus-500/30'
                      : 'bg-charcoal-100 border-surface-border text-savecus-400 hover:text-savecus-300'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-savecus-500 shrink-0" />
                  <span>Gold Logo</span>
                </button>
              </div>
            </div>

            {/* Tactile Slider 1: Logo Size */}
            <div className="space-y-1.5 pt-2 border-t border-surface-border">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Logo Size</span>
                <span className="font-mono text-savecus-400 font-bold">
                  {Math.round(placement.scale * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.08"
                max="0.60"
                step="0.01"
                value={placement.scale}
                onChange={(e) => onChangePlacement({ ...placement, scale: parseFloat(e.target.value) })}
                className="w-full accent-savecus-500 h-2 bg-charcoal-900 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Smaller</span>
                <span>Larger</span>
              </div>
            </div>

            {/* Tactile Slider 2: Opacity */}
            <div className="space-y-1.5 pt-2 border-t border-surface-border">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Logo Visibility</span>
                <span className="font-mono text-savecus-400 font-bold">
                  {Math.round(placement.opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={placement.opacity}
                onChange={(e) => onChangePlacement({ ...placement, opacity: parseFloat(e.target.value) })}
                className="w-full accent-savecus-500 h-2 bg-charcoal-900 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Watermark</span>
                <span>Solid</span>
              </div>
            </div>

            {/* Giant Rebrand Batch Button */}
            <button
              onClick={onStartBatchProcessing}
              disabled={isProcessingBatch}
              className="w-full py-4 px-4 rounded-2xl bg-savecus-500 hover:bg-savecus-400 text-charcoal-900 font-extrabold text-base shadow-xl shadow-savecus-500/30 transition-all flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50"
            >
              {isProcessingBatch ? (
                <div className="w-5 h-5 border-3 border-charcoal-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-5 h-5 fill-current" />
              )}
              <span>{isProcessingBatch ? 'Processing Photos...' : `Process All ${images.length} Photos ✨`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Back button */}
      <div className="flex items-center justify-between pt-4 border-t border-surface-border">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-charcoal-200 hover:bg-charcoal-100 border border-surface-border text-slate-300 text-sm font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back: Erase Old Logo</span>
        </button>

        <button
          onClick={onStartBatchProcessing}
          disabled={isProcessingBatch}
          className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-savecus-500 hover:bg-savecus-400 text-charcoal-900 font-extrabold text-base shadow-xl shadow-savecus-500/25 transition-all transform active:scale-95"
        >
          <span>Process All Photos</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

