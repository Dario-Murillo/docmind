import {
  Component,
  OnDestroy,
  OnInit,
  TemplateRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterLink } from '@angular/router';
import { Api, ErrorResponse, NotebookResponse } from '../../core/api';
import { AppHeader } from '../../core/app-header/app-header';

// Matches Notebook.MaxTitleLength in DocMind.Core, so the API's 400 is never what the user reads.
const maxTitleLength = 100;

@Component({
  imports: [
    AppHeader,
    DatePipe,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    RouterLink,
  ],
  selector: 'app-notebook-list',
  styleUrl: './notebook-list.css',
  templateUrl: './notebook-list.html',
})
export class NotebookList implements OnInit, OnDestroy {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly titleDialog = viewChild.required<TemplateRef<unknown>>('titleDialog');
  private dialogRef?: MatDialogRef<unknown>;

  protected readonly maxTitleLength = maxTitleLength;
  protected readonly notebooks = signal<NotebookResponse[]>([]);
  protected readonly loaded = signal(false);
  protected readonly search = signal('');
  protected readonly visibleNotebooks = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.notebooks().filter((notebook) => notebook.title.toLowerCase().includes(term));
  });
  protected readonly error = signal<string | null>(null);

  // One dialog both creates and renames: editing is null while creating.
  protected readonly editing = signal<NotebookResponse | null>(null);
  protected readonly title = signal('');
  protected readonly saving = signal(false);
  protected readonly dialogError = signal<string | null>(null);

  ngOnInit(): void {
    this.api.getNotebooks().subscribe({
      next: (notebooks) => {
        this.notebooks.set(notebooks);
        this.loaded.set(true);
      },
      error: () => this.error.set('Could not load your notebooks.'),
    });
  }

  // The dialog lives in an overlay outside this component, so a redirect (e.g. to /login when
  // the session expires) would otherwise leave it on top of the next page.
  ngOnDestroy(): void {
    this.dialogRef?.close();
  }

  protected onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onTitleInput(event: Event): void {
    this.title.set((event.target as HTMLInputElement).value);
  }

  protected openTitleDialog(notebook: NotebookResponse | null = null): void {
    this.editing.set(notebook);
    this.title.set(notebook?.title ?? '');
    this.saving.set(false);
    this.error.set(null);
    this.dialogError.set(null);
    this.dialogRef = this.dialog.open(this.titleDialog(), { width: '400px' });
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();

    const title = this.title().trim();
    if (!title || this.saving()) {
      return;
    }

    const notebook = this.editing();
    if (title === notebook?.title) {
      this.dialogRef?.close();
      return;
    }

    this.setSaving(true);
    this.dialogError.set(null);

    if (notebook) {
      this.renameNotebook(notebook, title);
    } else {
      this.createNotebook(title);
    }
  }

  protected deleteNotebook(notebook: NotebookResponse): void {
    if (
      !confirm(`Delete "${notebook.title}"? All of its documents and conversations will be lost.`)
    ) {
      return;
    }

    this.error.set(null);
    this.api.deleteNotebook(notebook.notebookId).subscribe({
      next: () =>
        this.notebooks.update((notebooks) =>
          notebooks.filter((existing) => existing.notebookId !== notebook.notebookId),
        ),
      error: (error: HttpErrorResponse) =>
        this.error.set(this.messageFrom(error, 'Could not delete the notebook.')),
    });
  }

  private createNotebook(title: string): void {
    // A new notebook has nothing to show yet, so the next step is always to open it.
    this.api.createNotebook({ title }).subscribe({
      next: (notebook) => {
        this.dialogRef?.close();
        this.router.navigate(['/notebooks', notebook.notebookId]);
      },
      error: (error: HttpErrorResponse) => {
        this.setSaving(false);
        this.dialogError.set(this.messageFrom(error, 'Could not create the notebook.'));
      },
    });
  }

  private renameNotebook(notebook: NotebookResponse, title: string): void {
    this.api.renameNotebook(notebook.notebookId, { title }).subscribe({
      next: (renamed) => {
        this.notebooks.update((notebooks) =>
          notebooks.map((existing) =>
            existing.notebookId === renamed.notebookId ? renamed : existing,
          ),
        );
        this.dialogRef?.close();
      },
      error: (error: HttpErrorResponse) => {
        this.setSaving(false);
        this.dialogError.set(this.messageFrom(error, 'Could not rename the notebook.'));
      },
    });
  }

  // While saving, Escape and backdrop clicks are ignored so a failure is never shown off screen.
  private setSaving(saving: boolean): void {
    this.saving.set(saving);
    if (this.dialogRef) {
      this.dialogRef.disableClose = saving;
    }
  }

  private messageFrom(error: HttpErrorResponse, fallback: string): string {
    return (error.error as ErrorResponse | undefined)?.message ?? fallback;
  }
}
