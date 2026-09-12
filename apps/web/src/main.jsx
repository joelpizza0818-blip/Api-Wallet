import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import './styles/reset.css';
import './styles/variables.css';
import './styles/globals.css';
import ErrorBoundary from './components/common/ErrorBoundary/ErrorBoundary';
import { installClientErrorLogging } from './utils/clientLogger';
import { checkForDesktopUpdates } from './utils/desktopUpdater';

installClientErrorLogging();
checkForDesktopUpdates();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </React.StrictMode>
);
