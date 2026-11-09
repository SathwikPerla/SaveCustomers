import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Trash2, ArrowRight, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { ImageItem } from '../../types';

interface Step1UploadProps {
  images: ImageItem[];
  onUpload: (files: File[]) => Promise<void>;
  onDeleteImage: (id: string) => Promise<void>;
  onNext: () => void;
}

export const Step1Upload: React.FC<Step1UploadProps> = ({
  images,
  onUpload,
  onDeleteImage,
  onNext,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const valid: File[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      if (allowed.includes(f.type)) {
        valid.push(f);
      }
    }

    if (valid.length === 0) {
      setErrorMessage('Please select standard photo files (JPG, PNG, or WEBP).');
      return;
    }

    try {
      setIsUploading(true);
      await onUpload(valid);
    } catch (err: any) {
      setErrorMessage(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-4">
      {/* Step Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-savecus-500/10 border border-savecus-500/30 text-savecus-400 text-sm font-semibold">
          <Upload className="w-4 h-4" />
          <span>Step 1 of 4</span>
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Add Your Pictures
        </h2>
        <p className="text-base text-slate-300 max-w-xl mx-auto">
          Choose the photos you want to brand with your Savecus logo. You can upload up to 30 photos at once.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Big Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`rounded-3xl border-3 border-dashed p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
          isDragging
            ? 'border-savecus-500 bg-savecus-500/15 scale-[1.01]'
            : 'border-surface-borderStrong bg-charcoal-200 hover:border-savecus-500/80 hover:bg-charcoal-100 shadow-xl'
        }`}
      >
        <div className="w-20 h-20 rounded-2xl bg-savecus-500/15 border border-savecus-500/30 text-savecus-500 flex items-center justify-center mb-4 shadow-inner">
          {isUploading ? (
            <div className="w-9 h-9 border-3 border-savecus-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className="w-9 h-9" />
          )}
        </div>

        <h3 className="text-xl font-bold text-white">
          {isUploading ? 'Loading your pictures...' : 'Drag and drop your photos here'}
        </h3>
        <p className="text-sm text-slate-300 mt-1 max-w-md">
          Supports JPG, PNG, and WEBP. High-resolution photos are fully supported.
        </p>

        {/* Big high-contrast CTA button */}
        <button
          type="button"
          disabled={isUploading}
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
          className="mt-6 px-8 py-3.5 rounded-2xl bg-savecus-500 hover:bg-savecus-400 text-charcoal-900 font-extrabold text-base shadow-xl shadow-savecus-500/25 transition-all transform active:scale-95 flex items-center gap-2.5"
        >
          <ImageIcon className="w-5 h-5 text-charcoal-900" />
          <span>Choose Photos from Computer</span>
        </button>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Uploaded Photos Gallery Preview */}
      {images.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-surface-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-base font-bold text-white">
                Photos Ready ({images.length})
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" /> All Loaded
              </span>
            </div>

            <button
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-charcoal-100 hover:bg-charcoal-50 border border-surface-border text-slate-200 text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4 text-savecus-500" />
              <span>Add More Photos</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {images.map((img, idx) => (
              <div
                key={img.id}
                className="group relative rounded-2xl overflow-hidden bg-charcoal-200 border border-surface-border flex flex-col justify-between shadow-md"
              >
                <div className="relative aspect-video w-full bg-charcoal-900 flex items-center justify-center overflow-hidden">
                  <img
                    src={img.processed_url || img.thumbnail_url}
                    alt={img.original_filename}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-charcoal-900/80 backdrop-blur-sm text-[11px] font-mono text-savecus-400 px-2 py-0.5 rounded-md border border-charcoal-100">
                    #{idx + 1}
                  </div>
                  <button
                    onClick={() => onDeleteImage(img.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-charcoal-900/80 hover:bg-rose-600 text-slate-400 hover:text-white transition-all shadow"
                    title="Remove photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-2.5 bg-charcoal-300 border-t border-surface-border flex flex-col gap-0.5">
                  <span className="text-xs font-semibold text-slate-200 truncate" title={img.original_filename}>
                    {img.original_filename}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {img.width} × {img.height} px
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Forward Button */}
          <div className="flex justify-end pt-4">
            <button
              onClick={onNext}
              className="px-8 py-3.5 rounded-2xl bg-savecus-500 hover:bg-savecus-400 text-charcoal-900 font-extrabold text-base shadow-xl shadow-savecus-500/25 transition-all flex items-center gap-2 transform active:scale-95"
            >
              <span>Next: Erase Old Logo</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

