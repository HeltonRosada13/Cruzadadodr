'use client';

import React, { createContext, useContext, useSyncExternalStore, useState, useEffect, useRef, useCallback } from 'react';
import { ChurchSettings, ChurchActivity, PhotoItem, VideoItem, ChurchEvent, SocialLink, HighlightMoment, Testimony } from './types';
import { initialChurchData } from './churchData';
import { db, doc, setDoc, onSnapshot, handleFirestoreError, OperationType } from './firebase';
import { deleteVideoFileBlob, clearAllStoredVideoBlobs, clearHeroVideoBlob } from './videoStorage';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'quota_exceeded' | 'ready';

interface ChurchContextType {
  data: ChurchSettings;
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
  syncNowWithCloud: () => Promise<void>;
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
    const raw = localStorage.getItem(LAST_EDIT_TS_KEY);
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
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    // Quota cooldown: treat as exceeded for 4 hours unless manually reconnected
    if (Date.now() - ts < 4 * 60 * 60 * 1000) {
      return true;
    }
  } catch {}
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

function sanitizeSavedData(savedRaw: string): ChurchSettings {
  try {
    const cleaned = savedRaw.replace(
      /photo-1532629345422-7515f3d16bb7/g,
      'photo-1519834785169-98be25ec3f84'
    );
    const parsed = JSON.parse(cleaned);
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
    const savedV2 = localStorage.getItem('catedral_amor_e_fe_data_v2');
    const savedV1 = localStorage.getItem('catedral_amor_e_fe_data_v1');
    const saved = savedV2 || savedV1;
    if (saved) {
      memoryState = sanitizeSavedData(saved);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(memoryState));
    }
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

// Function to write directly to Firebase Firestore with automatic debouncing and error handling
async function persistToFirestore(state: ChurchSettings, force = false): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // Prevent spamming requests if quota is known to be exceeded and not forcing
  if (isFirestoreQuotaExceeded && !force) {
    return false;
  }

  // Deduplication: Avoid writing if data is identical to last persisted payload
  const currentPayloadJson = JSON.stringify(state);
  if (currentPayloadJson === lastPersistedPayloadJson && !force) {
    return true;
  }

  const path = `${FIRESTORE_DOC_PATH}/${FIRESTORE_DOC_ID}`;
  try {
    const editTimestamp = getStoredLocalEditTimestamp() || Date.now();
    const mainDocRef = doc(db, FIRESTORE_DOC_PATH, FIRESTORE_DOC_ID);
    await setDoc(mainDocRef, {
      ...state,
      editTimestamp,
      lastUpdatedAt: new Date().toISOString(),
    }, { merge: true });
    
    lastPersistedPayloadJson = currentPayloadJson;
    if (isFirestoreQuotaExceeded) {
      isFirestoreQuotaExceeded = false;
      setQuotaExceededStored(false);
      if (onQuotaStateChange) onQuotaStateChange(false);
    }
    return true;
  } catch (err: unknown) {
    const errObj = err as { message?: string; code?: string };
    const errString = errObj?.message || String(err);
    const isQuotaErr = 
      errString.includes('resource-exhausted') || 
      errString.includes('Quota limit exceeded') || 
      errString.includes('Quota exceeded') ||
      errObj?.code === 'resource-exhausted';

    if (isQuotaErr) {
      isFirestoreQuotaExceeded = true;
      setQuotaExceededStored(true);
      if (onQuotaStateChange) onQuotaStateChange(true);
    }

    try {
      handleFirestoreError(err, OperationType.WRITE, path);
    } catch {
      // Ignored for graceful UI continuation
    }
    return false;
  }
}

function updateChurchStore(updater: (prev: ChurchSettings) => ChurchSettings) {
  const now = Date.now();
  setStoredLocalEditTimestamp(now);
  memoryState = updater(memoryState);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(memoryState));
    } catch (e) {
      console.warn('Could not save church data to localStorage:', e);
    }
  }
  listeners.forEach((listener) => listener());
  
  // If quota is already exceeded, don't trigger automatic write attempts
  if (isFirestoreQuotaExceeded) {
    return;
  }

  // Quick push to Firestore with short debounce so rapid typing batches cleanly
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }
  saveDebounceTimer = setTimeout(() => {
    persistToFirestore(memoryState);
  }, 400);
}

const ChurchContext = createContext<ChurchContextType | undefined>(undefined);

