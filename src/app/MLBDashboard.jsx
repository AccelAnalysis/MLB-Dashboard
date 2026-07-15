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
  isSharedProjectBackendEnabled,
  loadSharedProjects,
  subscribeToSharedProjectChanges,
} from '../services/sharedProjectStorage';
import {
  loadSalesActivity,
  loadSharedSalesActivity,
  saveSalesActivity,
  saveSharedSalesActivity,
  subscribeToSharedSalesActivity,
} from '../services/salesActivityStorage';

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
  const refreshTimerRef = useRef(null);
  const productionReadyRef = useRef(Promise.resolve());
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

    const initialization = initializeLegacyWorkflowProduction({ projects: loadProjects(), profile });
    productionReadyRef.current = initialization;
    initialization
      .then(() => {
        if (!active) return;
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
        .then(() => productionReadyRef.current.catch(() => {}))
        .then(() => syncLegacyProjectsToProduction({
          projects,
          previousProjects,
          profile,
          capabilities,
        }))
        .then((result) => {
          if (result?.saved || result?.reason === 'NO_NORMALIZED_CHANGES') {
            setInstanceKey((current) => current + 1);
          }
        })
        .catch((error) => {
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

    const emitStatus = (detail) => {
      window.dispatchEvent(new CustomEvent('mlb-shared-backend-status', { detail }));
    };

    const readLocalProjects = () => loadProjects();

    const applyRemoteProjects = (projects) => {
      const nextSnapshot = serializeProjects(projects);
      const currentSnapshot = serializeProjects(readLocalProjects());
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

    const initializeSharedBackend = async () => {
      await productionReadyRef.current.catch(() => {});
      const localProjects = readLocalProjects();
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
    };

    initializeSharedBackend();

    return () => {
      disposedRef.current = true;
      sharedReadyRef.current = false;
      unsubscribe();
      window.clearTimeout(refreshTimerRef.current);
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!profile) return undefined;
    let disposed = false;
    let unsubscribe = () => {};
    let refreshTimer = null;

    const hydrate = async () => {
      const localRecords = loadSalesActivity();
      const result = await loadSharedSalesActivity(localRecords);
      if (disposed) return;
      if (result.usedRemote) {
        saveSalesActivity(result.records, { force: true });
        setInstanceKey((current) => current + 1);
      } else if (result.available && result.reason === 'REMOTE_SALES_ACTIVITY_EMPTY' && localRecords.length) {
        await saveSharedSalesActivity(localRecords);
      }
    };

    const handleLocalSave = (event) => {
      saveSharedSalesActivity(event.detail?.records || loadSalesActivity())
        .catch((error) => setAuthorizationMessage(error.message || 'Unable to sync sales activity.'));
    };
    const scheduleHydrate = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(hydrate, 250);
    };

    window.addEventListener('mlb-sales-activity-saved', handleLocalSave);
    hydrate().then(() => {
      if (!disposed) unsubscribe = subscribeToSharedSalesActivity(scheduleHydrate);
    });

    return () => {
      disposed = true;
      unsubscribe();
      window.clearTimeout(refreshTimer);
      window.removeEventListener('mlb-sales-activity-saved', handleLocalSave);
    };
  }, [profile?.id]);

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
