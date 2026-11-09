import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, AlertCircle, Plus } from 'lucide-react';

interface ImageUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  isCompact?: boolean;
  maxFiles?: number;
  currentCount?: number;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onUpload,
  isCompact = false,
  maxFiles = 30,
  currentCount = 0,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);

    const validFiles: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!allowedTypes.includes(file.type)) {
        setErrorMessage(`"${file.name}" has an unsupported format. Please upload JPG, PNG, or WEBP.`);
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setErrorMessage(`"${file.name}" exceeds the 50MB file size limit.`);
        return;
      }
      validFiles.push(file);
    }

    if (currentCount + validFiles.length > maxFiles) {
      setErrorMessage(`Cannot exceed ${maxFiles} images per project. (Current: ${currentCount})`);
      return;
    }

    try {
      setIsUploading(true);
      await onUpload(validFiles);
    } catch (err: any) {
      setErrorMessage(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  if (isCompact) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isUploading || currentCount >= maxFiles}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5 text-brand-400" />
          <span>{isUploading ? 'Uploading...' : 'Add More'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`group relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer p-8 text-center flex flex-col items-center justify-center ${
          isDragging
            ? 'border-brand-500 bg-brand-500/10'
            : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
        }`}
      >
        <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
          {isUploading ? (
            <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className="w-6 h-6" />
          )}
        </div>

        <h3 className="text-base font-semibold text-slate-100">
          {isUploading ? 'Uploading images...' : 'Drag & drop images here'}
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          or <span className="text-brand-400 underline font-medium">browse files</span> from your computer.
          Support for JPG, PNG, and WEBP up to 50MB each.
        </p>

        <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500 bg-slate-800/60 px-3 py-1 rounded-full border border-slate-800">
          <ImageIcon className="w-3 h-3" />
          <span>Up to 30 images simultaneously ({currentCount}/{maxFiles} uploaded)</span>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

