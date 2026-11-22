import { Component, inject, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Api } from '../../core/api';
import { Conversations } from '../../core/conversations';

// The passages behind the answer selected in the chat (the latest one, unless the user picks).
@Component({
  imports: [DecimalPipe, MatButtonModule, MatIconModule, MatProgressBarModule],
  selector: 'app-sources',
  styleUrl: './sources.css',
  templateUrl: './sources.html',
})
export class Sources {
  private readonly api = inject(Api);
  protected readonly conversations = inject(Conversations);

  readonly closed = output<void>();

  protected fileUrl(documentId: string): string {
    return this.api.documentFileUrl(documentId);
  }
}
