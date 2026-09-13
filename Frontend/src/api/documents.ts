import api from '../services/api';
import { PaginatedResponse, ApiResponse, QueryParams } from '../types';

export interface Document {
  _id: string;
  organizationId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  cloudinaryPublicId: string;
  folder: string;
  relatedType?: string;
  relatedId?: string;
  uploadedBy: string;
  description?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DocumentQueryParams extends QueryParams {
  folder?: string;
  relatedType?: string;
  relatedId?: string;
}

export const documentsApi = {
  getAll: (params?: DocumentQueryParams): Promise<ApiResponse<PaginatedResponse<Document>>> =>
    api.get('/documents', params),

  getById: (id: string): Promise<ApiResponse<Document>> =>
    api.get(`/documents/${id}`),

  getDownloadUrl: (id: string): Promise<ApiResponse<{ url: string; fileName: string }>> =>
    api.get(`/documents/download/${id}`),

  upload: (formData: FormData): Promise<ApiResponse<Document>> =>
    api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (id: string): Promise<void> =>
    api.delete(`/documents/${id}`),

  getByEntity: (type: string, entityId: string): Promise<ApiResponse<Document[]>> =>
    api.get(`/documents/entity/${type}/${entityId}`),
};
