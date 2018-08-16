import SourceFile from './sourcefile'

class Token {
  // Punctuators.
  static leftParen = "leftParen"
  static rightParen = "rightParen"
  static leftBracket = "leftBracket"
  static rightBracket = "rightBracket"
  static leftBrace = "leftBrace"
  static rightBrace = "rightBrace"
  static colon = "colon"
  static dot = "dot"
  static dotDot = "dotDot"
  static dotDotDot = "dotDotDot"
  static comma = "comma"
  static star = "star"
  static slash = "slash"
  static percent = "percent"
  static plus = "plus"
  static minus = "minus"
  static pipe = "pipe"
  static pipePipe = "pipePipe"
  static caret = "caret"
  static amp = "amp"
  static ampAmp = "ampAmp"
  static question = "question"
  static bang = "bang"
  static tilde = "tilde"
  static equal = "equal"
  static less = "less"
  static lessEqual = "lessEqual"
  static lessLess = "lessLess"
  static greater = "greater"
  static greaterEqual = "greaterEqual"
  static greaterGreater = "greaterGreater"
  static equalEqual = "equalEqual"
  static bangEqual = "bangEqual"

  // Keywords.
  static breakKeyword = "break"
  static classKeyword = "class"
  static constructKeyword = "construct"
  static elseKeyword = "else"
  static falseKeyword = "false"
  static forKeyword = "for"
  static foreignKeyword = "foreign"
  static ifKeyword = "if"
  static importKeyword = "import"
  static inKeyword = "in"
  static isKeyword = "is"
  static nullKeyword = "null"
  static returnKeyword = "return"
  static staticKeyword = "static"
  static superKeyword = "super"
  static thisKeyword = "this"
  static trueKeyword = "true"
  static varKeyword = "var"
  static whileKeyword = "while"

  static field = "field"
  static staticField = "staticField"
  static tname = "name"
  static number = "number"
  static string = "string"
  static interpolation = "interpolation"
  static line = "line"
  static error = "error"
  static eof = "eof"

  source: SourceFile;
  type: string;
  start: number;
  length: number;

  constructor(source: SourceFile, type: string, start: number, length: number) {
    this.source = source
    this.type = type
    this.start = start
    this.length = length
  }

  // The source file this token was parsed from.
  get text(): string { return this.source.substring(this.start, this.length) }

  // The 1-based line number that the token starts on.
  get lineStart(): number { return this.source.lineAt(this.start) }
  get lineEnd(): number { return this.source.lineAt(this.start + this.length) }

  // The 1-based column number that the token starts on.
  get columnStart(): number { return this.source.columnAt(this.start) }
  get columnEnd(): number { return this.source.columnAt(this.start + this.length) }

  public toString(): string { return this.text }
}

export default Token