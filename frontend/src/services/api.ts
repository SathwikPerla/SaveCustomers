import { Project, ImageItem, LogoItem, LogoPlacement, MaskRegion, BatchJob } from '../types';

const API_BASE = '/api';

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    let errorMsg = `Request failed: ${res.status} ${res.statusText}`;
    try {
      const err = await res.json();
      if (err.detail) {
        errorMsg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
      }
    } catch {
      // Use fallback errorMsg
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  // Projects
  async listProjects(): Promise<Project[]> {
    return fetchJson<Project[]>(`${API_BASE}/projects`);
  },

  async createProject(name: string, description?: string): Promise<Project> {
    return fetchJson<Project>(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
  },

  async getProject(id: string): Promise<Project> {
    return fetchJson<Project>(`${API_BASE}/projects/${id}`);
  },

  async updateProject(id: string, data: { name?: string; description?: string; global_settings?: LogoPlacement }): Promise<Project> {
    return fetchJson<Project>(`${API_BASE}/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async deleteProject(id: string): Promise<{ message: string; id: string }> {
    return fetchJson<{ message: string; id: string }>(`${API_BASE}/projects/${id}`, {
      method: 'DELETE',
    });
  },

  // Images
  async uploadImages(projectId: string, files: File[]): Promise<ImageItem[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    return fetchJson<ImageItem[]>(`${API_BASE}/projects/${projectId}/images`, {
      method: 'POST',
      body: formData,
    });
  },

  async deleteImage(projectId: string, imageId: string): Promise<{ message: string; id: string }> {
    return fetchJson<{ message: string; id: string }>(`${API_BASE}/projects/${projectId}/images/${imageId}`, {
      method: 'DELETE',
    });
  },

  async resetImage(projectId: string, imageId: string): Promise<ImageItem> {
    return fetchJson<ImageItem>(`${API_BASE}/projects/${projectId}/images/${imageId}/reset`, {
      method: 'POST',
    });
  },

  async rotateImage(projectId: string, imageId: string, degrees: number = 90): Promise<ImageItem> {
    return fetchJson<ImageItem>(`${API_BASE}/projects/${projectId}/images/${imageId}/rotate?degrees=${degrees}`, {
      method: 'POST',
    });
  },

  async updateImageConfig(
    projectId: string,
    imageId: string,
    config: {
      custom_settings?: LogoPlacement | null;
      mask_data?: MaskRegion[] | null;
      inpainting_method?: string;
    }
  ): Promise<ImageItem> {
    return fetchJson<ImageItem>(`${API_BASE}/projects/${projectId}/images/${imageId}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
  },

  // Logo
  async uploadLogo(projectId: string, file: File): Promise<LogoItem> {
    const formData = new FormData();
    formData.append('file', file);

    return fetchJson<LogoItem>(`${API_BASE}/projects/${projectId}/logo`, {
      method: 'POST',
      body: formData,
    });
  },

  async deleteLogo(projectId: string): Promise<{ message: string }> {
    return fetchJson<{ message: string }>(`${API_BASE}/projects/${projectId}/logo`, {
      method: 'DELETE',
    });
  },

  async switchLogoVariant(projectId: string, variant: 'junnu_mukka' | 'gold' | 'black' | string): Promise<LogoItem> {
    return fetchJson<LogoItem>(`${API_BASE}/projects/${projectId}/logo-variant?variant=${variant}`, {
      method: 'POST',
    });
  },

  // Detection & Inpainting
  async detectLogo(projectId: string, imageId: string): Promise<{ detected: boolean; regions: MaskRegion[]; message: string }> {
    return fetchJson(`${API_BASE}/projects/${projectId}/images/${imageId}/detect-logo`, {
      method: 'POST',
    });
  },

  async inpaintImage(projectId: string, imageId: string, method: string, maskRegions?: MaskRegion[]): Promise<ImageItem> {
    return fetchJson<ImageItem>(`${API_BASE}/projects/${projectId}/images/${imageId}/inpaint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, mask_regions: maskRegions }),
    });
  },

  async applyLogo(projectId: string, imageId: string): Promise<ImageItem> {
    return fetchJson<ImageItem>(`${API_BASE}/projects/${projectId}/images/${imageId}/apply-logo`, {
      method: 'POST',
    });
  },

  // Batch Processing
  async startBatchJob(projectId: string): Promise<BatchJob> {
    return fetchJson<BatchJob>(`${API_BASE}/projects/${projectId}/batch-process`, {
      method: 'POST',
    });
  },

  async getJobStatus(projectId: string, jobId: string): Promise<BatchJob> {
    return fetchJson<BatchJob>(`${API_BASE}/projects/${projectId}/jobs/${jobId}`);
  },

  // Exports
  getZipExportUrl(projectId: string): string {
    return `${API_BASE}/projects/${projectId}/export/zip`;
  },

  getImageDownloadUrl(projectId: string, imageId: string): string {
    return `${API_BASE}/projects/${projectId}/images/${imageId}/download`;
  },
};
