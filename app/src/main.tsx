import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyColorMode, setupChannel } from './lib/channel';
import { getThemePref } from './lib/storage';
import './styles/global.css';

setupChannel();
applyColorMode(getThemePref());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
