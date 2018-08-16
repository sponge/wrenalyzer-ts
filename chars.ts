// Utilities for working with characters.
class Chars {
  static tab = 0x09;
  static lineFeed = 0x0a;
  static carriageReturn = 0x0d;
  static space = 0x20;
  static bang = 0x21;
  static quote = 0x22;
  static percent = 0x25;
  static amp = 0x26;
  static leftParen = 0x28;
  static rightParen = 0x29;
  static star = 0x2a;
  static plus = 0x2b;
  static comma = 0x2c;
  static minus = 0x2d;
  static dot = 0x2e;
  static slash = 0x2f;

  static zero = 0x30;
  static nine = 0x39;

  static colon = 0x3a;
  static less = 0x3c;
  static equal = 0x3d;
  static greater = 0x3e;
  static question = 0x3f;

  static upperA = 0x41;
  static upperF = 0x46;
  static upperZ = 0x5a;

  static leftBracket = 0x5b;
  static backslash = 0x5c;
  static rightBracket = 0x5d;
  static caret = 0x5e;
  static underscore = 0x5f;

  static lowerA = 0x61;
  static lowerF = 0x66;
  static lowerX = 0x78;
  static lowerZ = 0x7a;

  static leftBrace = 0x7b;
  static pipe = 0x7c;
  static rightBrace = 0x7d;
  static tilde = 0x7e;

  static isAlpha(c: number): boolean {
    return (c >= Chars.lowerA && c <= Chars.lowerZ) ||
      (c >= Chars.upperA && c <= Chars.upperZ) ||
      c === Chars.underscore;
  }

  static isDigit(c: number): boolean { return c >= Chars.zero && c <= Chars.nine; }

  static isAlphaNumeric(c: number): boolean { return Chars.isAlpha(c) || Chars.isDigit(c); }

  static isHexDigit(c: number): boolean {
    return c >= Chars.zero && c <= Chars.nine ||
      c >= Chars.lowerA && c <= Chars.lowerF ||
      c >= Chars.upperA && c <= Chars.upperF;
  }

  static isLowerAlpha(c: number): boolean { return c >= Chars.lowerA && c <= Chars.lowerZ; }
}

export default Chars;