import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './lib/auth';
import { ToastProvider } from './components/Toast';
import './styles.css';
import { installMockApi } from './demo/mockApi';

// Preview build only (VITE_DEMO=1): serve the UI from an in-memory mock API.
if (import.meta.env.VITE_DEMO) installMockApi();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
