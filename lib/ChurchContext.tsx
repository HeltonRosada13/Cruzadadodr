'use client';

import React, { createContext, useContext, useSyncExternalStore, useState, useEffect, useRef, useCallback } from 'react';
import { ChurchSettings, ChurchActivity, PhotoItem, VideoItem, ChurchEvent, SocialLink, HighlightMoment, Testimony } from './types';
import { initialChurchData } from './churchData';
import { db, doc, setDoc, getDoc, onSnapshot, handleFirestoreError, OperationType } from './firebase';
import { deleteVideoFileBlob, clearAllStoredVideoBlobs, clearHeroVideoBlob } from './videoStorage';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'quota_exceeded' | 'ready';

interface ChurchContextType {
  data: ChurchSettings;
  isReady: boolean;
  updateCurrentActivity: (activity: Partial<ChurchActivity>) => void;
  updateChurchInfo: (info: Partial<ChurchSettings>) => void;
  addPhoto: (photo: Omit<PhotoItem, 'id'>) => void;
  addBatchPhotos: (photos: Omit<PhotoItem, 'id'>[]) => void;
  updatePhoto: (id: string, updated: Partial<PhotoItem>) => void;
  removePhoto: (id: string) => void;
  addVideo: (video: Omit<VideoItem, 'id'> & { id?: string }) => void;
  updateVideo: (id: string, updated: Partial<VideoItem>) => void;
  removeVideo: (id: string) => void;
  setPrimaryFeaturedVideo: (id: string) => void;
  resetVideosToDefaults: () => void;
  clearAllOldVideos: () => void;
  addUpcomingEvent: (event: Omit<ChurchEvent, 'id'>) => void;
  updateUpcomingEvent: (id: string, updated: Partial<ChurchEvent>) => void;
  removeUpcomingEvent: (id: string) => void;
  updateSocialLink: (id: string, updated: Partial<SocialLink>) => void;
  addHighlight: (item: Omit<HighlightMoment, 'id'>) => void;
  updateHighlight: (id: string, updated: Partial<HighlightMoment>) => void;
  removeHighlight: (id: string) => void;
  resetHighlightsToDefaults: () => void;
  updateTestimony: (id: string, updated: Partial<Testimony>) => void;
  updateWorshipScheduleItem: (index: number, updated: { day: string; time: string; name: string }) => void;
  addWorshipScheduleItem: (item: { day: string; time: string; name: string }) => void;
  removeWorshipScheduleItem: (index: number) => void;
  resetToDefaults: () => void;
  syncNowWithCloud: () => Promise<boolean>;
  isAdminOpen: boolean;
  setIsAdminOpen: (open: boolean) => void;
  syncState: SyncState;
  lastSyncedAt: Date | null;
  firebaseProjectId: string;
  isQuotaExceeded: boolean;
  firebaseConsoleUrl: string;
}

