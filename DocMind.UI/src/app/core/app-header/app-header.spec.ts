import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { Auth } from '../auth';
import { AppHeader } from './app-header';

describe('AppHeader', () => {
  let fixture: ComponentFixture<AppHeader>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppHeader],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    TestBed.inject(Auth).loadSession().subscribe();
    http
      .expectOne((req) => req.url.endsWith('/auth/manage/info'))
      .flush({ email: 'ana@test.local', isEmailConfirmed: false });
    fixture = TestBed.createComponent(AppHeader);
    await fixture.whenStable();
  });

  it('renders the title and the account', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toContain('DocMind');
    expect(element.querySelector('.account')?.getAttribute('aria-label')).toContain(
      'ana@test.local',
    );
  });

  it('goes to the login page after logging out', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    (fixture.nativeElement.querySelector('.account') as HTMLButtonElement).click();
    await fixture.whenStable();
    (document.querySelector('.logout') as HTMLButtonElement).click();
    http.expectOne((req) => req.url.endsWith('/auth/logout')).flush(null);

    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
