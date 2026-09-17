import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
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
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
