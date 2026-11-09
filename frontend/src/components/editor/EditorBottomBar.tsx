import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Undo2, 
  Redo2, 
  RotateCcw, 
  Save, 
  Play, 
  Layers, 
  Check, 
  Sliders 
} from 'lucide-react';
import { ImageItem } from '../../types';

interface EditorBottomBarProps {
  currentIndex: number;
  totalImages: number;
  currentImage: ImageItem;
  onPrevious: () => void;
  onNext: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onReset: () => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  onProcessSingle: () => Promise<void>;
  isProcessingSingle: boolean;
  onOpenBatchModal: () => void;
}

export const EditorBottomBar: React.FC<EditorBottomBarProps> = ({
  currentIndex,
  totalImages,
  currentImage,
  onPrevious,
  onNext,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onReset,
  onSave,
  isSaving,
  hasUnsavedChanges,
  onProcessSingle,
  isProcessingSingle,
  onOpenBatchModal,
}) => {
  return (
    <footer className="h-16 border-t border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-30">
      {/* Left: Navigation Between Images */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={onPrevious}
            disabled={currentIndex <= 0}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
            title="Previous Image (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-medium text-slate-300 px-2 select-none">
            {currentIndex + 1} / {totalImages}
          </span>

          <button
            onClick={onNext}
            disabled={currentIndex >= totalImages - 1}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-colors"
            title="Next Image (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="hidden sm:flex flex-col">
          <span className="text-xs font-medium text-slate-200 truncate max-w-[200px]" title={currentImage.original_filename}>
            {currentImage.original_filename}
          </span>
          <span className="text-[10px] text-slate-500">
            {currentImage.width} × {currentImage.height}px
          </span>
        </div>
      </div>

      {/* Center: History / Reset Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white hover:bg-slate-850 disabled:opacity-30 transition-colors"
          title="Undo (Ctrl/Cmd+Z)"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Undo</span>
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:text-white hover:bg-slate-850 disabled:opacity-30 transition-colors"
          title="Redo (Ctrl/Cmd+Shift+Z)"
        >
          <Redo2 className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Redo</span>
        </button>

        <button
          onClick={onReset}
          className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Reset to Center"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: Actions (Save / Process) */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onSave}
          disabled={isSaving || !hasUnsavedChanges}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border transition-all ${
            hasUnsavedChanges
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm animate-pulse'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          {isSaving ? (
            <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          ) : hasUnsavedChanges ? (
            <Save className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>{hasUnsavedChanges ? 'Save Changes' : 'Saved'}</span>
        </button>

        <button
          onClick={onProcessSingle}
          disabled={isProcessingSingle}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-medium border border-slate-700 transition-all disabled:opacity-40"
        >
          <Sliders className="w-3.5 h-3.5 text-brand-400" />
          <span>{isProcessingSingle ? 'Processing...' : 'Apply & Preview'}</span>
        </button>

        <button
          onClick={onOpenBatchModal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-medium shadow-md shadow-brand-600/25 transition-all active:scale-95"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Process All Batch</span>
        </button>
      </div>
    </footer>
  );
};

