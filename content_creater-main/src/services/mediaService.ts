import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { MediaAsset } from '@/types';

interface MediaDB extends DBSchema {
  media: {
    key: string;
    value: MediaAsset;
    indexes: {
      'by-date': string;
      'by-type': string;
      'by-source': string;
    };
  };
}

const DB_NAME = 'social-media-os-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<MediaDB> | null = null;

async function getDB(): Promise<IDBPDatabase<MediaDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<MediaDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create media store
      const mediaStore = db.createObjectStore('media', { keyPath: 'id' });
      mediaStore.createIndex('by-date', 'createdAt');
      mediaStore.createIndex('by-type', 'type');
      mediaStore.createIndex('by-source', 'source');
    },
  });

  return dbInstance;
}

// Save a media asset
export async function saveMediaAsset(asset: MediaAsset): Promise<void> {
  const db = await getDB();
  await db.put('media', asset);
}

// Get all media assets
export async function getAllMediaAssets(): Promise<MediaAsset[]> {
  const db = await getDB();
  const assets = await db.getAll('media');
  return assets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Get media asset by ID
export async function getMediaAssetById(id: string): Promise<MediaAsset | undefined> {
  const db = await getDB();
  return await db.get('media', id);
}

// Delete media asset
export async function deleteMediaAsset(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('media', id);
}

// Search media by tags
export async function searchMediaByTags(tags: string[]): Promise<MediaAsset[]> {
  const allAssets = await getAllMediaAssets();
  return allAssets.filter(asset =>
    tags.some(tag => asset.tags.some(t => t.toLowerCase().includes(tag.toLowerCase())))
  );
}

// Update media asset tags
export async function updateMediaTags(id: string, tags: string[]): Promise<void> {
  const db = await getDB();
  const asset = await db.get('media', id);
  if (asset) {
    asset.tags = tags;
    await db.put('media', asset);
  }
}

// Get media by type
export async function getMediaByType(type: 'image' | 'video'): Promise<MediaAsset[]> {
  const db = await getDB();
  return await db.getAllFromIndex('media', 'by-type', type);
}

// Auto-save AI-generated media
export async function autoSaveAIMedia(
  url: string,
  type: 'image' | 'video',
  postTopic?: string
): Promise<MediaAsset> {
  const asset: MediaAsset = {
    id: crypto.randomUUID(),
    name: `${type}_${new Date().getTime()}`,
    type,
    url,
    size: 0, // Will be calculated if needed
    tags: postTopic ? [postTopic] : [],
    createdAt: new Date().toISOString(),
    source: 'ai-generated',
    usedInPosts: [],
  };

  await saveMediaAsset(asset);
  return asset;
}

// Create thumbnail for video (basic implementation)
export async function createVideoThumbnail(videoUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';

    video.addEventListener('loadeddata', () => {
      video.currentTime = 1; // Capture at 1 second
    });

    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } else {
        resolve(''); // Fallback
      }
    });
  });
}

// Handle file upload
export async function uploadMediaFile(file: File): Promise<MediaAsset> {
  const url = URL.createObjectURL(file);
  const type = file.type.startsWith('image/') ? 'image' : 'video';

  let thumbnailUrl: string | undefined;
  if (type === 'video') {
    thumbnailUrl = await createVideoThumbnail(url);
  }

  const asset: MediaAsset = {
    id: crypto.randomUUID(),
    name: file.name,
    type,
    url,
    thumbnailUrl,
    size: file.size,
    tags: [],
    createdAt: new Date().toISOString(),
    source: 'uploaded',
    usedInPosts: [],
  };

  await saveMediaAsset(asset);
  return asset;
}

// Mark media as used in a post
export async function markMediaUsedInPost(mediaId: string, postId: string): Promise<void> {
  const asset = await getMediaAssetById(mediaId);
  if (asset && !asset.usedInPosts.includes(postId)) {
    asset.usedInPosts.push(postId);
    await saveMediaAsset(asset);
  }
}

// Get storage stats
export async function getStorageStats(): Promise<{ totalAssets: number; totalSize: number }> {
  const assets = await getAllMediaAssets();
  const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);
  return { totalAssets: assets.length, totalSize };
}
