import React, { useEffect, useState, useRef } from 'react';
import { 
  X, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  RefreshCw, 
  Layers, 
  FileArchive,
  ArrowRight
} from 'lucide-react';
import { BatchJob, Project, ImageItem } from '../../types';
import { api } from '../../services/api';

interface BatchModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onJobCompleted: () => void;
}

export const BatchModal: React.FC<BatchModalProps> = ({
  project,
  isOpen,
  onClose,
  onJobCompleted,
}) => {
  const [job, setJob] = useState<BatchJob | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollTimerRef = useRef<any>(null);

  const images = project.images || [];

  const handleStartBatch = async () => {
    try {
      setIsStarting(true);
      setErrorMsg(null);
      const newJob = await api.startBatchJob(project.id);
      setJob(newJob);
      startPolling(newJob.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start batch processing');
    } finally {
      setIsStarting(false);
    }
  };

  const startPolling = (jobId: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(async () => {
      try {
        const status = await api.getJobStatus(project.id, jobId);
        setJob(status);
        if (status.status === 'completed' || status.status === 'failed' || status.status === 'completed_with_errors') {
          clearInterval(pollTimerRef.current);
          onJobCompleted();
        }
      } catch (err) {
        clearInterval(pollTimerRef.current);
      }
    }, 1200);
  };

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const total = job ? job.total_images : images.length;
  const processed = job ? job.processed_images : 0;
  const failed = job ? job.failed_images : 0;
  const progressPct = total > 0 ? Math.round((processed / total) * 100) : 0;
  const isRunning = job?.status === 'running';
  const isFinished = job?.status === 'completed' || job?.status === 'completed_with_errors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-brand-500/20 text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-base">Bulk Batch Processor</h3>
              <p className="text-xs text-slate-400">Process all project images with current branding settings</p>
            </div>
          </div>

          {!isRunning && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status / Overview Body */}
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">
                {isRunning
                  ? 'Rebranding Images...'
                  : isFinished
                  ? 'Batch Completed'
                  : 'Ready to Process'}
              </span>
              <span className="font-mono text-slate-200">
                {processed} / {total} ({progressPct}%)
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-center">
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Total</div>
              <div className="text-base font-bold text-slate-200">{total}</div>
            </div>
            <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-center">
              <div className="text-[10px] text-emerald-400 uppercase font-semibold">Completed</div>
              <div className="text-base font-bold text-emerald-400">{processed}</div>
            </div>
            <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-center">
              <div className="text-[10px] text-rose-400 uppercase font-semibold">Failed</div>
              <div className="text-base font-bold text-rose-400">{failed}</div>
            </div>
          </div>

          {/* Error Message if any */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Warnings if logo missing */}
          {!project.logo && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Please upload a replacement logo before running batch processing.</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2 border-t border-slate-800">
          {!job || (!isRunning && !isFinished) ? (
            <button
              onClick={handleStartBatch}
              disabled={isStarting || !project.logo || images.length === 0}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 disabled:opacity-40 text-white font-medium text-xs shadow-lg shadow-brand-600/25 transition-all flex items-center justify-center gap-2"
            >
              {isStarting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>Start Batch Processing ({images.length} images)</span>
            </button>
          ) : isRunning ? (
            <div className="flex items-center justify-center gap-2 py-2 text-xs text-brand-400 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Processing image queue in background...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {processed > 0 && (
                <a
                  href={api.getZipExportUrl(project.id)}
                  download
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
                >
                  <FileArchive className="w-4 h-4" />
                  <span>Download All Rebranded Images (ZIP)</span>
                </a>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={handleStartBatch}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-run Batch</span>
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium transition-colors"
                >
                  View in Gallery
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

