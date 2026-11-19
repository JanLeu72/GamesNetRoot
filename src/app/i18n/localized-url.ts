export const DEFAULT_LANGUAGE = 'de';
export const languages = [DEFAULT_LANGUAGE, 'en', 'es', 'fr'] as const;
export type Language = (typeof languages)[number];

export function supportedLanguage(value: string | null): Language | undefined {
  const code = value?.toLowerCase().split('-')[0];
  return languages.find(language => language === code);
}

export function splitLocalizedUrl(url: string) {
  const index = url.search(/[?#]/);
  const pathname = index === -1 ? url : url.slice(0, index);
  const suffix = index === -1 ? '' : url.slice(index);
  const segment = pathname.split('/')[1];
  const prefix = languages.find(language => language !== DEFAULT_LANGUAGE && language === segment);
  const path = (prefix ? pathname.slice(prefix.length + 1) : pathname).replace(/\/$/, '') || '/';
  return { path, prefix, suffix };
}

export function localizedUrl(url: string, language: Language): string {
  const { path, suffix } = splitLocalizedUrl(url);
  if (language === DEFAULT_LANGUAGE) return path + suffix;
  return `/${language}${path === '/' ? '' : path}${suffix}`;
}
