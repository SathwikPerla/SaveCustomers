import React, { useState } from 'react';
import { 
  Sliders, 
  Sparkles, 
  Layers, 
  RotateCw, 
  SunMedium, 
  Lock, 
  Unlock, 
  Copy, 
  ClipboardCheck, 
  Eraser, 
  Crop, 
  Wand2, 
  RefreshCw,
  Eye,
  Check,
  Grid
} from 'lucide-react';
import { LogoPlacement, LogoItem, ImageItem, MaskRegion } from '../../types';

interface EditorSidebarProps {
  placement: LogoPlacement;
  onChangePlacement: (newPlacement: LogoPlacement) => void;
  isGlobalMode: boolean;
  onToggleGlobalMode: (isGlobal: boolean) => void;
  onApplyToAllImages: () => void;
  logo: LogoItem | null;
  editorMode: 'placement' | 'mask';
  onChangeEditorMode: (mode: 'placement' | 'mask') => void;
  maskRegions: MaskRegion[];
  onClearMasks: () => void;
  onAutoDetectLogo: () => Promise<void>;
  isDetectingLogo: boolean;
  onInpaint: (method: string) => Promise<void>;
  isInpainting: boolean;
  currentImage: ImageItem;
}

export const EditorSidebar: React.FC<EditorSidebarProps> = ({
  placement,
  onChangePlacement,
  isGlobalMode,
  onToggleGlobalMode,
  onApplyToAllImages,
  logo,
  editorMode,
  onChangeEditorMode,
  maskRegions,
  onClearMasks,
  onAutoDetectLogo,
  isDetectingLogo,
  onInpaint,
  isInpainting,
  currentImage,
}) => {
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [inpaintingMethod, setInpaintingMethod] = useState<'telea' | 'ns' | 'ai'>('telea');

  // Quick Preset Handlers
  const applyPreset = (preset: 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right' | 'bottom-center') => {
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
      case 'bottom-center':
        x = 0.5;
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

  const handleCopySettings = () => {
    localStorage.setItem('rebrand_studio_copied_placement', JSON.stringify(placement));
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  const handlePasteSettings = () => {
    const raw = localStorage.getItem('rebrand_studio_copied_placement');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        onChangePlacement(parsed);
      } catch {}
    }
  };

  return (
    <aside className="w-80 border-l border-slate-800 bg-slate-900/90 backdrop-blur-md flex flex-col h-full overflow-hidden shrink-0">
      {/* Top Tab Mode Switcher: Logo Placement vs Logo Removal */}
      <div className="p-3 border-b border-slate-800 bg-slate-900">
        <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onChangeEditorMode('placement')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              editorMode === 'placement'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Logo Placement</span>
          </button>

          <button
            onClick={() => onChangeEditorMode('mask')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              editorMode === 'mask'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Old Logo Removal</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {editorMode === 'placement' ? (
          <>
            {/* Global vs Individual Mode Selector */}
            <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Editing Scope</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isGlobalMode 
                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {isGlobalMode ? 'Global (All Images)' : 'Individual (This Image)'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onToggleGlobalMode(true)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    isGlobalMode
                      ? 'bg-brand-600/20 border-brand-500/50 text-brand-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Global Mode
                </button>
                <button
                  onClick={() => onToggleGlobalMode(false)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    !isGlobalMode
                      ? 'bg-amber-600/20 border-amber-500/50 text-amber-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Individual
                </button>
              </div>

              <p className="text-[10px] text-slate-500">
                {isGlobalMode
                  ? 'Normalized settings will automatically be inherited by all images in the project.'
                  : 'Changes made now will only affect this individual photo.'}
              </p>
            </div>

            {/* Quick Placement Presets */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Quick Position Presets</span>
                <span className="text-[10px] text-slate-500 font-normal">Normalized</span>
              </label>

              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'top-left', label: 'Top Left' },
                  { id: 'center', label: 'Center' },
                  { id: 'top-right', label: 'Top Right' },
                  { id: 'bottom-left', label: 'Bottom Left' },
                  { id: 'bottom-center', label: 'Bottom Mid' },
                  { id: 'bottom-right', label: 'Bottom Right' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id as any)}
                    className="py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-brand-500/50 hover:bg-slate-900 text-[11px] text-slate-300 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Position Sliders (X & Y) */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300">Exact Coordinates</label>

              {/* X Position */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Horizontal (X)</span>
                  <span className="font-mono text-slate-200">{Math.round(placement.x * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={placement.x}
                  onChange={(e) => onChangePlacement({ ...placement, x: parseFloat(e.target.value) })}
                  className="w-full accent-brand-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Y Position */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Vertical (Y)</span>
                  <span className="font-mono text-slate-200">{Math.round(placement.y * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={placement.y}
                  onChange={(e) => onChangePlacement({ ...placement, y: parseFloat(e.target.value) })}
                  className="w-full accent-brand-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Scale & Aspect Ratio */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Size & Proportion</label>
                <button
                  onClick={() => onChangePlacement({ ...placement, lock_aspect_ratio: !placement.lock_aspect_ratio })}
                  className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition-colors ${
                    placement.lock_aspect_ratio
                      ? 'bg-brand-500/10 border-brand-500/30 text-brand-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                  title="Lock / Unlock Aspect Ratio"
                >
                  {placement.lock_aspect_ratio ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  <span>{placement.lock_aspect_ratio ? 'Locked' : 'Unlocked'}</span>
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Relative Width</span>
                  <span className="font-mono text-slate-200">{Math.round(placement.scale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.03"
                  max="0.90"
                  step="0.01"
                  value={placement.scale}
                  onChange={(e) => onChangePlacement({ ...placement, scale: parseFloat(e.target.value) })}
                  className="w-full accent-brand-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Rotation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-300">Rotation</label>
                <span className="font-mono text-slate-200">{Math.round(placement.rotation)}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={placement.rotation}
                onChange={(e) => onChangePlacement({ ...placement, rotation: parseInt(e.target.value) })}
                className="w-full accent-brand-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                <button
                  onClick={() => onChangePlacement({ ...placement, rotation: 0 })}
                  className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:text-white"
                >
                  0° Reset
                </button>
                <button
                  onClick={() => onChangePlacement({ ...placement, rotation: 90 })}
                  className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:text-white"
                >
                  90°
                </button>
                <button
                  onClick={() => onChangePlacement({ ...placement, rotation: 180 })}
                  className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:text-white"
                >
                  180°
                </button>
                <button
                  onClick={() => onChangePlacement({ ...placement, rotation: -90 })}
                  className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 hover:text-white"
                >
                  -90°
                </button>
              </div>
            </div>

            {/* Appearance (Opacity & Blending & Shadow) */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300">Appearance & Effects</label>

              {/* Opacity */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Opacity</span>
                  <span className="font-mono text-slate-200">{Math.round(placement.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={placement.opacity}
                  onChange={(e) => onChangePlacement({ ...placement, opacity: parseFloat(e.target.value) })}
                  className="w-full accent-brand-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Blend Mode */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Blend Mode</span>
                </div>
                <select
                  value={placement.blend_mode}
                  onChange={(e) => onChangePlacement({ ...placement, blend_mode: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2 focus:border-brand-500 focus:outline-none"
                >
                  <option value="normal">Normal</option>
                  <option value="multiply">Multiply (Darken)</option>
                  <option value="screen">Screen (Lighten)</option>
                  <option value="overlay">Overlay</option>
                </select>
              </div>

              {/* Drop Shadow Toggle */}
              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Drop Shadow</span>
                  <input
                    type="checkbox"
                    checked={placement.shadow}
                    onChange={(e) => onChangePlacement({ ...placement, shadow: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-brand-600 focus:ring-0 cursor-pointer"
                  />
                </div>

                {placement.shadow && (
                  <div className="mt-2 pl-3 border-l-2 border-slate-800 space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Blur Radius</span>
                        <span>{placement.shadow_blur}px</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="30"
                        value={placement.shadow_blur}
                        onChange={(e) => onChangePlacement({ ...placement, shadow_blur: parseFloat(e.target.value) })}
                        className="w-full accent-brand-500 h-1 bg-slate-800 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Presets Clipboard */}
            <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
              <button
                onClick={handleCopySettings}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-colors"
              >
                {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSuccess ? 'Copied!' : 'Copy Preset'}</span>
              </button>

              <button
                onClick={handlePasteSettings}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-colors"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Paste Preset</span>
              </button>
            </div>
          </>
        ) : (
          /* Old Logo Removal Panel (Stage 3) */
          <div className="space-y-4">
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 space-y-1.5">
              <span className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                <Eraser className="w-3.5 h-3.5" />
                Logo Removal Selection
              </span>
              <p className="text-[11px] text-rose-200/80">
                Draw a bounding box or brush over the existing logo to generate an inpainting mask.
              </p>
            </div>

            {/* Auto-detection trigger */}
            <button
              onClick={onAutoDetectLogo}
              disabled={isDetectingLogo}
              className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-brand-500/40 hover:bg-brand-500/10 text-xs font-medium text-brand-300 transition-all flex items-center justify-center gap-2"
            >
              <Wand2 className={`w-3.5 h-3.5 ${isDetectingLogo ? 'animate-spin' : ''}`} />
              <span>{isDetectingLogo ? 'Detecting Logo Candidates...' : 'AI Auto-Detect Old Logo'}</span>
            </button>

            {/* Active Mask Regions List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Selected Regions ({maskRegions.length})</span>
                {maskRegions.length > 0 && (
                  <button
                    onClick={onClearMasks}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {maskRegions.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  No removal areas drawn yet. Click and drag on the canvas to select the old logo.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {maskRegions.map((m, idx) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                    >
                      <span className="text-slate-300">Region #{idx + 1} ({m.type})</span>
                      <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                        Masked
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inpainting Engine Selector */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300">Inpainting Method</label>
              <div className="space-y-1.5">
                {[
                  { id: 'telea', label: 'OpenCV Fast Marching (Telea)', desc: 'Fast, smooth edge reconstruction' },
                  { id: 'ns', label: 'Navier-Stokes Fluid Mechanics', desc: 'Preserves gradient contours' },
                  { id: 'ai', label: 'Generative AI Reconstruct', desc: 'Advanced synthesis for textured backgrounds' },
                ].map((meth) => (
                  <label
                    key={meth.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      inpaintingMethod === meth.id
                        ? 'bg-brand-500/10 border-brand-500/40 text-slate-100'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="inpainting_method"
                      value={meth.id}
                      checked={inpaintingMethod === meth.id}
                      onChange={() => setInpaintingMethod(meth.id as any)}
                      className="mt-0.5 accent-brand-500"
                    />
                    <div>
                      <div className="text-xs font-medium text-slate-200">{meth.label}</div>
                      <div className="text-[10px] text-slate-500">{meth.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Inpainting Action Button */}
            <button
              onClick={() => onInpaint(inpaintingMethod)}
              disabled={isInpainting || maskRegions.length === 0}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 disabled:opacity-40 text-white font-medium text-xs shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Eraser className={`w-3.5 h-3.5 ${isInpainting ? 'animate-spin' : ''}`} />
              <span>{isInpainting ? 'Reconstructing Background...' : 'Remove Logo Now'}</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
