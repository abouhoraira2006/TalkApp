import { supabase, STORAGE_BUCKET, MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES, ALLOWED_AUDIO_TYPES, ALLOWED_VIDEO_TYPES } from '../config/supabase';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { decode } from 'base64-arraybuffer';

// Upload media with improved error handling and validation
export const uploadMedia = async (
  uri: string,
  type: 'image' | 'audio' | 'video',
  fileName?: string
): Promise<{ url: string | null; error: string | null }> => {
  try {
    console.log('Starting upload for:', { uri, type, fileName });

    // Validate file exists
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      return { url: null, error: 'File does not exist' };
    }

    // Validate file type
    const contentType = getContentType(uri, type);
    if (!isValidFileType(contentType, type)) {
      return { url: null, error: 'نوع الملف غير مدعوم' };
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = getFileExtension(uri) || (type === 'audio' ? '.m4a' : '.jpg');
    const finalFileName = fileName ? `${timestamp}_${fileName}` : `${type}_${timestamp}_${randomId}${extension}`;
    console.log('Using filename:', finalFileName);
    
    // Create upload path
    const uploadPath = `${type}/${finalFileName}`;
    console.log('Uploading to path:', uploadPath);
    
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Convert base64 to ArrayBuffer
    const arrayBuffer = decode(base64);
    
    // Upload with retry logic
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Upload attempt ${attempt}/${maxRetries}`);
        
        // Check bucket exists and is accessible
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
        if (bucketError) {
          console.error('Bucket list error:', bucketError);
        } else {
          console.log('Available buckets:', buckets?.map(b => b.name));
        }
        
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(uploadPath, arrayBuffer, {
            contentType,
            upsert: true,
          });
        
        if (error) {
          console.error('Supabase storage error:', error);
          throw error;
        }
        
        console.log('Upload successful:', data);
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(uploadPath);
        
        console.log('Public URL:', publicUrl);
        return { url: publicUrl, error: null };
        
      } catch (error) {
        console.log(`Upload attempt ${attempt} failed:`, error);
        lastError = error;
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        }
      }
    }
    
    console.error('Supabase upload error after all attempts:', lastError);
    return { url: null, error: `Upload failed: ${lastError?.message || 'Network or authentication error'}` };
    
  } catch (error) {
    console.error('Upload error:', error);
    return { url: null, error: error instanceof Error ? error.message : 'Unknown upload error' };
  }
};

// Download media with progress tracking
export const downloadMedia = async (
  url: string, 
  fileName: string,
  onProgress?: (progress: number) => void
): Promise<{ uri: string | null; error: string | null }> => {
  try {
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    
    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      fileUri,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        console.log(`Download progress: ${(progress * 100).toFixed(1)}%`);
        onProgress?.(progress);
      }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result) {
      return { uri: null, error: 'Download failed' };
    }

    return { uri: result.uri, error: null };
  } catch (error) {
    console.error('Download error:', error);
    return { uri: null, error: error instanceof Error ? error.message : 'Download failed' };
  }
};

// Delete media from Supabase Storage
export const deleteMedia = async (url: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    // Extract file path from URL
    const filePath = extractFilePathFromUrl(url);
    if (!filePath) {
      return { success: false, error: 'Invalid URL format' };
    }

    console.log('Deleting file:', filePath);

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return { success: false, error: error.message };
    }

    console.log('File deleted successfully');
    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting media:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Delete failed' };
  }
};

// Helper functions
const getFolderByType = (type: string): string => {
  switch (type) {
    case 'image': return 'images';
    case 'audio': return 'audio';
    case 'video': return 'videos';
    default: return 'files';
  }
};

const getFileExtension = (uri: string): string => {
  const parts = uri.split('.');
  return parts[parts.length - 1]?.toLowerCase() || 'bin';
};

const extractFilePathFromUrl = (url: string): string | null => {
  try {
    const urlParts = url.split('/');
    const bucketIndex = urlParts.findIndex(part => part === STORAGE_BUCKET);
    if (bucketIndex === -1) return null;
    
    return urlParts.slice(bucketIndex + 1).join('/');
  } catch {
    return null;
  }
};

const isValidFileType = (contentType: string, type: string): boolean => {
  switch (type) {
    case 'image': return ALLOWED_IMAGE_TYPES.includes(contentType);
    case 'audio': return ALLOWED_AUDIO_TYPES.includes(contentType);
    case 'video': return ALLOWED_VIDEO_TYPES.includes(contentType);
    default: return false;
  }
};

const getContentType = (uri: string, type: string): string => {
  const extension = uri.split('.').pop()?.toLowerCase();
  
  switch (type) {
    case 'image':
      switch (extension) {
        case 'jpg':
        case 'jpeg':
          return 'image/jpeg';
        case 'png':
          return 'image/png';
        case 'gif':
          return 'image/gif';
        case 'webp':
          return 'image/webp';
        default:
          return 'image/jpeg';
      }
    case 'audio':
      switch (extension) {
        case 'mp3':
          return 'audio/mpeg';
        case 'wav':
          return 'audio/wav';
        case 'm4a':
          return 'audio/mp4';
        case 'aac':
          return 'audio/aac';
        default:
          return 'audio/mpeg';
      }
    case 'video':
      switch (extension) {
        case 'mp4':
          return 'video/mp4';
        case 'mov':
          return 'video/quicktime';
        case 'avi':
          return 'video/x-msvideo';
        case 'mkv':
          return 'video/x-matroska';
        default:
          return 'video/mp4';
      }
    default:
      return 'application/octet-stream';
  }
};

export const generateFileName = (type: string, extension: string): string => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const userId = Math.random().toString(36).substring(2, 8); // Simulate user ID
  return `${type}_${userId}_${timestamp}_${randomId}.${extension}`;
};

export const getFileSize = async (uri: string): Promise<{ size: number; error: string | null }> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      return { size: 0, error: 'File does not exist' };
    }
    // Type guard to check if fileInfo has size property
    const size = 'size' in fileInfo ? fileInfo.size || 0 : 0;
    return { size, error: null };
  } catch (error) {
    console.error('Error getting file size:', error);
    return { size: 0, error: error instanceof Error ? error.message : 'Failed to get file size' };
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 بايت';
  
  const k = 1024;
  const sizes = ['بايت', 'ك.ب', 'م.ب', 'ج.ب'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Batch upload for multiple files
export const uploadMultipleMedia = async (
  files: Array<{ uri: string; type: 'image' | 'audio' | 'video'; fileName?: string }>
): Promise<Array<{ url: string | null; error: string | null; originalUri: string }>> => {
  const results = [];
  
  for (const file of files) {
    const result = await uploadMedia(file.uri, file.type, file.fileName);
    results.push({ ...result, originalUri: file.uri });
  }
  
  return results;
};

// Check if storage bucket exists and is accessible
export const checkStorageHealth = async (): Promise<{ healthy: boolean; error: string | null }> => {
  try {
    const { data, error } = await supabase.storage.getBucket(STORAGE_BUCKET);
    
    if (error) {
      return { healthy: false, error: error.message };
    }
    
    return { healthy: true, error: null };
  } catch (error) {
    return { healthy: false, error: error instanceof Error ? error.message : 'Storage check failed' };
  }
};
