import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { PRIMARY_OUTLET, RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { DEFAULT_LANGUAGE, languages, localizedUrl, splitLocalizedUrl } from './localized-url';

const origin = 'https://games.netroot.ch';

@Injectable()
export class GamesTitleStrategy extends TitleStrategy {
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly translate = inject(TranslateService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const key = this.buildTitle(snapshot);
    this.title.setTitle(key ? `${this.translate.instant(key)} | NetRoot Games` : 'NetRoot Games');

    let route = snapshot.root;
    let child = route.children.find(candidate => candidate.outlet === PRIMARY_OUTLET);
    while (child) {
      route = child;
      child = route.children.find(candidate => candidate.outlet === PRIMARY_OUTLET);
    }

    this.document.head.querySelectorAll('[data-games-seo]').forEach(link => link.remove());
    const description = route.data['description'];
    if (typeof description !== 'string') {
      this.meta.removeTag('name="description"');
      this.meta.updateTag({ name: 'robots', content: 'noindex' });
      return;
    }

    this.meta.removeTag('name="robots"');
    this.meta.updateTag({ name: 'description', content: this.translate.instant(description) });
    const { path, prefix } = splitLocalizedUrl(snapshot.url);
    this.addLink('canonical', localizedUrl(path, prefix ?? DEFAULT_LANGUAGE));
    for (const language of languages) this.addLink('alternate', localizedUrl(path, language), language);
    this.addLink('alternate', path, 'x-default');
  }

  private addLink(rel: string, path: string, language?: string): void {
    const link = this.document.createElement('link');
    link.rel = rel;
    link.href = new URL(path, origin).href;
    if (language) link.hreflang = language;
    link.setAttribute('data-games-seo', '');
    this.document.head.appendChild(link);
  }
}
