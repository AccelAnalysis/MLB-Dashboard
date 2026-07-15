import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './auth/AuthContext.jsx';
import AuthenticationGate from './components/auth/AuthenticationGate.jsx';
import MLBDashboard from './app/MLBDashboard.jsx';
import './index.css';
import './phase-1-stabilization.css';
import './modal-contrast.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AuthenticationGate>
        <MLBDashboard />
      </AuthenticationGate>
    </AuthProvider>
  </React.StrictMode>,
);
