import { Component, OnInit, inject, input, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Api, NotebookResponse } from '../../core/api';
import { AppHeader } from '../../core/app-header/app-header';
import { Conversations } from '../../core/conversations';
import { ConversationList } from '../conversation-list/conversation-list';
import { Query } from '../query/query';
import { Sources } from '../sources/sources';
import { Upload } from '../upload/upload';

// Below these widths a panel floats over the chat instead of sitting next to it.
const narrowForSidebar = '(max-width: 839px)';
const narrowForSources = '(max-width: 1199px)';

@Component({
  imports: [
    AppHeader,
    ConversationList,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSidenavModule,
    Query,
    RouterLink,
    Sources,
    Upload,
  ],
  providers: [Conversations],
  selector: 'app-workspace',
  styleUrl: './workspace.css',
  templateUrl: './workspace.html',
})
export class Workspace implements OnInit {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly breakpoints = inject(BreakpointObserver);
  protected readonly conversations = inject(Conversations);

  // Filled in from the route (withComponentInputBinding). It never changes during the component's
  // life: NotebookRouteReuse creates a new Workspace for each notebook.
  readonly notebookId = input.required<string>();

  protected readonly notebook = signal<NotebookResponse | null>(null);

  // 1 to ConversationService.MaxTopK, so the menu can't offer a value the API rejects.
  protected readonly topKOptions = Array.from({ length: 10 }, (_, index) => index + 1);
  protected readonly topK = signal(5);

  protected readonly sidebarFloats = this.matches(narrowForSidebar);
  protected readonly sourcesFloat = this.matches(narrowForSources);
  // linkedSignal: the user can open and close each panel, and crossing a breakpoint resets it to
  // the default for that width (open when there is room, closed when it would cover the chat).
  protected readonly sidebarOpen = linkedSignal(() => !this.sidebarFloats());
  protected readonly sourcesOpen = linkedSignal(() => !this.sourcesFloat());

  // The children only render once the notebook is known, so a notebook that was deleted or belongs
  // to another user goes back to the list without them firing requests that would fail too.
  ngOnInit(): void {
    this.api.getNotebook(this.notebookId()).subscribe({
      next: (notebook) => this.notebook.set(notebook),
      error: () => this.router.navigate(['/']),
    });
  }

  protected closeFloatingSidebar(): void {
    if (this.sidebarFloats()) {
      this.sidebarOpen.set(false);
    }
  }

  private matches(query: string) {
    return toSignal(this.breakpoints.observe(query).pipe(map((state) => state.matches)), {
      initialValue: this.breakpoints.isMatched(query),
    });
  }
}
