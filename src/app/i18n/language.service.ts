import { DOCUMENT, inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { DEFAULT_LANGUAGE, Language, localizedUrl, supportedLanguage } from './localized-url';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly currentLanguage = signal<Language>(DEFAULT_LANGUAGE);
  readonly language = this.currentLanguage.asReadonly();

  select(value: string): Promise<boolean> {
    const language = supportedLanguage(value);
    if (!language) return Promise.resolve(false);
    return this.router.navigateByUrl(localizedUrl(this.router.url, language));
  }

  url(path: string): string {
    return localizedUrl(path, this.language());
  }

  apply(language: Language) {
    this.currentLanguage.set(language);
    this.document.documentElement.lang = language;
    return this.translate.use(language);
  }
}

export function injectRouteLanguage(): Language {
  return inject(ActivatedRoute).snapshot.data['language'] ?? inject(LanguageService).language();
}
