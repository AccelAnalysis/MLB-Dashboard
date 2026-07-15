import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { CAPABILITY } from '../auth/permissions';
import BackendAdminPanel from '../components/admin/BackendAdminPanel.jsx';
import UserAdminPanel from '../components/admin/UserAdminPanel.jsx';
import AccountControl from '../components/auth/AccountControl.jsx';
import LegacyMLBDashboard from '../MLBDashboard_field_complete.jsx';
import {
  initializeLegacyWorkflowProduction,
  syncLegacyProjectsToProduction,
} from '../services/legacyWorkflowSyncService';
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
      Read-only role: you may review authorized records, but unauthorized changes are discarded.
    </div>
  );
}

/**
 * Production application entry point.
 *
 * The stabilized New Project -> Open File -> Edit Project workflow remains the
 * only operator entry surface. Successful project-file saves are reconciled into
 * the normalized Phase 6 customer/job/scope backend, including validation,
 * revision metadata, activity history, status history, and archive/void behavior.
 */
export default function MLBDashboard() {
  const auth = useAuth();
  const profile = auth.profile;
  const capabilities = profile?.capabilities || {};
  const canManageUsers = Boolean(capabilities[CAPABILITY.MANAGE_USERS]);
  const canManageBackend = Boolean(capabilities[CAPABILITY.MANAGE_BACKEND]);
  const canWriteSharedData = Boolean(
    capabilities[CAPABILITY.MANAGE_SALES_DATA]
    || capabilities[CAPABILITY.MANAGE_PRODUCTION_DATA]
    || capabilities[CAPABILITY.MANAGE_FINANCIAL_DATA],
  );

  const [instanceKey, setInstanceKey] = useState(0);
  const [authorizationMessage, setAuthorizationMessage] = useState('');
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
  const productionSyncQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    if (capabilities[CAPABILITY.WALLBOARD_ONLY]) prepareWallboardOnlyUrl();
  }, [capabilities]);

  useEffect(() => {
    removeQueryFlag('manualEntry');
  }, []);

  useEffect(() => {
    const handleBackendAdmin = () => {
      if (canManageBackend) setBackendAdminOpen(true);
    };
    const handleUserAdmin = () => {
      if (canManageUsers) setUserAdminOpen(true);
    };
    const handleAuthorizationDenied = (event) => {
      setAuthorizationMessage(event.detail?.message || 'Your role cannot save that change.');
      setInstanceKey((current) => current + 1);
    };

    window.addEventListener('mlb-open-backend-admin', handleBackendAdmin);
    window.addEventListener('mlb-open-user-admin', handleUserAdmin);
    window.addEventListener('mlb-authorization-denied', handleAuthorizationDenied);
    return () => {
      window.removeEventListener('mlb-open-backend-admin', handleBackendAdmin);
      window.removeEventListener('mlb-open-user-admin', handleUserAdmin);
      window.removeEventListener('mlb-authorization-denied', handleAuthorizationDenied);
    };
  }, [canManageBackend, canManageUsers]);

  useEffect(() => {
    if (!profile) return undefined;
    let active = true;

    initializeLegacyWorkflowProduction({ projects: loadProjects(), profile })
      .then(() => {
        if (!active) return;
        lastLocalSnapshotRef.current = serializeProjects(loadProjects());
        setInstanceKey((current) => current + 1);
      })
      .catch((error) => {
        if (active) setAuthorizationMessage(error.message || 'Unable to initialize normalized production records.');
      });

    return () => {
      active = false;
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!profile) return undefined;

    const handleLegacyProjectSave = (event) => {
      const detail = event.detail || {};
      const projects = detail.projects || loadProjects();
      const previousProjects = detail.previousProjects || [];

      productionSyncQueueRef.current = productionSyncQueueRef.current
        .catch(() => {})
        .then(() => syncLegacyProjectsToProduction({
          projects,
          previousProjects,
          profile,
          capabilities,
        }))
        .then((result) => {
          lastLocalSnapshotRef.current = serializeProjects(loadProjects());
          if (result?.saved || result?.reason === 'NO_NORMALIZED_CHANGES') {
            setInstanceKey((current) => current + 1);
          }
        })
        .catch((error) => {
          lastLocalSnapshotRef.current = serializeProjects(loadProjects());
          setAuthorizationMessage(error.message || 'The normalized production backend rejected the project-file change.');
          setInstanceKey((current) => current + 1);
        });
    };

    window.addEventListener('mlb-legacy-projects-saved', handleLegacyProjectSave);
    return () => window.removeEventListener('mlb-legacy-projects-saved', handleLegacyProjectSave);
  }, [profile, capabilities]);

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
        if (!result.saved && result.error) {
          setAuthorizationMessage(result.error.message || 'The shared backend rejected the change.');
          setInstanceKey((current) => current + 1);
        }
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

      if (canWriteSharedData) {
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
  }, [canWriteSharedData, profile?.id]);

  return (
    <>
      {authorizationMessage && (
        <div className="fixed left-1/2 top-4 z-[100] w-[min(92vw,760px)] -translate-x-1/2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-950 shadow-2xl" role="alert">
          <div className="flex items-start justify-between gap-4">
            <span>{authorizationMessage}</span>
            <button type="button" onClick={() => setAuthorizationMessage('')} className="text-xs font-black uppercase text-amber-800">Dismiss</button>
          </div>
        </div>
      )}

      <LegacyMLBDashboard key={instanceKey} />
      <ReadOnlyNotice profile={profile} />
      <AccountControl
        onOpenUsers={() => canManageUsers && setUserAdminOpen(true)}
        onOpenBackend={() => canManageBackend && setBackendAdminOpen(true)}
      />
      <BackendAdminPanel
        open={backendAdminOpen && canManageBackend}
        onClose={() => {
          setBackendAdminOpen(false);
          removeQueryFlag('backendAdmin');
        }}
      />
      <UserAdminPanel
        open={userAdminOpen && canManageUsers}
        onClose={() => {
          setUserAdminOpen(false);
          removeQueryFlag('userAdmin');
        }}
        actorProfile={profile}
      />
    </>
  );
}
