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

const AuthContext = createContext(null);

const loadingSnapshot = {
  ready: false,
  authenticated: false,
  accessState: 'loading',
  profile: null,
  user: null,
  session: null,
  error: null,
  recoveryRequired: false,
};

export function AuthProvider({ children }) {
  const [snapshot, setSnapshot] = useState(loadingSnapshot);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState(null);

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
  }, []);

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
  }, []);

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
  }, []);

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
  }, []);

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
      await updatePassword(password);
      const next = await getAuthSnapshot({ recordLogin: false });
      setSnapshot({ ...next, recoveryRequired: false, event: 'USER_UPDATED' });
      return next;
    } catch (error) {
      setActionError(error);
      throw error;
    } finally {
      setWorking(false);
    }
  }, []);

  const changeDisplayName = useCallback(async (displayName) => {
    setWorking(true);
    setActionError(null);
    try {
      const profile = await updateMyDisplayName(displayName);
      setSnapshot((current) => ({ ...current, profile }));
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