const LOCAL_STORAGE_KEY = 'catedral_amor_e_fe_data_v2';
const LAST_EDIT_TS_KEY = 'catedral_last_edit_timestamp_v2';
const QUOTA_STORAGE_KEY = 'catedral_firestore_quota_exceeded_timestamp';
const FIRESTORE_DOC_PATH = 'church_data';
const FIRESTORE_DOC_ID = 'main';
const FIREBASE_PROJECT_ID = 'cruzada-75071';
const FIRESTORE_DB_ID = 'ai-studio-igrejacatedralde-1689f903-4252-4c97-842d-c7bb1fa516bf';
const FIREBASE_CONSOLE_URL = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore/databases/${FIRESTORE_DB_ID}/data?openUpgradeDialog=true`;

function getStoredLocalEditTimestamp(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(LAST_EDIT_TS_KEY) || localStorage.getItem('catedral_last_edit_timestamp_v4');
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

function setStoredLocalEditTimestamp(ts: number) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_EDIT_TS_KEY, ts.toString());
  } catch {}
}

function checkIsQuotaExceededStored(): boolean {
  return false;
}

function setQuotaExceededStored(exceeded: boolean) {
  if (typeof window === 'undefined') return;
  try {
    if (exceeded) {
      localStorage.setItem(QUOTA_STORAGE_KEY, Date.now().toString());
    } else {
      localStorage.removeItem(QUOTA_STORAGE_KEY);
    }
  } catch {}
}

let memoryState: ChurchSettings = initialChurchData;
let hasInitializedFromStorage = false;
const listeners = new Set<() => void>();
let saveDebounceTimer: NodeJS.Timeout | null = null;
let lastPersistedPayloadJson = '';
let isFirestoreQuotaExceeded = false;
let onQuotaStateChange: ((exceeded: boolean) => void) | null = null;

// Multi-tab instant communication channel for sub-millisecond local synchronization
const broadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('catedral_sync_channel_v1')
  : null;

if (broadcastChannel) {
  broadcastChannel.onmessage = (event) => {
    if (event.data?.type === 'SYNC_STATE_UPDATE' && event.data?.payload) {
      try {
        const sanitized = sanitizeSavedData(JSON.stringify(event.data.payload));
        memoryState = sanitized;
        lastPersistedPayloadJson = JSON.stringify(sanitized);
        listeners.forEach((l) => l());
      } catch (err) {
        console.warn('Error processing broadcast channel message:', err);
      }
    }
  };
}

function sanitizeSavedData(savedRaw: string): ChurchSettings {
  try {
    let cleaned = savedRaw.replace(
      /photo-1532629345422-7515f3d16bb7/g,
      'photo-1519834785169-98be25ec3f84'
    );
    cleaned = cleaned.replace(
      /https:\/\/assets\.mixkit\.co\/videos\/preview\/[^\"]+/g,
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
    );
    const parsed = JSON.parse(cleaned);
    
    // Fix heroVideo if it is a mixkit link
    let sanitizedHeroVideo = parsed.currentActivity?.heroVideo;
    if (!sanitizedHeroVideo || sanitizedHeroVideo.includes('mixkit.co')) {
      sanitizedHeroVideo = initialChurchData.currentActivity.heroVideo;
    }

    return {
      ...initialChurchData,
      ...parsed,
      churchName: parsed.churchName || initialChurchData.churchName,
      churchMotto: parsed.churchMotto || initialChurchData.churchMotto,
      churchAbout: parsed.churchAbout || initialChurchData.churchAbout,
      phone: parsed.phone || initialChurchData.phone,
      whatsappNumber: parsed.whatsappNumber || initialChurchData.whatsappNumber,
      whatsappMessage: parsed.whatsappMessage || initialChurchData.whatsappMessage,
      email: parsed.email || initialChurchData.email,
      address: parsed.address || initialChurchData.address,
      cityCountry: parsed.cityCountry || initialChurchData.cityCountry,
      currentActivity: {
        ...initialChurchData.currentActivity,
        ...(parsed.currentActivity || {}),
        heroVideo: sanitizedHeroVideo,
      },
      upcomingEvents: Array.isArray(parsed.upcomingEvents) ? parsed.upcomingEvents : initialChurchData.upcomingEvents,
      photos: Array.isArray(parsed.photos) ? parsed.photos : initialChurchData.photos,
      videos: Array.isArray(parsed.videos) ? parsed.videos : initialChurchData.videos,
      socialLinks: Array.isArray(parsed.socialLinks) ? parsed.socialLinks : initialChurchData.socialLinks,
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : initialChurchData.highlights,
      testimonies: Array.isArray(parsed.testimonies) ? parsed.testimonies : initialChurchData.testimonies,
      worshipSchedule: Array.isArray(parsed.worshipSchedule) ? parsed.worshipSchedule : initialChurchData.worshipSchedule,
      developedBy: {
        ...initialChurchData.developedBy,
        ...(parsed.developedBy || {}),
      },
    };
  } catch (err) {
    console.error('Error parsing saved church data:', err);
    return initialChurchData;
  }
}

function initChurchDataFromStorage() {
  if (typeof window === 'undefined' || hasInitializedFromStorage) return;
  hasInitializedFromStorage = true;
  isFirestoreQuotaExceeded = checkIsQuotaExceededStored();
  try {
    // Check all known keys to restore customized user content safely
    const v2 = localStorage.getItem('catedral_amor_e_fe_data_v2');
    const v4 = localStorage.getItem('catedral_amor_e_fe_data_v4');
    const v3 = localStorage.getItem('catedral_amor_e_fe_data_v3');
    const v1 = localStorage.getItem('catedral_amor_e_fe_data_v1');
    const legacy = localStorage.getItem('church_data') || localStorage.getItem('catedral_data');

    let saved = v2 || v4 || v3 || v1 || legacy;

    // If still not found, search all localStorage keys for any saved church configuration
    if (!saved) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('catedral') || key.includes('church'))) {
          const val = localStorage.getItem(key);
          if (val && val.includes('currentActivity')) {
            saved = val;
            break;
          }
        }
      }
    }

    if (saved) {
      memoryState = sanitizeSavedData(saved);
    } else {
      memoryState = initialChurchData;
    }
    // Save to active local key
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(memoryState));
  } catch (e) {
    console.warn('Could not read saved church data from localStorage:', e);
  }
}

if (typeof window !== 'undefined') {
  initChurchDataFromStorage();
}

function getChurchSnapshot(): ChurchSettings {
  return memoryState;
}

function getServerChurchSnapshot(): ChurchSettings {
  return initialChurchData;
}

function subscribeChurchStore(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

import firebaseConfig from '../firebase-applet-config.json';

const FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId || 'ai-studio-igrejacatedralde-1689f903-4252-4c97-842d-c7bb1fa516bf';
const FIRESTORE_REST_URL = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${FIRESTORE_DATABASE_ID}/documents/${FIRESTORE_DOC_PATH}/${FIRESTORE_DOC_ID}`;

function parseFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return null;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(parseFirestoreValue);
  }
  if ('mapValue' in val) {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      res[k] = parseFirestoreValue(v);
    }
    return res;
  }
  return null;
}

function parseFirestoreRestDoc(docData: any): Record<string, any> | null {
  if (!docData || !docData.fields) return null;
  const res: Record<string, any> = {};
  for (const [k, v] of Object.entries(docData.fields)) {
    res[k] = parseFirestoreValue(v);
  }
  return res;
}

function toFirestoreRestValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreRestValue) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreRestValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreRestDoc(obj: Record<string, any>): { fields: Record<string, any> } {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = toFirestoreRestValue(v);
    }
  }
  return { fields };
}

async function fetchFirestoreRestDoc(): Promise<Record<string, any> | null> {
  try {
    const res = await fetch(FIRESTORE_REST_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      return parseFirestoreRestDoc(data);
    }
  } catch (err) {
    console.warn('REST API fetch notice:', err);
  }
  return null;
}

async function saveFirestoreRestDoc(state: Record<string, any>): Promise<boolean> {
  try {
    const payload = toFirestoreRestDoc(state);
    const res = await fetch(FIRESTORE_REST_URL, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.warn('REST API patch notice:', err);
    return false;
  }
}
async function persistToFirestore(state: ChurchSettings, force = false): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // Deduplication: Avoid writing if data is identical to last persisted payload
  const currentPayloadJson = JSON.stringify(state);
  if (currentPayloadJson === lastPersistedPayloadJson && !force) {
    return true;
  }

  const path = `${FIRESTORE_DOC_PATH}/${FIRESTORE_DOC_ID}`;
  let writeSucceeded = false;

  const editTimestamp = getStoredLocalEditTimestamp() || Date.now();
  
  // Deep clone and strip any undefined keys to guarantee clean Firestore compatibility
  const safePayload = JSON.parse(JSON.stringify({
    ...state,
    editTimestamp,
    lastUpdatedAt: new Date().toISOString(),
  }));

  // 1. Dual Channel Write: REST API (works across all browsers/networks)
  try {
    const restOk = await saveFirestoreRestDoc(safePayload);
    if (restOk) {
      writeSucceeded = true;
    }
  } catch (err) {
    console.warn('Dual-write REST error:', err);
  }

  // 2. Dual Channel Write: Firestore Web SDK
  try {
    const mainDocRef = doc(db, FIRESTORE_DOC_PATH, FIRESTORE_DOC_ID);
    await setDoc(mainDocRef, safePayload, { merge: true });
    writeSucceeded = true;
  } catch (err: unknown) {
    console.warn('Dual-write SDK notice:', err);
    try {
      handleFirestoreError(err, OperationType.WRITE, path);
    } catch {
      // Ignored
    }
  }

  if (writeSucceeded) {
    lastPersistedPayloadJson = currentPayloadJson;
    isFirestoreQuotaExceeded = false;
    setQuotaExceededStored(false);
    if (onQuotaStateChange) onQuotaStateChange(false);
    return true;
  }

  return false;
}

