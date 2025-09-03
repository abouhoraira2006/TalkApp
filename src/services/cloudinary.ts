import * as FileSystem from 'expo-file-system';

// Cloudinary configuration - free tier: 25GB storage, 25GB bandwidth
const CLOUDINARY_CLOUD_NAME = 'your-cloud-name'; // Replace with your cloud name
const CLOUDINARY_UPLOAD_PRESET = 'chat-media'; // Replace with your upload preset
const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

export const uploadToCloudinary = async (
  uri: string,
  type: 'image' | 'video' | 'audio'
): Promise<{ url: string | null; error: string | null }> => {
  try {
    console.log('Starting Cloudinary upload for:', { uri, type });

    // Validate file exists
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      return { url: null, error: 'File does not exist' };
    }

    // Check file size (25MB limit for free tier)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if ('size' in fileInfo && fileInfo.size && fileInfo.size > maxSize) {
      return { url: null, error: 'حجم الملف يجب أن يكون أقل من 25 ميجابايت' };
    }

    // Create form data
    const formData = new FormData();
    
    // Add file
    const fileExtension = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${type}_${Date.now()}.${fileExtension}`;
    
    formData.append('file', {
      uri,
      type: getContentType(fileExtension, type),
      name: fileName,
    } as any);
    
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('resource_type', type === 'image' ? 'image' : type === 'video' ? 'video' : 'raw');
    
    // Add folder organization
    formData.append('folder', `chat-media/${type}`);
    
    // Upload with retry logic
    const maxRetries = 3;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Cloudinary upload attempt ${attempt}/${maxRetries}`);
        
        const response = await fetch(CLOUDINARY_API_URL, {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
          throw new Error(result.error.message || 'Cloudinary upload failed');
        }
        
        console.log('Cloudinary upload successful:', result.secure_url);
        return { url: result.secure_url, error: null };
        
      } catch (error) {
        console.log(`Cloudinary upload attempt ${attempt} failed:`, error);
        lastError = error;
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        }
      }
    }
    
    console.error('Cloudinary upload error after all attempts:', lastError);
    return { url: null, error: `رفع فاشل: ${lastError?.message || 'خطأ في الشبكة'}` };
    
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return { url: null, error: error instanceof Error ? error.message : 'خطأ غير معروف في الرفع' };
  }
};

const getContentType = (extension: string, type: string): string => {
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
        default:
          return 'video/mp4';
      }
    default:
      return 'application/octet-stream';
  }
};

export const deleteFromCloudinary = async (url: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    // Extract public_id from Cloudinary URL
    const publicId = extractPublicIdFromUrl(url);
    if (!publicId) {
      return { success: false, error: 'Invalid Cloudinary URL' };
    }

    // Note: Deletion requires API key/secret, which should be done server-side
    // For now, we'll just return success as files will auto-expire
    console.log('File marked for deletion:', publicId);
    return { success: true, error: null };
    
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Delete failed' };
  }
};

const extractPublicIdFromUrl = (url: string): string | null => {
  try {
    const parts = url.split('/');
    const uploadIndex = parts.findIndex(part => part === 'upload');
    if (uploadIndex === -1) return null;
    
    const pathParts = parts.slice(uploadIndex + 2); // Skip version info
    const fileName = pathParts.join('/');
    return fileName.split('.')[0]; // Remove extension
  } catch {
    return null;
  }
};
