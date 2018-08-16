import Chars from './chars'
import Token from './token'
import SourceFile from './sourcefile'

const KEYWORDS = {
  "break": Token.breakKeyword,
  "class": Token.classKeyword,
  "construct": Token.constructKeyword,
  "else": Token.elseKeyword,
  "false": Token.falseKeyword,
  "for": Token.forKeyword,
  "foreign": Token.foreignKeyword,
  "if": Token.ifKeyword,
  "import": Token.importKeyword,
  "in": Token.inKeyword,
  "is": Token.isKeyword,
  "null": Token.nullKeyword,
  "return": Token.returnKeyword,
  "static": Token.staticKeyword,
  "super": Token.superKeyword,
  "this": Token.thisKeyword,
  "true": Token.trueKeyword,
  "var": Token.varKeyword,
  "while": Token.whileKeyword
};

// Data table for tokens that are tokenized using maximal munch.
//
// The key is the character that starts the token or tokens. After that is a
// list of token types and characters. As long as the next character is matched,
// the type will update to the type after that character.
const PUNCTUATORS = {
  [Chars.leftParen]: [Token.leftParen],
  [Chars.rightParen]: [Token.rightParen],
  [Chars.leftBracket]: [Token.leftBracket],
  [Chars.rightBracket]: [Token.rightBracket],
  [Chars.leftBrace]: [Token.leftBrace],
  [Chars.rightBrace]: [Token.rightBrace],
  [Chars.colon]: [Token.colon],
  [Chars.comma]: [Token.comma],
  [Chars.star]: [Token.star],
  [Chars.slash]: [Token.slash],
  [Chars.percent]: [Token.percent],
  [Chars.plus]: [Token.plus],
  [Chars.minus]: [Token.minus],
  [Chars.tilde]: [Token.tilde],
  [Chars.caret]: [Token.caret],
  [Chars.question]: [Token.question],
  [Chars.lineFeed]: [Token.line],

  [Chars.pipe]: [Token.pipe, Chars.pipe, Token.pipePipe],
  [Chars.amp]: [Token.amp, Chars.amp, Token.ampAmp],
  [Chars.bang]: [Token.bang, Chars.equal, Token.bangEqual],
  [Chars.equal]: [Token.equal, Chars.equal, Token.equalEqual],

  [Chars.dot]: [Token.dot, Chars.dot, Token.dotDot, Chars.dot, Token.dotDotDot]
};

class Lexer {
  source: SourceFile;
  start: number;
  current: number;
  interpolations: number[];

  constructor(source: SourceFile) {
    this.source = source;
    this.start = 0;
    this.current = 0;
    this.interpolations = [];
  }

  public readToken(): Token {
    if (this.current >= this.source.length) {
      return this.makeToken(Token.eof);
    }

    this.skipWhitespace();

    // TODO: Skip comments.

    this.start = this.current;
    const c = this.source.index(this.current);
    this.advance();

    if (this.interpolations.length > 0) {
      const last = this.interpolations.length - 1;
      if (c === Chars.leftParen) {
        this.interpolations[last]++;
      } else if (c === Chars.rightParen) {
        this.interpolations[last]--;

        // The last ")" in an interpolated expression ends the expression and resumes the string.
        if (this.interpolations[last] === 0) {
          this.interpolations.pop();
          return this.readString();
        }
      }
    }

    if (c in PUNCTUATORS) {
      const punctuator = PUNCTUATORS[c];
      let type = punctuator[0];
      let i = 1;
      while (1 < punctuator.length) {
        if (!this.match(punctuator[i])) {
          break;
        }

        type = punctuator[i + 1];
        i += 2;
      }

      return this.makeToken(type.toString());
    }

    // Handle "<", "<<", and "<=".
    if (c === Chars.less) {
      if (this.match(Chars.less)) return this.makeToken(Token.lessLess);
      if (this.match(Chars.equal)) return this.makeToken(Token.lessEqual);
      return this.makeToken(Token.less);
    }

    // Handle ">", ">>", and ">=".
    if (c === Chars.greater) {
      if (this.match(Chars.greater)) return this.makeToken(Token.greaterGreater);
      if (this.match(Chars.equal)) return this.makeToken(Token.greaterEqual);
      return this.makeToken(Token.greater);
    }

    if (c === Chars.underscore) return this.readField();
    if (c === Chars.quote) return this.readString();

    if (c === Chars.zero && this.peek() === Chars.lowerX) return this.readHexNumber();
    if (Chars.isDigit(c)) return this.readNumber();
    if (Chars.isAlpha(c)) return this.readName();

    return this.makeToken(Token.error)  
  }

