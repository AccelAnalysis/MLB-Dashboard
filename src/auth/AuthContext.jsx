import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  getAuthSnapshot,
  sendPasswordReset,
  signInWithPassword,
  signOut,
  subscribeToAuthChanges,
  updateMyDisplayName,
  updatePassword,
} from '../services/authService';
import { setRuntimeAccessContext } from './runtimeAuthorization';

const AuthContext = createContext(null);

const loadingSnapshot = {
  mode: 'local',
  ready: false,
  authenticated: false,
  accessState: 'loading',
  profile: null,
  user: null,
  session: null,
  error: null,
  recoveryRequired: false,
};

const applyRuntimeContext = (snapshot) => {
  setRuntimeAccessContext({
    provider: snapshot?.mode || 'local',
    profile: snapshot?.profile || null,
  });
};

export function AuthProvider({ children }) {
  const [snapshot, setSnapshotState] = useState(loadingSnapshot);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState(null);

  const setSnapshot = useCallback((next) => {
    applyRuntimeContext(next);
    setSnapshotState(next);
  }, []);

  const refresh = useCallback(async () => {
    setWorking(true);
    setActionError(null);
    try {
      const next = await getAuthSnapshot({ recordLogin: true });
      setSnapshot(next);
      return next;
    } catch (error) {
      setActionError(error);
      return null;
    } finally {
      setWorking(false);
    }
  }, [setSnapshot]);

  useEffect(() => {
    let disposed = false;
    let unsubscribe = () => {};

    getAuthSnapshot({ recordLogin: true })
      .then((next) => {
        if (!disposed) setSnapshot(next);
      })
      .catch((error) => {
        if (!disposed) {
          setSnapshot({
            ...loadingSnapshot,
            ready: true,
            accessState: 'error',
            error,
          });
        }
      });

    try {
      unsubscribe = subscribeToAuthChanges((next) => {
        if (!disposed) {
          setSnapshot(next);
          setActionError(null);
        }
      });
    } catch (error) {
      setActionError(error);
    }

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [setSnapshot]);

  const login = useCallback(async (credentials) => {
    setWorking(true);
    setActionError(null);
    try {
      const next = await signInWithPassword(credentials);
      setSnapshot(next);
      return next;
    } catch (error) {
      setActionError(error);
      throw error;
    } finally {
      setWorking(false);
    }
  }, [setSnapshot]);

  const logout = useCallback(async () => {
    setWorking(true);
    setActionError(null);
    try {
      const next = await signOut();
      setSnapshot(next);
      return next;
    } catch (error) {
      setActionError(error);
      throw error;
    } finally {
      setWorking(false);
    }
  }, [setSnapshot]);

  const requestPasswordReset = useCallback(async (email) => {
    setWorking(true);
    setActionError(null);
    try {
      return await sendPasswordReset(email);
    } catch (error) {
      setActionError(error);
      throw error;
    } finally {
      setWorking(false);
    }
  }, []);

  const completePasswordRecovery = useCallback(async (password) => {
    setWorking(true);
    setActionError(null);
    try {
      const next = await updatePassword(password);
      setSnapshot({ ...next, recoveryRequired: false, event: 'USER_UPDATED' });
      return next;
    } catch (error) {
      setActionError(error);
      throw error;
    } finally {
      setWorking(false);
    }
  }, [setSnapshot]);

  const changeDisplayName = useCallback(async (displayName) => {
    setWorking(true);
    setActionError(null);
    try {
      const profile = await updateMyDisplayName(displayName);
      setSnapshotState((current) => {
        const next = { ...current, profile };
        applyRuntimeContext(next);
        return next;
      });
      return profile;
    } catch (error) {
      setActionError(error);
      throw error;
    } finally {
      setWorking(false);
    }
  }, []);

  const clearActionError = useCallback(() => setActionError(null), []);

  const value = useMemo(() => ({
    ...snapshot,
    working,
    actionError,
    accessGranted: snapshot.ready && snapshot.accessState === 'active',
    login,
    logout,
    refresh,
    requestPasswordReset,
    completePasswordRecovery,
    changeDisplayName,
    clearActionError,
  }), [
    snapshot,
    working,
    actionError,
    login,
    logout,
    refresh,
    requestPasswordReset,
    completePasswordRecovery,
    changeDisplayName,
    clearActionError,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
};
