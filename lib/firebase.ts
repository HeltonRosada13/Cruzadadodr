import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId || 'ai-studio-igrejacatedralde-1689f903-4252-4c97-842d-c7bb1fa516bf';
  db = getFirestore(app, firestoreDatabaseId);
  auth = getAuth(app);
} catch (error) {
  console.warn('Firebase initialization notice:', error);
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId || 'ai-studio-igrejacatedralde-1689f903-4252-4c97-842d-c7bb1fa516bf';
  db = getFirestore(app, firestoreDatabaseId);
  auth = getAuth(app);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errCode = (error as { code?: string })?.code;
  const isQuotaErr = 
    errMessage.includes('resource-exhausted') || 
    errMessage.includes('Quota limit exceeded') || 
    errMessage.includes('Quota exceeded') ||
    errMessage.includes('Write stream exhausted') ||
    errMessage.includes('maximum backoff delay') ||
    errCode === 'resource-exhausted';

  if (isQuotaErr) {
    console.warn(`[Firestore Quota] Limite diário do plano gratuito atingido para ${operationType} em "${path}". A aplicação está a operar em modo local/offline.`);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
}

export { app, db, auth, doc, setDoc, getDoc, onSnapshot, collection, addDoc, serverTimestamp };

