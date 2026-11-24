import { Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';

@Pipe({ name: 'markdown' })
export class MarkdownPipe implements PipeTransform {
  transform(text: string): string {
    // breaks: a single line break from the model becomes <br>, as with pre-wrap before.
    return marked.parse(text, { async: false, breaks: true });
  }
}
