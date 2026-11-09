import React from 'react';
import { ImageItem } from '../../types';
import { CheckCircle2, Clock, AlertTriangle, Plus, Image as ImageIcon } from 'lucide-react';
import { ImageUploader } from '../upload/ImageUploader';

interface EditorLeftSidebarProps {
  images: ImageItem[];
  currentImageId: string;
  onSelectImage: (image: ImageItem) => void;
  onUploadMore: (files: File[]) => Promise<void>;
}

export const EditorLeftSidebar: React.FC<EditorLeftSidebarProps> = ({
  images,
  currentImageId,
  onSelectImage,
  onUploadMore,
}) => {
  return (
    <aside className="w-56 border-r border-slate-800 bg-slate-900/90 backdrop-blur-md flex flex-col h-full overflow-hidden shrink-0">
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-brand-400" />
          Queue ({images.length})
        </span>

        <ImageUploader
          onUpload={onUploadMore}
          isCompact
          maxFiles={30}
          currentCount={images.length}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {images.map((img, idx) => {
          const isActive = img.id === currentImageId;

          return (
            <div
              key={img.id}
              onClick={() => onSelectImage(img)}
              className={`group relative rounded-xl p-1.5 border transition-all cursor-pointer flex items-center gap-2.5 ${
                isActive
                  ? 'bg-brand-600/10 border-brand-500 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              {/* Thumbnail */}
              <div className="relative w-12 h-10 rounded-lg overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                <img
                  src={img.processed_url || img.thumbnail_url}
                  alt={img.original_filename}
                  className="w-full h-full object-cover"
                />
                {img.status === 'completed' && (
                  <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 drop-shadow" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">#{idx + 1}</span>
                  {img.status === 'completed' ? (
                    <span className="text-[9px] text-emerald-400 font-medium">Rebranded</span>
                  ) : img.status === 'failed' ? (
                    <span className="text-[9px] text-rose-400 font-medium">Failed</span>
                  ) : (
                    <span className="text-[9px] text-slate-500">Ready</span>
                  )}
                </div>
                <div className="text-xs font-medium text-slate-300 truncate" title={img.original_filename}>
                  {img.original_filename}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

