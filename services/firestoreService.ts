import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  updateDoc,
  onSnapshot,
  orderBy,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from '../src/lib/firebase';
import { ChatSession, ChatFolder, VirtualModel, PersonalizationConfig, GeneratedImageItem } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
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
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore
export async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

// Collection references helper
const getSessionsRef = () => db ? collection(db, 'chatSessions') : null;
const getFoldersRef = () => db ? collection(db, 'chatFolders') : null;
const getModelsRef = () => db ? collection(db, 'virtualModels') : null;
const getUsersRef = () => db ? collection(db, 'users') : null;
const getImageCreationsRef = () => db ? collection(db, 'imageCreations') : null;
const getStatisticsRef = () => db ? collection(db, 'userStatistics') : null;

// User Settings
export const saveUserSettings = async (userId: string, data: Partial<{ personalization: PersonalizationConfig, themeId: string }>) => {
  const usersRef = getUsersRef();
  if (!db || !usersRef) return;
  const path = `users/${userId}`;
  try {
    await setDoc(doc(usersRef, userId), {
      ...data,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getUserSettings = async (userId: string) => {
  const usersRef = getUsersRef();
  if (!db || !usersRef) return null;
  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(usersRef, userId));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

// Chat Sessions
export const saveChatSession = async (userId: string, session: ChatSession) => {
  const sessionsRef = getSessionsRef();
  if (!db || !sessionsRef) return;
  const path = `chatSessions/${session.id}`;
  try {
    await setDoc(doc(sessionsRef, session.id), {
      ...session,
      userId,
      updatedAt: Date.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteChatSession = async (sessionId: string) => {
  const sessionsRef = getSessionsRef();
  if (!db || !sessionsRef) return;
  const path = `chatSessions/${sessionId}`;
  try {
    await deleteDoc(doc(sessionsRef, sessionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const subscribeToSessions = (userId: string, callback: (sessions: ChatSession[]) => void) => {
  const sessionsRef = getSessionsRef();
  if (!db || !sessionsRef) {
    return () => {};
  }
  const path = 'chatSessions';
  const q = query(
    sessionsRef, 
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc')
  );
  
  return onSnapshot(q, (snap) => {
    const sessions = snap.docs.map(doc => doc.data() as ChatSession);
    callback(sessions);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
};

// Chat Folders
export const saveFolder = async (userId: string, folder: ChatFolder) => {
  const foldersRef = getFoldersRef();
  if (!db || !foldersRef) return;
  const path = `chatFolders/${folder.id}`;
  try {
    await setDoc(doc(foldersRef, folder.id), {
      ...folder,
      userId
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteFolder = async (folderId: string) => {
  const foldersRef = getFoldersRef();
  if (!db || !foldersRef) return;
  const path = `chatFolders/${folderId}`;
  try {
    await deleteDoc(doc(foldersRef, folderId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const getFolders = async (userId: string) => {
  const foldersRef = getFoldersRef();
  if (!db || !foldersRef) return [];
  const path = 'chatFolders';
  try {
    const q = query(foldersRef, where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as ChatFolder);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

// Virtual Models
export const saveVirtualModel = async (userId: string, model: VirtualModel) => {
  const modelsRef = getModelsRef();
  if (!db || !modelsRef) return;
  const path = `virtualModels/${model.id}`;
  try {
    await setDoc(doc(modelsRef, model.id), {
      ...model,
      userId
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteVirtualModel = async (modelId: string) => {
  const modelsRef = getModelsRef();
  if (!db || !modelsRef) return;
  const path = `virtualModels/${modelId}`;
  try {
    await deleteDoc(doc(modelsRef, modelId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const getVirtualModels = async (userId: string) => {
  const modelsRef = getModelsRef();
  if (!db || !modelsRef) return [];
  const path = 'virtualModels';
  try {
    const q = query(modelsRef, where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as VirtualModel);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
};

// ============================================================================
// Image Creations (Styles & Create, Imagine Scene, Remove Objects, Extend, Perspective)
// ============================================================================

export const saveImageCreation = async (userId: string, item: GeneratedImageItem): Promise<void> => {
  const creationsRef = getImageCreationsRef();
  if (!db || !creationsRef) return;
  const path = `imageCreations/${item.id}`;
  try {
    // Keep document payload safe from exceeding Firestore 1MB limits
    // If url is exceedingly long (> 700KB base64), optimize/trim or store reference
    let safeUrl = item.url;
    let safeThumbnail = item.url;
    
    // Create compact payload
    const creationDoc = {
      id: item.id,
      userId,
      prompt: (item.prompt || 'Generated Creation').slice(0, 2048),
      url: safeUrl,
      thumbnailUrl: safeThumbnail,
      editType: item.editType || 'initial',
      style: item.style || '',
      aspectRatio: item.aspectRatio || '1:1',
      createdAt: item.createdAt || Date.now(),
      editNote: item.editNote || ''
    };

    await setDoc(doc(creationsRef, item.id), creationDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteImageCreation = async (creationId: string): Promise<void> => {
  const creationsRef = getImageCreationsRef();
  if (!db || !creationsRef) return;
  const path = `imageCreations/${creationId}`;
  try {
    await deleteDoc(doc(creationsRef, creationId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const getUserImageCreations = async (userId: string): Promise<GeneratedImageItem[]> => {
  const creationsRef = getImageCreationsRef();
  if (!db || !creationsRef) return [];
  const path = 'imageCreations';
  try {
    const q = query(
      creationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as GeneratedImageItem);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
};

export const subscribeToUserCreations = (
  userId: string,
  callback: (items: GeneratedImageItem[]) => void
): (() => void) => {
  const creationsRef = getImageCreationsRef();
  if (!db || !creationsRef) {
    return () => {};
  }
  const path = 'imageCreations';
  const q = query(
    creationsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map(doc => doc.data() as GeneratedImageItem);
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
};

// ============================================================================
// User Activity Statistics
// ============================================================================

export const saveUserStatisticsToFirebase = async (userId: string, stats: any): Promise<void> => {
  const statsRef = getStatisticsRef();
  if (!db || !statsRef) return;
  const path = `userStatistics/${userId}`;
  try {
    await setDoc(doc(statsRef, userId), {
      userId,
      ...stats,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getUserStatisticsFromFirebase = async (userId: string): Promise<any | null> => {
  const statsRef = getStatisticsRef();
  if (!db || !statsRef) return null;
  const path = `userStatistics/${userId}`;
  try {
    const snap = await getDoc(doc(statsRef, userId));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

