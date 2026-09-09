import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Express } from 'express';

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface UploadOptions {
  folder?: string;
  publicId?: string;
  transformation?: Record<string, any>[];
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private configured = false;

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get<string>('app.cloudinary.cloudName');
    const apiKey = this.configService.get<string>('app.cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('app.cloudinary.apiSecret');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.configured = true;
      this.logger.log('☁️ Cloudinary configured');
    } else {
      this.logger.warn('⚠️ Cloudinary not configured - uploads will fail');
    }
  }

  async upload(
    file: Express.Multer.File,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    if (!this.configured) {
      throw new BadRequestException('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
    }

    const { folder = 'clienthub', publicId, transformation, resourceType = 'auto' } = options;

    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        folder,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      };

      if (publicId) {
        uploadOptions.public_id = publicId;
      }

      if (transformation) {
        uploadOptions.transformation = transformation;
      }

      const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
        if (error) {
          this.logger.error('Cloudinary upload error:', error);
          reject(new BadRequestException(`Upload failed: ${error.message}`));
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        } else {
          reject(new BadRequestException('Upload failed: No result returned'));
        }
      });

      stream.end(file.buffer);
    });
  }

  async uploadBase64(
    base64Data: string,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    if (!this.configured) {
      throw new BadRequestException('Cloudinary is not configured');
    }

    const { folder = 'clienthub', publicId, transformation, resourceType = 'auto' } = options;

    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        folder,
        resource_type: resourceType,
        overwrite: false,
      };

      if (publicId) {
        uploadOptions.public_id = publicId;
      }

      if (transformation) {
        uploadOptions.transformation = transformation;
      }

      cloudinary.uploader.upload(
        `data:${base64Data.includes(';base64,') ? base64Data.split(';base64,')[0].replace('data:', '') : 'image/png'};base64,${base64Data.includes(';base64,') ? base64Data.split(';base64,')[1] : base64Data}`,
        uploadOptions,
        (error, result) => {
          if (error) {
            this.logger.error('Cloudinary base64 upload error:', error);
            reject(new BadRequestException(`Upload failed: ${error.message}`));
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              width: result.width,
              height: result.height,
              format: result.format,
              bytes: result.bytes,
            });
          } else {
            reject(new BadRequestException('Upload failed: No result returned'));
          }
        },
      );
    });
  }

  async delete(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<void> {
    if (!this.configured) {
      throw new BadRequestException('Cloudinary is not configured');
    }

    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      this.logger.log(`Deleted file: ${publicId}`);
    } catch (error) {
      this.logger.error(`Failed to delete ${publicId}:`, error);
      throw new BadRequestException(`Delete failed: ${error.message}`);
    }
  }

  async deleteByUrl(url: string): Promise<void> {
    if (!this.configured) return;

    try {
      const publicId = this.extractPublicId(url);
      if (publicId) {
        await this.delete(publicId);
      }
    } catch (error) {
      this.logger.error(`Failed to delete by URL ${url}:`, error);
    }
  }

  private extractPublicId(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const uploadIndex = pathParts.indexOf('upload');
      if (uploadIndex !== -1 && pathParts.length > uploadIndex + 1) {
        const publicIdWithExt = pathParts.slice(uploadIndex + 1).join('/');
        return publicIdWithExt.replace(/\.[^/.]+$/, '');
      }
    } catch {
      // Invalid URL
    }
    return null;
  }

  getOptimizedUrl(publicId: string, options: { width?: number; height?: number; quality?: number; format?: string } = {}): string {
    if (!this.configured) return '';

    const { width, height, quality = 'auto', format = 'auto' } = options;
    return cloudinary.url(publicId, {
      fetch_format: format,
      quality,
      width,
      height,
      crop: width || height ? 'fill' : undefined,
      gravity: 'auto',
      secure: true,
    });
  }
}