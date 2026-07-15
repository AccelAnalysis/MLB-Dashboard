import { useEffect, useRef, useState } from 'react';
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

/**
 * Production app entry point.
 *
 * Phase 4 keeps the stabilized legacy dashboard intact and uses this wrapper as
 * the shared-backend boundary. Local storage remains an immediate cache. Once
 * Supabase is configured and an authenticated active user exists, the wrapper:
 *
 * 1. Hydrates the local cache from the shared production dataset.
 * 2. Remounts the legacy UI so it reads the shared records.
 * 3. Debounces local edits back to the shared repository.
 * 4. Refreshes the cache when realtime database changes arrive.
 *
 * An empty remote database is never populated automatically; bootstrap is an
 * explicit admin operation handled by the backend administration service.
 */
export default function MLBDashboard() {
  const [instanceKey, setInstanceKey] = useState(0);
  const disposedRef = useRef(false);
  const sharedReadyRef = useRef(false);
  const lastLocalSnapshotRef = useRef('');
  const saveTimerRef = useRef(null);
  const refreshTimerRef = useRef(null);

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

      saveProjects(projects);
      setInstanceKey((current) => current + 1);
    };

    const refreshFromRemote = async () => {
      if (!sharedReadyRef.current || disposedRef.current) return;
      const result = await loadSharedProjects(readLocalProjects());
      emitStatus({ operation: 'refresh', ...result });

      if (result.usedRemote && !disposedRef.current) {
        applyRemoteProjects(result.projects);
      }
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

      pollTimer = window.setInterval(() => {
        if (!sharedReadyRef.current || disposedRef.current) return;

        const projects = readLocalProjects();
        const snapshot = serializeProjects(projects);
        if (snapshot === lastLocalSnapshotRef.current) return;

        scheduleRemoteSave(projects, snapshot);
      }, 1000);
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
  }, []);

  return <LegacyMLBDashboard key={instanceKey} />;
}