  // Skips over whitespace and comments.
  private skipWhitespace(): void {
    while (true) {
      const c = this.peek();
      if (c === Chars.tab || c === Chars.carriageReturn || c === Chars.space) {
        // Whitespace is ignored.
        this.advance();
      } else if (c === Chars.slash && this.peek(1) === Chars.slash) {
        // A line comment stops at the newline since newlines are significant.
        while (this.peek() !== Chars.lineFeed && !this.isAtEnd) {
          this.advance()
        }
      } else if (c === Chars.slash && this.peek(1) === Chars.star) {
        this.advance();
        this.advance();
      } else if (c === Chars.slash && this.peek(1) === Chars.star) {
        this.advance()
        this.advance()

        // Block comments can nest.
        let nesting = 1
        while (nesting > 0) {
          // TODO: Report error.
          if (this.isAtEnd) {
            return;
          }

          if (this.peek() === Chars.slash && this.peek(1) === Chars.star) {
            this.advance();
            this.advance();
            nesting++;
          } else if (this.peek() === Chars.star && this.peek(1) === Chars.slash) {
            this.advance();
            this.advance();
            nesting--;
            if (nesting === 0) {
              break;
            }
          } else {
            this.advance();
          }
        }
      } else {
        break
      }
    }
  }

  // Reads a static or instance field.
  private readField(): Token {
    let type = Token.field;
    if (this.match(Chars.underscore)) {
      type = Token.staticField;
    }

     // Read the rest of the name.
    while (this.match((c) => Chars.isAlphaNumeric(c))) { }
    return this.makeToken(type);
  }

  // Reads a string literal.
  private readString(): Token {
    let type = Token.string;

    while (this.current < this.source.length - 1) {
      const c = this.source.index(this.current);
      this.advance();

      if (c === Chars.backslash) {
        // TODO: Process specific escapes and validate them.
        this.advance();
      } else if (c === Chars.percent) {
        // Consume the '('.
        this.advance()
        // TODO: Handle missing '('.
        this.interpolations.push(1)
        type = Token.interpolation
        break
      } else if (c === Chars.quote) {
        break;
      }
    }

    // TODO: Handle unterminated string.
    return this.makeToken(type)
  }

  // Reads a number literal.
  private readHexNumber(): Token {
    // Skip past the `x`.
    this.advance();

    // Read the rest of the number.
    while (this.match((c) => Chars.isHexDigit(c))) { }
    return this.makeToken(Token.number);
  }

  // Reads a number literal.
  private readNumber(): Token {
    // Read the rest of the number.
    while (this.match((c) => Chars.isDigit(c))) { }

    return this.makeToken(Token.number);
  }

  // Reads an identifier or keyword token.
  private readName(): Token {
    // Read the rest of the name.
    while (this.match((c) => Chars.isAlphaNumeric(c))) { }

    const text = this.source.substring(this.start, this.current - this.start);
    let type = Token.name;
    if (text in KEYWORDS) {
      type = KEYWORDS[text];
    }

    return new Token(this.source, type, this.start, this.current - this.start);
  }

  // Returns `true` if we have scanned all characters.
  get isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  // Advances past the current character.
  private advance(): void {
    this.current++;
  }

  // Returns the byte value of the current character.
  private peek(n = 0): number {
    if (this.current + n >= this.source.length) {
      return -1;
    }

    return this.source.index(this.current + n);
  }

  // Consumes the current character if it matches [condition], which can be a
  // numeric code point value or a function that takes a code point and returns
  // `true` if the code point matches.
  private match(condition: any) {
    if (this.isAtEnd) {
      return false;
    }

    const c = this.source.index(this.current);
    if (typeof condition === 'function') {
      if (condition(c) !== true) {
        return false;
      }
    } else if (c !== condition) {
      return false;
    }

    this.advance();
    return true;
  }

  // Creates a token of [type] from the current character range.
  public makeToken(type: string): Token {
    return new Token(this.source, type, this.start, this.current - this.start);
  }
}

export default Lexer