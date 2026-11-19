import { mergeApplicationConfig } from '@angular/core';
import { PrerenderFallback, provideServerRendering, RenderMode, ServerRoute, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { languages, localizedUrl } from './i18n/localized-url';

const publicRoutes: ServerRoute[] = languages.flatMap<ServerRoute>(language => [
  { path: localizedUrl('/', language).slice(1), renderMode: RenderMode.Prerender },
  {
    path: localizedUrl('/games/:slug/details', language).slice(1),
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client,
    getPrerenderParams: async () => [{ slug: 'brick-breaker' }],
  },
]);

export const serverConfig = mergeApplicationConfig(appConfig, {
  providers: [
    provideServerRendering(withRoutes([...publicRoutes, { path: '**', renderMode: RenderMode.Client }])),
  ],
});
