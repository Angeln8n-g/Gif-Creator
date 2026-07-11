import type { RenderSettings } from '../types';

const DB_NAME = 'GifCreatorDB';
const DB_VERSION = 1;
const STORE_NAME = 'project';
const PROJECT_KEY = 'current-project';

export interface SavedProject {
  frames: {
    id: string;
    file: File;
    duration: number;
    animation: any;
    filter?: any;
    transition: any;
    transitionDuration: number;
    text?: any;
    stickers: any[];
    crop?: any;
    sfx?: {
      name: string;
      file: File;
      volume: number;
      start: number;
      end: number;
    };
  }[];
  settings: RenderSettings;
  audioTrack: File | null;
  audioVolume: number;
}

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveProject(data: SavedProject): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const sanitizedFrames = data.frames.map(f => ({
      id: f.id,
      file: f.file,
      duration: f.duration,
      animation: f.animation,
      filter: f.filter,
      transition: f.transition,
      transitionDuration: f.transitionDuration,
      text: f.text,
      stickers: f.stickers,
      crop: f.crop,
      sfx: f.sfx ? {
        name: f.sfx.name,
        file: f.sfx.file,
        volume: f.sfx.volume,
        start: f.sfx.start,
        end: f.sfx.end
      } : undefined
    }));

    const sanitizedData = {
      frames: sanitizedFrames,
      settings: data.settings,
      audioTrack: data.audioTrack,
      audioVolume: data.audioVolume
    };

    const request = store.put(sanitizedData, PROJECT_KEY);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadProject(): Promise<SavedProject | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(PROJECT_KEY);

      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('Error loading project from IndexedDB:', error);
    return null;
  }
}

export async function clearProject(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(PROJECT_KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error clearing project from IndexedDB:', error);
  }
}
