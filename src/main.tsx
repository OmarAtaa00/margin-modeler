import React from 'react';
import ReactDOM from 'react-dom/client';
import App, {
  initializeProjectPersistence
} from './App';
import './App.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element was not found.');
}

const startApplication = async (): Promise<void> => {
  // Load or migrate the saved workspace before rendering
  // the application.
  await initializeProjectPersistence();

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

void startApplication();