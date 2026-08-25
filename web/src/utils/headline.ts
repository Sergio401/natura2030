export interface HeadlineWord {
  text: string;
  accent: boolean;
  /** Whether this word had whitespace before it in the source (false right after an opening line or before trailing punctuation glued to the previous word). */
  spaceBefore: boolean;
}

/**
 * Parses a headline authored as `"Plain words {{accent phrase}} more words\nSecond line."`
 * into lines of words, so themes can render accent spans and/or per-word reveal
 * animations without duplicating headline copy per visual treatment. Preserves
 * whether whitespace separated tokens so punctuation glued to a word (e.g. the
 * trailing period after an {{accent}} phrase) renders without an extra gap.
 */
export function parseHeadline(raw: string): HeadlineWord[][] {
  return raw.split('\n').map((line) => {
    const words: HeadlineWord[] = [];
    const regex = /\{\{(.+?)\}\}|(\S+)/g;
    let match: RegExpExecArray | null;
    let cursor = 0;
    while ((match = regex.exec(line)) !== null) {
      const gapBefore = match.index > cursor;
      if (match[1] !== undefined) {
        match[1].split(' ').forEach((w, i) => {
          words.push({ text: w, accent: true, spaceBefore: i === 0 ? gapBefore : true });
        });
      } else if (match[2] !== undefined) {
        words.push({ text: match[2], accent: false, spaceBefore: gapBefore });
      }
      cursor = match.index + match[0].length;
    }
    return words;
  });
}
