import { MarkdownPipe } from './markdown-pipe';

describe('MarkdownPipe', () => {
  it('renders bold text and bullet lists', () => {
    const html = new MarkdownPipe().transform('**Key** point\n\n- one\n- two');

    expect(html).toContain('<strong>Key</strong>');
    expect(html).toContain('<li>one</li>');
  });
});
