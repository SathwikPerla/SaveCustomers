import React from 'react';
import { ImageItem } from '../../types';
import { Trash2, CheckCircle2, Clock, AlertTriangle, Layers, Maximize2 } from 'lucide-react';
import { ImageUploader } from '../upload/ImageUploader';

interface ImageGalleryGridProps {
  images: ImageItem[];
  selectedImageId: string | null;
  onSelectImage: (image: ImageItem) => void;
  onDeleteImage: (imageId: string) => Promise<void>;
  onUploadMore: (files: File[]) => Promise<void>;
}

export const ImageGalleryGrid: React.FC<ImageGalleryGridProps> = ({
  images,
  selectedImageId,
  onSelectImage,
  onDeleteImage,
  onUploadMore,
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadge = (status: ImageItem['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" /> Rebranded
          </span>
        );
      case 'processing':
        return (
          <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 animate-pulse">
            <Clock className="w-3 h-3" /> Processing
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-[10px] font-medium text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30">
            <AlertTriangle className="w-3 h-3" /> Failed
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700">
            Ready
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <span>Project Images</span>
            <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
              {images.length} / 30
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Select an image to preview and adjust branding positioning
          </p>
        </div>

        <ImageUploader
          onUpload={onUploadMore}
          isCompact
          maxFiles={30}
          currentCount={images.length}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {images.map((img) => {
          const isSelected = img.id === selectedImageId;

          return (
            <div
              key={img.id}
              onClick={() => onSelectImage(img)}
              className={`group relative rounded-xl overflow-hidden bg-slate-900 border transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-brand-500 ring-2 ring-brand-500/30 shadow-lg shadow-brand-500/10'
                  : 'border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
                <img
                  src={img.processed_url || img.thumbnail_url}
                  alt={img.original_filename}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />

                {/* Status Badge overlay */}
                <div className="absolute top-2 left-2 pointer-events-none">
                  {getStatusBadge(img.status)}
                </div>

                {/* Delete button overlay */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteImage(img.id);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/80 hover:bg-rose-600 text-slate-400 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-md"
                  title="Remove image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Card Meta Footer */}
              <div className="p-2.5 bg-slate-900/90 border-t border-slate-800 flex flex-col gap-1">
                <div className="text-xs font-medium text-slate-200 truncate" title={img.original_filename}>
                  {img.original_filename}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>{img.width} × {img.height}px</span>
                  <span>{formatFileSize(img.file_size)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

