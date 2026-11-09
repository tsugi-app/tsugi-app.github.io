import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyColorMode } from './lib/channel';
import { getThemePref } from './lib/storage';
import './styles/global.css';

applyColorMode(getThemePref());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
