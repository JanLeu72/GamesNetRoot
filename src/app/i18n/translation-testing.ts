import { provideTranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import de from '../../../public/i18n/de.json';
import en from '../../../public/i18n/en.json';
import es from '../../../public/i18n/es.json';
import fr from '../../../public/i18n/fr.json';
import { DEFAULT_LANGUAGE } from './localized-url';

const translations = new Map([['de', de], ['en', en], ['es', es], ['fr', fr]]);

export const testTranslationProviders = provideTranslateService({
  fallbackLang: DEFAULT_LANGUAGE,
  lang: DEFAULT_LANGUAGE,
  loader: provideTranslateLoader(() => ({
    getTranslation: (language: string) => of(translations.get(language) ?? de),
  })),
});
