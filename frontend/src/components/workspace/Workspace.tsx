import React, { useState, useEffect } from 'react';
import { Project, ImageItem, LogoItem, LogoPlacement, MaskRegion } from '../../types';
import { WizardStepper } from '../wizard/WizardStepper';
import { Step1Upload } from '../wizard/Step1Upload';
import { Step2Erase } from '../wizard/Step2Erase';
import { Step3Place } from '../wizard/Step3Place';
import { Step4Download } from '../wizard/Step4Download';
import { StudioCanvas } from '../editor/StudioCanvas';
import { EditorSidebar } from '../editor/EditorSidebar';
import { EditorLeftSidebar } from '../editor/EditorLeftSidebar';
import { EditorBottomBar } from '../editor/EditorBottomBar';
import { CompareModal } from '../processing/CompareModal';
import { BatchModal } from '../processing/BatchModal';
import { useCanvasHistory } from '../../hooks/useCanvasHistory';
import { api } from '../../services/api';
import { 
  ArrowLeft, 
  Sparkles, 
  LayoutGrid, 
  Sliders, 
  FileArchive, 
  SplitSquareVertical, 
  Play,
  RotateCcw
} from 'lucide-react';

interface WorkspaceProps {
  project: Project;
  onBack: () => void;
  onUploadImages: (files: File[]) => Promise<void>;
  onDeleteImage: (imageId: string) => Promise<void>;
  onUploadLogo: (file: File) => Promise<void>;
  onDeleteLogo: () => Promise<void>;
  onSelectImageForEditing: (image: ImageItem) => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({
  project,
  onBack,
  onUploadImages,
  onDeleteImage,
  onUploadLogo,
  onDeleteLogo,
  onSelectImageForEditing,
}) => {
  // Mode: Guided Wizard (default for father) vs Advanced Studio Canvas
  const [workspaceMode, setWorkspaceMode] = useState<'wizard' | 'advanced'>('wizard');
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(
    project.images && project.images.length > 0
      ? project.images.some((img) => img.status === 'completed')
        ? 4
        : 2
      : 1
  );

  const [selectedImageId, setSelectedImageId] = useState<string | null>(
    project.images && project.images.length > 0 ? project.images[0].id : null
  );

  // Mask regions for watermark erasure
  const [maskRegions, setMaskRegions] = useState<MaskRegion[]>([]);

  // Modals
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [compareImage, setCompareImage] = useState<ImageItem | null>(null);

  // Action status
  const [isDetectingLogo, setIsDetectingLogo] = useState(false);
  const [isInpainting, setIsInpainting] = useState(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingSingle, setIsProcessingSingle] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const images = project.images || [];
  const currentImage = images.find((img) => img.id === selectedImageId) || images[0] || null;
  const currentIndex = currentImage ? images.findIndex((img) => img.id === currentImage.id) : 0;
  const isProcessed = images.length > 0 && images.some((img) => img.status === 'completed');

  // Placement history
  const initialPlacement: LogoPlacement = 
    currentImage?.custom_settings || project.global_settings || {
      x: 0.85,
      y: 0.85,
      scale: 0.20,
      rotation: 0,
      opacity: 1.0,
      blend_mode: 'normal',
      shadow: true,
      shadow_blur: 6.0,
      shadow_opacity: 0.4,
      shadow_offset_x: 4.0,
      shadow_offset_y: 4.0,
      lock_aspect_ratio: true,
    };

  const {
    currentState: currentPlacement,
    pushState: pushPlacementState,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
  } = useCanvasHistory(initialPlacement);

  // Sync state when active image changes
  useEffect(() => {
    if (currentImage) {
      const activeP = currentImage.custom_settings || project.global_settings;
      if (activeP) resetHistory(activeP);
      setMaskRegions(currentImage.mask_data || []);
      setHasUnsavedChanges(false);
    }
  }, [currentImage?.id, project.global_settings, resetHistory]);

  const handlePlacementChange = (newP: LogoPlacement) => {
    pushPlacementState(newP);
    setHasUnsavedChanges(true);
  };

  const handleSavePlacement = async () => {
    if (!currentImage) return;
    try {
      setIsSaving(true);
      await api.updateProject(project.id, {
        global_settings: currentPlacement,
      });
      await api.updateImageConfig(project.id, currentImage.id, {
        custom_settings: currentPlacement,
        mask_data: maskRegions,
      });
      setHasUnsavedChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Switch logo variant (Black vs Gold)
  const handleSwitchLogoVariant = async (variant: 'black' | 'gold') => {
    try {
      const updatedLogo = await api.switchLogoVariant(project.id, variant);
      project.logo = updatedLogo;
    } catch (err: any) {
      alert(err.message || 'Failed to switch logo color');
    }
  };

  // Auto-detect watermark
  const handleAutoDetectLogo = async () => {
    if (!currentImage) return;
    try {
      setIsDetectingLogo(true);
      const res = await api.detectLogo(project.id, currentImage.id);
      if (res.detected && res.regions.length > 0) {
        setMaskRegions((prev) => [...prev, ...res.regions]);
      } else {
        alert(res.message);
      }
    } finally {
      setIsDetectingLogo(false);
    }
  };

  // Inpaint watermark removal
  const handleInpaint = async (method: string) => {
    if (!currentImage || maskRegions.length === 0) return;
    try {
      setIsInpainting(true);
      const updated = await api.inpaintImage(project.id, currentImage.id, method, maskRegions);
      const imgIdx = images.findIndex((img) => img.id === updated.id);
      if (imgIdx !== -1) {
        images[imgIdx] = updated;
      }
    } finally {
      setIsInpainting(false);
    }
  };

  // Start Batch Process from Step 3
  const handleStartBatchProcessing = async () => {
    try {
      setIsProcessingBatch(true);
      await handleSavePlacement();
      const job = await api.startBatchJob(project.id);
      
      // Poll until batch job completes
      const interval = setInterval(async () => {
        try {
          const status = await api.getJobStatus(project.id, job.id);
          if (status.status === 'completed' || status.status === 'completed_with_errors' || status.status === 'failed') {
            clearInterval(interval);
            setIsProcessingBatch(false);
            // Refresh project images
            const detailed = await api.getProject(project.id);
            if (detailed.images) project.images = detailed.images;
            // Advance to Step 4 Download!
            setWizardStep(4);
          }
        } catch {
          clearInterval(interval);
          setIsProcessingBatch(false);
        }
      }, 1000);
    } catch (err: any) {
      setIsProcessingBatch(false);
      alert(err.message || 'Batch processing failed to start');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-charcoal-500">
      {/* Top Navigation Sub-Bar */}
      <div className="h-15 border-b border-surface-border bg-charcoal-400 px-6 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-charcoal-300 transition-colors"
            title="Back to Batches"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>{project.name}</span>
              <span className="text-xs font-bold text-savecus-400 bg-savecus-500/10 px-2.5 py-0.5 rounded-full border border-savecus-500/20">
                {images.length} photos
              </span>
            </h2>
          </div>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex items-center gap-3">
          {/* Guided Mode vs Studio Mode Toggle */}
          <div className="flex items-center bg-charcoal-900 p-1 rounded-xl border border-surface-border">
            <button
              onClick={() => setWorkspaceMode('wizard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                workspaceMode === 'wizard'
                  ? 'bg-savecus-500 text-charcoal-900 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>Simple Mode (Guided)</span>
            </button>
            <button
              onClick={() => {
                if (images.length > 0) setWorkspaceMode('advanced');
              }}
              disabled={images.length === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40 ${
                workspaceMode === 'advanced'
                  ? 'bg-savecus-500 text-charcoal-900 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Studio Mode</span>
            </button>
          </div>

          <div className="w-px h-6 bg-surface-border" />

          {/* Download ZIP Button */}
          {images.some((img) => img.status === 'completed') && (
            <a
              href={api.getZipExportUrl(project.id)}
              download
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-savecus-500 hover:bg-savecus-400 text-charcoal-900 text-xs font-extrabold shadow-lg shadow-savecus-500/20 transition-all"
            >
              <FileArchive className="w-4 h-4 stroke-[2.5]" />
              <span>Download ZIP</span>
            </a>
          )}
        </div>
      </div>

      {/* Main Workspace Body */}
      {workspaceMode === 'wizard' ? (
        /* GUIDED 4-STEP WIZARD (SUPER EASY FOR FATHER) */
        <div className="flex-1 flex flex-col overflow-hidden">
          <WizardStepper
            currentStep={wizardStep}
            onSelectStep={setWizardStep}
            hasImages={images.length > 0}
            hasLogo={!!project.logo}
            isProcessed={isProcessed}
          />

          <div className="flex-1 overflow-y-auto p-6">
            {wizardStep === 1 && (
              <Step1Upload
                images={images}
                onUpload={onUploadImages}
                onDeleteImage={onDeleteImage}
                onNext={() => setWizardStep(2)}
              />
            )}

            {wizardStep === 2 && currentImage && (
              <Step2Erase
                currentImage={currentImage}
                images={images}
                onSelectImage={(img) => setSelectedImageId(img.id)}
                maskRegions={maskRegions}
                onAddMaskRegion={(reg) => {
                  setMaskRegions((prev) => [...prev, reg]);
                  setHasUnsavedChanges(true);
                }}
                onClearMasks={() => {
                  setMaskRegions([]);
                  setHasUnsavedChanges(true);
                }}
                onAutoDetectLogo={handleAutoDetectLogo}
                isDetectingLogo={isDetectingLogo}
                onInpaint={handleInpaint}
                isInpainting={isInpainting}
                onNext={() => setWizardStep(3)}
                onBack={() => setWizardStep(1)}
              />
            )}

            {wizardStep === 3 && currentImage && (
              <Step3Place
                currentImage={currentImage}
                images={images}
                onSelectImage={(img) => setSelectedImageId(img.id)}
                logo={project.logo || null}
                placement={currentPlacement}
                onChangePlacement={handlePlacementChange}
                onSwitchLogoVariant={handleSwitchLogoVariant}
                onStartBatchProcessing={handleStartBatchProcessing}
                isProcessingBatch={isProcessingBatch}
                onBack={() => setWizardStep(2)}
              />
            )}

            {wizardStep === 4 && (
              <Step4Download
                project={project}
                images={images}
                onBackToEdit={() => setWizardStep(3)}
                onRestart={() => setWizardStep(1)}
              />
            )}
          </div>
        </div>
      ) : (
        /* ADVANCED STUDIO MODE */
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            <EditorLeftSidebar
              images={images}
              currentImageId={currentImage?.id || ''}
              onSelectImage={(img) => setSelectedImageId(img.id)}
              onUploadMore={onUploadImages}
            />

            <div className="flex-1 relative flex overflow-hidden">
              {currentImage ? (
                <StudioCanvas
                  image={currentImage}
                  logo={project.logo || null}
                  placement={currentPlacement}
                  onChangePlacement={handlePlacementChange}
                  editorMode="placement"
                  maskRegions={maskRegions}
                  onAddMaskRegion={(reg) => {
                    setMaskRegions((prev) => [...prev, reg]);
                    setHasUnsavedChanges(true);
                  }}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                  No photo selected
                </div>
              )}
            </div>

            {currentImage && (
              <EditorSidebar
                placement={currentPlacement}
                onChangePlacement={handlePlacementChange}
                isGlobalMode={true}
                onToggleGlobalMode={() => {}}
                onApplyToAllImages={handleSavePlacement}
                logo={project.logo || null}
                editorMode="placement"
                onChangeEditorMode={() => {}}
                maskRegions={maskRegions}
                onClearMasks={() => setMaskRegions([])}
                onAutoDetectLogo={handleAutoDetectLogo}
                isDetectingLogo={isDetectingLogo}
                onInpaint={handleInpaint}
                isInpainting={isInpainting}
                currentImage={currentImage}
              />
            )}
          </div>

          {currentImage && (
            <EditorBottomBar
              currentIndex={currentIndex}
              totalImages={images.length}
              currentImage={currentImage}
              onPrevious={() => {
                if (currentIndex > 0) setSelectedImageId(images[currentIndex - 1].id);
              }}
              onNext={() => {
                if (currentIndex < images.length - 1) setSelectedImageId(images[currentIndex + 1].id);
              }}
              onUndo={undo}
              onRedo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
              onReset={() => {
                handlePlacementChange({
                  ...currentPlacement,
                  x: 0.5,
                  y: 0.5,
                  rotation: 0,
                  scale: 0.20,
                });
              }}
              onSave={handleSavePlacement}
              isSaving={isSaving}
              hasUnsavedChanges={hasUnsavedChanges}
              onProcessSingle={async () => {
                await handleSavePlacement();
                const updated = await api.applyLogo(project.id, currentImage.id);
                const idx = images.findIndex((i) => i.id === updated.id);
                if (idx !== -1) images[idx] = updated;
              }}
              isProcessingSingle={isProcessingSingle}
              onOpenBatchModal={() => setIsBatchModalOpen(true)}
            />
          )}
        </div>
      )}

      {/* Compare Modal */}
      {compareImage && (
        <CompareModal
          image={compareImage}
          projectId={project.id}
          onClose={() => setCompareImage(null)}
        />
      )}

      {/* Batch Processing Modal */}
      <BatchModal
        project={project}
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onJobCompleted={async () => {
          const updated = await api.getProject(project.id);
          if (project.images) project.images = updated.images;
        }}
      />
    </div>
  );
};
