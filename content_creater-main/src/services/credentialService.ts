import {
  PlatformCredentials,
  TwitterCredentials,
  LinkedInCredentials,
  FacebookCredentials,
  InstagramCredentials,
  Platform
} from '@/types';

const STORAGE_KEY = 'social_media_credentials';
const ENCRYPTION_KEY = 'smOS_v1'; // In production, use proper encryption key management

/**
 * Simple obfuscation for localStorage storage
 * WARNING: This is NOT secure encryption. For production, use a backend with proper encryption.
 */
function obfuscate(data: string): string {
  try {
    const encoded = btoa(data);
    return encoded.split('').reverse().join('');
  } catch (e) {
    console.error('Obfuscation error:', e);
    return data;
  }
}

function deobfuscate(data: string): string {
  try {
    const reversed = data.split('').reverse().join('');
    return atob(reversed);
  } catch (e) {
    console.error('Deobfuscation error:', e);
    return data;
  }
}

/**
 * Save all platform credentials to localStorage
 */
export function saveCredentials(credentials: PlatformCredentials): void {
  try {
    const jsonString = JSON.stringify(credentials);
    const obfuscated = obfuscate(jsonString);
    localStorage.setItem(STORAGE_KEY, obfuscated);
  } catch (error) {
    console.error('Failed to save credentials:', error);
    throw new Error('Failed to save credentials');
  }
}

/**
 * Load all platform credentials from localStorage
 */
export function loadCredentials(): PlatformCredentials {
  try {
    const obfuscated = localStorage.getItem(STORAGE_KEY);
    if (!obfuscated) {
      return {};
    }
    const jsonString = deobfuscate(obfuscated);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Failed to load credentials:', error);
    return {};
  }
}

/**
 * Save credentials for a specific platform
 */
export function savePlatformCredentials(
  platform: Platform,
  credentials: TwitterCredentials | LinkedInCredentials | FacebookCredentials | InstagramCredentials
): void {
  const allCredentials = loadCredentials();
  allCredentials[platform] = credentials;
  saveCredentials(allCredentials);
}

/**
 * Get credentials for a specific platform
 */
export function getPlatformCredentials(platform: Platform) {
  const allCredentials = loadCredentials();
  return allCredentials[platform];
}

/**
 * Check if a platform is connected (has valid credentials)
 */
export function isPlatformConnected(platform: Platform): boolean {
  const credentials = getPlatformCredentials(platform);
  return credentials?.isConnected ?? false;
}

/**
 * Disconnect a platform (remove credentials)
 */
export function disconnectPlatform(platform: Platform): void {
  const allCredentials = loadCredentials();
  if (allCredentials[platform]) {
    allCredentials[platform] = {
      ...allCredentials[platform],
      isConnected: false,
    };
    saveCredentials(allCredentials);
  }
}

/**
 * Clear all credentials (logout from all platforms)
 */
export function clearAllCredentials(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get connection summary for all platforms
 */
export function getConnectionSummary(): Record<Platform, boolean> {
  const allCredentials = loadCredentials();
  return {
    twitter: allCredentials.twitter?.isConnected ?? false,
    linkedin: allCredentials.linkedin?.isConnected ?? false,
    facebook: allCredentials.facebook?.isConnected ?? false,
    instagram: allCredentials.instagram?.isConnected ?? false,
    tiktok: allCredentials.tiktok?.isConnected ?? false,
    youtube: allCredentials.youtube?.isConnected ?? false,
  };
}