function updateChurchStore(updater: (prev: ChurchSettings) => ChurchSettings, immediate = false) {
  const now = Date.now();
  setStoredLocalEditTimestamp(now);
  memoryState = updater(memoryState);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(memoryState));
      broadcastChannel?.postMessage({ type: 'SYNC_STATE_UPDATE', payload: memoryState });
    } catch (e) {
      console.warn('Could not save church data to localStorage:', e);
    }
  }
  listeners.forEach((listener) => listener());

  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }

  if (immediate) {
    persistToFirestore(memoryState, true);
  } else {
    saveDebounceTimer = setTimeout(() => {
      persistToFirestore(memoryState, true);
    }, 100);
  }
}

const ChurchContext = createContext<ChurchContextType | undefined>(undefined);

const emptySubscribe = () => () => {};

export function ChurchProvider({ children }: { children: React.ReactNode }) {
  const data = useSyncExternalStore(
    subscribeChurchStore,
    getChurchSnapshot,
    getServerChurchSnapshot
  );

  const isReady = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>('syncing');
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const isInitialRemoteLoadDone = useRef(false);

  useEffect(() => {
    onQuotaStateChange = (exceeded: boolean) => {
      setIsQuotaExceeded(exceeded);
      if (exceeded) {
        setSyncState('quota_exceeded');
      }
    };
    return () => {
      onQuotaStateChange = null;
    };
  }, []);

  // Multi-tab storage event listener for cross-tab instant consistency
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
        try {
          const sanitized = sanitizeSavedData(e.newValue);
          memoryState = sanitized;
          lastPersistedPayloadJson = JSON.stringify(sanitized);
          listeners.forEach((l) => l());
        } catch (err) {
          console.warn('Storage sync event error:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Connect to Firebase Firestore in real-time
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const applyRemoteData = (remoteData: Record<string, any>) => {
      const remoteTs = typeof remoteData.editTimestamp === 'number'
        ? remoteData.editTimestamp
        : (remoteData.lastUpdatedAt ? new Date(remoteData.lastUpdatedAt).getTime() : 0);

      const finalPhotos = Array.isArray(remoteData.photos) ? remoteData.photos : initialChurchData.photos;
      const finalVideos = Array.isArray(remoteData.videos) ? remoteData.videos : initialChurchData.videos;
      const finalHighlights = Array.isArray(remoteData.highlights) ? remoteData.highlights : initialChurchData.highlights;
      const finalSchedule = Array.isArray(remoteData.worshipSchedule) ? remoteData.worshipSchedule : initialChurchData.worshipSchedule;
      const finalEvents = Array.isArray(remoteData.upcomingEvents) ? remoteData.upcomingEvents : initialChurchData.upcomingEvents;
      const finalSocialLinks = Array.isArray(remoteData.socialLinks) ? remoteData.socialLinks : initialChurchData.socialLinks;
      const finalTestimonies = Array.isArray(remoteData.testimonies) ? remoteData.testimonies : initialChurchData.testimonies;
      const finalHeroVideo = remoteData.currentActivity?.heroVideo || initialChurchData.currentActivity.heroVideo;

      const sanitized: ChurchSettings = {
        ...initialChurchData,
        ...remoteData,
        churchName: remoteData.churchName || initialChurchData.churchName,
        churchMotto: remoteData.churchMotto || initialChurchData.churchMotto,
        churchAbout: remoteData.churchAbout || initialChurchData.churchAbout,
        phone: remoteData.phone || initialChurchData.phone,
        whatsappNumber: remoteData.whatsappNumber || initialChurchData.whatsappNumber,
        whatsappMessage: remoteData.whatsappMessage || initialChurchData.whatsappMessage,
        email: remoteData.email || initialChurchData.email,
        address: remoteData.address || initialChurchData.address,
        cityCountry: remoteData.cityCountry || initialChurchData.cityCountry,
        currentActivity: {
          ...initialChurchData.currentActivity,
          ...(remoteData.currentActivity || {}),
          heroVideo: finalHeroVideo,
        },
        upcomingEvents: finalEvents,
        photos: finalPhotos,
        videos: finalVideos,
        socialLinks: finalSocialLinks,
        highlights: finalHighlights,
        testimonies: finalTestimonies,
        worshipSchedule: finalSchedule,
        developedBy: {
          ...initialChurchData.developedBy,
          ...(remoteData.developedBy || {}),
        },
      };

      memoryState = sanitized;
      if (remoteTs > 0) {
        setStoredLocalEditTimestamp(remoteTs);
      }
      lastPersistedPayloadJson = JSON.stringify(sanitized);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(memoryState));
          broadcastChannel?.postMessage({ type: 'SYNC_STATE_UPDATE', payload: memoryState });
        } catch {
          // ignored
        }
      }
      listeners.forEach((l) => l());
      setLastSyncedAt(new Date());
      setSyncState('synced');
    };

    const setupFirestoreListener = () => {
      // 1. Instant REST Hydration (works in 100% of browsers immediately on mount)
      fetchFirestoreRestDoc()
        .then((remoteData) => {
          if (remoteData) {
            applyRemoteData(remoteData);
          }
        })
        .catch((err) => {
          console.warn('Initial REST load notice:', err);
        });

      try {
        const mainDocRef = doc(db, FIRESTORE_DOC_PATH, FIRESTORE_DOC_ID);
        
        // 2. Initial direct fetch from Web SDK
        getDoc(mainDocRef)
          .then((snap) => {
            if (snap.exists()) {
              const data = snap.data();
              if (data) {
                applyRemoteData(data);
              }
            } else {
              persistToFirestore(memoryState, true);
            }
          })
          .catch((e) => {
            console.warn('Initial direct getDoc note:', e);
          });

        // 3. Real-time snapshot stream from Web SDK
        unsubscribe = onSnapshot(
          mainDocRef,
          { includeMetadataChanges: false },
          (snapshot) => {
            if (snapshot.exists()) {
              const remoteData = snapshot.data();
              if (remoteData) {
                applyRemoteData(remoteData);
              }
            } else {
              persistToFirestore(memoryState, true).then((success) => {
                setLastSyncedAt(new Date());
                if (success) {
                  setSyncState('synced');
                }
              });
            }
            isInitialRemoteLoadDone.current = true;
          },
          (error) => {
            console.warn('Firebase onSnapshot notice:', error);
            const errObj = error as { message?: string; code?: string };
            const errString = errObj?.message || String(error);
            const isQuota = 
              errString.includes('resource-exhausted') || 
              errString.includes('Quota limit exceeded') || 
              errString.includes('Quota exceeded') ||
              errObj?.code === 'resource-exhausted';

            if (isQuota) {
              setSyncState('quota_exceeded');
            } else {
              setSyncState('offline');
            }
          }
        );
      } catch (e) {
        console.warn('Could not establish initial Firestore listener:', e);
      }
    };

    setupFirestoreListener();

    // 4. Background REST Poller to guarantee cross-browser & mobile instant updates
    const pollInterval = setInterval(() => {
      fetchFirestoreRestDoc().then((remoteData) => {
        if (remoteData) {
          const remoteTs = typeof remoteData.editTimestamp === 'number'
            ? remoteData.editTimestamp
            : (remoteData.lastUpdatedAt ? new Date(remoteData.lastUpdatedAt).getTime() : 0);
          const currentLocalTs = getStoredLocalEditTimestamp() || 0;
          
          // If remote server has a newer or different edit timestamp, sync immediately
          if (remoteTs > currentLocalTs || (remoteTs > 0 && Math.abs(remoteTs - currentLocalTs) > 500)) {
            applyRemoteData(remoteData);
          }
        }
      }).catch(() => {
        // silent
      });
    }, 3500);

    // Re-verify connection when window regains focus or comes back from background
    const handleVisibilityOrFocus = () => {
      fetchFirestoreRestDoc().then((remoteData) => {
        if (remoteData) applyRemoteData(remoteData);
      }).catch(() => {});

      if (document.visibilityState === 'visible' && !unsubscribe) {
        setupFirestoreListener();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch {}
      }
    };
  }, []);

  const syncNowWithCloud = useCallback(async (): Promise<boolean> => {
    setSyncState('syncing');
    try {
      const ok = await persistToFirestore(memoryState, true);
      if (ok) {
        setLastSyncedAt(new Date());
        setSyncState('synced');
        setIsQuotaExceeded(false);
        return true;
      } else {
        setSyncState('quota_exceeded');
        setIsQuotaExceeded(true);
        return false;
      }
    } catch {
      setSyncState('offline');
      return false;
    }
  }, []);

  const updateCurrentActivity = useCallback((activityUpdate: Partial<ChurchActivity>) => {
    setSyncState('syncing');
    updateChurchStore((prev) => ({
      ...prev,
      currentActivity: {
        ...prev.currentActivity,
        ...activityUpdate,
      },
    }), true);
    setLastSyncedAt(new Date());
    setSyncState('synced');
  }, []);

  const updateChurchInfo = useCallback((infoUpdate: Partial<ChurchSettings>) => {
    setSyncState('syncing');
    updateChurchStore((prev) => ({
      ...prev,
      ...infoUpdate,
    }), true);
    setLastSyncedAt(new Date());
    setSyncState('synced');
  }, []);

  const addPhoto = useCallback((photoData: Omit<PhotoItem, 'id'>) => {
    const newPhoto: PhotoItem = {
      ...photoData,
      id: 'p-' + Date.now(),
    };
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      photos: [newPhoto, ...prev.photos],
    }), true);
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const addBatchPhotos = useCallback((photosData: Omit<PhotoItem, 'id'>[]) => {
    if (!photosData || photosData.length === 0) return;
    const newPhotos: PhotoItem[] = photosData.map((p, idx) => ({
      ...p,
      id: 'p-' + (Date.now() + idx),
    }));
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      photos: [...newPhotos, ...prev.photos],
    }), true);
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const updatePhoto = useCallback((id: string, updated: Partial<PhotoItem>) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      photos: prev.photos.map((p) => (p.id === id ? { ...p, ...updated } : p)),
    }), true);
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const removePhoto = useCallback((id: string) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      photos: prev.photos.filter((p) => p.id !== id),
    }), true);
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const addVideo = useCallback((videoData: Omit<VideoItem, 'id'> & { id?: string }) => {
    const newVideo: VideoItem = {
      ...videoData,
      id: videoData.id || 'v-' + Date.now(),
    };
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      videos: [newVideo, ...prev.videos],
    }), true);
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const updateVideo = useCallback((id: string, updated: Partial<VideoItem>) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      videos: prev.videos.map((v) => (v.id === id ? { ...v, ...updated } : v)),
    }), true);
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const removeVideo = useCallback((id: string) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    deleteVideoFileBlob(id);
    updateChurchStore((prev) => ({
      ...prev,
      videos: prev.videos.filter((v) => v.id !== id),
    }), true);
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const setPrimaryFeaturedVideo = useCallback((id: string) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => {
      const target = prev.videos.find((v) => v.id === id);
      if (!target) return prev;
      const filtered = prev.videos.filter((v) => v.id !== id);
      return {
        ...prev,
        videos: [target, ...filtered],
      };
    }, true);
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const resetVideosToDefaults = useCallback(() => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    clearAllStoredVideoBlobs();
    updateChurchStore((prev) => ({
      ...prev,
      videos: initialChurchData.videos,
    }), true);
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const clearAllOldVideos = useCallback(() => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    clearAllStoredVideoBlobs();
    updateChurchStore((prev) => ({
      ...prev,
      videos: [],
    }), true);
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const addUpcomingEvent = useCallback((eventData: Omit<ChurchEvent, 'id'>) => {
    const newEvent: ChurchEvent = {
      ...eventData,
      id: 'ev-' + Date.now(),
    };
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      upcomingEvents: [newEvent, ...prev.upcomingEvents],
    }), true);
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const updateUpcomingEvent = useCallback((id: string, updated: Partial<ChurchEvent>) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      upcomingEvents: prev.upcomingEvents.map((ev) => (ev.id === id ? { ...ev, ...updated } : ev)),
    }), true);
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const removeUpcomingEvent = useCallback((id: string) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      upcomingEvents: prev.upcomingEvents.filter((ev) => ev.id !== id),
    }), true);
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const updateSocialLink = useCallback((id: string, updated: Partial<SocialLink>) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.map((item) =>
        item.id === id ? { ...item, ...updated } : item
      ),
    }), true);
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const addHighlight = useCallback((item: Omit<HighlightMoment, 'id'>) => {
    const newHighlight: HighlightMoment = {
      ...item,
      id: 'hl-' + Date.now(),
    };
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      highlights: [...prev.highlights, newHighlight],
    }), true);
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const updateHighlight = useCallback((id: string, updated: Partial<HighlightMoment>) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      highlights: prev.highlights.map((item) =>
        item.id === id ? { ...item, ...updated } : item
      ),
    }), true);
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const removeHighlight = useCallback((id: string) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      highlights: prev.highlights.filter((item) => item.id !== id),
    }), true);
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const resetHighlightsToDefaults = useCallback(() => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      highlights: initialChurchData.highlights,
    }), true);
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const updateTestimony = useCallback((id: string, updated: Partial<Testimony>) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      testimonies: prev.testimonies.map((item) =>
        item.id === id ? { ...item, ...updated } : item
      ),
    }), true);
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const updateWorshipScheduleItem = useCallback((index: number, updated: { day: string; time: string; name: string }) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => {
      const copy = [...prev.worshipSchedule];
      if (copy[index]) {
        copy[index] = { ...copy[index], ...updated };
      }
      return { ...prev, worshipSchedule: copy };
    }, true);
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const addWorshipScheduleItem = useCallback((item: { day: string; time: string; name: string }) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      worshipSchedule: [...prev.worshipSchedule, item],
    }), true);
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const removeWorshipScheduleItem = useCallback((index: number) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      worshipSchedule: prev.worshipSchedule.filter((_, idx) => idx !== index),
    }), true);
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const resetToDefaults = useCallback(() => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    clearAllStoredVideoBlobs();
    clearHeroVideoBlob();
    updateChurchStore(() => initialChurchData, true);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialChurchData));
        window.dispatchEvent(new CustomEvent('hero-video-updated', { detail: { blobUrl: null } }));
      } catch (e) {
        console.error(e);
      }
    }
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  return (
    <ChurchContext.Provider
      value={{
        data,
        isReady,
        updateCurrentActivity,
        updateChurchInfo,
        addPhoto,
        addBatchPhotos,
        updatePhoto,
        removePhoto,
        addVideo,
        updateVideo,
        removeVideo,
        setPrimaryFeaturedVideo,
        resetVideosToDefaults,
        clearAllOldVideos,
        addUpcomingEvent,
        updateUpcomingEvent,
        removeUpcomingEvent,
        updateSocialLink,
        addHighlight,
        updateHighlight,
        removeHighlight,
        resetHighlightsToDefaults,
        updateTestimony,
        updateWorshipScheduleItem,
        addWorshipScheduleItem,
        removeWorshipScheduleItem,
        resetToDefaults,
        syncNowWithCloud,
        isAdminOpen,
        setIsAdminOpen,
        syncState,
        lastSyncedAt,
        firebaseProjectId: FIREBASE_PROJECT_ID,
        isQuotaExceeded,
        firebaseConsoleUrl: FIREBASE_CONSOLE_URL,
      }}
    >
      {children}
    </ChurchContext.Provider>
  );
}

export function useChurch() {
  const context = useContext(ChurchContext);
  if (!context) {
    throw new Error('useChurch must be used within a ChurchProvider');
  }
  return context;
}

