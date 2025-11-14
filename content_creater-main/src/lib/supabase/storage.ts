import { createServerClient } from './server';

/**
 * Upload a base64 image or video to Supabase Storage
 * @param base64Data - Base64 data URL (e.g., "data:image/png;base64,..." or "data:video/mp4;base64,...")
 * @param fileName - Name for the file
 * @param bucket - Storage bucket name (default: 'media')
 * @returns Public URL of the uploaded file
 */
export async function uploadBase64Image(
  base64Data: string,
  fileName: string,
  bucket: string = 'media'
): Promise<string> {
  const supabase = await createServerClient();

  // Extract base64 content and mime type
  const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid base64 data URL format');
  }

  const mimeType = matches[1];
  const base64Content = matches[2];
  
  // Convert base64 to buffer
  const buffer = Buffer.from(base64Content, 'base64');
  
  // Log file size for debugging
  const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
  console.log(`Uploading ${mimeType} file: ${fileName}, Size: ${fileSizeMB}MB`);
  
  // Generate unique file path with proper extension
  const timestamp = Date.now();
  const extension = mimeType.split('/')[1]?.replace('quicktime', 'mov') || 'bin';
  const filePath = `${timestamp}-${fileName}.${extension}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    console.error('Error uploading to Supabase Storage:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  console.log(`Successfully uploaded to: ${publicUrlData.publicUrl}`);
  return publicUrlData.publicUrl;
}

/**
 * Delete a file from Supabase Storage
 * @param fileUrl - Public URL of the file
 * @param bucket - Storage bucket name (default: 'media')
 */
export async function deleteFileFromStorage(
  fileUrl: string,
  bucket: string = 'media'
): Promise<void> {
  const supabase = await createServerClient();

  // Extract file path from URL
  const urlParts = fileUrl.split(`/storage/v1/object/public/${bucket}/`);
  if (urlParts.length < 2) {
    console.warn('Invalid storage URL format:', fileUrl);
    return;
  }

  const filePath = urlParts[1];

  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath]);

  if (error) {
    console.error('Error deleting from Supabase Storage:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}
