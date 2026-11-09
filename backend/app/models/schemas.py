from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime

class LogoPlacement(BaseModel):
    x: float = Field(default=0.85, description="Normalized X position (0-1)")
    y: float = Field(default=0.85, description="Normalized Y position (0-1)")
    scale: float = Field(default=0.20, description="Normalized scale relative to image width (0.01-1.0)")
    rotation: float = Field(default=0.0, description="Rotation in degrees (-360 to 360)")
    opacity: float = Field(default=1.0, ge=0.0, le=1.0, description="Opacity 0 to 1")
    blend_mode: str = Field(default="normal", description="Blend mode (normal, multiply, screen, overlay)")
    shadow: bool = Field(default=False, description="Enable drop shadow")
    shadow_blur: float = Field(default=8.0, description="Shadow blur radius in pixels")
    shadow_opacity: float = Field(default=0.4, ge=0.0, le=1.0, description="Shadow opacity")
    shadow_offset_x: float = Field(default=4.0, description="Shadow X offset")
    shadow_offset_y: float = Field(default=4.0, description="Shadow Y offset")
    lock_aspect_ratio: bool = Field(default=True, description="Lock aspect ratio")

class MaskRegion(BaseModel):
    id: str
    type: str = Field(description="'rect' | 'brush' | 'polygon'")
    # For rect:
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    # For brush / polygon:
    points: Optional[list[float]] = None
    stroke_width: Optional[float] = None

class ImageItem(BaseModel):
    id: str
    project_id: str
    original_filename: str
    url: str
    thumbnail_url: str
    width: int
    height: int
    file_size: int
    status: str
    error_message: Optional[str] = None
    custom_settings: Optional[LogoPlacement] = None
    mask_data: Optional[list[MaskRegion]] = None
    inpainting_method: str = "telea"
    processed_url: Optional[str] = None
    created_at: str
    updated_at: str

class LogoItem(BaseModel):
    id: str
    project_id: str
    original_filename: str
    url: str
    width: int
    height: int
    file_size: int
    has_alpha: bool
    created_at: str

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = ""

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    global_settings: Optional[LogoPlacement] = None

class ProjectItem(BaseModel):
    id: str
    name: str
    description: str
    global_settings: LogoPlacement
    images_count: int = 0
    processed_count: int = 0
    logo: Optional[LogoItem] = None
    created_at: str
    updated_at: str

class ProjectDetail(ProjectItem):
    images: list[ImageItem] = []

class BatchJobStatus(BaseModel):
    id: str
    project_id: str
    status: str
    total_images: int
    processed_images: int
    failed_images: int
    current_image_id: Optional[str] = None
    error_message: Optional[str] = None
    created_at: str
    updated_at: str

class ImageConfigUpdate(BaseModel):
    custom_settings: Optional[LogoPlacement] = None
    mask_data: Optional[list[MaskRegion]] = None
    inpainting_method: Optional[str] = None

class InpaintRequest(BaseModel):
    method: str = "telea"  # 'telea' | 'ns' | 'ai'
    mask_regions: Optional[list[MaskRegion]] = None

class DetectLogoResponse(BaseModel):
    detected: bool
    regions: list[MaskRegion]
    message: str

