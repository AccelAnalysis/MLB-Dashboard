import { useEffect, useRef, useState } from 'react';
import { AuthProvider, useAuth } from '../auth/AuthContext.jsx';
import BackendAdminPanel from '../components/admin/BackendAdminPanel.jsx';
import UserAdministrationPanel from '../components/admin/UserAdministrationPanel.jsx';
import AccountControl from '../components/auth/AccountControl.jsx';
import AuthGate from '../components/auth/AuthGate.jsx';
import LegacyMLBDashboard from '../MLBDashboard_field_complete.jsx';
import { loadProjects, saveProjects } from '../services/projectStorage';
import {
  getSharedSyncDebounceMs,
  isSharedProjectBackendEnabled,
  loadSharedProjects,
  saveSharedProjects,
  subscribeToSharedProjectChanges,
} from '../services/sharedProjectStorage';

const serializeProjects = (projects) => JSON.stringify(projects || []);

const removeQueryFlag = (name) => {
  const params = new URLSearchParams(window.location.search);
  params.delete(name);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  window.history.replaceState(null, '', `${window.location.pathname}${suffix}${window.location.hash}`);
};

const prepareWallboardOnlyUrl = () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('area') === 'wallboard' && params.get('display') === '1') return;
  params.set('area', 'wallboard');
  params.set('display', '1');
  params.delete('mode');
  params.delete('filter');
  window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}${window.location.hash}`);
};

function ReadOnlyNotice({ profile }) {
  const displayMode = new URLSearchParams(window.location.search).get('display') === '1';
  if (!profile?.capabilities?.readOnly || displayMode) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[65] max-w-sm rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900 shadow-lg print:hidden">
      Read-only role: you may review authorized records, but changes made in the legacy dashboard will not be persisted.
    </div>
  );
}

function DashboardRuntime() {
  const auth = useAuth();
  const capabilities = auth.profile?.capabilities || {};
  const canLegacyWrite = Boolean(capabilities.legacyFullWrite);
  const canManageUsers = Boolean(capabilities.manageUsers);
  const canManageBackend = Boolean(capabilities.backendAdministration);

  // The legacy storage service checks this synchronously before its own effects run.
  window.__MLB_LEGACY_CAN_WRITE__ = canLegacyWrite;
  window.__MLB_AUTH_CONTEXT__ = {
    profile: auth.profile,
    capabilities,
    accessState: auth.accessState,
  };

  if (capabilities.wallboardOnly) prepareWallboardOnlyUrl();

  const [instanceKey, setInstanceKey] = useState(0);
  const [backendAdminOpen, setBackendAdminOpen] = useState(
    () => canManageBackend && new URLSearchParams(window.location.search).get('backendAdmin') === '1',
  );
  const [userAdminOpen, setUserAdminOpen] = useState(
    () => canManageUsers && new URLSearchParams(window.location.search).get('userAdmin') === '1',
  );
  const disposedRef = useRef(false);
  const sharedReadyRef = useRef(false);
  const lastLocalSnapshotRef = useRef('');
  const saveTimerRef = useRef(null);
  const refreshTimerRef = useRef(null);

  const openBackendAdmin = () => {
    if (!canManageBackend) return;
    setBackendAdminOpen(true);
  };

  const openUserAdmin = () => {
    if (!canManageUsers) return;
    setUserAdminOpen(true);
  };

  useEffect(() => {
    const handleBackendAdmin = () => openBackendAdmin();
    const handleUserAdmin = () => openUserAdmin();
    window.addEventListener('mlb-open-backend-admin', handleBackendAdmin);
    window.addEventListener('mlb-open-user-admin', handleUserAdmin);
    return () => {
      window.removeEventListener('mlb-open-backend-admin', handleBackendAdmin);
      window.removeEventListener('mlb-open-user-admin', handleUserAdmin);
    };
  }, [canManageBackend, canManageUsers]);

  useEffect(() => {
    disposedRef.current = false;
    let unsubscribe = () => {};
    let pollTimer = null;

    const emitStatus = (detail) => {
      window.dispatchEvent(new CustomEvent('mlb-shared-backend-status', { detail }));
    };

    const readLocalProjects = () => loadProjects();

    const applyRemoteProjects = (projects) => {
      const nextSnapshot = serializeProjects(projects);
      const currentSnapshot = serializeProjects(readLocalProjects());
      lastLocalSnapshotRef.current = nextSnapshot;

      if (nextSnapshot === currentSnapshot || disposedRef.current) return;

      saveProjects(projects, { force: true });
      setInstanceKey((current) => current + 1);
    };

    const refreshFromRemote = async () => {
      if (!sharedReadyRef.current || disposedRef.current) return;
      const result = await loadSharedProjects(readLocalProjects());
      emitStatus({ operation: 'refresh', ...result });

      if (result.usedRemote && !disposedRef.current) applyRemoteProjects(result.projects);
    };

    const scheduleRemoteRefresh = () => {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = window.setTimeout(refreshFromRemote, 250);
    };

    const scheduleRemoteSave = (projects, snapshot) => {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(async () => {
        const result = await saveSharedProjects(projects);
        emitStatus({ operation: 'save', ...result });
        if (result.saved) lastLocalSnapshotRef.current = snapshot;
      }, getSharedSyncDebounceMs());
    };

    const initializeSharedBackend = async () => {
      const localProjects = readLocalProjects();
      lastLocalSnapshotRef.current = serializeProjects(localProjects);

      if (!isSharedProjectBackendEnabled()) {
        emitStatus({
          operation: 'initialize',
          available: false,
          usedRemote: false,
          reason: 'SHARED_BACKEND_DISABLED',
        });
        return;
      }

      const result = await loadSharedProjects(localProjects);
      emitStatus({ operation: 'initialize', ...result });
      if (disposedRef.current) return;

      sharedReadyRef.current = Boolean(result.available && result.usedRemote);

      if (result.usedRemote) {
        applyRemoteProjects(result.projects);
        unsubscribe = subscribeToSharedProjectChanges(scheduleRemoteRefresh);
      }

      if (canLegacyWrite) {
        pollTimer = window.setInterval(() => {
          if (!sharedReadyRef.current || disposedRef.current) return;

          const projects = readLocalProjects();
          const snapshot = serializeProjects(projects);
          if (snapshot === lastLocalSnapshotRef.current) return;

          scheduleRemoteSave(projects, snapshot);
        }, 1000);
      }
    };

    initializeSharedBackend();

    return () => {
      disposedRef.current = true;
      sharedReadyRef.current = false;
      unsubscribe();
      window.clearInterval(pollTimer);
      window.clearTimeout(saveTimerRef.current);
      window.clearTimeout(refreshTimerRef.current);
    };
  }, [canLegacyWrite, auth.profile?.id]);

  const closeBackendAdmin = () => {
    setBackendAdminOpen(false);
    removeQueryFlag('backendAdmin');
  };

  const closeUserAdmin = () => {
    setUserAdminOpen(false);
    removeQueryFlag('userAdmin');
  };

  return (
    <>
      <LegacyMLBDashboard key={instanceKey} />
      <ReadOnlyNotice profile={auth.profile} />
      <AccountControl onOpenUsers={openUserAdmin} onOpenBackend={openBackendAdmin} />
      <BackendAdminPanel open={backendAdminOpen && canManageBackend} onClose={closeBackendAdmin} />
      <UserAdministrationPanel open={userAdminOpen && canManageUsers} onClose={closeUserAdmin} />
    </>
  );
}

/**
 * Phase 5 production entry point.
 *
 * Supabase mode verifies both the Auth session and the linked active application
 * profile before mounting the dashboard. Local mode retains a development-owner
 * identity so the stabilized prototype remains usable without remote credentials.
 */
export default function MLBDashboard() {
  return (
    <AuthProvider>
      <AuthGate>
        <DashboardRuntime />
      </AuthGate>
    </AuthProvider>
  );
}
