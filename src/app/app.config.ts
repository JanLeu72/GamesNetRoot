import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter, RouteReuseStrategy, TitleStrategy } from '@angular/router';
import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { DEFAULT_LANGUAGE } from './i18n/localized-url';
import { GamesTitleStrategy } from './i18n/games-title.strategy';
import { GameRouteReuse } from './i18n/game-route-reuse';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: TitleStrategy, useClass: GamesTitleStrategy },
    { provide: RouteReuseStrategy, useClass: GameRouteReuse },
    provideAnimationsAsync(),
    provideClientHydration(),
    provideHttpClient(),
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: '/i18n/',
        suffix: '.json',
      }),
      fallbackLang: DEFAULT_LANGUAGE,
      lang: DEFAULT_LANGUAGE,
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
