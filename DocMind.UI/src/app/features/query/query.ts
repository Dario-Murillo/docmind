import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CdkCopyToClipboard } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Conversations } from '../../core/conversations';
import { MarkdownPipe } from '../../core/markdown-pipe';

@Component({
  imports: [CdkCopyToClipboard, MarkdownPipe, MatButtonModule, MatIconModule, MatProgressBarModule],
  selector: 'app-query',
  styleUrl: './query.css',
  templateUrl: './query.html',
})
export class Query {
  protected readonly conversations = inject(Conversations);

  readonly topK = input(5);
  readonly sourcesRequested = output<void>();

  // The API's limit (ConversationService.MaxQuestionLength).
  protected readonly maxQuestionLength = 2000;
  protected readonly question = signal('');

  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');
  private readonly messageCount = computed(() => this.conversations.messages().length);

  // Keeps the newest message in view: the composer is pinned, so the list scrolls on its own.
  private readonly scrollToNewest = afterRenderEffect(() => {
    this.messageCount();
    this.conversations.status();
    const element = this.scroller().nativeElement;
    element.scrollTop = element.scrollHeight;
  });

  protected onQuestionInput(event: Event): void {
    this.question.set((event.target as HTMLInputElement).value);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.ask();
  }

  protected showSources(index: number): void {
    this.conversations.selectAnswer(index);
    this.sourcesRequested.emit();
  }

  protected deleteOpenConversation(): void {
    const id = this.conversations.selectedId();
    const open = this.conversations.list().find((existing) => existing.conversationId === id);
    if (open) {
      this.conversations.confirmDelete(open);
    }
  }

  protected ask(): void {
    const question = this.question().trim();
    if (!question || this.conversations.status() === 'loading') {
      return;
    }

    this.conversations.ask(question, this.topK());
    this.question.set('');
  }
}
