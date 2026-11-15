import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import de from '../../../public/i18n/de.json';
import en from '../../../public/i18n/en.json';
import es from '../../../public/i18n/es.json';
import fr from '../../../public/i18n/fr.json';
import { App } from '../app';
import { appConfig } from '../app.config';
import { LanguageService } from './language.service';

describe('Games HTTP translations', () => {
  it('loads the default and linked language, then fetches new selections on demand', async () => {
    const storageKey = 'netroot.games.language';
    const previous = localStorage.getItem(storageKey);
    localStorage.removeItem(storageKey);
    history.replaceState(null, '', '/?lang=fr');

    try {
      TestBed.configureTestingModule({ providers: [...appConfig.providers, provideHttpClientTesting()] });
      const http = TestBed.inject(HttpTestingController);
      const fixture = TestBed.createComponent(App);
      const router = TestBed.inject(Router);
      const navigation = router.navigateByUrl('/games/not-a-game');
      http.expectOne('./i18n/de.json').flush(de);
      http.expectOne('./i18n/fr.json').flush(fr);
      await navigation;
      await fixture.whenStable();

      const heading = () => (fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent;
      expect(heading()).toBe(fr.pages.notFound.title);
      expect(document.title).toBe('Page introuvable | NetRoot Games');
      http.expectNone('./i18n/en.json');
      http.expectNone('./i18n/es.json');

      const locale = TestBed.inject(LanguageService);
      for (const [language, dictionary] of [['en', en], ['es', es]] as const) {
        locale.select(language);
        http.expectOne('./i18n/' + language + '.json').flush(dictionary);
        await fixture.whenStable();
        expect(heading()).toBe(dictionary.pages.notFound.title);
      }
      locale.select('de');
      await fixture.whenStable();
      expect(heading()).toBe(de.pages.notFound.title);
      http.verify();
    } finally {
      history.replaceState(null, '', '/');
      if (previous === null) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, previous);
    }
  });
});
