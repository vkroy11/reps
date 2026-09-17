/** Split extracted article text into the blocks the reader taps to highlight. */
export function paragraphsOf(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}
