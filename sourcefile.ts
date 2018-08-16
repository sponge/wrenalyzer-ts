import Chars from './chars'

class SourceFile {
  public path: string;
  private string: any;
  private lines: number[];

  constructor(path: string, string: string) {
    this.path = path;
    this.string = string;

    this.lines = [0];
    for (let i = 0; i < string.length; i++) {
      if (this.string.charCodeAt(i) === Chars.lineFeed) {
        this.lines.push(i + 1);
      }
    }
  }

  // Gets the byte at i in the source file.
  public index(i): number { return this.string.charCodeAt(i); }

  // The number of bytes in the source file.
  get length(): number { return this.string.length; }

  // Gets the 1-based line that the byte at offset lies on.
  public columnAt(offset: number): number {
    let column = 1;

    // Walk backwards until we hit a newline
    for (let i = offset - 1; i > 0; i--) {
      if (this.string.charCodeAt(i) === Chars.lineFeed) {
        break;
      }
      column += 1;
    }
    return column;
  }

  // Gets the 1-based line that the byte at offset lies on.
  public lineAt(offset: number): number {
    let line = 0;
    for (let i = 0; i < this.lines.length; i++) {
      if (offset < this.lines[i]) {
        return i;
      }
    }
    return this.lines.length;
  }

  // Gets the source text of [line], where 1 is the first line.
  public getLine(line: number): string {
    return this.string.substring(this.lines[line - 1], this.lines[line] - 1)
  }

  // Gets a substring of the source string starting at [start] with [length] bytes
  public substring(start: number, length: number): string {
    return this.string.substr(start, length);
  }
}

export default SourceFile