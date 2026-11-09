import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Eraser, 
  Sparkles, 
  Download, 
  FileArchive, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  RotateCcw, 
  Trash2, 
  Wand2, 
  SplitSquareVertical, 
  Plus,
  ArrowRight,
  Move,
  X,
  HardDrive,
  Sliders,
  Crop,
  Check,
  Undo2,
  Redo2,
  Paintbrush,
  Square
} from 'lucide-react';
import { Project, ImageItem, LogoItem, LogoPlacement, MaskRegion } from '../../types';
import { StudioCanvas } from '../editor/StudioCanvas';
import { CompareModal } from '../processing/CompareModal';
import { api } from '../../services/api';

const DEFAULT_PLACEMENT: LogoPlacement = {
  x: 0.86,
  y: 0.86,
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

const BRUSH_PRESETS = [
  { label: '15px Fine', size: 15 },
  { label: '30px Normal ★', size: 30 },
  { label: '60px Thick', size: 60 },
  { label: '100px Wide', size: 100 },
];

export const SimpleStudio: React.FC = () => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  // Active tool on photo: 'move-logo' or 'mark-remove'
  const [activeCanvasTool, setActiveCanvasTool] = useState<'move-logo' | 'mark-remove'>('move-logo');

  // Mobile active tab when controls are stacked: 'placement' | 'watermark'
  const [mobileTab, setMobileTab] = useState<'placement' | 'watermark'>('placement');

  // Snapseed Healing tool state
  const [activeMaskTool, setActiveMaskTool] = useState<'brush' | 'rect'>('brush');
  const [brushSize, setBrushSize] = useState<number>(30);
  const [autoHealOnRelease, setAutoHealOnRelease] = useState<boolean>(true);
  const [isHealing, setIsHealing] = useState<boolean>(false);

  // Per-photo logo placement settings (x, y, scale, etc.)
  const [photoPlacements, setPhotoPlacements] = useState<Record<string, LogoPlacement>>({});

  // Per-photo watermark masks
  const [photoMasks, setPhotoMasks] = useState<Record<string, MaskRegion[]>>({});

  // Per-photo undo / redo history stack
  const [photoHistory, setPhotoHistory] = useState<
    Record<string, { past: Array<{ processed_url: string | null; masks: MaskRegion[] }>; future: Array<{ processed_url: string | null; masks: MaskRegion[] }> }>
  >({});

  // Apply logo position to all photos state
  const [isApplyingToAll, setIsApplyingToAll] = useState(false);
  const [applyAllSuccessMsg, setApplyAllSuccessMsg] = useState<string | null>(null);

  // Processing states
  const [isUploading, setIsUploading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [inpaintSuccessMsg, setInpaintSuccessMsg] = useState(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, pct: 0 });
  const [isCompleted, setIsCompleted] = useState(false);
  const [compareModalImage, setCompareModalImage] = useState<ImageItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Logo selection and custom logo state
  const [activeLogoChoice, setActiveLogoChoice] = useState<'junnu_mukka' | 'gold' | 'black' | 'custom'>('junnu_mukka');
  const [customLogoItem, setCustomLogoItem] = useState<LogoItem | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoSuccessMsg, setLogoSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoUploadInputRef = useRef<HTMLInputElement>(null);

  // Initialize or fetch the active batch project on startup
  useEffect(() => {
    const initProject = async () => {
      try {
        setLoading(true);
        const projects = await api.listProjects();
        if (projects.length > 0) {
          const latest = await api.getProject(projects[0].id);
          setProject(latest);
          if (latest.images && latest.images.length > 0) {
            setSelectedImageId(latest.images[0].id);
            const initialPlacements: Record<string, LogoPlacement> = {};
            const initialMasks: Record<string, MaskRegion[]> = {};
            latest.images.forEach((img) => {
              initialPlacements[img.id] = img.custom_settings || latest.global_settings || DEFAULT_PLACEMENT;
              initialMasks[img.id] = img.mask_data || [];
            });
            setPhotoPlacements(initialPlacements);
            setPhotoMasks(initialMasks);
            if (latest.images.some((i) => i.status === 'completed')) {
              setIsCompleted(true);
            }
          }
          if (latest.logo) {
            const orig = (latest.logo.original_filename || '').toLowerCase();
            const url = (latest.logo.url || '').toLowerCase();
            if (orig.includes('junnu') || url.includes('junnu')) {
              setActiveLogoChoice('junnu_mukka');
            } else if (orig.includes('gold') || url.includes('gold')) {
              setActiveLogoChoice('gold');
            } else if (orig.includes('black') || url.includes('black')) {
              setActiveLogoChoice('black');
            } else {
              setActiveLogoChoice('custom');
              setCustomLogoItem(latest.logo);
            }
          }
        } else {
          const fresh = await api.createProject('My Photos Batch', 'Auto-created quick rebrand batch');
          const detailed = await api.getProject(fresh.id);
          setProject(detailed);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to initialize session');
      } finally {
        setLoading(false);
      }
    };
    initProject();
  }, []);

  const images = project?.images || [];
  const currentImage = images.find((i) => i.id === selectedImageId) || images[0] || null;

  // Active photo's independent placement, masks, and undo stack
  const currentPlacement: LogoPlacement = (currentImage && photoPlacements[currentImage.id])
    ? photoPlacements[currentImage.id]
    : (project?.global_settings || DEFAULT_PLACEMENT);

  const currentMasks: MaskRegion[] = (currentImage && photoMasks[currentImage.id])
    ? photoMasks[currentImage.id]
    : [];

  const currentHistory = (currentImage && photoHistory[currentImage.id])
    ? photoHistory[currentImage.id]
    : { past: [], future: [] };

  const canUndo = (currentHistory.past && currentHistory.past.length > 0) || (currentMasks.length > 0 && !autoHealOnRelease);
  const canRedo = Boolean(currentHistory.future && currentHistory.future.length > 0);

  // Update placement for current photo only
  const handleChangePlacement = (newPlacement: LogoPlacement) => {
    if (!currentImage) return;
    setPhotoPlacements((prev) => ({
      ...prev,
      [currentImage.id]: newPlacement,
    }));
  };

  // Handle Photo Upload
  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !project) return;
    setErrorMessage(null);

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const valid: File[] = [];
    for (let i = 0; i < files.length; i++) {
      if (allowed.includes(files[i].type)) valid.push(files[i]);
    }

    if (valid.length === 0) {
      setErrorMessage('Please choose JPG, PNG, or WEBP photo files.');
      return;
    }

    try {
      setIsUploading(true);
      await api.uploadImages(project.id, valid);
      const updated = await api.getProject(project.id);
      setProject(updated);
      if (updated.images && updated.images.length > 0) {
        setSelectedImageId(updated.images[0].id);
        const newPlacements: Record<string, LogoPlacement> = { ...photoPlacements };
        const newMasks: Record<string, MaskRegion[]> = { ...photoMasks };
        updated.images.forEach((img) => {
          if (!newPlacements[img.id]) {
            newPlacements[img.id] = img.custom_settings || updated.global_settings || DEFAULT_PLACEMENT;
          }
          if (!newMasks[img.id]) {
            newMasks[img.id] = img.mask_data || [];
          }
        });
        setPhotoPlacements(newPlacements);
        setPhotoMasks(newMasks);
      }
      setIsCompleted(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Start Over / Fresh Batch
  const handleStartFresh = async () => {
    if (!window.confirm('Do you want to start a fresh batch?')) return;
    try {
      setLoading(true);
      const fresh = await api.createProject(`Batch ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      const detailed = await api.getProject(fresh.id);
      setProject(detailed);
      setSelectedImageId(null);
      setPhotoPlacements({});
      setPhotoMasks({});
      setPhotoHistory({});
      setIsCompleted(false);
      setErrorMessage(null);
    } finally {
      setLoading(false);
    }
  };

  // Switch Preset Logo (Junnu Mukka Sarees, Savecus Gold, Savecus Black)
  const handleSelectLogoPreset = async (variant: 'junnu_mukka' | 'gold' | 'black') => {
    if (!project) return;
    try {
      setErrorMessage(null);
      setActiveLogoChoice(variant);
      const updatedLogo = await api.switchLogoVariant(project.id, variant);
      const cacheBusted: LogoItem = {
        ...updatedLogo,
        url: `${updatedLogo.url.split('?')[0]}?t=${Date.now()}`,
      };
      setProject((prev) => (prev ? { ...prev, logo: cacheBusted } : prev));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to switch logo variant');
    }
  };

  // Switch to previously uploaded custom logo
  const handleSelectCustomLogo = () => {
    if (customLogoItem && project) {
      setActiveLogoChoice('custom');
      setProject({ ...project, logo: customLogoItem });
    }
  };

  // Upload any custom logo with auto-transparency
  const handleUploadCustomLogo = async (files: FileList | null) => {
    if (!files || files.length === 0 || !project) return;
    const file = files[0];
    try {
      setIsUploadingLogo(true);
      setErrorMessage(null);
      const uploaded = await api.uploadLogo(project.id, file);
      const cacheBusted: LogoItem = {
        ...uploaded,
        url: `${uploaded.url.split('?')[0]}?t=${Date.now()}`,
      };
      setCustomLogoItem(cacheBusted);
      setProject((prev) => (prev ? { ...prev, logo: cacheBusted } : prev));
      setActiveLogoChoice('custom');
      setLogoSuccessMsg(`✓ Logo "${file.name}" uploaded with transparent background!`);
      setTimeout(() => setLogoSuccessMsg(null), 4500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Logo upload failed');
    } finally {
      setIsUploadingLogo(false);
      if (logoUploadInputRef.current) logoUploadInputRef.current.value = '';
    }
  };

  // Apply current photo's logo position & size across all photos in the batch
  const handleApplyPlacementToAll = async () => {
    if (!project || images.length === 0 || !currentImage) return;
    const placementToCopy = photoPlacements[currentImage.id] || currentPlacement;
    try {
      setIsApplyingToAll(true);
      setErrorMessage(null);

      // 1. Update local state for all photos
      const updated: Record<string, LogoPlacement> = {};
      images.forEach((img) => {
        updated[img.id] = { ...placementToCopy };
      });
      setPhotoPlacements(updated);

      // 2. Persist global_settings to project
      await api.updateProject(project.id, { global_settings: placementToCopy });

      // 3. Persist custom_settings for all images on backend
      await Promise.all(
        images.map((img) =>
          api.updateImageConfig(project.id, img.id, { custom_settings: placementToCopy })
        )
      );

      // 4. Update project images state
      setProject((prev) =>
        prev
          ? {
              ...prev,
              global_settings: placementToCopy,
              images: prev.images?.map((img) => ({
                ...img,
                custom_settings: placementToCopy,
              })),
            }
          : prev
      );

      setApplyAllSuccessMsg(`✓ Copied logo position to all ${images.length} photos!`);
      setTimeout(() => setApplyAllSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to apply logo position to all photos');
    } finally {
      setIsApplyingToAll(false);
    }
  };

  // Execute inpainting with specific masks and record undo history
  const executeInpaint = async (masksToInpaint: MaskRegion[]) => {
    if (!project || !currentImage) return;
    try {
      setIsHealing(true);
      setErrorMessage(null);

      // Record prior step into history
      const prevStep = {
        processed_url: currentImage.processed_url || null,
        masks: photoMasks[currentImage.id] || [],
      };
      setPhotoHistory((prev) => ({
        ...prev,
        [currentImage.id]: {
          past: [...(prev[currentImage.id]?.past || []), prevStep],
          future: [],
        },
      }));

      const updated = await api.inpaintImage(
        project.id,
        currentImage.id,
        'clean_structure',
        masksToInpaint
      );

      const cacheBusted: ImageItem = {
        ...updated,
        processed_url: updated.processed_url
          ? `${updated.processed_url.split('?')[0]}?t=${Date.now()}`
          : updated.processed_url,
      };

      setProject((prev) =>
        prev
          ? {
              ...prev,
              images: prev.images?.map((img) =>
                img.id === updated.id ? cacheBusted : img
              ),
            }
          : prev
      );

      setPhotoMasks((prev) => ({
        ...prev,
        [currentImage.id]: masksToInpaint,
      }));

      setInpaintSuccessMsg(true);
      setTimeout(() => setInpaintSuccessMsg(false), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Watermark erasure failed');
    } finally {
      setIsHealing(false);
    }
  };

  // Google Snapseed Auto-Heal: immediately heals watermark when user lifts finger/mouse
  const handleAutoHeal = (newRegion: MaskRegion) => {
    if (!currentImage) return;
    const existing = photoMasks[currentImage.id] || [];
    const combined = [...existing, newRegion];
    executeInpaint(combined);
  };

  // Add mask stroke when autoHeal is disabled
  const handleAddMaskRegion = (region: MaskRegion) => {
    if (!currentImage) return;
    setPhotoMasks((prev) => ({
      ...prev,
      [currentImage.id]: [...(prev[currentImage.id] || []), region],
    }));
  };

  // Manually trigger inpaint on active photo
  const handleInpaintSinglePhoto = () => {
    if (!currentImage) return;
    const masks = photoMasks[currentImage.id] || [];
    if (masks.length === 0) return;
    executeInpaint(masks);
  };

  // Clear drawn masks on current photo
  const handleClearCurrentMasks = () => {
    if (!currentImage) return;
    setPhotoMasks((prev) => ({
      ...prev,
      [currentImage.id]: [],
    }));
  };

  // Auto-Detect Watermark
  const handleAutoDetect = async () => {
    if (!project || !currentImage || isHealing) return;
    try {
      setIsDetecting(true);
      const res = await api.detectLogo(project.id, currentImage.id);
      if (res.detected && res.regions.length > 0) {
        if (autoHealOnRelease) {
          const existing = photoMasks[currentImage.id] || [];
          const combined = [...existing, ...res.regions];
          await executeInpaint(combined);
        } else {
          setPhotoMasks((prev) => ({
            ...prev,
            [currentImage.id]: [...(prev[currentImage.id] || []), ...res.regions],
          }));
        }
        setActiveCanvasTool('mark-remove');
        setMobileTab('watermark');
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Auto-detection failed');
    } finally {
      setIsDetecting(false);
    }
  };

  // Instant Undo: reverts last heal or uncommitted stroke
  const handleUndo = async () => {
    if (!project || !currentImage || isHealing) return;
    const currentPhotoMaskList = photoMasks[currentImage.id] || [];
    const history = photoHistory[currentImage.id];

    // Case 1: uncommitted masks if auto-heal was off
    if (currentPhotoMaskList.length > 0 && !autoHealOnRelease && (!history || history.past.length === 0)) {
      const updated = currentPhotoMaskList.slice(0, -1);
      setPhotoMasks((prev) => ({ ...prev, [currentImage.id]: updated }));
      return;
    }

    // Case 2: undo from past inpaint history
    if (!history || history.past.length === 0) return;

    const previousStep = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);
    const currentStep = {
      processed_url: currentImage.processed_url || null,
      masks: currentPhotoMaskList,
    };

    setPhotoHistory((prev) => ({
      ...prev,
      [currentImage.id]: {
        past: newPast,
        future: [currentStep, ...(prev[currentImage.id]?.future || [])],
      },
    }));

    try {
      setIsHealing(true);
      if (previousStep.masks.length === 0) {
        // Revert to original upload
        const resetItem = await api.resetImage(project.id, currentImage.id);
        setProject((prev) =>
          prev
            ? {
                ...prev,
                images: prev.images?.map((img) =>
                  img.id === currentImage.id ? resetItem : img
                ),
              }
            : prev
        );
        setPhotoMasks((prev) => ({ ...prev, [currentImage.id]: [] }));
      } else {
        const updated = await api.inpaintImage(
          project.id,
          currentImage.id,
          'clean_structure',
          previousStep.masks
        );
        const cacheBusted: ImageItem = {
          ...updated,
          processed_url: updated.processed_url
            ? `${updated.processed_url.split('?')[0]}?t=${Date.now()}`
            : updated.processed_url,
        };
        setProject((prev) =>
          prev
            ? {
                ...prev,
                images: prev.images?.map((img) =>
                  img.id === currentImage.id ? cacheBusted : img
                ),
              }
            : prev
        );
        setPhotoMasks((prev) => ({
          ...prev,
          [currentImage.id]: previousStep.masks,
        }));
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Undo failed');
    } finally {
      setIsHealing(false);
    }
  };

  // Instant Redo: re-applies undone heal
  const handleRedo = async () => {
    if (!project || !currentImage || isHealing) return;
    const history = photoHistory[currentImage.id];
    if (!history || history.future.length === 0) return;

    const nextStep = history.future[0];
    const newFuture = history.future.slice(1);
    const currentPhotoMaskList = photoMasks[currentImage.id] || [];
    const currentStep = {
      processed_url: currentImage.processed_url || null,
      masks: currentPhotoMaskList,
    };

    setPhotoHistory((prev) => ({
      ...prev,
      [currentImage.id]: {
        past: [...(prev[currentImage.id]?.past || []), currentStep],
        future: newFuture,
      },
    }));

    try {
      setIsHealing(true);
      const updated = await api.inpaintImage(
        project.id,
        currentImage.id,
        'clean_structure',
        nextStep.masks
      );
      const cacheBusted: ImageItem = {
        ...updated,
        processed_url: updated.processed_url
          ? `${updated.processed_url.split('?')[0]}?t=${Date.now()}`
          : updated.processed_url,
      };
      setProject((prev) =>
        prev
          ? {
              ...prev,
              images: prev.images?.map((img) =>
                img.id === currentImage.id ? cacheBusted : img
              ),
            }
          : prev
      );
      setPhotoMasks((prev) => ({
        ...prev,
        [currentImage.id]: nextStep.masks,
      }));
    } catch (err: any) {
      setErrorMessage(err.message || 'Redo failed');
    } finally {
      setIsHealing(false);
    }
  };

  // Reset photo back to original untouched upload
  const handleResetPhoto = async () => {
    if (!project || !currentImage || isHealing) return;
    if (!window.confirm('Reset this photo back to its original untouched upload?')) return;
    try {
      setIsHealing(true);
      const resetItem = await api.resetImage(project.id, currentImage.id);
      setProject((prev) =>
        prev
          ? {
              ...prev,
              images: prev.images?.map((img) =>
                img.id === currentImage.id ? resetItem : img
              ),
            }
          : prev
      );
      setPhotoMasks((prev) => ({ ...prev, [currentImage.id]: [] }));
      setPhotoHistory((prev) => ({
        ...prev,
        [currentImage.id]: { past: [], future: [] },
      }));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset photo');
    } finally {
      setIsHealing(false);
    }
  };

  // Keyboard shortcut listener for Ctrl+Z / Cmd+Z and Ctrl+Y / Cmd+Shift+Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentImage, photoHistory, photoMasks, isHealing, autoHealOnRelease]);

  // Remove single photo from batch
  const handleDeleteImage = async (imgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!project) return;
    if (!window.confirm('Remove this photo from the batch?')) return;
    try {
      await api.deleteImage(project.id, imgId);
      const remaining = (project.images || []).filter((i) => i.id !== imgId);
      setProject({ ...project, images: remaining });
      if (selectedImageId === imgId) {
        setSelectedImageId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to remove photo');
    }
  };

  // Download All Photos (ZIP) directly to computer
  const handleDownloadZip = () => {
    if (!project) return;
    const link = document.createElement('a');
    link.href = api.getZipExportUrl(project.id);
    link.setAttribute('download', `${project.name || 'photos'}_rebranded.zip`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compass Presets for current photo
  const applyCompass = (pos: 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right') => {
    let x = 0.5;
    let y = 0.5;
    const m = 0.12;
    if (pos === 'top-left') { x = m; y = m; }
    else if (pos === 'top-right') { x = 1 - m; y = m; }
    else if (pos === 'bottom-left') { x = m; y = 1 - m; }
    else if (pos === 'bottom-right') { x = 1 - m; y = 1 - m; }
    else { x = 0.5; y = 0.5; }

    handleChangePlacement({ ...currentPlacement, x, y });
    setActiveCanvasTool('move-logo');
  };

  // Compass active position highlights for visual feedback
  const isTopLeft = currentPlacement.x <= 0.3 && currentPlacement.y <= 0.3;
  const isTopRight = currentPlacement.x >= 0.7 && currentPlacement.y <= 0.3;
  const isBottomLeft = currentPlacement.x <= 0.3 && currentPlacement.y >= 0.7;
  const isBottomRight = currentPlacement.x >= 0.7 && currentPlacement.y >= 0.7;
  const isCenter = currentPlacement.x >= 0.4 && currentPlacement.x <= 0.6 && currentPlacement.y >= 0.4 && currentPlacement.y <= 0.6;

  // Run Batch Processing: saves all photos' custom settings & masks
  const handleRunBatch = async () => {
    if (!project || images.length === 0) return;
    try {
      setIsProcessingBatch(true);
      setErrorMessage(null);
      setBatchProgress({ current: 0, total: images.length, pct: 0 });

      // Save each image's independent placement and masks on backend
      await Promise.all(
        images.map((img) =>
          api.updateImageConfig(project.id, img.id, {
            custom_settings: photoPlacements[img.id] || currentPlacement,
            mask_data: photoMasks[img.id] || [],
          })
        )
      );
      await api.updateProject(project.id, { global_settings: currentPlacement });

      // Start background batch job
      const job = await api.startBatchJob(project.id);

      const poll = setInterval(async () => {
        try {
          const status = await api.getJobStatus(project.id, job.id);
          const current = status.processed_images;
          const total = status.total_images;
          const pct = total > 0 ? Math.round((current / total) * 100) : 0;
          setBatchProgress({ current, total, pct });

          if (status.status === 'completed' || status.status === 'completed_with_errors' || status.status === 'failed') {
            clearInterval(poll);
            setIsProcessingBatch(false);
            const detailed = await api.getProject(project.id);
            const cacheBustedImages = (detailed.images || []).map((img) => ({
              ...img,
              processed_url: img.processed_url ? `${img.processed_url.split('?')[0]}?t=${Date.now()}` : img.processed_url,
              thumbnail_url: img.thumbnail_url ? `${img.thumbnail_url.split('?')[0]}?t=${Date.now()}` : img.thumbnail_url,
            }));
            setProject({ ...detailed, images: cacheBustedImages });
            setIsCompleted(true);
            handleDownloadZip();
          }
        } catch {
          clearInterval(poll);
          setIsProcessingBatch(false);
        }
      }, 1000);
    } catch (err: any) {
      setIsProcessingBatch(false);
      setErrorMessage(err.message || 'Processing failed');
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-charcoal-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-savecus-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-bold text-slate-300">Opening Savecus Studio...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-charcoal-500 text-white select-none overflow-hidden">
      {/* Responsive Top Header */}
      <header className="h-16 border-b border-surface-border bg-charcoal-400 px-3 sm:px-6 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-savecus-500 flex items-center justify-center shadow-lg shadow-savecus-500/25 p-1.5 shrink-0">
            <img src="/savecus_logo.png" alt="Savecus Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-white tracking-wider text-sm sm:text-base whitespace-nowrap">SAVECUS</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-savecus-500/15 text-savecus-400 border border-savecus-500/30 uppercase tracking-wider shrink-0">
                Studio
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block truncate">Bulk Photo Rebranding</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {images.length > 0 && (
            <button
              onClick={handleStartFresh}
              className="min-h-[44px] flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-charcoal-300 hover:bg-charcoal-200 border border-surface-border text-slate-200 hover:text-white text-xs sm:text-sm font-bold transition-colors active:scale-95"
              title="Start fresh with a new batch"
            >
              <RotateCcw className="w-4 h-4 text-savecus-500" />
              <span className="hidden sm:inline">Start Over</span>
            </button>
          )}

          {isCompleted && project && (
            <button
              onClick={handleDownloadZip}
              className="min-h-[44px] flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-savecus-500 hover:bg-savecus-400 text-charcoal-950 font-black text-xs sm:text-sm shadow-lg shadow-savecus-500/30 transition-all active:scale-95"
              title="Save all rebranded photos as ZIP"
            >
              <FileArchive className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Download </span>
              <span>ZIP</span>
            </button>
          )}
        </div>
      </header>

      {/* Hidden file input for uploading batch photos */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleUploadFiles(e.target.files)}
      />

      {/* Hidden file input for custom logo upload */}
      <input
        ref={logoUploadInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => handleUploadCustomLogo(e.target.files)}
      />

      {/* Error alert banner */}
      {errorMessage && (
        <div className="bg-rose-500/20 border-b border-rose-500/30 px-4 py-2 flex items-center justify-between text-xs text-rose-300 font-medium shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Studio Body */}
      {images.length === 0 ? (
        /* ================= ZERO STATE: DIRECT INVITING UPLOAD ================= */
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-xl w-full space-y-6 text-center">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Rebrand Your Saree Photos
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-md mx-auto">
                Upload your batch of 20 to 30 saree photos. Cleanly remove old watermarks with zero blur, and place Junnu Mukka Sarees or your own custom logo anywhere in seconds.
              </p>
            </div>

            {/* Giant Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleUploadFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-3xl border-3 border-dashed border-surface-borderStrong bg-charcoal-200 hover:border-savecus-500 hover:bg-charcoal-100 p-8 sm:p-12 cursor-pointer transition-all flex flex-col items-center justify-center shadow-2xl space-y-4 group"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-savecus-500/15 border border-savecus-500/30 text-savecus-500 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                {isUploading ? (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 border-3 border-savecus-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-8 h-8 sm:w-9 sm:h-9" />
                )}
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  {isUploading ? 'Uploading photos...' : 'Drag and drop your photos here'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Works on mobile & computer. JPG, PNG, WEBP supported.
                </p>
              </div>

              <button
                type="button"
                disabled={isUploading}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="mt-2 sm:mt-4 w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl bg-savecus-500 hover:bg-savecus-400 text-charcoal-900 font-extrabold text-sm sm:text-base shadow-xl shadow-savecus-500/25 transition-all transform active:scale-95 flex items-center justify-center gap-2.5"
              >
                <ImageIcon className="w-5 h-5 text-charcoal-900" />
                <span>Choose 20–30 Photos to Rebrand</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ================= POPULATED STUDIO: RESPONSIVE & CORNERS 100% UNOBSTRUCTED ================= */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 
            DEDICATED TOOLBAR BAR ABOVE THE CANVAS:
            This completely moves all buttons and badges OUT of the canvas so the
            top-left, top-right, and all 4 corners are 100% unobstructed!
          */}
          <div className="bg-charcoal-400 border-b border-surface-border px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2.5 shrink-0 z-20">
            {/* Tool mode buttons - Senior-friendly large 50px targets */}
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setActiveCanvasTool('move-logo');
                  setMobileTab('placement');
                }}
                className={`flex-1 sm:flex-initial min-h-[50px] flex items-center justify-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all active:scale-95 ${
                  activeCanvasTool === 'move-logo'
                    ? 'bg-savecus-500 text-charcoal-950 shadow-lg ring-2 ring-savecus-500/40 border border-savecus-400'
                    : 'bg-charcoal-300 text-slate-300 hover:text-white border border-surface-border'
                }`}
              >
                <Move className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="truncate">1. Position Logo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveCanvasTool('mark-remove');
                  setMobileTab('watermark');
                }}
                className={`flex-1 sm:flex-initial min-h-[50px] flex items-center justify-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all active:scale-95 ${
                  activeCanvasTool === 'mark-remove'
                    ? 'bg-rose-600 text-white shadow-lg ring-2 ring-rose-500/40 border border-rose-500'
                    : 'bg-charcoal-300 text-slate-300 hover:text-white border border-surface-border'
                }`}
              >
                <Eraser className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="truncate">2. Erase Watermark</span>
                {currentMasks.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-900/80 border border-rose-400/50 text-rose-200 text-[10px] font-black">
                    {currentMasks.length}
                  </span>
                )}
              </button>
            </div>

            {/* Instant Undo / Redo / Reset controls right in toolbar */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={handleUndo}
                disabled={!canUndo || isHealing}
                className={`min-h-[46px] px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all active:scale-95 border ${
                  canUndo && !isHealing
                    ? 'bg-charcoal-300 hover:bg-charcoal-200 text-white border-surface-border hover:border-slate-400 shadow-sm'
                    : 'bg-charcoal-400 text-slate-600 border-surface-border cursor-not-allowed opacity-50'
                }`}
                title="Undo last heal or stroke (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Undo</span>
              </button>

              <button
                type="button"
                onClick={handleRedo}
                disabled={!canRedo || isHealing}
                className={`min-h-[46px] px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all active:scale-95 border ${
                  canRedo && !isHealing
                    ? 'bg-charcoal-300 hover:bg-charcoal-200 text-white border-surface-border hover:border-slate-400 shadow-sm'
                    : 'bg-charcoal-400 text-slate-600 border-surface-border cursor-not-allowed opacity-50'
                }`}
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Redo</span>
              </button>

              {currentImage?.processed_url && (
                <button
                  type="button"
                  onClick={handleResetPhoto}
                  disabled={isHealing}
                  className="min-h-[46px] px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold text-rose-300 hover:text-white bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 transition-all flex items-center gap-1.5 active:scale-95"
                  title="Reset photo to pristine original upload"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden md:inline">Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Responsive Layout: Vertical on mobile/tablet (flex-col), Horizontal on desktop (lg:flex-row) */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden w-full max-w-full">
            {/* Center Canvas Area */}
            <div className="flex flex-col flex-1 min-w-0 min-h-[42vh] sm:min-h-[46vh] lg:min-h-0 bg-charcoal-900 relative overflow-hidden w-full">
              {/* 
                THE CANVAS:
                100% unobstructed! All 4 corners (top-left, top-right, bottom-left, bottom-right)
                are completely clear and free of any floating HTML overlays.
              */}
              <div className="flex-1 relative flex overflow-hidden w-full">
                {currentImage ? (
                  <StudioCanvas
                    image={currentImage}
                    logo={project?.logo || null}
                    placement={currentPlacement}
                    onChangePlacement={handleChangePlacement}
                    editorMode={activeCanvasTool === 'mark-remove' ? 'mask' : 'placement'}
                    activeMaskTool={activeMaskTool}
                    brushSize={brushSize}
                    autoHealOnRelease={autoHealOnRelease}
                    onAutoHeal={handleAutoHeal}
                    maskRegions={currentMasks}
                    onAddMaskRegion={handleAddMaskRegion}
                    isHealing={isHealing}
                  />
                ) : null}
              </div>

              {/* Bottom Thumbnail Strip */}
              <div className="h-16 sm:h-20 border-t border-surface-border bg-charcoal-400 px-3 sm:px-4 flex items-center justify-between shrink-0 gap-2 sm:gap-3 w-full">
                <div className="flex items-center gap-2 overflow-x-auto py-1 min-w-0 flex-1">
                  {images.map((img, idx) => {
                    const isVertical = img.height > img.width;
                    return (
                      <button
                        key={img.id}
                        onClick={() => setSelectedImageId(img.id)}
                        className={`relative w-16 h-12 sm:w-20 sm:h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                          img.id === currentImage?.id
                            ? 'border-savecus-500 scale-105 shadow-lg'
                            : 'border-surface-border opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={img.processed_url || img.thumbnail_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 bg-charcoal-900/80 text-[9px] sm:text-[10px] text-white px-1 rounded font-mono">
                          #{idx + 1}
                        </span>
                        <span className="absolute top-1 left-1 bg-charcoal-900/80 text-[8px] text-savecus-300 px-1 rounded font-bold">
                          {isVertical ? '↕ 9:16' : '↔ 16:9'}
                        </span>
                        {img.status === 'completed' && (
                          <div className="absolute top-1 right-1 bg-emerald-500 text-charcoal-900 rounded-full p-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[48px] flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-charcoal-200 hover:bg-charcoal-100 border border-surface-border text-xs sm:text-sm font-bold text-slate-200 shrink-0 active:scale-95"
                >
                  <Plus className="w-4 h-4 text-savecus-500" />
                  <span className="hidden sm:inline">Add Photos</span>
                </button>
              </div>
            </div>

            {/* Right Side / Mobile Bottom Control Panel */}
            <div className="w-full lg:w-96 min-w-0 border-t lg:border-t-0 lg:border-l border-surface-border bg-charcoal-300 p-3 sm:p-5 flex flex-col overflow-y-auto shrink-0 space-y-4 max-h-[50vh] lg:max-h-none relative">
              {/* Mobile Tab Pill Switcher (Visible only on mobile screen) */}
              <div className="lg:hidden flex items-center gap-2 p-1 bg-charcoal-400 rounded-xl border border-surface-border shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveCanvasTool('move-logo');
                    setMobileTab('placement');
                  }}
                  className={`flex-1 min-h-[46px] rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                    mobileTab === 'placement'
                      ? 'bg-savecus-500 text-charcoal-950 shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Logo & Position</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCanvasTool('mark-remove');
                    setMobileTab('watermark');
                  }}
                  className={`flex-1 min-h-[46px] rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                    mobileTab === 'watermark'
                      ? 'bg-rose-600 text-white shadow'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Eraser className="w-4 h-4" />
                  <span>Erase Watermark</span>
                  {currentMasks.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-900 text-rose-200 text-[10px] font-black">
                      {currentMasks.length}
                    </span>
                  )}
                </button>
              </div>

              <div className="space-y-4">
                {/* 1. Visual Logo Shelf & Placement */}
                <div className={`rounded-2xl bg-charcoal-200 border border-surface-border p-3.5 sm:p-4 space-y-3.5 ${mobileTab === 'placement' ? 'block' : 'hidden lg:block'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-savecus-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      Choose or Upload Logo
                    </span>
                    <span className="text-[10px] sm:text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Auto 100% Transparent
                    </span>
                  </div>

                  {/* 3 Preset Logo Cards - Large 50px+ Touch Targets */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Card 1: Junnu Mukka Sarees (Magenta & Gold) */}
                    <button
                      type="button"
                      onClick={() => handleSelectLogoPreset('junnu_mukka')}
                      className={`relative p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center border-2 min-h-[96px] active:scale-95 ${
                        activeLogoChoice === 'junnu_mukka'
                          ? 'bg-savecus-500/20 border-savecus-500 shadow-xl ring-2 ring-savecus-500/40'
                          : 'bg-charcoal-100 border-surface-border hover:border-slate-400 hover:bg-charcoal-50'
                      }`}
                    >
                      <div className="w-full h-11 flex items-center justify-center p-1 bg-charcoal-900/80 rounded-xl overflow-hidden">
                        <img
                          src="/junnu_mukka_logo.png"
                          alt="Junnu Mukka Sarees"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="leading-tight">
                        <div className="text-xs sm:text-sm font-black text-white">Junnu Mukka</div>
                        <div className="text-[10px] sm:text-xs text-savecus-400 font-bold truncate">Sarees ★</div>
                      </div>
                      {activeLogoChoice === 'junnu_mukka' && (
                        <div className="absolute top-1.5 right-1.5 bg-savecus-500 text-charcoal-950 rounded-full p-0.5 shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                        </div>
                      )}
                    </button>

                    {/* Card 2: Savecus Gold */}
                    <button
                      type="button"
                      onClick={() => handleSelectLogoPreset('gold')}
                      className={`relative p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center border-2 min-h-[96px] active:scale-95 ${
                        activeLogoChoice === 'gold'
                          ? 'bg-savecus-500/20 border-savecus-500 shadow-xl ring-2 ring-savecus-500/40'
                          : 'bg-charcoal-100 border-surface-border hover:border-slate-400 hover:bg-charcoal-50'
                      }`}
                    >
                      <div className="w-full h-11 flex items-center justify-center p-1 bg-charcoal-900/80 rounded-xl overflow-hidden">
                        <img
                          src="/savecus_logo_gold.png"
                          alt="Savecus Gold"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="leading-tight">
                        <div className="text-xs sm:text-sm font-black text-white">Savecus</div>
                        <div className="text-[10px] sm:text-xs text-amber-400 font-bold">Gold</div>
                      </div>
                      {activeLogoChoice === 'gold' && (
                        <div className="absolute top-1.5 right-1.5 bg-savecus-500 text-charcoal-950 rounded-full p-0.5 shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                        </div>
                      )}
                    </button>

                    {/* Card 3: Savecus Black */}
                    <button
                      type="button"
                      onClick={() => handleSelectLogoPreset('black')}
                      className={`relative p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all text-center border-2 min-h-[96px] active:scale-95 ${
                        activeLogoChoice === 'black'
                          ? 'bg-savecus-500/20 border-savecus-500 shadow-xl ring-2 ring-savecus-500/40'
                          : 'bg-charcoal-100 border-surface-border hover:border-slate-400 hover:bg-charcoal-50'
                      }`}
                    >
                      <div className="w-full h-11 flex items-center justify-center p-1 bg-charcoal-900/80 rounded-xl overflow-hidden">
                        <img
                          src="/savecus_logo.png"
                          alt="Savecus Black"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div className="leading-tight">
                        <div className="text-xs sm:text-sm font-black text-white">Savecus</div>
                        <div className="text-[10px] sm:text-xs text-slate-400 font-bold">Classic</div>
                      </div>
                      {activeLogoChoice === 'black' && (
                        <div className="absolute top-1.5 right-1.5 bg-savecus-500 text-charcoal-950 rounded-full p-0.5 shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Uploaded Custom Logo Card (if any exists) */}
                  {customLogoItem && (
                    <button
                      type="button"
                      onClick={handleSelectCustomLogo}
                      className={`w-full min-h-[64px] p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer border-2 transition-all active:scale-98 ${
                        activeLogoChoice === 'custom'
                          ? 'bg-savecus-500/20 border-savecus-500 shadow-xl ring-2 ring-savecus-500/40'
                          : 'bg-charcoal-100 border-surface-border hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-14 h-11 bg-charcoal-900 rounded-xl p-1 flex items-center justify-center shrink-0 overflow-hidden">
                          <img
                            src={customLogoItem.url}
                            alt="Custom Logo"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="text-xs sm:text-sm font-black text-white truncate">
                            {customLogoItem.original_filename || 'Custom Uploaded Logo'}
                          </p>
                          <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                            ✓ Transparent PNG (0 background)
                          </p>
                        </div>
                      </div>
                      {activeLogoChoice === 'custom' ? (
                        <span className="text-xs font-black px-2.5 py-1 rounded-full bg-savecus-500 text-charcoal-950 shrink-0 shadow">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300 font-bold px-2 py-1 bg-charcoal-200 rounded-lg hover:text-white shrink-0">
                          Tap to Use
                        </span>
                      )}
                    </button>
                  )}

                  {/* Big Tactile Upload Button for Custom Logo */}
                  <button
                    type="button"
                    disabled={isUploadingLogo}
                    onClick={() => logoUploadInputRef.current?.click()}
                    className="w-full min-h-[54px] py-3 px-4 rounded-2xl bg-savecus-500/10 hover:bg-savecus-500/20 border-2 border-dashed border-savecus-400 hover:border-savecus-300 text-sm font-black text-savecus-300 transition-all flex items-center justify-center gap-3 active:scale-98 shadow-sm"
                  >
                    {isUploadingLogo ? (
                      <div className="w-5 h-5 border-2 border-savecus-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 text-savecus-400 shrink-0" />
                    )}
                    <div className="text-left">
                      <div className="font-black text-white text-xs sm:text-sm">
                        {isUploadingLogo ? 'Processing & Making Transparent...' : '+ Upload Your Own Logo'}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-savecus-400 font-medium">
                        Auto-detects & makes background 100% transparent
                      </div>
                    </div>
                  </button>

                  {/* Upload feedback banner */}
                  {logoSuccessMsg && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{logoSuccessMsg}</span>
                    </div>
                  )}

                  {/* 5 Compass Buttons - High Contrast & 48px+ targets */}
                  <div className="space-y-2 pt-2 border-t border-surface-border">
                    <div className="flex items-center justify-between text-xs sm:text-sm text-slate-300">
                      <span className="font-bold">Position on Photo</span>
                      <span className="text-[11px] text-slate-400">or drag freely on photo</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => applyCompass('top-left')}
                        className={`min-h-[48px] py-2.5 px-3 rounded-xl border-2 text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                          isTopLeft
                            ? 'bg-savecus-500 text-charcoal-950 border-savecus-400 shadow-md ring-2 ring-savecus-500/40'
                            : 'bg-charcoal-100 hover:bg-charcoal-50 border-surface-border text-slate-200 hover:border-savecus-500'
                        }`}
                      >
                        <span>↖ Top-Left</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyCompass('top-right')}
                        className={`min-h-[48px] py-2.5 px-3 rounded-xl border-2 text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                          isTopRight
                            ? 'bg-savecus-500 text-charcoal-950 border-savecus-400 shadow-md ring-2 ring-savecus-500/40'
                            : 'bg-charcoal-100 hover:bg-charcoal-50 border-surface-border text-slate-200 hover:border-savecus-500'
                        }`}
                      >
                        <span>↗ Top-Right</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyCompass('bottom-left')}
                        className={`min-h-[48px] py-2.5 px-3 rounded-xl border-2 text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                          isBottomLeft
                            ? 'bg-savecus-500 text-charcoal-950 border-savecus-400 shadow-md ring-2 ring-savecus-500/40'
                            : 'bg-charcoal-100 hover:bg-charcoal-50 border-surface-border text-slate-200 hover:border-savecus-500'
                        }`}
                      >
                        <span>↙ Bottom-Left</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyCompass('bottom-right')}
                        className={`min-h-[48px] py-2.5 px-3 rounded-xl border-2 text-xs sm:text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                          isBottomRight
                            ? 'bg-savecus-500 text-charcoal-950 border-savecus-400 shadow-md ring-2 ring-savecus-500/40'
                            : 'bg-savecus-500/15 hover:bg-savecus-500/25 border-savecus-500/60 text-savecus-300'
                        }`}
                      >
                        <span>↘ Bottom-Right ★</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => applyCompass('center')}
                      className={`w-full min-h-[44px] py-2 px-3 rounded-xl border-2 text-xs sm:text-sm font-extrabold transition-all active:scale-95 ${
                        isCenter
                          ? 'bg-savecus-500 text-charcoal-950 border-savecus-400 shadow-md ring-2 ring-savecus-500/40'
                          : 'bg-charcoal-100 hover:bg-charcoal-50 border-surface-border text-slate-300'
                      }`}
                    >
                      ⏺ Center
                    </button>
                  </div>

                  {/* Size slider & Quick Presets */}
                  <div className="space-y-2 pt-2 border-t border-surface-border">
                    <div className="flex justify-between items-center text-xs sm:text-sm text-slate-300">
                      <span className="font-bold">Logo Size</span>
                      <span className="font-mono text-savecus-400 font-black text-sm">{Math.round(currentPlacement.scale * 100)}%</span>
                    </div>

                    {/* Quick preset buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleChangePlacement({ ...currentPlacement, scale: 0.15 })}
                        className={`min-h-[46px] py-2 px-2 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all ${
                          Math.abs(currentPlacement.scale - 0.15) < 0.02
                            ? 'bg-savecus-500 text-charcoal-950 border-savecus-400 font-black'
                            : 'bg-charcoal-100 text-slate-300 border-surface-border hover:border-slate-400'
                        }`}
                      >
                        Small 15%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChangePlacement({ ...currentPlacement, scale: 0.20 })}
                        className={`min-h-[46px] py-2 px-2 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all ${
                          Math.abs(currentPlacement.scale - 0.20) < 0.02
                            ? 'bg-savecus-500 text-charcoal-950 border-savecus-400 font-black'
                            : 'bg-savecus-500/15 text-savecus-300 border-savecus-500/50 hover:border-savecus-500'
                        }`}
                      >
                        Medium 20% ★
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChangePlacement({ ...currentPlacement, scale: 0.28 })}
                        className={`min-h-[46px] py-2 px-2 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all ${
                          Math.abs(currentPlacement.scale - 0.28) < 0.02
                            ? 'bg-savecus-500 text-charcoal-950 border-savecus-400 font-black'
                            : 'bg-charcoal-100 text-slate-300 border-surface-border hover:border-slate-400'
                        }`}
                      >
                        Large 28%
                      </button>
                    </div>

                    <input
                      type="range"
                      min="0.08"
                      max="0.60"
                      step="0.01"
                      value={currentPlacement.scale}
                      onChange={(e) => handleChangePlacement({ ...currentPlacement, scale: parseFloat(e.target.value) })}
                      className="w-full accent-savecus-500 h-3 bg-charcoal-900 rounded-full cursor-pointer mt-1"
                    />
                  </div>

                  {/* Per-Photo vs Batch: Apply This Logo Position to All Photos */}
                  <div className="pt-3 border-t border-surface-border space-y-2">
                    <button
                      type="button"
                      onClick={handleApplyPlacementToAll}
                      disabled={images.length <= 1 || isApplyingToAll}
                      className="w-full min-h-[52px] py-3 px-4 rounded-2xl bg-savecus-500/15 hover:bg-savecus-500/25 border-2 border-savecus-500/70 hover:border-savecus-400 text-xs sm:text-sm font-black text-savecus-300 hover:text-white transition-all flex items-center justify-center gap-2.5 active:scale-98 shadow-sm"
                    >
                      <span className="text-lg">☵</span>
                      <span>
                        {isApplyingToAll
                          ? 'Applying to all photos...'
                          : `[ ☵ Apply This Logo Position to All ${images.length} Photos ]`}
                      </span>
                    </button>
                    <p className="text-[11px] text-slate-400 text-center leading-tight">
                      By default, each photo keeps its own custom placement (independent portrait vs landscape). Tap above to sync across the entire batch.
                    </p>

                    {applyAllSuccessMsg && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-bold animate-fadeIn">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{applyAllSuccessMsg}</span>
                      </div>
                    )}
                  </div>

                  {/* On Mobile: Switch to Step 2 */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCanvasTool('mark-remove');
                      setMobileTab('watermark');
                    }}
                    className="lg:hidden w-full min-h-[48px] py-2.5 px-3 rounded-xl bg-charcoal-100 hover:bg-charcoal-50 border border-surface-border text-xs sm:text-sm font-bold text-slate-300 flex items-center justify-center gap-2"
                  >
                    <span>Erase Old Watermarks on Sarees? Tap Here ➔</span>
                  </button>
                </div>

                {/* 2. Old Watermark Erasure (Google Snapseed Style Healing Brush) */}
                <div className={`rounded-2xl bg-charcoal-200 border border-surface-border p-3.5 sm:p-4 space-y-3.5 ${mobileTab === 'watermark' ? 'block' : 'hidden lg:block'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                      <Eraser className="w-4 h-4" />
                      Snapseed Healing Tool
                    </span>
                    {currentMasks.length > 0 && (
                      <span className="text-[10px] sm:text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-black">
                        ✓ {currentMasks.length} Area{currentMasks.length > 1 ? 's' : ''} Healed
                      </span>
                    )}
                  </div>

                  {/* Zero-Blur Fabric Reassurance Card */}
                  <div className="p-3.5 rounded-xl bg-charcoal-100/90 border border-emerald-500/30 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-400">
                      <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>Zero-Blur Saree Fabric Protection</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      AI precisely erases stickers while reconstructing identical silk weave, zari pleats, and dual-tone borders. <strong className="text-emerald-400">Zero blur, zero smudge on fabric.</strong>
                    </p>
                  </div>

                  {/* Two Selection Modes: Healing Brush vs Box Select (50px+ targets) */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-slate-300">Choose Erase Tool:</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveMaskTool('brush')}
                        className={`min-h-[52px] p-2.5 rounded-2xl border-2 text-left transition-all active:scale-95 flex items-center gap-2.5 ${
                          activeMaskTool === 'brush'
                            ? 'bg-rose-600 text-white border-rose-400 shadow-lg ring-2 ring-rose-500/40 font-black'
                            : 'bg-charcoal-100 text-slate-300 border-surface-border hover:border-slate-400 font-bold'
                        }`}
                      >
                        <Paintbrush className="w-5 h-5 shrink-0 text-rose-200" />
                        <div className="leading-tight min-w-0">
                          <div className="text-xs sm:text-sm font-extrabold truncate">Healing Brush</div>
                          <div className={`text-[10px] truncate ${activeMaskTool === 'brush' ? 'text-rose-100 font-medium' : 'text-slate-400'}`}>
                            Snapseed Freeform ★
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveMaskTool('rect')}
                        className={`min-h-[52px] p-2.5 rounded-2xl border-2 text-left transition-all active:scale-95 flex items-center gap-2.5 ${
                          activeMaskTool === 'rect'
                            ? 'bg-rose-600 text-white border-rose-400 shadow-lg ring-2 ring-rose-500/40 font-black'
                            : 'bg-charcoal-100 text-slate-300 border-surface-border hover:border-slate-400 font-bold'
                        }`}
                      >
                        <Square className="w-5 h-5 shrink-0 text-rose-200" />
                        <div className="leading-tight min-w-0">
                          <div className="text-xs sm:text-sm font-extrabold truncate">Box Select</div>
                          <div className={`text-[10px] truncate ${activeMaskTool === 'rect' ? 'text-rose-100 font-medium' : 'text-slate-400'}`}>
                            Drag rectangle
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Brush Size Controls (Presets + Slider) */}
                  {activeMaskTool === 'brush' && (
                    <div className="space-y-2 p-3 bg-charcoal-100/90 rounded-2xl border border-surface-border">
                      <div className="flex items-center justify-between text-xs sm:text-sm text-slate-200">
                        <span className="font-bold flex items-center gap-1.5">
                          <Paintbrush className="w-3.5 h-3.5 text-rose-400" />
                          Brush Size
                        </span>
                        <div className="flex items-center gap-2">
                          <div
                            className="rounded-full bg-rose-500 border border-white/60 shrink-0"
                            style={{
                              width: `${Math.min(22, Math.max(6, Math.round(brushSize / 4)))}px`,
                              height: `${Math.min(22, Math.max(6, Math.round(brushSize / 4)))}px`,
                            }}
                          />
                          <span className="font-mono text-rose-400 font-black text-sm">{brushSize}px</span>
                        </div>
                      </div>

                      {/* 4 Quick Preset Buttons */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {BRUSH_PRESETS.map((p) => (
                          <button
                            key={p.size}
                            type="button"
                            onClick={() => setBrushSize(p.size)}
                            className={`min-h-[46px] py-2 px-1.5 rounded-xl text-xs font-black border-2 transition-all flex items-center justify-center text-center active:scale-95 ${
                              brushSize === p.size
                                ? 'bg-rose-600 text-white border-rose-400 shadow-md ring-2 ring-rose-500/40'
                                : 'bg-charcoal-200 text-slate-300 border-surface-border hover:border-rose-400/50 hover:text-white'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>

                      {/* Tactile Slider 10px to 120px */}
                      <div className="pt-1 flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400 font-bold shrink-0">10px</span>
                        <input
                          type="range"
                          min={10}
                          max={120}
                          step={1}
                          value={brushSize}
                          onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                          className="flex-1 accent-rose-500 h-2.5 bg-charcoal-900 rounded-full cursor-pointer"
                        />
                        <span className="text-[10px] font-mono text-slate-400 font-bold shrink-0">120px</span>
                      </div>
                    </div>
                  )}

                  {/* Auto-Heal On Release Toggle (Snapseed Style) */}
                  <label className="flex items-center justify-between p-3 rounded-xl bg-charcoal-100/90 border border-surface-border cursor-pointer hover:bg-charcoal-100 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">⚡</span>
                      <div>
                        <div className="text-xs sm:text-sm font-black text-white">Auto-Heal on Release</div>
                        <div className="text-[11px] text-slate-400 font-medium">Instantly erases as soon as finger lifts (Snapseed style)</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoHealOnRelease}
                      onChange={(e) => setAutoHealOnRelease(e.target.checked)}
                      className="w-5 h-5 accent-rose-500 rounded cursor-pointer shrink-0"
                    />
                  </label>

                  {/* Auto-Detect Watermark & Clear */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAutoDetect}
                      disabled={isDetecting || isHealing}
                      className="flex-1 min-h-[50px] py-2.5 px-3 rounded-xl bg-charcoal-100 hover:bg-charcoal-50 border-2 border-savecus-500/50 hover:border-savecus-500 text-xs sm:text-sm font-extrabold text-savecus-300 hover:text-white transition-colors flex items-center justify-center gap-2"
                    >
                      <Wand2 className={`w-4 h-4 text-savecus-400 ${isDetecting ? 'animate-spin' : ''}`} />
                      <span>{isDetecting ? 'Detecting watermark...' : '✨ Auto-Detect Watermark'}</span>
                    </button>

                    {currentMasks.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearCurrentMasks}
                        disabled={isHealing}
                        className="min-h-[50px] py-2.5 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs sm:text-sm font-bold text-rose-300 transition-colors"
                        title="Clear all drawn masks"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Immediate watermark erase on active photo if auto-heal is disabled */}
                  {!autoHealOnRelease && currentMasks.length > 0 && (
                    <button
                      type="button"
                      onClick={handleInpaintSinglePhoto}
                      disabled={isHealing}
                      className="w-full min-h-[52px] py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-rose-600/30 transition-all flex items-center justify-center gap-2.5 active:scale-98"
                    >
                      <Eraser className={`w-4 h-4 ${isHealing ? 'animate-spin' : ''}`} />
                      <span>{isHealing ? 'Erasing watermark (0 blur)...' : '⚡ Erase Watermark on This Photo Now'}</span>
                    </button>
                  )}

                  {inpaintSuccessMsg && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Watermark cleanly healed with zero blur!</span>
                    </div>
                  )}

                  {/* On Mobile: Switch back to Step 1 */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCanvasTool('move-logo');
                      setMobileTab('placement');
                    }}
                    className="lg:hidden w-full min-h-[48px] py-2.5 px-3 rounded-xl bg-charcoal-100 hover:bg-charcoal-50 border border-surface-border text-xs sm:text-sm font-bold text-slate-300 flex items-center justify-center gap-2"
                  >
                    <span>Back to Choose Logo & Position ➔</span>
                  </button>
                </div>
              </div>

              {/* 3. The Big Single Rebrand & Download Action - Sticky for Instant Access */}
              <div className="sticky bottom-0 bg-charcoal-300/95 backdrop-blur-md pt-3 pb-3 -mx-3 sm:-mx-5 px-3 sm:px-5 border-t border-surface-border shadow-2xl z-20 space-y-2.5 mt-auto">
                {isProcessingBatch ? (
                  <div className="space-y-2 bg-charcoal-200 p-3.5 rounded-2xl border border-savecus-500/30">
                    <div className="flex justify-between text-xs sm:text-sm text-savecus-400 font-black">
                      <span>Rebranding photos in batch ({batchProgress.current}/{batchProgress.total})...</span>
                      <span>{batchProgress.pct}%</span>
                    </div>
                    <div className="w-full h-3 bg-charcoal-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-savecus-500 rounded-full transition-all duration-300"
                        style={{ width: `${batchProgress.pct}%` }}
                      />
                    </div>
                  </div>
                ) : isCompleted ? (
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-black flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>All {images.length} photos rebranded successfully!</span>
                    </div>

                    {/* Massive Save to Computer Button */}
                    <button
                      onClick={handleDownloadZip}
                      className="w-full min-h-[56px] py-3.5 sm:py-4 px-4 rounded-2xl bg-savecus-500 hover:bg-savecus-400 text-charcoal-950 font-black text-sm sm:text-base shadow-2xl shadow-savecus-500/40 transition-all flex items-center justify-center gap-2.5 transform active:scale-95"
                    >
                      <HardDrive className="w-5 h-5 stroke-[2.5]" />
                      <span>SAVE ALL TO COMPUTER (ZIP)</span>
                    </button>
                    <p className="text-[11px] text-slate-400 text-center">
                      Downloads directly to your device Downloads folder.
                    </p>

                    {currentImage && (
                      <button
                        onClick={() => setCompareModalImage(currentImage)}
                        className="w-full min-h-[44px] py-2 px-3 rounded-xl bg-charcoal-200 hover:bg-charcoal-100 border border-surface-border text-xs sm:text-sm font-bold text-slate-200 flex items-center justify-center gap-2"
                      >
                        <SplitSquareVertical className="w-4 h-4 text-savecus-500" />
                        <span>Compare Before & After</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleRunBatch}
                    disabled={isProcessingBatch || images.length === 0}
                    className="w-full min-h-[56px] sm:min-h-[60px] py-3.5 sm:py-4 px-4 rounded-2xl bg-gradient-to-r from-savecus-500 to-amber-400 hover:from-savecus-400 hover:to-amber-300 text-charcoal-950 font-black text-sm sm:text-base shadow-2xl shadow-savecus-500/40 transition-all flex items-center justify-center gap-2.5 transform active:scale-95 disabled:opacity-40"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Rebrand All {images.length} Photos ✨</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Before / After Comparison Modal */}
      {compareModalImage && project && (
        <CompareModal
          image={compareModalImage}
          projectId={project.id}
          onClose={() => setCompareModalImage(null)}
        />
      )}
    </div>
  );
};
