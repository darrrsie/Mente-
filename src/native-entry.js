import './app.js';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  App.addListener('appStateChange', ({ isActive }) => window.jardimPause?.(!isActive)).catch(console.error);
  App.addListener('backButton', () => {
    if (!window.jardimBack?.()) App.minimizeApp().catch(console.error);
  }).catch(console.error);
}
