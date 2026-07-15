import LegacyMLBDashboard from '../MLBDashboard_field_complete.jsx';

/**
 * Production app entry point introduced during Phase 2 modernization.
 *
 * The dashboard still renders the stabilized legacy prototype component while
 * the large file is incrementally decomposed into app, data, services, utils,
 * and component modules. Keeping this wrapper behavior-only avoids another UI
 * regression while giving future phases a stable import path.
 */
export default function MLBDashboard() {
  return <LegacyMLBDashboard />;
}
