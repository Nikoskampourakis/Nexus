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
import { ChatSession, ChatFolder, VirtualModel, PersonalizationConfig } from '../types';

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
  }
};
