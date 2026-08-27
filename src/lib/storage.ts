import { supabase } from './supabase';

/**
 * Upload single media file (Photo or Video) to Supabase Storage
 */
export async function uploadMedia(file: File, folder: string): Promise<string | null> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const isVideo = file.type.startsWith('video/') || ['mp4', 'webm', 'mov'].includes(ext);
  const prefix = isVideo ? 'vid' : 'img';
  const fileName = `${folder}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from('report-photos')
    .upload(fileName, file, { contentType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg') });

  if (error) {
    console.error('[Storage] Upload error:', error);
    return null;
  }

  const { data } = supabase.storage.from('report-photos').getPublicUrl(fileName);
  return data.publicUrl;
}

/**
 * Alias for backward compatibility
 */
export const uploadPhoto = uploadMedia;

/**
 * Parallel upload multiple media files (Photos and/or Videos)
 */
export async function uploadMultipleMedia(files: File[], folder: string): Promise<string[]> {
  if (!files || files.length === 0) return [];
  const uploadPromises = files.map((file) => uploadMedia(file, folder));
  const results = await Promise.all(uploadPromises);
  return results.filter((url): url is string => url !== null);
}

/**
 * High-performance Client-Side Canvas Image Compression
 */
export function compressImage(file: File, maxWidth = 1600, quality = 0.82): Promise<File> {
  // If not image (e.g. video), return original file directly
  if (!file.type.startsWith('image/')) {
    return Promise.resolve(file);
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressed);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
