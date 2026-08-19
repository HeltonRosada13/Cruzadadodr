// Native browser IndexedDB storage for uploaded video files to ensure local persistence
const DB_NAME = 'CatedralAmorEFe_MediaDB';
const STORE_NAME = 'videos';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported or running server-side'));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveHeroVideoBlob(file: Blob): Promise<string> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(file, 'hero_video_blob');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not persist video to IndexedDB:', err);
  }
  return URL.createObjectURL(file);
}

export async function getHeroVideoBlobUrl(): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('hero_video_blob');
      req.onsuccess = () => {
        if (req.result instanceof Blob) {
          resolve(URL.createObjectURL(req.result));
        } else if (req.result) {
          try {
            const blob = new Blob([req.result], { type: 'video/mp4' });
            resolve(URL.createObjectURL(blob));
          } catch {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveVideoFileBlob(id: string, file: Blob): Promise<string> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      // Store under specific id
      const req = store.put(file, `video_item_${id}`);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not persist video item to IndexedDB:', err);
  }
  return URL.createObjectURL(file);
}

export async function getVideoFileBlobUrl(id: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(`video_item_${id}`);
      req.onsuccess = () => {
        if (req.result instanceof Blob) {
          resolve(URL.createObjectURL(req.result));
        } else if (req.result) {
          try {
            const blob = new Blob([req.result], { type: 'video/mp4' });
            resolve(URL.createObjectURL(blob));
          } catch {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function getAllStoredVideoBlobUrls(): Promise<Record<string, string>> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      const results: Record<string, string> = {};

      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const key = String(cursor.key);
          if (key.startsWith('video_item_')) {
            const id = key.replace('video_item_', '');
            if (cursor.value instanceof Blob) {
              results[id] = URL.createObjectURL(cursor.value);
            } else if (cursor.value) {
              try {
                const blob = new Blob([cursor.value], { type: 'video/mp4' });
                results[id] = URL.createObjectURL(blob);
              } catch {
                // Ignore
              }
            }
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => resolve({});
    });
  } catch {
    return {};
  }
}

export async function generateVideoThumbnailAndDuration(file: File): Promise<{
  thumbnailDataUrl: string;
  durationFormatted: string;
  durationSeconds: number;
}> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    const cleanUp = () => {
      URL.revokeObjectURL(objectUrl);
      video.remove();
    };

    video.onloadedmetadata = () => {
      const durationSec = Math.round(video.duration) || 0;
      const mins = Math.floor(durationSec / 60);
      const secs = durationSec % 60;
      const durationFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} min`;

      video.currentTime = Math.min(1, video.duration / 4 || 0.5);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, 640, 360);
          const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          cleanUp();
          const durationSec = Math.round(video.duration) || 0;
          const mins = Math.floor(durationSec / 60);
          const secs = durationSec % 60;
          resolve({
            thumbnailDataUrl,
            durationFormatted: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} min`,
            durationSeconds: durationSec,
          });
          return;
        }
      } catch (err) {
        console.warn('Could not generate video canvas thumb:', err);
      }
      cleanUp();
      resolve({
        thumbnailDataUrl: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=800&q=80',
        durationFormatted: '05:00 min',
        durationSeconds: 300,
      });
    };

    video.onerror = () => {
      cleanUp();
      resolve({
        thumbnailDataUrl: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&w=800&q=80',
        durationFormatted: '05:00 min',
        durationSeconds: 300,
      });
    };
  });
}

export async function clearHeroVideoBlob(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete('hero_video_blob');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignored
  }
}

export async function deleteVideoFileBlob(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(`video_item_${id}`);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignored
  }
}

export async function clearAllStoredVideoBlobs(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignored
  }
}
