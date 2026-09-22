import { 
  signInWithPopup, 
  signInWithCredential, 
  signInAnonymously, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../src/lib/firebase';
import firebaseConfig from '../firebase-applet-config.json';


// Workspace OAuth Scopes configured for user's apps
export const WORKSPACE_SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/tasks',
];

const provider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => {
  provider.addScope(scope);
});
provider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to track ongoing sign in flow
let isSigningIn = false;

// In-memory token storage
let cachedAccessToken: string | null = null;

export interface AuthState {
  user: User | null;
  hasToken: boolean;
  isLoggingIn: boolean;
  error: string | null;
}

// Global event listeners for token state changes
type AuthCallback = (user: User | null, token: string | null) => void;
const listeners: Set<AuthCallback> = new Set();

function notifyListeners(user: User | null, token: string | null) {
  listeners.forEach((cb) => {
    try {
      cb(user, token);
    } catch (e) {
      console.error('Error in auth listener:', e);
    }
  });
}

export function subscribeAuth(callback: AuthCallback): () => void {
  listeners.add(callback);
  callback(auth ? auth.currentUser : null, cachedAccessToken);
  return () => {
    listeners.delete(callback);
  };
}

// Initialize auth state listener. Call on app mount.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (!auth) {
    if (onAuthFailure) onAuthFailure();
    notifyListeners(null, null);
    return () => {};
  }
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
        notifyListeners(user, cachedAccessToken);
      } else if (!isSigningIn) {
        notifyListeners(user, null);
      }
    } else {
      // Auto sign-in anonymously if no user is signed in to enable Firestore security rules
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.warn('Anonymous auth auto-init notice:', err);
      }
      if (onAuthFailure) onAuthFailure();
      notifyListeners(auth?.currentUser || null, null);
    }
  });
};

// Helper for Google Identity Services (GIS) Token Request
const requestGSIToken = (clientId: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !(window as any).google?.accounts?.oauth2) {
      return reject(new Error('Google Identity Services client script not loaded.'));
    }
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: WORKSPACE_SCOPES.join(' '),
      callback: (response: any) => {
        if (response.error) {
          reject(new Error(`GSI OAuth Error: ${response.error_description || response.error}`));
        } else if (response.access_token) {
          resolve(response.access_token);
        } else {
          reject(new Error('No access token returned from Google Identity Services.'));
        }
      },
      error_callback: (err: any) => {
        reject(new Error(err.message || 'GSI token request failed'));
      }
    });
    client.requestAccessToken({ prompt: 'select_account' });
  });
};

// Interactive Google Sign-In with popup + GIS fallback
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    let user: User | null = null;
    let accessToken: string | null = null;

    // Strategy 1: Try Google Identity Services (GIS) Token Client first (bypasses iframe authDomain CORS)
    const clientId = (firebaseConfig as any).oAuthClientId;
    if (clientId && typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      try {
        accessToken = await requestGSIToken(clientId);
        if (accessToken) {
          if (auth) {
            const credential = GoogleAuthProvider.credential(null, accessToken);
            const userCredential = await signInWithCredential(auth, credential);
            user = userCredential.user;
          } else {
            // Synthesize user object with basic profile
            user = {
              uid: 'gis-user-' + Math.random().toString(36).substring(2, 9),
              email: 'workspace-user@google.com',
              displayName: 'Workspace User',
              photoURL: null,
            } as unknown as User;
          }
        }
      } catch (gisError) {
        console.warn('GIS Token Client skipped or unavailable, falling back to signInWithPopup:', gisError);
      }
    }

    // Strategy 2: Fall back to signInWithPopup
    if (!accessToken || !user) {
      if (!auth) {
        throw new Error('Google Sign-In requires configuring VITE_FIREBASE_API_KEY in your settings/secrets or opening in a standard tab with Google Identity Services.');
      }
      try {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          accessToken = credential.accessToken;
          user = result.user;
        }
      } catch (popupError: any) {
        if (popupError.code === 'auth/network-request-failed' || popupError.message?.includes('network-request-failed')) {
          throw new Error('Google Sign-In popup was blocked by browser iframe cross-origin restrictions. Please click "Open in New Tab" above or in Connect Hub to sign in directly.');
        }
        throw popupError;
      }
    }

    if (!user || !accessToken) {
      throw new Error('Failed to acquire Google access token.');
    }

    cachedAccessToken = accessToken;
    notifyListeners(user, cachedAccessToken);
    return { user, accessToken };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Retrieve current cached token
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// Retrieve current Firebase user
export const getCurrentUser = (): User | null => {
  return auth ? auth.currentUser : null;
};

// Disconnect / Sign out
export const logout = async () => {
  try {
    if (auth) {
      await signOut(auth);
    }
  } finally {
    cachedAccessToken = null;
    notifyListeners(null, null);
  }
};
