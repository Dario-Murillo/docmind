import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageResponse } from '../../core/api';
import { Conversations } from '../../core/conversations';
import { Query } from './query';

describe('Query', () => {
  const answer: MessageResponse = {
    messageId: 'm1',
    role: 'assistant',
    content: 'An answer',
    createdAt: '2026-10-22T10:00:00Z',
    sources: [
      { documentId: 'd1', fileName: 'manual.pdf', sequenceNumber: 1, score: 0.9, excerpt: '...' },
    ],
  };

  let fixture: ComponentFixture<Query>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Query],
      // Workspace provides Conversations in the app (it isn't auto-provided), so the test does too.
      providers: [provideHttpClient(), provideHttpClientTesting(), Conversations],
    }).compileComponents();

    fixture = TestBed.createComponent(Query);
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('invites a question when no conversation is open', () => {
    expect(element().textContent).toContain('Ask a question about your uploaded documents');
  });

  it('asks with the Top K it was given', async () => {
    fixture.componentRef.setInput('topK', 8);
    const input = element().querySelector('input') as HTMLInputElement;
    input.value = '  What is DocMind?  ';
    input.dispatchEvent(new Event('input'));

    element().querySelector('form')?.dispatchEvent(new Event('submit'));

    const request = http.expectOne((req) => req.method === 'POST');
    expect(request.request.body).toEqual({ question: 'What is DocMind?', topK: 8 });
  });

  it('selects an answer and asks for the panel when its sources are clicked', async () => {
    let requested = false;
    fixture.componentInstance.sourcesRequested.subscribe(() => (requested = true));
    const conversations = TestBed.inject(Conversations);
    conversations.open('c1');
    http
      .expectOne((req) => req.url.endsWith('/conversations/c1'))
      .flush({ conversationId: 'c1', messages: [answer, { ...answer, messageId: 'm2' }] });
    await fixture.whenStable();

    (element().querySelector('.show-sources') as HTMLButtonElement).click();

    expect(conversations.selectedAnswer()).toBe(0);
    expect(requested).toBe(true);
  });
});
