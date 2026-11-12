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
  RotateCw,
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
  Square,
  SlidersHorizontal,
  Eye
} from 'lucide-react';
import { Project, ImageItem, LogoItem, LogoPlacement, MaskRegion } from '../../types';
import { StudioCanvas } from '../editor/StudioCanvas';
import { CompareModal } from '../processing/CompareModal';
import { PreviewSaveModal } from '../processing/PreviewSaveModal';
import { api } from '../../services/api';

const LS_PROJECT_KEY = 'savecus_active_project_id';
const LS_IMAGE_KEY = 'savecus_selected_image_id';
const LS_PLACEMENTS_KEY = 'savecus_placements';
const LS_LOGO_ON_KEY = 'savecus_logo_enabled';

const DEFAULT_PLACEMENT: LogoPlacement = {
  x: 0.50,
  y: 0.48,
  scale: 0.42,
  rotation: 0,
  opacity: 1.0,
  blend_mode: 'normal',
  shadow: true,
  shadow_blur: 10.0,
  shadow_opacity: 0.60,
  shadow_offset_x: 2.0,
  shadow_offset_y: 6.0,
  lock_aspect_ratio: true,
};

const LOGO_PRESETS: { key: string; src: string; name: string; sub: string; subClass: string; lightBg?: boolean }[] = [
  { key: 'junnu_mukka', src: '/junnu_mukka_logo.png', name: 'Junnu Mukka', sub: 'Sarees ★', subClass: 'text-savecus-400' },
  { key: 'black', src: '/savecus_logo.png', name: 'VSC Black', sub: 'No background', subClass: 'text-slate-400' },
  { key: 'gold', src: '/savecus_logo_gold.png', name: 'VSC Gold', sub: 'No background', subClass: 'text-amber-400' },
  { key: 'red', src: '/red_savecus_logo.png', name: 'VSC Red', sub: 'No background', subClass: 'text-rose-400' },
  { key: 'blue', src: '/blue_savecus_logo.png', name: 'VSC Royal Blue', sub: 'No background', subClass: 'text-blue-400' },
  { key: 'orange', src: '/orange_savecus_logo.png', name: 'VSC Orange', sub: 'No background', subClass: 'text-orange-400' },
  { key: 'white_bg', src: '/white_bg_savecus_logo.png', name: 'VSC on White', sub: 'Covers what is behind', subClass: 'text-emerald-400', lightBg: true },
  { key: 'red_bg', src: '/red_bg_savecus_logo.png', name: 'VSC Red on White', sub: 'Covers what is behind', subClass: 'text-emerald-400', lightBg: true },
];

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
  const [activeCanvasTool, setActiveCanvasTool] = useState<'view' | 'move-logo' | 'mark-remove'>('view');

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
  const [activeLogoChoice, setActiveLogoChoice] = useState<string>('junnu_mukka');
  const [customLogoItem, setCustomLogoItem] = useState<LogoItem | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoSuccessMsg, setLogoSuccessMsg] = useState<string | null>(null);
  const [isUpdatingSingle, setIsUpdatingSingle] = useState(false);
  const [singleUpdateSuccess, setSingleUpdateSuccess] = useState<string | null>(null);
  const [isRotating, setIsRotating] = useState(false);

  // Mobile: options drawer + preview/save screen + unsaved-change tracking
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  // Logo is OFF until the user picks one (so nothing covers the photo by default)
  const [logoEnabled, setLogoEnabled] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const lastTapRef = useRef<{ id: string; t: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoUploadInputRef = useRef<HTMLInputElement>(null);

  // Initialize or fetch the active batch project on startup
  useEffect(() => {
    const initProject = async () => {
      try {
        setLoading(true);
        const projects = await api.listProjects();
        if (projects.length > 0) {
          // 1. Try to find saved project from localStorage
          const savedProjectId = localStorage.getItem(LS_PROJECT_KEY);
          let targetProject = projects.find((p) => p.id === savedProjectId);
          // If saved project does not exist or has 0 images, prefer latest project with images
          if (!targetProject || targetProject.images_count === 0) {
            const projectWithImages = projects.find((p) => p.images_count > 0);
            targetProject = projectWithImages || targetProject || projects[0];
          }

          const detailed = await api.getProject(targetProject.id);
          setProject(detailed);
          try {
            const saved = localStorage.getItem(`${LS_LOGO_ON_KEY}_${detailed.id}`);
            if (saved !== null) setLogoEnabled(saved === '1');
            else setLogoEnabled((detailed.images || []).some((i) => i.status === 'completed'));
          } catch {}
          try {
            localStorage.setItem(LS_PROJECT_KEY, detailed.id);
          } catch {}

          if (detailed.images && detailed.images.length > 0) {
            // Restore saved image ID or default to first image
            const savedImageId = localStorage.getItem(LS_IMAGE_KEY);
            const foundImage = detailed.images.find((i) => i.id === savedImageId);
            const chosenId = foundImage ? foundImage.id : detailed.images[0].id;
            setSelectedImageId(chosenId);
            try {
              localStorage.setItem(LS_IMAGE_KEY, chosenId);
            } catch {}

            // Restore cached placements from localStorage
            let cachedPlacements: Record<string, LogoPlacement> = {};
            try {
              const raw = localStorage.getItem(`${LS_PLACEMENTS_KEY}_${detailed.id}`);
              if (raw) cachedPlacements = JSON.parse(raw);
            } catch {}

            const initialPlacements: Record<string, LogoPlacement> = {};
            const initialMasks: Record<string, MaskRegion[]> = {};
            detailed.images.forEach((img) => {
              initialPlacements[img.id] = cachedPlacements[img.id] || img.custom_settings || detailed.global_settings || DEFAULT_PLACEMENT;
              initialMasks[img.id] = img.mask_data || [];
            });
            setPhotoPlacements(initialPlacements);
            setPhotoMasks(initialMasks);
            if (detailed.images.some((i) => i.status === 'completed')) {
              setIsCompleted(true);
            }
          }
          if (detailed.logo) {
            const orig = (detailed.logo.original_filename || '').toLowerCase();
            const url = (detailed.logo.url || '').toLowerCase();
            const found = [...LOGO_PRESETS]
              .sort((x, y) => y.key.length - x.key.length)
              .find((p) => p.key !== 'junnu_mukka' && url.includes(`savecus_${p.key}_`));
            if (orig.includes('junnu') || url.includes('junnu')) {
              setActiveLogoChoice('junnu_mukka');
            } else if (found) {
              setActiveLogoChoice(found.key);
            } else {
              setActiveLogoChoice('custom');
              setCustomLogoItem(detailed.logo);
            }
          }
        } else {
          const fresh = await api.createProject('My Photos Batch', 'Auto-created quick rebrand batch');
          const detailed = await api.getProject(fresh.id);
          setProject(detailed);
          try {
            localStorage.setItem(LS_PROJECT_KEY, detailed.id);
          } catch {}
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
  const currentImageIndex = images.findIndex((i) => i.id === currentImage?.id);

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

  // Select an image and persist to localStorage
  useEffect(() => {
    if (!project) return;
    try {
      localStorage.setItem(`${LS_LOGO_ON_KEY}_${project.id}`, logoEnabled ? '1' : '0');
    } catch {}
  }, [logoEnabled, project?.id]);

  // Attach the logo on/off choice to a placement before saving it to the server
  const withLogoFlag = (pl: LogoPlacement): LogoPlacement => ({ ...pl, show_logo: logoEnabled });

  const handleNoLogo = () => {
    setLogoEnabled(false);
    setDirty(true);
    setActiveCanvasTool((t) => (t === 'move-logo' ? 'view' : t));
  };

  const handleSelectImage = (imgId: string) => {
    setSelectedImageId(imgId);
    try {
      localStorage.setItem(LS_IMAGE_KEY, imgId);
    } catch {}
  };

  // Update placement for current photo only (persisted in state & localStorage)
  const handleChangePlacement = (newPlacement: LogoPlacement) => {
    if (!currentImage || !project) return;
    setDirty(true);
    setPhotoPlacements((prev) => {
      const updated = {
        ...prev,
        [currentImage.id]: newPlacement,
      };
      try {
        localStorage.setItem(`${LS_PLACEMENTS_KEY}_${project.id}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Remove individual photo from batch
  const handleDeleteImage = async (imageId: string) => {
    if (!project) return;
    try {
      await api.deleteImage(project.id, imageId);
      const remaining = images.filter((img) => img.id !== imageId);
      setProject((prev) => (prev ? { ...prev, images: remaining } : prev));

      // Clean up local placements and masks
      setPhotoPlacements((prev) => {
        const copy = { ...prev };
        delete copy[imageId];
        try {
          localStorage.setItem(`${LS_PLACEMENTS_KEY}_${project.id}`, JSON.stringify(copy));
        } catch {}
        return copy;
      });
      setPhotoMasks((prev) => {
        const copy = { ...prev };
        delete copy[imageId];
        return copy;
      });

      // If active photo was deleted, select next or first
      if (selectedImageId === imageId) {
        const nextId = remaining[0]?.id || null;
        setSelectedImageId(nextId);
        try {
          if (nextId) localStorage.setItem(LS_IMAGE_KEY, nextId);
          else localStorage.removeItem(LS_IMAGE_KEY);
        } catch {}
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to remove image');
    }
  };

  // Rotate current photo 90 degrees clockwise (swaps portrait/landscape)
  const handleRotateCurrentPhoto = async () => {
    if (!project || !currentImage || isRotating) return;
    try {
      setIsRotating(true);
      setDirty(true);
      setErrorMessage(null);
      const rotated = await api.rotateImage(project.id, currentImage.id, 90);
      const cacheBusted: ImageItem = {
        ...rotated,
        url: `${rotated.url.split('?')[0]}?t=${Date.now()}`,
        thumbnail_url: `${rotated.thumbnail_url.split('?')[0]}?t=${Date.now()}`,
        processed_url: rotated.processed_url
          ? `${rotated.processed_url.split('?')[0]}?t=${Date.now()}`
          : rotated.processed_url,
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

      // Auto-adapt scale when switching between vertical and horizontal
      const isNowVertical = rotated.height > rotated.width;
      const cur = photoPlacements[currentImage.id] || currentPlacement;
      const adaptedScale = isNowVertical ? 0.46 : 0.36;
      handleChangePlacement({ ...cur, scale: adaptedScale });

      const idx = images.findIndex((img) => img.id === currentImage.id);
      setSingleUpdateSuccess(`✓ Photo #${idx + 1} rotated 90° (${isNowVertical ? 'Vertical 9:16' : 'Horizontal'})`);
      setTimeout(() => setSingleUpdateSuccess(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to rotate image');
    } finally {
      setIsRotating(false);
    }
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
        handleSelectImage(updated.images[0].id);
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
      setDirty(true);
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
      try {
        localStorage.setItem(LS_PROJECT_KEY, detailed.id);
        localStorage.removeItem(LS_IMAGE_KEY);
      } catch {}
      setSelectedImageId(null);
      setPhotoPlacements({});
      setPhotoMasks({});
      setPhotoHistory({});
      setLogoEnabled(false);
      setActiveCanvasTool('view');
      setIsCompleted(false);
      setErrorMessage(null);
    } finally {
      setLoading(false);
    }
  };

  // Switch Preset Logo (Junnu Mukka Sarees, Savecus Gold, Savecus Black)
  const handleSelectLogoPreset = async (variant: string) => {
    if (!project) return;
    try {
      setErrorMessage(null);
      setActiveLogoChoice(variant);
      setLogoEnabled(true);
      setActiveCanvasTool('move-logo');
      setDirty(true);
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
      setLogoEnabled(true);
      setActiveCanvasTool('move-logo');
      setDirty(true);
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
      setLogoEnabled(true);
      setActiveCanvasTool('move-logo');
      setDirty(true);
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
      setDirty(true);
      setErrorMessage(null);

      // 1. Update local state for all photos
      const updated: Record<string, LogoPlacement> = {};
      images.forEach((img) => {
        updated[img.id] = { ...placementToCopy };
      });
      setPhotoPlacements(updated);

      // 2. Persist global_settings to project
      await api.updateProject(project.id, { global_settings: withLogoFlag(placementToCopy) });

      // 3. Persist custom_settings for all images on backend
      await Promise.all(
        images.map((img) =>
          api.updateImageConfig(project.id, img.id, { custom_settings: withLogoFlag(placementToCopy) })
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
      setDirty(true);
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

  // Download single active photo
  const handleDownloadSinglePhoto = () => {
    if (!currentImage) return;
    const url = currentImage.processed_url || currentImage.url;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rebranded_${currentImage.original_filename || 'saree.jpg'}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Update/Save single photo rebrand
  const handleUpdateSinglePhoto = async () => {
    if (!project || !currentImage || isUpdatingSingle) return;
    try {
      setIsUpdatingSingle(true);
      setErrorMessage(null);
      const placementToSave = photoPlacements[currentImage.id] || currentPlacement;
      const masksToSave = photoMasks[currentImage.id] || [];

      // 1. Save config
      await api.updateImageConfig(project.id, currentImage.id, {
        custom_settings: withLogoFlag(placementToSave),
        mask_data: masksToSave,
      });

      // 2. Apply logo to this photo
      const updated = await api.applyLogo(project.id, currentImage.id);
      const cacheBusted: ImageItem = {
        ...updated,
        processed_url: updated.processed_url
          ? `${updated.processed_url.split('?')[0]}?t=${Date.now()}`
          : updated.processed_url,
        thumbnail_url: updated.thumbnail_url
          ? `${updated.thumbnail_url.split('?')[0]}?t=${Date.now()}`
          : updated.thumbnail_url,
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

      const idx = images.findIndex((img) => img.id === currentImage.id);
      setSingleUpdateSuccess(`✓ Photo #${idx + 1} updated successfully!`);
      setTimeout(() => setSingleUpdateSuccess(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update photo');
    } finally {
      setIsUpdatingSingle(false);
    }
  };

  const handlePreviewSingle = async () => {
    if (!currentImage) return;
    await handleUpdateSinglePhoto();
    setPreviewIndex(currentImageIndex);
    setPreviewOpen(true);
  };

  // Compass Presets for current photo
  const applyCompass = (pos: 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right') => {
    let x = 0.5;
    let y = 0.48;
    const m = 0.12;
    if (pos === 'top-left') { x = m; y = m; }
    else if (pos === 'top-right') { x = 1 - m; y = m; }
    else if (pos === 'bottom-left') { x = m; y = 1 - m; }
    else if (pos === 'bottom-right') { x = 1 - m; y = 1 - m; }
    else { x = 0.5; y = 0.48; }

    handleChangePlacement({ ...currentPlacement, x, y });
    setLogoEnabled(true);
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
            custom_settings: withLogoFlag(photoPlacements[img.id] || currentPlacement),
            mask_data: photoMasks[img.id] || [],
          })
        )
      );
      await api.updateProject(project.id, { global_settings: withLogoFlag(currentPlacement) });

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
            setDirty(false);
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

  const needsProcessing = !isCompleted || dirty || images.some((i) => !i.processed_url);

  const openPreview = () => {
    setDrawerOpen(false);
    setPreviewIndex(null);
    setPreviewOpen(true);
    if (needsProcessing && !isProcessingBatch) handleRunBatch();
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
      <header className="h-14 sm:h-16 border-b border-surface-border bg-charcoal-400 px-3 sm:px-6 flex items-center justify-between shrink-0 z-30">
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

          {images.length > 0 && (
            <button
              onClick={openPreview}
              className="hidden sm:flex min-h-[44px] items-center gap-2 px-4 py-2.5 rounded-xl bg-savecus-500 hover:bg-savecus-400 text-charcoal-950 font-black text-sm shadow-lg shadow-savecus-500/30 transition-all active:scale-95"
            >
              <Eye className="w-4 h-4 stroke-[2.5]" />
              <span>Preview & Save</span>
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
                onClick={() => setActiveCanvasTool('view')}
                className={`flex-1 sm:flex-initial min-h-[50px] flex items-center justify-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all active:scale-95 ${
                  activeCanvasTool === 'view'
                    ? 'bg-sky-600 text-white shadow-lg ring-2 ring-sky-500/40 border border-sky-400'
                    : 'bg-charcoal-300 text-slate-300 hover:text-white border border-surface-border'
                }`}
              >
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="truncate">View</span>
              </button>

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
                <span className="truncate"><span className="sm:hidden">Logo</span><span className="hidden sm:inline">1. Position Logo</span></span>
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
                <span className="truncate"><span className="sm:hidden">Erase</span><span className="hidden sm:inline">2. Erase Watermark</span></span>
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
                  className="hidden sm:flex min-h-[46px] px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold text-rose-300 hover:text-white bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 transition-all flex items-center gap-1.5 active:scale-95"
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
            <div className="flex flex-col flex-1 min-w-0 min-h-0 bg-charcoal-900 relative overflow-hidden w-full">
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
                    editorMode={activeCanvasTool === 'mark-remove' ? 'mask' : activeCanvasTool === 'move-logo' ? 'placement' : 'view'}
                    showLogo={logoEnabled && activeCanvasTool === 'move-logo'}
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

              {/* Single Photo Action Bar (Tactile & Senior Friendly) */}
              {currentImage && (
                <div className="bg-charcoal-800 border-t border-surface-border px-3 py-2 flex items-center justify-between gap-2 shrink-0 z-10 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs sm:text-sm font-black text-white px-2.5 py-1 rounded-lg bg-charcoal-700 border border-surface-border shrink-0 flex items-center gap-1.5 shadow">
                      <span className="w-2 h-2 rounded-full bg-savecus-500 animate-pulse" />
                      <span>Photo #{currentImageIndex + 1} of {images.length}</span>
                    </span>
                    <span className="text-[11px] font-bold text-savecus-300 hidden sm:inline truncate">
                      {currentImage.height > currentImage.width ? '↕ Vertical 9:16' : '↔ Horizontal'} • {currentImage.width}×{currentImage.height}px
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                    {/* Rotate 90 degrees */}
                    <button
                      type="button"
                      disabled={isRotating}
                      onClick={handleRotateCurrentPhoto}
                      className="min-h-[42px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-charcoal-700 hover:bg-charcoal-600 border border-surface-border text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
                      title="Rotate this photo 90° clockwise (swaps portrait/landscape)"
                    >
                      {isRotating ? (
                        <div className="w-3.5 h-3.5 border-2 border-savecus-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <RotateCw className="w-3.5 h-3.5 text-savecus-400" />
                      )}
                      <span className="hidden sm:inline">Rotate 90° ↻</span>
                    </button>

                    {/* Preview this photo as it will be saved */}
                    <button
                      type="button"
                      disabled={isUpdatingSingle}
                      onClick={handlePreviewSingle}
                      className="min-h-[42px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-charcoal-700 hover:bg-charcoal-600 border border-surface-border text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
                      title="Apply and preview this photo exactly as it will be saved"
                    >
                      <Eye className="w-3.5 h-3.5 text-sky-400" />
                      <span>Preview</span>
                    </button>

                    {/* Update / Save this photo */}
                    <button
                      type="button"
                      disabled={isUpdatingSingle}
                      onClick={handleUpdateSinglePhoto}
                      className="min-h-[42px] px-3 sm:px-4 py-1.5 rounded-xl bg-savecus-500 hover:bg-savecus-400 text-charcoal-950 text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                      title="Apply new logo position or healing to this photo only"
                    >
                      {isUpdatingSingle ? (
                        <div className="w-3.5 h-3.5 border-2 border-charcoal-950 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 fill-current" />
                      )}
                      <span><span className="sm:hidden">Update</span><span className="hidden sm:inline">Update Photo #{currentImageIndex + 1}</span></span>
                    </button>

                    {/* Reset this photo */}
                    <button
                      type="button"
                      onClick={handleResetPhoto}
                      className="hidden sm:flex min-h-[42px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-charcoal-700 hover:bg-rose-900/40 border border-surface-border hover:border-rose-500/50 text-xs font-bold text-slate-300 hover:text-rose-300 flex items-center gap-1 active:scale-95 transition-all"
                      title="Reset only this photo back to original"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                      <span className="hidden sm:inline">Reset</span>
                    </button>

                    {/* Delete / Remove this photo */}
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Remove Photo #${currentImageIndex + 1} from this batch?`)) {
                          handleDeleteImage(currentImage.id);
                        }
                      }}
                      className="min-h-[42px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-charcoal-700 hover:bg-rose-900/50 border border-surface-border hover:border-rose-500/50 text-xs font-bold text-slate-300 hover:text-rose-300 flex items-center gap-1 active:scale-95 transition-all"
                      title="Remove this photo from the batch"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span className="hidden sm:inline">Remove</span>
                    </button>

                    {/* Download this photo */}
                    <button
                      type="button"
                      onClick={handleDownloadSinglePhoto}
                      className="hidden sm:flex min-h-[42px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-charcoal-700 hover:bg-charcoal-600 border border-surface-border text-xs font-bold text-slate-200 items-center gap-1 active:scale-95 transition-all"
                      title="Download this single photo directly"
                    >
                      <Download className="w-3.5 h-3.5 text-savecus-400" />
                      <span className="hidden sm:inline">Download</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Single Photo Feedback Banner */}
              {singleUpdateSuccess && (
                <div className="bg-emerald-500 text-charcoal-950 font-black text-xs sm:text-sm px-4 py-2 text-center animate-fadeIn shadow">
                  {singleUpdateSuccess}
                </div>
              )}

              {/* Bottom Thumbnail Strip with Serial Numbers and X Delete Buttons */}
              <div className="h-20 sm:h-24 border-t border-surface-border bg-charcoal-400 px-3 sm:px-4 flex items-center justify-between shrink-0 gap-2 sm:gap-3 w-full">
                <div className="flex items-center gap-2 overflow-x-auto py-1 min-w-0 flex-1">
                  {images.map((img, idx) => {
                    const isVertical = img.height > img.width;
                    const isSelected = img.id === currentImage?.id;
                    return (
                      <div
                        key={img.id}
                        onClick={() => {
                          const now = Date.now();
                          const last = lastTapRef.current;
                          if (last && last.id === img.id && now - last.t < 400) {
                            lastTapRef.current = null;
                            if (window.confirm(`Do you really want to delete Photo #${idx + 1}?`)) {
                              handleDeleteImage(img.id);
                            }
                            return;
                          }
                          lastTapRef.current = { id: img.id, t: now };
                          handleSelectImage(img.id);
                        }}
                        className={`relative w-20 h-16 sm:w-24 sm:h-18 rounded-xl overflow-hidden shrink-0 border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-savecus-500 scale-105 shadow-xl ring-2 ring-savecus-500/50 z-10'
                            : 'border-surface-border opacity-75 hover:opacity-100 hover:border-slate-400'
                        }`}
                      >
                        <img
                          src={img.processed_url || img.thumbnail_url}
                          alt={`Photo #${idx + 1}`}
                          className="w-full h-full object-cover"
                        />

                        {/* 1. Bold High-Contrast Serial Number Badge */}
                        <div
                          className={`absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[11px] sm:text-xs font-black shadow-md z-10 flex items-center justify-center leading-none ${
                            isSelected
                              ? 'bg-savecus-500 text-charcoal-950 ring-1 ring-charcoal-950 font-black'
                              : 'bg-charcoal-950/90 text-white border border-white/20'
                          }`}
                        >
                          #{idx + 1}
                        </div>

                        {/* 3. Orientation Indicator */}
                        <span className="absolute bottom-1 left-1 bg-charcoal-950/80 text-[8px] sm:text-[9px] text-savecus-300 px-1 rounded font-bold">
                          {isVertical ? '↕ 9:16' : '↔ Wide'}
                        </span>

                        {/* 4. Completed Status Badge */}
                        {img.status === 'completed' && (
                          <div className="absolute bottom-1 right-1 bg-emerald-500 text-charcoal-950 rounded-full p-0.5 shadow-md">
                            <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <span className="hidden sm:block text-[10px] text-slate-400 shrink-0 max-w-[90px] leading-tight">Double-tap a photo to remove it</span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[48px] min-w-[48px] flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-charcoal-200 hover:bg-charcoal-100 border border-surface-border text-xs sm:text-sm font-bold text-slate-200 shrink-0 active:scale-95"
                  aria-label="Add photos"
                >
                  <Plus className="w-5 h-5 text-savecus-500" />
                  <span className="hidden sm:inline">Add Photos</span>
                </button>
              </div>

              {/* Mobile bottom action bar: Tools drawer + Preview & Save */}
              <div
                className="sm:hidden bg-charcoal-400 border-t border-surface-border px-3 pt-2 flex gap-2 shrink-0"
                style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
              >
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  className="flex-1 min-h-[52px] rounded-2xl bg-charcoal-200 border border-surface-border text-white font-black text-sm flex items-center justify-center gap-2 active:scale-95"
                >
                  <SlidersHorizontal className="w-5 h-5 text-savecus-400" />
                  Options
                </button>
                <button
                  type="button"
                  onClick={openPreview}
                  className="flex-[1.4] min-h-[52px] rounded-2xl bg-savecus-500 text-charcoal-950 font-black text-sm flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-savecus-500/30"
                >
                  <Eye className="w-5 h-5" />
                  Preview & Save
                </button>
              </div>
            </div>

            {/* Right Side / Mobile Bottom Control Panel */}
            {/* Backdrop (mobile/tablet drawer) */}
            {drawerOpen && (
              <div
                className="lg:hidden fixed inset-0 z-40 bg-black/60"
                onClick={() => setDrawerOpen(false)}
              />
            )}
            <div
              className={`fixed inset-y-0 right-0 z-50 w-[88%] max-w-sm lg:static lg:z-auto lg:w-96 lg:max-w-none min-w-0 border-l border-surface-border bg-charcoal-300 p-3 sm:p-5 flex flex-col overflow-y-auto overscroll-contain shrink-0 space-y-4 transition-transform duration-200 ${
                drawerOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
              }`}
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {/* Drawer header (mobile/tablet only) */}
              <div className="lg:hidden flex items-center justify-between shrink-0">
                <span className="font-black text-base">Options</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="w-11 h-11 rounded-xl bg-charcoal-200 border border-surface-border flex items-center justify-center active:scale-95"
                  aria-label="Close options"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
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

                  {/* Logo presets (tap to choose) */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleNoLogo}
                      className={`col-span-2 min-h-[56px] rounded-2xl border-2 font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all ${
                        !logoEnabled
                          ? 'bg-savecus-500/20 border-savecus-500 ring-2 ring-savecus-500/40 text-white'
                          : 'bg-charcoal-100 border-surface-border text-slate-300'
                      }`}
                    >
                      <X className="w-4 h-4" />
                      No Logo (just the photo)
                      {!logoEnabled && <Check className="w-4 h-4 text-savecus-400" />}
                    </button>
                    {LOGO_PRESETS.map((p) => {
                      const active = logoEnabled && activeLogoChoice === p.key;
                      return (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => handleSelectLogoPreset(p.key)}
                          className={`relative p-2 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-center border-2 min-h-[96px] active:scale-95 transition-all ${
                            active
                              ? 'bg-savecus-500/20 border-savecus-500 shadow-xl ring-2 ring-savecus-500/40'
                              : 'bg-charcoal-100 border-surface-border hover:border-slate-400'
                          }`}
                        >
                          <div className={`w-full h-12 flex items-center justify-center p-1 rounded-xl overflow-hidden ${p.lightBg ? 'bg-slate-500' : 'bg-charcoal-900/80'}`}>
                            <img src={p.src} alt={p.name} className="max-h-full max-w-full object-contain" />
                          </div>
                          <div className="leading-tight">
                            <div className="text-xs font-black text-white">{p.name}</div>
                            <div className={`text-[10px] font-bold ${p.subClass}`}>{p.sub}</div>
                          </div>
                          {active && (
                            <div className="absolute top-1.5 right-1.5 bg-savecus-500 text-charcoal-950 rounded-full p-0.5 shadow-md">
                              <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Uploaded Custom Logo Card (if any exists) */}
                  {customLogoItem && (
                    <button
                      type="button"
                      onClick={handleSelectCustomLogo}
                      className={`w-full min-h-[64px] p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer border-2 transition-all active:scale-98 ${
                        logoEnabled && activeLogoChoice === 'custom'
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
                      {logoEnabled && activeLogoChoice === 'custom' ? (
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

                  {/* Photo Orientation & Rotate 90° Clockwise */}
                  {currentImage && (
                    <div className="pt-2 border-t border-surface-border">
                      <div className="flex items-center justify-between text-xs sm:text-sm text-slate-300 mb-2">
                        <span className="font-bold flex items-center gap-1.5 text-white">
                          <RotateCw className="w-3.5 h-3.5 text-savecus-400" />
                          Photo Orientation
                        </span>
                        <span className="px-2.5 py-1 rounded-md bg-charcoal-100 text-[11px] font-black text-savecus-300 border border-surface-border">
                          {currentImage.height > currentImage.width ? '↕ Vertical 9:16' : '↔ Horizontal'}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={isRotating}
                        onClick={handleRotateCurrentPhoto}
                        className="w-full min-h-[46px] py-2.5 px-3 rounded-xl bg-charcoal-100 hover:bg-charcoal-50 border-2 border-surface-border hover:border-savecus-400 text-xs sm:text-sm font-bold text-slate-200 hover:text-white flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
                        title="Rotate this photo 90° clockwise (swaps portrait/landscape)"
                      >
                        {isRotating ? (
                          <div className="w-4 h-4 border-2 border-savecus-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <RotateCw className="w-4 h-4 text-savecus-400" />
                        )}
                        <span>🔄 Rotate Photo 90° Clockwise (Swap Orientation)</span>
                      </button>
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
                      className={`w-full min-h-[48px] py-2.5 px-3 rounded-xl border-2 text-xs sm:text-sm font-extrabold transition-all active:scale-95 flex items-center justify-center gap-2 ${
                        isCenter
                          ? 'bg-savecus-500 text-charcoal-950 border-savecus-400 shadow-md ring-2 ring-savecus-500/40 font-black'
                          : 'bg-savecus-500/15 hover:bg-savecus-500/25 border-savecus-500/50 text-savecus-300'
                      }`}
                    >
                      <span className="text-base">⏺</span>
                      <span>Center (Over Watermark) ★</span>
                    </button>
                  </div>

                  {/* Size slider & Quick Presets */}
                  <div className="space-y-2 pt-2 border-t border-surface-border">
                    <div className="flex justify-between items-center text-xs sm:text-sm text-slate-300">
                      <span className="font-bold">Logo Size</span>
                      <span className="font-mono text-savecus-400 font-black text-sm">{Math.round(currentPlacement.scale * 100)}%</span>
                    </div>

                    {/* Quick preset buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleChangePlacement({ ...currentPlacement, scale: 0.30 })}
                        className={`min-h-[44px] py-2 px-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                          Math.abs(currentPlacement.scale - 0.30) < 0.02
                            ? 'bg-savecus-500 text-charcoal-950 border-savecus-400 font-black'
                            : 'bg-charcoal-100 text-slate-300 border-surface-border hover:border-slate-400'
                        }`}
                      >
                        30% Small
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChangePlacement({ ...currentPlacement, scale: 0.36 })}
                        className={`min-h-[44px] py-2 px-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                          Math.abs(currentPlacement.scale - 0.36) < 0.02
                            ? 'bg-savecus-500 text-charcoal-950 border-savecus-400 font-black'
                            : 'bg-charcoal-100 text-slate-300 border-surface-border hover:border-slate-400'
                        }`}
                      >
                        36% Square ★
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChangePlacement({ ...currentPlacement, scale: 0.46 })}
                        className={`min-h-[44px] py-2 px-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                          Math.abs(currentPlacement.scale - 0.46) < 0.02
                            ? 'bg-savecus-500 text-charcoal-950 border-savecus-400 font-black'
                            : 'bg-savecus-500/15 text-savecus-300 border-savecus-500/50 hover:border-savecus-500'
                        }`}
                      >
                        46% 9:16 Tall ★
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChangePlacement({ ...currentPlacement, scale: 0.52 })}
                        className={`min-h-[44px] py-2 px-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                          Math.abs(currentPlacement.scale - 0.52) < 0.02
                            ? 'bg-savecus-500 text-charcoal-950 border-savecus-400 font-black'
                            : 'bg-charcoal-100 text-slate-300 border-surface-border hover:border-slate-400'
                        }`}
                      >
                        52% Large
                      </button>
                    </div>

                    <input
                      type="range"
                      min="0.10"
                      max="0.65"
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

              {/* Preview & Save everything */}
              <div className="sticky bottom-0 bg-charcoal-300/95 backdrop-blur-md pt-3 pb-3 -mx-3 sm:-mx-5 px-3 sm:px-5 border-t border-surface-border shadow-2xl z-20 space-y-2.5 mt-auto">
                <button
                  onClick={openPreview}
                  disabled={isProcessingBatch || images.length === 0}
                  className="w-full min-h-[56px] py-3.5 px-4 rounded-2xl bg-gradient-to-r from-savecus-500 to-amber-400 text-charcoal-950 font-black text-sm sm:text-base shadow-2xl shadow-savecus-500/40 transition-all flex items-center justify-center gap-2.5 active:scale-95 disabled:opacity-40"
                >
                  <Eye className="w-5 h-5" />
                  <span>{isProcessingBatch ? `Applying… ${batchProgress.pct}%` : `Preview & Save All ${images.length} Photos`}</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleResetPhoto}
                    disabled={isHealing}
                    className="min-h-[46px] rounded-xl bg-charcoal-200 border border-surface-border text-xs font-bold text-rose-300 flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <RotateCcw className="w-4 h-4" /> Reset this photo
                  </button>
                  <button
                    onClick={handleDownloadSinglePhoto}
                    className="min-h-[46px] rounded-xl bg-charcoal-200 border border-surface-border text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Download className="w-4 h-4 text-savecus-400" /> Save this photo
                  </button>
                </div>
                {isCompleted && currentImage && (
                  <button
                    onClick={() => setCompareModalImage(currentImage)}
                    className="w-full min-h-[44px] rounded-xl bg-charcoal-200 border border-surface-border text-xs font-bold text-slate-200 flex items-center justify-center gap-2"
                  >
                    <SplitSquareVertical className="w-4 h-4 text-savecus-500" />
                    Compare Before & After
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {previewOpen && project && (
        <PreviewSaveModal
          images={images}
          projectId={project.id}
          projectName={project.name || 'photos'}
          isProcessing={isProcessingBatch}
          progress={batchProgress}
          needsProcessing={previewIndex !== null ? false : needsProcessing}
          startIndex={previewIndex}
          onEdit={(idx) => {
            const img = images[idx];
            setPreviewOpen(false);
            if (img) handleSelectImage(img.id);
          }}
          onReprocess={handleRunBatch}
          onClose={() => {
            setPreviewOpen(false);
            setPreviewIndex(null);
          }}
        />
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
