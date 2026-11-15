import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TranslateService } from '@ngx-translate/core';
import { routes } from '../../app.routes';
import { testTranslationProviders } from '../../i18n/translation-testing';

describe('PageNotFoundComponent', () => {
  it('renders a translated error page for an unknown nested URL', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), testTranslationProviders],
    });
    TestBed.inject(TranslateService).use('fr').subscribe();

    const path = '/games/not-a-game';
    const harness = await RouterTestingHarness.create(path);
    expect(TestBed.inject(Router).url).toBe(path);
    expect(document.title).toBe('Page introuvable | NetRoot Games');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Page introuvable');
    expect(harness.routeNativeElement?.querySelector('img')?.getAttribute('src')).toBe('/images/404.jpg');
    expect(harness.routeNativeElement?.querySelector('a')?.getAttribute('href')).toBe('/');
  });
});
