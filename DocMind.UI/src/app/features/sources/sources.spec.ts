import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Conversations } from '../../core/conversations';
import { Sources } from './sources';

describe('Sources', () => {
  it('links live documents and marks the deleted ones', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), Conversations],
    });
    const fixture = TestBed.createComponent(Sources);
    TestBed.inject(Conversations).open('c1');
    const source = { sequenceNumber: 2, score: 0.8, excerpt: 'Some text' };
    TestBed.inject(HttpTestingController)
      .expectOne((req) => req.url.endsWith('/conversations/c1'))
      .flush({
        conversationId: 'c1',
        messages: [
          {
            role: 'assistant',
            content: 'An answer',
            sources: [
              { ...source, documentId: 'd1', fileName: 'live.pdf' },
              { ...source, documentId: null, fileName: 'gone.pdf' },
            ],
          },
        ],
      });
    await fixture.whenStable();

    const [live, gone] = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('li'));
    expect(live.querySelector('a')?.getAttribute('href')).toContain('/documents/d1/file');
    expect(gone.querySelector('a')).toBeNull();
    expect(gone.textContent).toContain('Deleted');
  });
});
