import React, { useState, useRef } from 'react';
import { Upload, Sparkles, Trash2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { LogoItem } from '../../types';

interface LogoUploaderProps {
  logo?: LogoItem | null;
  onUploadLogo: (file: File) => Promise<void>;
  onDeleteLogo: () => Promise<void>;
}

export const LogoUploader: React.FC<LogoUploaderProps> = ({
  logo,
  onUploadLogo,
  onDeleteLogo,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = ['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg'];

  const handleFile = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);
    const file = fileList[0];

    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Please upload a PNG (recommended with transparency), SVG, or WEBP logo.');
      return;
    }

    try {
      setIsUploading(true);
      await onUploadLogo(file);
    } catch (err: any) {
      setErrorMessage(err.message || 'Logo upload failed');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/svg+xml,image/webp,image/jpeg"
        className="hidden"
        onChange={(e) => handleFile(e.target.files)}
      />

      {logo ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-400" />
              Active Replacement Logo
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center gap-1"
                title="Replace with another logo"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Replace</span>
              </button>

              <button
                onClick={onDeleteLogo}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                title="Remove logo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Checkerboard Preview Area */}
          <div className="relative rounded-xl border border-slate-800/80 bg-checkerboard p-4 flex items-center justify-center min-h-[110px] overflow-hidden">
            <img
              src={logo.url}
              alt={logo.original_filename}
              className="max-h-20 max-w-full object-contain filter drop-shadow-md transition-transform hover:scale-105"
            />
          </div>

          {/* Metadata badges */}
          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/50">
            <span className="truncate max-w-[140px]" title={logo.original_filename}>
              {logo.original_filename}
            </span>
            <div className="flex items-center gap-2">
              <span>{logo.width} × {logo.height}px</span>
              <span>•</span>
              <span>{formatFileSize(logo.file_size)}</span>
              {logo.has_alpha && (
                <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 text-[10px]">
                  Alpha
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFile(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
            isDragging
              ? 'border-brand-500 bg-brand-500/10'
              : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mb-2.5">
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </div>

          <p className="text-xs font-semibold text-slate-200">
            {isUploading ? 'Uploading Logo...' : 'Upload Replacement Logo'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Transparent PNG or SVG recommended
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

