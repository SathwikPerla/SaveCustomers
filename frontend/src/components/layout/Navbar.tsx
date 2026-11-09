import React from 'react';
import { Sparkles, FolderKanban, Plus, ChevronRight, Layers } from 'lucide-react';
import { Project } from '../../types';

interface NavbarProps {
  currentProject: Project | null;
  onBackToDashboard: () => void;
  onOpenNewProjectModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentProject,
  onBackToDashboard,
  onOpenNewProjectModal,
}) => {
  return (
    <header className="h-16 border-b border-surface-border bg-charcoal-400/95 backdrop-blur-md px-6 flex items-center justify-between z-30 shrink-0">
      <div className="flex items-center gap-4">
        {/* Brand */}
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-3 text-left group hover:opacity-95 transition-opacity"
        >
          {/* Logo icon container with Savecus Gold */}
          <div className="w-10 h-10 rounded-xl bg-savecus-500 flex items-center justify-center shadow-lg shadow-savecus-500/25 p-1.5">
            <img
              src="/savecus_logo.png"
              alt="Savecus Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white tracking-wider text-base">SAVECUS</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-savecus-500/15 text-savecus-400 border border-savecus-500/30 uppercase tracking-wider">
                Studio
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Bulk Picture Rebranding</span>
          </div>
        </button>

        {/* Breadcrumb */}
        {currentProject && (
          <div className="flex items-center gap-2 text-sm text-slate-400 border-l border-surface-border pl-4">
            <button
              onClick={onBackToDashboard}
              className="hover:text-savecus-400 transition-colors flex items-center gap-1.5 font-medium"
            >
              <FolderKanban className="w-4 h-4 text-slate-400" />
              <span>Projects</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-white font-bold truncate max-w-[240px]">
              {currentProject.name}
            </span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenNewProjectModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-savecus-500 hover:bg-savecus-400 text-charcoal-900 text-sm font-extrabold shadow-lg shadow-savecus-500/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Rebrand Batch</span>
        </button>
      </div>
    </header>
  );
};
