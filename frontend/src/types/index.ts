export interface LogoPlacement {
  x: number; // 0 to 1
  y: number; // 0 to 1
  scale: number; // 0.01 to 1.0 (relative to image width)
  rotation: number; // -360 to 360
  opacity: number; // 0 to 1
  blend_mode: 'normal' | 'multiply' | 'screen' | 'overlay';
  shadow: boolean;
  shadow_blur: number;
  shadow_opacity: number;
  shadow_offset_x: number;
  shadow_offset_y: number;
  lock_aspect_ratio: boolean;
}

export interface MaskRegion {
  id: string;
  type: 'rect' | 'brush' | 'polygon';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  points?: number[];
  stroke_width?: number;
}

export interface ImageItem {
  id: string;
  project_id: string;
  original_filename: string;
  url: string;
  thumbnail_url: string;
  width: number;
  height: number;
  file_size: number;
  status: 'uploaded' | 'ready' | 'processing' | 'completed' | 'failed';
  error_message?: string | null;
  custom_settings?: LogoPlacement | null;
  mask_data?: MaskRegion[] | null;
  inpainting_method: string;
  processed_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LogoItem {
  id: string;
  project_id: string;
  original_filename: string;
  url: string;
  width: number;
  height: number;
  file_size: number;
  has_alpha: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  global_settings: LogoPlacement;
  images_count: number;
  processed_count: number;
  logo?: LogoItem | null;
  images?: ImageItem[];
  created_at: string;
  updated_at: string;
}

export interface BatchJob {
  id: string;
  project_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'completed_with_errors' | 'cancelled';
  total_images: number;
  processed_images: number;
  failed_images: number;
  current_image_id?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}
