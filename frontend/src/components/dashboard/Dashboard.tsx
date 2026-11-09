import React, { useState } from 'react';
import { 
  FolderPlus, 
  Trash2, 
  Image as ImageIcon, 
  CheckCircle2, 
  Layers, 
  ArrowRight, 
  Clock, 
  Search,
  Sparkles
} from 'lucide-react';
import { Project } from '../../types';

interface DashboardProps {
  projects: Project[];
  loading: boolean;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (name: string, description: string) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  loading,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  isCreateModalOpen,
  setIsCreateModalOpen,
}) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    try {
      setIsSubmitting(true);
      await onCreateProject(newProjectName.trim(), newProjectDesc.trim());
      setNewProjectName('');
      setNewProjectDesc('');
      setIsCreateModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalImages = projects.reduce((acc, p) => acc + (p.images_count || 0), 0);
  const totalProcessed = projects.reduce((acc, p) => acc + (p.processed_count || 0), 0);

  return (
    <div className="flex-1 overflow-y-auto bg-charcoal-500 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header & Stats Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-surface-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-savecus-400">Savecus Studio</span>
              <span className="text-xs font-semibold text-slate-400 bg-charcoal-300 px-2.5 py-0.5 rounded-full border border-surface-border">
                {projects.length} Batches
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Picture Rebranding Workspace
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Upload photos, remove old watermarks, and place your Savecus branding anywhere.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 bg-charcoal-300 border border-surface-border rounded-2xl px-5 py-2.5 shadow-lg">
              <div className="flex flex-col">
                <span className="text-[11px] uppercase font-bold text-slate-400">Total Photos</span>
                <span className="text-xl font-extrabold text-white">{totalImages}</span>
              </div>
              <div className="w-px h-8 bg-surface-border" />
              <div className="flex flex-col">
                <span className="text-[11px] uppercase font-bold text-savecus-400">Rebranded</span>
                <span className="text-xl font-extrabold text-savecus-400">{totalProcessed}</span>
              </div>
            </div>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-savecus-500 hover:bg-savecus-400 text-charcoal-900 font-extrabold text-sm shadow-xl shadow-savecus-500/25 transition-all active:scale-95"
            >
              <FolderPlus className="w-5 h-5 stroke-[2.5]" />
              <span>Start New Batch</span>
            </button>
          </div>
        </div>

        {/* Filter and Search */}
        {projects.length > 0 && (
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search batches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-charcoal-300 border border-surface-border text-sm text-white placeholder-slate-400 focus:outline-none focus:border-savecus-500 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 rounded-3xl bg-charcoal-300/60 border border-surface-border animate-pulse p-6" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          /* Empty State */
          <div className="rounded-3xl border-2 border-dashed border-surface-borderStrong bg-charcoal-300/40 p-12 text-center max-w-xl mx-auto my-12 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-savecus-500/15 border border-savecus-500/30 text-savecus-500 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <FolderPlus className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">
              {searchQuery ? 'No matching projects found' : 'No photo batches yet'}
            </h3>
            <p className="text-sm text-slate-300 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'Try a different search term.'
                : 'Click the button below to upload your first set of photos and rebrand them with the Savecus logo.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-6 inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-savecus-500 hover:bg-savecus-400 text-charcoal-900 font-extrabold text-sm shadow-xl shadow-savecus-500/25 transition-all active:scale-95"
              >
                <FolderPlus className="w-5 h-5 stroke-[2.5]" />
                <span>Start First Photo Batch</span>
              </button>
            )}
          </div>
        ) : (
          /* Projects Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((project) => {
              const progressPct =
                project.images_count > 0
                  ? Math.round((project.processed_count / project.images_count) * 100)
                  : 0;

              return (
                <div
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className="group relative rounded-3xl bg-charcoal-200 border border-surface-border hover:border-savecus-500 hover:bg-charcoal-100 transition-all duration-200 cursor-pointer p-6 flex flex-col justify-between shadow-lg hover:shadow-2xl hover:shadow-savecus-500/10"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-white text-lg group-hover:text-savecus-400 transition-colors line-clamp-1">
                          {project.name}
                        </h3>
                        {project.description && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(project.id);
                        }}
                        className="text-slate-400 hover:text-rose-400 p-2 rounded-xl hover:bg-rose-500/10 transition-colors"
                        title="Delete batch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Meta stats badges */}
                    <div className="flex flex-wrap items-center gap-2 mt-5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 bg-charcoal-300 px-3 py-1.5 rounded-xl border border-surface-border">
                        <ImageIcon className="w-3.5 h-3.5 text-savecus-400" />
                        <span>{project.images_count} photos</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-semibold text-savecus-300 bg-savecus-500/10 px-3 py-1.5 rounded-xl border border-savecus-500/20">
                        <Sparkles className="w-3.5 h-3.5 text-savecus-400" />
                        <span>Savecus Logo Ready</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer & Progress */}
                  <div className="mt-6 pt-4 border-t border-surface-border space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Rebranded Progress</span>
                      <span className="font-bold text-slate-200">
                        {project.processed_count} / {project.images_count} ({progressPct}%)
                      </span>
                    </div>

                    {/* Progress Bar with Savecus Gold */}
                    <div className="w-full h-2 bg-charcoal-400 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-savecus-500 rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(project.updated_at).toLocaleDateString()}
                      </span>

                      <div className="flex items-center gap-1.5 text-sm font-bold text-savecus-400 group-hover:translate-x-1 transition-transform">
                        <span>Open Studio</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Project Modal */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/85 backdrop-blur-md">
            <div className="bg-charcoal-200 border border-surface-border rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-savecus-500/15 border border-savecus-500/30 text-savecus-500 flex items-center justify-center">
                  <FolderPlus className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-lg">New Photo Batch</h3>
                  <p className="text-xs text-slate-300">Name this batch to keep your photos organized</p>
                </div>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">
                    Batch Name <span className="text-savecus-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="e.g. Products Spring 2026"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-charcoal-300 border border-surface-border text-base text-white placeholder-slate-400 focus:outline-none focus:border-savecus-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">
                    Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Optional notes for this batch..."
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-charcoal-300 border border-surface-border text-sm text-white placeholder-slate-400 focus:outline-none focus:border-savecus-500 transition-colors resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-charcoal-300 text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newProjectName.trim()}
                    className="px-6 py-2.5 rounded-2xl bg-savecus-500 hover:bg-savecus-400 disabled:opacity-50 text-charcoal-900 text-sm font-extrabold shadow-lg shadow-savecus-500/25 transition-all"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Batch'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/85 backdrop-blur-md">
            <div className="bg-charcoal-200 border border-surface-border rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
              <h3 className="font-extrabold text-white text-lg">Delete this photo batch?</h3>
              <p className="text-sm text-slate-300">
                This will remove all pictures in this batch. This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-charcoal-300 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onDeleteProject(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-md transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