export function ChurchProvider({ children }: { children: React.ReactNode }) {
  const data = useSyncExternalStore(
    subscribeChurchStore,
    getChurchSnapshot,
    getServerChurchSnapshot
  );

  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>(checkIsQuotaExceededStored() ? 'quota_exceeded' : 'syncing');
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(checkIsQuotaExceededStored());
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

  // Connect to Firebase Firestore in real-time
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    // If quota was already recorded as exceeded, stay in local offline mode and don't spam network
    if (checkIsQuotaExceededStored()) {
      isFirestoreQuotaExceeded = true;
      return;
    }

    try {
      const mainDocRef = doc(db, FIRESTORE_DOC_PATH, FIRESTORE_DOC_ID);
      
      unsubscribe = onSnapshot(
        mainDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const remoteData = snapshot.data();
            if (remoteData) {
              const remoteTs = typeof remoteData.editTimestamp === 'number'
                ? remoteData.editTimestamp
                : (remoteData.lastUpdatedAt ? new Date(remoteData.lastUpdatedAt).getTime() : 0);
              const localTs = getStoredLocalEditTimestamp();

              // If local state has newer edits than remote Firestore data (by more than 400ms),
              // NEVER overwrite fresh local state with stale remote data!
              // Instead, push the latest local state to Firestore so cloud catches up.
              if (localTs > 0 && remoteTs > 0 && localTs > remoteTs + 400) {
                if (!isFirestoreQuotaExceeded) {
                  persistToFirestore(memoryState, true).catch(() => {});
                }
                return;
              }

              // Intelligently merge videos so locally uploaded videos are not erased
              const currentLocalVideos = memoryState.videos || [];
              const remoteVideosList = Array.isArray(remoteData.videos) ? remoteData.videos : initialChurchData.videos;
              const mergedVideos = [...currentLocalVideos];
              remoteVideosList.forEach((rv) => {
                if (!mergedVideos.some((lv) => lv.id === rv.id)) {
                  mergedVideos.push(rv);
                }
              });

              // Intelligently merge photos
              const currentLocalPhotos = memoryState.photos || [];
              const remotePhotosList = Array.isArray(remoteData.photos) ? remoteData.photos : initialChurchData.photos;
              const mergedPhotos = [...currentLocalPhotos];
              remotePhotosList.forEach((rp) => {
                if (!mergedPhotos.some((lp) => lp.id === rp.id)) {
                  mergedPhotos.push(rp);
                }
              });

              // Preserve local heroVideo if user uploaded a custom file
              const localHeroVideo = memoryState.currentActivity?.heroVideo;
              const remoteHeroVideo = remoteData.currentActivity?.heroVideo;
              const finalHeroVideo = localHeroVideo || remoteHeroVideo || initialChurchData.currentActivity.heroVideo;

              const sanitized: ChurchSettings = {
                ...initialChurchData,
                ...remoteData,
                churchName: remoteData.churchName || memoryState.churchName || initialChurchData.churchName,
                churchMotto: remoteData.churchMotto || memoryState.churchMotto || initialChurchData.churchMotto,
                churchAbout: remoteData.churchAbout || memoryState.churchAbout || initialChurchData.churchAbout,
                phone: remoteData.phone || memoryState.phone || initialChurchData.phone,
                whatsappNumber: remoteData.whatsappNumber || memoryState.whatsappNumber || initialChurchData.whatsappNumber,
                whatsappMessage: remoteData.whatsappMessage || memoryState.whatsappMessage || initialChurchData.whatsappMessage,
                email: remoteData.email || memoryState.email || initialChurchData.email,
                address: remoteData.address || memoryState.address || initialChurchData.address,
                cityCountry: remoteData.cityCountry || memoryState.cityCountry || initialChurchData.cityCountry,
                currentActivity: {
                  ...initialChurchData.currentActivity,
                  ...(memoryState.currentActivity || {}),
                  ...(remoteData.currentActivity || {}),
                  heroVideo: finalHeroVideo,
                },
                upcomingEvents: Array.isArray(remoteData.upcomingEvents) && remoteData.upcomingEvents.length > 0 
                  ? remoteData.upcomingEvents 
                  : (memoryState.upcomingEvents || initialChurchData.upcomingEvents),
                photos: mergedPhotos,
                videos: mergedVideos,
                socialLinks: Array.isArray(remoteData.socialLinks) ? remoteData.socialLinks : (memoryState.socialLinks || initialChurchData.socialLinks),
                highlights: Array.isArray(remoteData.highlights) ? remoteData.highlights : (memoryState.highlights || initialChurchData.highlights),
                testimonies: Array.isArray(remoteData.testimonies) ? remoteData.testimonies : (memoryState.testimonies || initialChurchData.testimonies),
                worshipSchedule: Array.isArray(remoteData.worshipSchedule) ? remoteData.worshipSchedule : (memoryState.worshipSchedule || initialChurchData.worshipSchedule),
                developedBy: {
                  ...initialChurchData.developedBy,
                  ...(remoteData.developedBy || {}),
                },
              };

              // Update memory state and notify listeners
              memoryState = sanitized;
              if (remoteTs > 0) {
                setStoredLocalEditTimestamp(remoteTs);
              }
              lastPersistedPayloadJson = JSON.stringify(sanitized);
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(memoryState));
                } catch {
                  // ignored
                }
              }
              listeners.forEach((l) => l());
              setLastSyncedAt(new Date());
              setSyncState('synced');
            }
          } else {
            // First time project setup: seed current memory state to Firestore only if quota allows
            if (!isFirestoreQuotaExceeded) {
              persistToFirestore(memoryState).then((success) => {
                setLastSyncedAt(new Date());
                if (success) {
                  setSyncState('synced');
                }
              });
            }
          }
          isInitialRemoteLoadDone.current = true;
        },
        (error) => {
          const errObj = error as { message?: string; code?: string };
          const errString = errObj?.message || String(error);
          const isQuota = 
            errString.includes('resource-exhausted') || 
            errString.includes('Quota limit exceeded') || 
            errString.includes('Quota exceeded') ||
            errObj?.code === 'resource-exhausted';

          if (isQuota) {
            isFirestoreQuotaExceeded = true;
            setQuotaExceededStored(true);
            setIsQuotaExceeded(true);
            setSyncState('quota_exceeded');
            // Unsubscribe immediately to prevent Firebase SDK exponential backoff retry spam
            if (unsubscribe) {
              try {
                unsubscribe();
                unsubscribe = undefined;
              } catch {}
            }
          } else {
            console.warn('Firebase onSnapshot notice:', error);
            setSyncState('offline');
          }
        }
      );
    } catch (e) {
      console.warn('Could not establish initial Firestore listener:', e);
    }

    return () => {
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch {}
      }
    };
  }, []);

  const syncNowWithCloud = useCallback(async () => {
    setSyncState('syncing');
    try {
      // Clear quota flag to test if quota has reset
      isFirestoreQuotaExceeded = false;
      setQuotaExceededStored(false);
      setIsQuotaExceeded(false);

      const ok = await persistToFirestore(memoryState, true);
      if (ok) {
        setLastSyncedAt(new Date());
        setSyncState('synced');
        setIsQuotaExceeded(false);
        setQuotaExceededStored(false);
      } else {
        setSyncState('quota_exceeded');
        setIsQuotaExceeded(true);
        setQuotaExceededStored(true);
      }
    } catch {
      setSyncState('offline');
    }
  }, []);

  const updateCurrentActivity = useCallback((activityUpdate: Partial<ChurchActivity>) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      currentActivity: {
        ...prev.currentActivity,
        ...activityUpdate,
      },
    }));
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const updateChurchInfo = useCallback((infoUpdate: Partial<ChurchSettings>) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      ...infoUpdate,
    }));
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
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
    }));
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
    }));
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const updatePhoto = useCallback((id: string, updated: Partial<PhotoItem>) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      photos: prev.photos.map((p) => (p.id === id ? { ...p, ...updated } : p)),
    }));
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const removePhoto = useCallback((id: string) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      photos: prev.photos.filter((p) => p.id !== id),
    }));
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
    }));
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const updateVideo = useCallback((id: string, updated: Partial<VideoItem>) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      videos: prev.videos.map((v) => (v.id === id ? { ...v, ...updated } : v)),
    }));
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const removeVideo = useCallback((id: string) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    deleteVideoFileBlob(id);
    updateChurchStore((prev) => ({
      ...prev,
      videos: prev.videos.filter((v) => v.id !== id),
    }));
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
    });
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const resetVideosToDefaults = useCallback(() => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    clearAllStoredVideoBlobs();
    updateChurchStore((prev) => ({
      ...prev,
      videos: initialChurchData.videos,
    }));
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const clearAllOldVideos = useCallback(() => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    clearAllStoredVideoBlobs();
    updateChurchStore((prev) => ({
      ...prev,
      videos: [],
    }));
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
    }));
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const updateUpcomingEvent = useCallback((id: string, updated: Partial<ChurchEvent>) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      upcomingEvents: prev.upcomingEvents.map((ev) => (ev.id === id ? { ...ev, ...updated } : ev)),
    }));
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const removeUpcomingEvent = useCallback((id: string) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      upcomingEvents: prev.upcomingEvents.filter((ev) => ev.id !== id),
    }));
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
    }));
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
    }));
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
    }));
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const removeHighlight = useCallback((id: string) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      highlights: prev.highlights.filter((item) => item.id !== id),
    }));
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const resetHighlightsToDefaults = useCallback(() => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      highlights: initialChurchData.highlights,
    }));
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
    }));
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
    });
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const addWorshipScheduleItem = useCallback((item: { day: string; time: string; name: string }) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      worshipSchedule: [...prev.worshipSchedule, item],
    }));
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const removeWorshipScheduleItem = useCallback((index: number) => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    updateChurchStore((prev) => ({
      ...prev,
      worshipSchedule: prev.worshipSchedule.filter((_, idx) => idx !== index),
    }));
    setLastSyncedAt(new Date());
    if (!isFirestoreQuotaExceeded) setSyncState('synced');
  }, []);

  const resetToDefaults = useCallback(() => {
    setSyncState(isFirestoreQuotaExceeded ? 'quota_exceeded' : 'syncing');
    clearAllStoredVideoBlobs();
    clearHeroVideoBlob();
    updateChurchStore(() => initialChurchData);
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

