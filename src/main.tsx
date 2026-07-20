import React from 'react';
import ReactDOM from 'react-dom/client';
import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import App, {
  flushProjectPersistence,
  initializeProjectPersistence
} from './App';
import './App.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element was not found.');
}

const registerClosePersistenceHandler =
  async (): Promise<void> => {
    if (!isTauri()) {
      return;
    }

    const appWindow = getCurrentWindow();

    await appWindow.onCloseRequested(async (event) => {
      event.preventDefault();

      try {
        await flushProjectPersistence();
      } catch (error) {
        console.error(
          'Could not finish saving before the window closed:',
          error
        );
      } finally {
        await appWindow.destroy();
      }
    });
  };

const startApplication = async (): Promise<void> => {
  // Load or migrate the saved workspace before rendering
  // the application.
  await initializeProjectPersistence();
  await registerClosePersistenceHandler();

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

void startApplication();