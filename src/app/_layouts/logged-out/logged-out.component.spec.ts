import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { testTranslationProviders } from '../../i18n/translation-testing';
import { LoggedOutComponent } from './logged-out.component';

describe('LoggedOutComponent', () => {
  it('renders the sign-out confirmation and sign-in link in the selected language', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), testTranslationProviders],
    });
    TestBed.inject(TranslateService).use('en').subscribe();

    const fixture = TestBed.createComponent(LoggedOutComponent);
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.textContent).toContain('You have signed out successfully.');
    expect(page.querySelector('a')?.textContent?.trim()).toBe('Sign in');
    expect(page.querySelector('a')?.getAttribute('href')).toBe('/user/login');
  });
});
