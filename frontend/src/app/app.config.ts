import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import Aura from '@primeuix/themes/aura';
import { HttpClientModule } from '@angular/common/http';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';


const firebaseConfig = {
  apiKey: "AIzaSyDdxTBst5NLU666xL4850IEq3Bgo1ueQ6Q",
  authDomain: "coaching-center-b47a4.firebaseapp.com",
  projectId: "coaching-center-b47a4",
  storageBucket: "coaching-center-b47a4.firebasestorage.app",
  messagingSenderId: "94765799379",
  appId: "1:94765799379:web:fbf589efaf113ce4c44126",
  measurementId: "G-4XWWCV5KH3"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    importProvidersFrom(HttpClientModule), 
    provideAnimationsAsync(),
        providePrimeNG({
            theme: {
                preset: Aura
            }
        }),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes), provideClientHydration(withEventReplay())
  ]
};
