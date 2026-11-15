import { DOCUMENT, inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export const DEFAULT_LANGUAGE = 'de';
const languages = [DEFAULT_LANGUAGE, 'en', 'es', 'fr'] as const;
const storageKey = 'netroot.games.language';
type Language = typeof languages[number];

function supportedLanguage(value: string | null): Language | undefined {
  const code = value?.toLowerCase().split('-')[0];
  return languages.find(language => language === code);
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly translate = inject(TranslateService);
  private readonly browser = this.document.defaultView;
  private readonly currentLanguage = signal<Language>(DEFAULT_LANGUAGE);
  readonly language = this.currentLanguage.asReadonly();

  constructor() {
    const incoming = new URLSearchParams(this.browser?.location.search).get('lang');
    const navigator = this.browser?.navigator;
    const browserLanguages = [...(navigator?.languages ?? []), navigator?.language ?? ''];
    const detected = browserLanguages.map(supportedLanguage).find(language => language !== undefined);
    this.apply(this.savedLanguage() ?? supportedLanguage(incoming) ?? detected ?? DEFAULT_LANGUAGE);
  }

  select(value: string): void {
    const language = supportedLanguage(value);
    if (!language) return;
    this.apply(language);
    try {
      this.browser?.localStorage.setItem(storageKey, language);
    } catch {
      // The choice still applies in the current tab.
    }
  }

  private savedLanguage(): Language | undefined {
    try {
      return supportedLanguage(this.browser?.localStorage.getItem(storageKey) ?? null);
    } catch {
      return undefined;
    }
  }

  private apply(language: Language): void {
    this.currentLanguage.set(language);
    this.document.documentElement.lang = language;
    this.translate.use(language).subscribe();
  }
}
