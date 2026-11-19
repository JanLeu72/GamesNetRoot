import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import de from '../../../public/i18n/de.json';
import en from '../../../public/i18n/en.json';
import es from '../../../public/i18n/es.json';
import fr from '../../../public/i18n/fr.json';
import { App } from '../app';
import { appConfig } from '../app.config';
import { LanguageService } from './language.service';

describe('Games HTTP translations', () => {
  it('loads the default and linked language, then fetches new selections on demand', async () => {
    TestBed.configureTestingModule({ providers: [...appConfig.providers, provideHttpClientTesting()] });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const navigation = router.navigateByUrl('/games/not-a-game?lang=fr');
    http.expectOne('/i18n/de.json').flush(de);
    await vi.waitFor(() => http.expectOne('/i18n/fr.json').flush(fr));
    await navigation;
    await fixture.whenStable();

    const heading = () => (fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent;
    expect(heading()).toBe(fr.pages.notFound.title);
    expect(document.title).toBe('Page introuvable | NetRoot Games');
    http.expectNone('/i18n/en.json');
    http.expectNone('/i18n/es.json');

    const locale = TestBed.inject(LanguageService);
    for (const [language, dictionary] of [['en', en], ['es', es]] as const) {
      const selection = locale.select(language);
      await vi.waitFor(() => http.expectOne('/i18n/' + language + '.json').flush(dictionary));
      await selection;
      await fixture.whenStable();
      expect(heading()).toBe(dictionary.pages.notFound.title);
    }
    await locale.select('de');
    await fixture.whenStable();
    expect(heading()).toBe(de.pages.notFound.title);
    http.verify();
  });
});
