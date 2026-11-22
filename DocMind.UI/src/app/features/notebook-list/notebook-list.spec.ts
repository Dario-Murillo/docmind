import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { Router, provideRouter } from '@angular/router';
import { NotebookResponse } from '../../core/api';
import { NotebookList } from './notebook-list';

describe('NotebookList', () => {
  const research: NotebookResponse = {
    notebookId: 'n1',
    title: 'Thesis research',
    createdAt: '2026-11-02T10:00:00Z',
    documentCount: 1,
  };

  let fixture: ComponentFixture<NotebookList>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotebookList],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotebookList);
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  // ngOnInit asks for the list as soon as the component renders, so every test answers it first.
  async function respondWithNotebooks(notebooks: NotebookResponse[]): Promise<void> {
    http
      .expectOne((req) => req.method === 'GET' && req.url.endsWith('/notebooks'))
      .flush(notebooks);
    await fixture.whenStable();
  }

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  // Searches the document, not the component: menus and dialogs render in an overlay.
  async function click(selector: string): Promise<void> {
    (document.querySelector(selector) as HTMLElement).click();
    await fixture.whenStable();
  }

  async function chooseOption(option: 'rename' | 'delete'): Promise<void> {
    await click('button[aria-label="Options for Thesis research"]');
    await click(`.${option}-option`);
  }

  async function type(selector: string, value: string): Promise<void> {
    const input = document.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  async function submitTitle(title: string): Promise<void> {
    await type('mat-dialog-content input', title);
    document.querySelector('mat-dialog-container form')?.dispatchEvent(new Event('submit'));
  }

  it('loads and lists the notebooks on init', async () => {
    await respondWithNotebooks([research, { ...research, notebookId: 'n2', documentCount: 3 }]);

    expect(element().textContent).toContain('Thesis research');
    expect(element().textContent).toMatch(/1 document\b/);
    expect(element().textContent).toMatch(/3 documents\b/);
    expect(element().querySelector('h3 a')?.getAttribute('href')).toBe('/notebooks/n1');
  });

  it('shows an empty state when there are no notebooks', async () => {
    await respondWithNotebooks([]);

    expect(element().textContent).toContain('No notebooks yet');
  });

  it('filters the notebooks by title', async () => {
    await respondWithNotebooks([research, { ...research, notebookId: 'n2', title: 'Contracts' }]);

    await type('input[type="search"]', 'THESIS');

    expect(element().textContent).toContain('Thesis research');
    expect(element().textContent).not.toContain('Contracts');
  });

  it('says so when the search matches nothing', async () => {
    await respondWithNotebooks([research]);

    await type('input[type="search"]', 'invoices');

    expect(element().textContent).toContain('No notebooks match');
  });

  it('opens a notebook right after creating it', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await respondWithNotebooks([]);

    await click('.new-notebook');
    await submitTitle('  Thesis research  ');

    const create = http.expectOne((req) => req.method === 'POST' && req.url.endsWith('/notebooks'));
    expect(create.request.body).toEqual({ title: 'Thesis research' });
    create.flush(research);
    expect(navigate).toHaveBeenCalledWith(['/notebooks', 'n1']);
  });

  it('keeps the dialog open with the error when creating fails', async () => {
    await respondWithNotebooks([]);

    await click('.new-notebook');
    await submitTitle('Contracts');
    http
      .expectOne((req) => req.method === 'POST')
      .flush({ message: 'Nope.' }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();

    expect(document.querySelector('mat-dialog-container')?.textContent).toContain('Nope.');
  });

  it('renames a notebook', async () => {
    await respondWithNotebooks([research]);

    await chooseOption('rename');
    await submitTitle('New title');
    const rename = http.expectOne(
      (req) => req.method === 'PATCH' && req.url.endsWith('/notebooks/n1'),
    );
    expect(rename.request.body).toEqual({ title: 'New title' });
    rename.flush({ ...research, title: 'New title' });
    await fixture.whenStable();

    expect(element().textContent).toContain('New title');
    expect(element().textContent).not.toContain('Thesis research');
  });

  it('does not rename when the dialog is cancelled', async () => {
    await respondWithNotebooks([research]);

    await chooseOption('rename');
    await click('.cancel');

    http.expectNone((req) => req.method === 'PATCH');
  });

  it('does not rename when the title is unchanged', async () => {
    await respondWithNotebooks([research]);

    await chooseOption('rename');
    await submitTitle(' Thesis research ');

    http.expectNone((req) => req.method === 'PATCH');
  });

  it('limits the title to 100 characters', async () => {
    await respondWithNotebooks([research]);

    await chooseOption('rename');

    const input = document.querySelector('mat-dialog-content input') as HTMLInputElement;
    expect(input.maxLength).toBe(100);
  });

  it('closes the dialog when leaving the page', async () => {
    await respondWithNotebooks([]);
    await click('.new-notebook');
    expect(document.querySelector('mat-dialog-container')).not.toBeNull();

    fixture.destroy();

    await vi.waitFor(() => expect(document.querySelector('mat-dialog-container')).toBeNull());
  });

  it('removes a notebook after deleting it', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await respondWithNotebooks([research]);

    await chooseOption('delete');
    http
      .expectOne((req) => req.method === 'DELETE' && req.url.endsWith('/notebooks/n1'))
      .flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(element().textContent).not.toContain('Thesis research');
  });

  it('does not delete when the confirmation is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await respondWithNotebooks([research]);

    await chooseOption('delete');

    http.expectNone((req) => req.method === 'DELETE');
    expect(element().textContent).toContain('Thesis research');
  });
});
