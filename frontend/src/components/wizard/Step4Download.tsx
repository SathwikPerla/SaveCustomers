import React, { useState } from 'react';
import { 
  Download, 
  FileArchive, 
  CheckCircle2, 
  SplitSquareVertical, 
  ArrowLeft, 
  RotateCcw,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { ImageItem, Project } from '../../types';
import { api } from '../../services/api';
import { CompareModal } from '../processing/CompareModal';

interface Step4DownloadProps {
  project: Project;
  images: ImageItem[];
  onBackToEdit: () => void;
  onRestart: () => void;
}

export const Step4Download: React.FC<Step4DownloadProps> = ({
  project,
  images,
  onBackToEdit,
  onRestart,
}) => {
  const [selectedCompareImg, setSelectedCompareImg] = useState<ImageItem | null>(null);
  const completedImages = images.filter((img) => img.status === 'completed' || img.processed_url);

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      {/* Celebration Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-bold shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>All Photos Rebranded Successfully!</span>
        </div>

        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Your Pictures Are Ready
        </h2>
        <p className="text-base text-slate-300 max-w-xl mx-auto">
          The Savecus branding has been applied to all {images.length} photos with full high-resolution preservation.
        </p>

        {/* Massive Primary Download Button */}
        <div className="pt-2">
          <a
            href={api.getZipExportUrl(project.id)}
            download
            className="inline-flex items-center justify-center gap-3 w-full max-w-md py-4 px-8 rounded-2xl bg-savecus-500 hover:bg-savecus-400 text-charcoal-900 font-extrabold text-lg shadow-2xl shadow-savecus-500/30 transition-all transform active:scale-95"
          >
            <FileArchive className="w-6 h-6 text-charcoal-900" />
            <span>DOWNLOAD ALL PHOTOS (ZIP)</span>
          </a>
        </div>
      </div>

      {/* Completed Photos Gallery */}
      <div className="space-y-4 pt-4 border-t border-surface-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Finished Photos ({completedImages.length})</span>
          </h3>

          <span className="text-xs text-slate-400">
            Click any picture to compare Before & After
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
          {images.map((img, idx) => (
            <div
              key={img.id}
              onClick={() => setSelectedCompareImg(img)}
              className="group relative rounded-2xl overflow-hidden bg-charcoal-200 border border-surface-border hover:border-savecus-500/80 transition-all cursor-pointer flex flex-col justify-between shadow-lg"
            >
              <div className="relative aspect-video w-full bg-charcoal-900 flex items-center justify-center overflow-hidden">
                <img
                  src={img.processed_url || img.thumbnail_url}
                  alt={img.original_filename}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                <div className="absolute top-2 left-2 bg-charcoal-900/80 text-[10px] text-savecus-400 px-2 py-0.5 rounded border border-charcoal-100 font-mono">
                  #{idx + 1}
                </div>

                {/* Compare badge overlay */}
                <div className="absolute inset-0 bg-charcoal-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs text-white font-bold backdrop-blur-xs">
                  <SplitSquareVertical className="w-4 h-4 text-savecus-500" />
                  <span>Compare</span>
                </div>
              </div>

              <div className="p-2.5 bg-charcoal-300 border-t border-surface-border flex items-center justify-between">
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-xs font-semibold text-slate-200 truncate" title={img.original_filename}>
                    {img.original_filename}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {img.width} × {img.height} px
                  </span>
                </div>

                <a
                  href={api.getImageDownloadUrl(project.id, img.id)}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg bg-charcoal-100 hover:bg-savecus-500 hover:text-charcoal-900 text-slate-300 transition-colors shrink-0"
                  title="Download single photo"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Navigation Options */}
      <div className="flex items-center justify-between pt-6 border-t border-surface-border">
        <button
          onClick={onBackToEdit}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-charcoal-200 hover:bg-charcoal-100 border border-surface-border text-slate-300 text-sm font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Adjust Logo Position</span>
        </button>

        <button
          onClick={onRestart}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-charcoal-100 hover:bg-charcoal-50 border border-surface-border text-slate-200 text-sm font-bold transition-colors"
        >
          <RotateCcw className="w-4 h-4 text-savecus-500" />
          <span>Start Another Batch</span>
        </button>
      </div>

      {/* Comparison Modal */}
      {selectedCompareImg && (
        <CompareModal
          image={selectedCompareImg}
          projectId={project.id}
          onClose={() => setSelectedCompareImg(null)}
        />
      )}
    </div>
  );
};

