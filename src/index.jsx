import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { setupIonicReact } from '@ionic/react';
import rootReducer from './store/rootReducer';
import { getAuthInitialState } from './store/auth.reducer';
import { NativeProvider } from './utils/NativeContext';
import { lockDocumentScroll } from './utils/lockDocumentScroll';
import { applyNightMode } from './utils/nightMode';
import { guestNight } from './helpers/guestCache';
import { AUTH_USER_KEY, cacheGet } from './utils/sessionCache';
import App from './components/App';
import './index.css';

lockDocumentScroll();
const savedAccount = cacheGet(AUTH_USER_KEY);
applyNightMode(savedAccount ? savedAccount.night_mode === true : guestNight());

if (typeof document !== 'undefined' && Capacitor.isNativePlatform()) {
  document.documentElement.classList.add('capacitor-native');
  document.getElementById('initial-loader')?.remove();
}

setupIonicReact(
  Capacitor.isNativePlatform()
    ? { mode: 'ios', scrollAssist: false, scrollPadding: false }
    : { mode: 'ios' }
);

const store = configureStore({
  reducer: rootReducer,
  preloadedState: {
    auth: getAuthInitialState(),
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [],
      },
    }),
});

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <NativeProvider>
          <App />
        </NativeProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
