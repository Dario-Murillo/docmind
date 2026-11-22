import { Component, OnInit, inject, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Conversations } from '../../core/conversations';

@Component({
  imports: [DatePipe, MatButtonModule, MatIconModule, MatMenuModule],
  selector: 'app-conversation-list',
  styleUrl: './conversation-list.css',
  templateUrl: './conversation-list.html',
})
export class ConversationList implements OnInit {
  protected readonly conversations = inject(Conversations);

  readonly notebookId = input.required<string>();
  // A chat was chosen: on narrow screens Workspace closes the sidebar to show it.
  readonly picked = output<void>();

  ngOnInit(): void {
    this.conversations.load(this.notebookId());
  }

  protected startNew(): void {
    this.conversations.startNew();
    this.picked.emit();
  }

  protected open(conversationId: string): void {
    this.conversations.open(conversationId);
    this.picked.emit();
  }
}
