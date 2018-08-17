import Lexer from './lexer';
import Token from './token';

interface Node { type: String; }

interface Expr extends Node { }

interface Stmt extends Node { }

interface Module extends Node {
  statements: Stmt[];
}

interface MapEntry {
  type: String;
  key: Expr;
  value: Expr;
}

interface Method {
  type: String;
  foreignKeyword: Token;
  staticKeyword: Token;
  constructKeyword: Token;
  name: Token;
  body: Body;
  parameters: Expr[];
}

interface Body {
  type: String;
  parameters: Expr[];
  expression?: Expr;
  statements: Stmt[];
}

interface ListExpr extends Expr {
  leftBracket: Token;
  elements: Expr[];
  rightBracket: Token;
}

interface ThisExpr extends Expr {
  keyword: Token;
}

interface NullExpr extends Expr {
  value: Token;
}

interface StaticFieldExpr extends Expr {
  name: Token;
}

interface FieldExpr extends Expr {
  name: Token;
}

interface CallExpr extends Expr {
  receiver: Expr;
  name: Token;
  args: Expr[];
  blockArgument: Body;
}

interface PrefixExpr extends Expr {
  operator: Token;
  right: Expr;
}

interface GroupingExpr extends Expr {
  leftParen: Token;
  expression: Expr;
  rightParen: Token;
}

interface AssignmentExpr extends Expr {
  target: Expr;
  equal: Token;
  value: Expr;
}

interface InfixExpr extends Expr {
  left: any;
  operator: Token;
  right: any;
}

interface MapExpr extends Expr {
  leftBrace: Token;
  entries: MapEntry[];
  rightBrace: Token;
}

interface ConditionalExpr extends Expr {
  condition: InfixExpr;
  question: Token;
  thenBranch: Expr;
  colon: Token;
  elseBranch: Expr;
}

interface NumExpr extends Expr {
  value: Token;
}

interface SuperExpr extends Expr {
  name: Token;
  args: Expr[];
  blockArgument: Body;
}

interface StringExpr extends Expr {
  value: Token;
}

interface SubscriptExpr extends Expr {
  receiver: Expr;
  leftBracket: Token;
  args: Expr[];
  rightBracket: Token;
}

interface BoolExpr extends Expr {
  value: Token;
}

interface InterpolationExpr extends Expr {
  strings: Token[];
  expressions: Expr[];
}

interface ForStmt extends Stmt {
  variable: Token;
  iterator: Expr;
  body: Stmt;
}

interface ReturnStmt extends Stmt {
  keyword: Token;
  value: Expr;
}

interface BlockStmt extends Stmt {
  statements: Stmt[];
}

interface VarStmt extends Stmt {
  name: Token;
  initializer: Stmt;
}

interface ImportStmt extends Stmt {
  path: Token;
  variables: Token[];
}

interface IfStmt extends Stmt {
  condition: Expr;
  thenBranch: Stmt;
  elseBranch: Stmt;
}

interface BreakStmt extends Stmt {
  keyword: Token;
}

interface WhileStmt extends Stmt {
  condition: Expr;
  body: Stmt;
}

interface ClassStmt extends Stmt {
  foreignKeyword: Token;
  name: Token;
  superclass: Token;
  methods: Method[];
}

const EQUALITY_OPERATORS = [
  Token.equalEqual,
  Token.bangEqual
];

const COMPARISON_OPERATORS = [
  Token.less,
  Token.lessEqual,
  Token.greater,
  Token.greaterEqual
];

const BITWISE_SHIFT_OPERATORS = [
  Token.lessLess,
  Token.greaterGreater
];

const RANGE_OPERATORS = [
  Token.dotDot,
  Token.dotDotDot
];

const TERM_OPERATORS = [
  Token.plus,
  Token.minus
];

const FACTOR_OPERATORS = [
  Token.star,
  Token.slash,
  Token.percent
];

const PREFIX_OPERATORS = [
  Token.minus,
  Token.bang,
  Token.tilde
];

const INFIX_OPERATORS = [
  Token.pipePipe,
  Token.ampAmp,
  Token.equalEqual,
  Token.bangEqual,
  Token.isKeyword,
  Token.less,
  Token.lessEqual,
  Token.greater,
  Token.greaterEqual,
  Token.pipe,
  Token.caret,
  Token.amp,
  Token.lessLess,
  Token.greaterGreater,
  Token.dotDot,
  Token.dotDotDot,
  Token.plus,
  Token.minus,
  Token.star,
  Token.slash,
  Token.percent
];

class Parser {
  lexer: Lexer;
  current: Token;
  previous: Token;
  problems: any[];

  constructor(lexer: Lexer) {
    this.lexer = lexer;
    this.current = lexer.readToken();
    this.problems = [];
  }

  parseModule(): Module {
    this.ignoreLine();

    const statements: Stmt[] = [];
    while (this.peek() !== Token.eof) {
      const def = this.definition();
      statements.push(def);
      //console.log(def);
      if (this.peek() === Token.eof) {
        break;
      }

      this.consumeLine("Expect newline.");
    }

    this.consume(Token.eof, "Expect end of input.");

    return { type: 'Module', statements };
  }

  definition(): Stmt {
    if (this.match(Token.classKeyword)) {
      return this.finishClass(null);
    }

    if (this.match(Token.foreignKeyword)) {
      const foreignKeyword = this.previous;
      this.consume(Token.classKeyword, "Expect 'class' after 'foreign'.");
      return this.finishClass(foreignKeyword);
    }

    if (this.match(Token.importKeyword)) {
      const path = this.consume(Token.string, "Expect import path.");
      let variables: Token[];

      // Parse the variable list, if there is one.
      if (this.match(Token.forKeyword)) {
        this.ignoreLine();

        variables = [];
        while (true) {
          variables.push(this.consume(Token.tname, "Expect imported variable name."));
          if (!this.match(Token.comma)) {
            break;
          }

          this.ignoreLine();
        }
      }

      return <ImportStmt>{ type: 'ImportStmt', path, variables };
    }

    if (this.match(Token.varKeyword)) {
      const name = this.consume(Token.tname, "Expect variable name.");
      let initializer: Expr;
      if (this.match(Token.equal)) {
        initializer = this.expression();
      }

      return <VarStmt>{ type: 'VarStmt', name, initializer };
    }

    return this.statement();
  }

  // Parses the rest of a class definition after the "class" token.
  finishClass(foreignKeyword: Token): ClassStmt {
    const name = this.consume(Token.tname, "Expect class name.");

    let superclass: Token;
    if (this.match(Token.isKeyword)) {
      // TODO: This is different from the VM (which is wrong). Need to make
      // sure we don't parse the class body as a block argument.
      superclass = this.consume(Token.tname, "Expect name of superclass.");
    }

    const methods: Method[] = [];
    this.consume(Token.leftBrace, "Expect '{' after class name.");
    this.ignoreLine();

    while (!this.match(Token.rightBrace) && this.peek() !== Token.eof) {
      methods.push(this.method());

      // Don't require a newline after the last definition.
      if (this.match(Token.rightBrace)) {
        break;
      }

      this.consumeLine("Expect newline after definition in class.");
    }

    return { type: 'ClassStmt', foreignKeyword, name, superclass, methods };
  }

  method(): Method {
    // Note: This parses more permissively than the grammar actually is. For
    // example, it will allow "static construct *()". We'll report errors on
    // invalid forms later.
    let foreignKeyword: Token;
    if (this.match(Token.foreignKeyword)) {
      foreignKeyword = this.previous;
    }

    let staticKeyword: Token;
    if (this.match(Token.staticKeyword)) {
      staticKeyword = this.previous;
    }

    let constructKeyword: Token;
    if (this.match(Token.constructKeyword)) {
      constructKeyword = this.previous;
    }

    // TODO: Error on invalid combinations of above keywords.

    let name: Token;
    let parameters: Token[];

    let allowParameters = false;

    if (this.match(Token.leftBracket)) {
      // Subscript operator.
      parameters = this.parameterList();
      this.consume(Token.rightBracket, "Expect ']' after parameters.");
      allowParameters = false;
    } else if (this.matchAny(INFIX_OPERATORS)) {
      allowParameters = true;
    } else if (this.matchAny([Token.bang, Token.tilde])) {
      allowParameters = false;
    } else {
      this.consume(Token.tname, "Expect method name.");
      allowParameters = true;
    }
    name = this.previous;

    if (this.match(Token.leftParen)) {
      // Parse the parameter list even if not allowed to give better errors
      // and have fewer cascaded errors.
      if (!allowParameters) {
        this.error("A parameter list is not allowed for this method.");
      }

      this.ignoreLine();
      if (!this.match(Token.rightParen)) {
        parameters = this.parameterList();
        this.ignoreLine();
        this.consume(Token.rightParen, "Expect ')' after parameters.");
      }
    }
    // TODO: Setters.

    let body: Body;
    if (foreignKeyword === undefined) {
      this.consume(Token.leftBrace, "Expect '{' before method body.");
      body = this.finishBody(parameters);
    }

    return { type: 'Method', foreignKeyword, staticKeyword, constructKeyword, name, body, parameters };
  }

  statement(): Stmt {
    if (this.match(Token.breakKeyword)) {
      return <BreakStmt>{ type: 'BreakStmt', keyword: this.previous };
    }

    if (this.match(Token.ifKeyword)) {
      this.consume(Token.leftParen, "Expect '(' after 'if'.");
      this.ignoreLine();
      const condition = this.expression();
      this.consume(Token.rightParen, "Expect ')' after if condition.");
      const thenBranch = this.statement();
      let elseBranch: Stmt;
      if (this.match(Token.elseKeyword)) {
        elseBranch = this.statement();
      }

      return <IfStmt>{ type: 'IfStmt', condition, thenBranch, elseBranch };
    }

    if (this.match(Token.forKeyword)) {
      this.consume(Token.leftParen, "Expect '(' after 'for'.");
      const variable = this.consume(Token.tname, "Expect for loop variable name.");
      this.consume(Token.inKeyword, "Expect 'in' after loop variable.");
      this.ignoreLine();
      const iterator = this.expression();
      this.consume(Token.rightParen, "Expect ')' after loop expression.");
      const body = this.statement();
      return <ForStmt>{ type: 'ForStmt', variable, iterator, body };
    }

    if (this.match(Token.whileKeyword)) {
      this.consume(Token.leftParen, "Expect '(' after 'while'.");
      this.ignoreLine();
      const condition = this.expression();
      this.consume(Token.rightParen, "Expect ')' after while condition.");
      const body = this.statement();
      return <WhileStmt>{ type: 'WhileStmt', condition, body };
    }

    if (this.match(Token.returnKeyword)) {
      const keyword = this.previous;
      let value: Expr;
      if (this.peek() !== Token.line) {
        value = this.expression();
      }

      return <ReturnStmt>{ type: 'ReturnStmt', keyword, value };
    }

    if (this.match(Token.leftBrace)) {
      const statements: Stmt[] = [];
      this.ignoreLine();

      while (this.peek() !== Token.rightBrace && this.peek() !== Token.eof) {
        statements.push(this.definition());

        // Don't require a newline after the last statement.
        if (this.peek() === Token.rightBrace) {
          break;
        }

        this.consumeLine("Expect newline after statement.");
      }

      this.consume(Token.rightBrace, "Expect '}' after block.");
      return <BlockStmt>{ type: 'BlockStmt', statements };
    }

    return this.expression();
  }

  // Parses the rest of a method or block argument body.
  finishBody(parameters: Expr[]): Body {
    // An empty block.
    if (this.match(Token.rightBrace)) {
      return { type: 'Body', parameters, expression: null, statements: [] };
    }

    if (!this.matchLine()) {
      const expr = this.expression();
      this.ignoreLine();
      this.consume(Token.rightBrace, "Expect '}' at end of block.");
      return { type: 'Body', parameters, expression: expr, statements: null };
    }

    if (this.match(Token.rightBrace)) {
      return { type: 'Body', parameters, expression: null, statements: [] };
    }

    const statements: Stmt[] = [];
    while (this.peek() !== Token.eof) {
      statements.push(this.definition());
      this.consumeLine("Expect newline after statement.");

      if (this.match(Token.rightBrace)) {
        break;
      }
    }

    return { type: 'Body', parameters, expression: null, statements };
  }

  expression(): Expr {
    return this.assignment();
  }

  // assignment: conditional ( "=" assignment )?
  assignment(): Expr {
    // TODO: This allows invalid LHS like "1 + 2 = 3". Decide if we want to
    // handle that here or later in the pipeline.
    const expr = this.conditional();
    if (!this.match(Token.equal)) {
      return expr;
    }

    const equal = this.previous;
    const value = this.assignment();

    return <AssignmentExpr>{ type: 'AssignmentExpr', target: expr, equal, value };
  }

  // conditional: logicalOr ( "?" conditional ":" assignment )?
  conditional(): Expr {
    const expr = this.logicalOr();
    if (!this.match(Token.question)) {
      return expr;
    }

    const question = this.previous;
    const thenBranch = this.conditional();
    const colon = this.consume(Token.colon, "Expect ':' after then branch of conditional operator.");
    const elseBranch = this.assignment();

    return <ConditionalExpr>{ type: 'ConditionalExpr', condition: expr, question, thenBranch, colon, elseBranch };
  }

  // logicalOr: logicalAnd ( "||" logicalAnd )*
  logicalOr(): InfixExpr { return this.parseInfix([Token.pipePipe], () => this.logicalAnd()); }

  // logicalAnd: equality ( "&&" equality )*
  logicalAnd(): InfixExpr { return this.parseInfix([Token.ampAmp], () => this.equality()); }

  // equality: typeTest ( equalityOperator typeTest )*
  // equalityOperator: "==" | "!="
  equality(): InfixExpr { return this.parseInfix(EQUALITY_OPERATORS, () => this.typeTest()); }

  // typeTest: comparison ( "is" comparison )*
  typeTest(): InfixExpr { return this.parseInfix([Token.isKeyword], () => this.comparison()); }

  // comparison: bitwiseOr ( comparisonOperator bitwiseOr )*
  // comparisonOperator: "<" | ">" | "<=" | ">="
  comparison(): InfixExpr { return this.parseInfix(COMPARISON_OPERATORS, () => this.bitwiseOr()); }

  // bitwiseOr: bitwiseXor ( "|" bitwiseXor )*
  bitwiseOr(): InfixExpr { return this.parseInfix([Token.pipe], () => this.bitwiseXor()); }

  // bitwiseXor: bitwiseAnd ( "^" bitwiseAnd )*
  bitwiseXor(): InfixExpr { return this.parseInfix([Token.caret], () => this.bitwiseAnd()); }

  // bitwiseAnd: bitwiseShift ( "&" bitwiseShift )*
  bitwiseAnd(): InfixExpr { return this.parseInfix([Token.amp], () => this.bitwiseShift()); }

  // bitwiseShift: range ( bitwiseShiftOperator range )*
  // bitwiseShiftOperator: "<<" | ">>"
  bitwiseShift(): InfixExpr { return this.parseInfix(BITWISE_SHIFT_OPERATORS, () => this.range()); }

  // range: term ( rangeOperator term )*
  // rangeOperator: ".." | ".."
  range(): InfixExpr { return this.parseInfix(RANGE_OPERATORS, () => this.term()); }

  // term: factor ( termOperator factor )*
  // termOperator: "+" | "-"
  term(): InfixExpr { return this.parseInfix(TERM_OPERATORS, () => this.factor()); }

  // factor: prefix ( factorOperator prefix )*
  // factorOperator: "*" | "/" | "%"
  factor(): InfixExpr { return this.parseInfix(FACTOR_OPERATORS, () => this.prefix()); }

  // prefix: ("-" | "!" | "~")* call
  prefix(): Expr {
    if (this.matchAny(PREFIX_OPERATORS)) {
      return <PrefixExpr>{ type: 'PrefixExpr', operator: this.previous, right: this.prefix() };
    }

    return this.call();
  }

  // call: primary ( subscript | "." methodCall )*
  // subscript: "[" argumentList "]"
  call(): Expr {
    let expr = this.primary();

    while (true) {
      if (this.match(Token.leftBracket)) {
        const leftBracket = this.previous;
        const args = this.argumentList();
        const rightBracket = this.consume(Token.rightBracket, "Expect ']' after subscript arguments.");
        expr = <SubscriptExpr>{ receiver: expr, leftBracket, args, rightBracket };
      } else if (this.match(Token.dot)) {
        const name = this.consume(Token.tname, "Expect method name after '.'.");
        expr = this.methodCall(expr, name);
      } else {
        break;
      }
    }

    return expr;
  }

  // Parses the argument list for a method call and creates a call expression
  // for it.
  //
  // methodCall: ( "(" argumentList? ")" )? blockArgument?
  // blockArgument: "{" ( "|" parameterList "|" )? body "}"
  // parameterList: Name ( "," Name )*
  // body:
  //   | "\n" ( definition "\n" )*
  //   | expression
  methodCall(receiver, name): CallExpr {
    var args = this.finishCall();
    return { type: 'CallExpr', receiver, name, args: args[0], blockArgument: args[1] };
  }

  // Parses the argument list for a method call. Returns a list containing the
  // argument list (if any) and block argument (if any). If either is missing,
  // the list element at that position is `null`.
  finishCall(): [Expr[], Body] {
    let args: Expr[];

    if (this.match(Token.leftParen)) {
      // Allow an empty argument list. Note that we treat this differently than
      // a getter (no argument list). The former will have a `null` argument
      // list and the latter will have an empty one.
      if (this.match(Token.rightParen)) {
        args = [];
      } else {
        args = this.argumentList();
        this.consume(Token.rightParen, "Expect ')' after arguments.");
      }
    }

    let blockArgument: Body;
    if (this.match(Token.leftBrace)) {
      let parameters: Expr[];
      if (this.match(Token.pipe)) {
        parameters = this.parameterList();
        this.consume(Token.pipe, "Expect '|' after block parameters.");
      }

      blockArgument = this.finishBody(parameters);
    }

    return [args, blockArgument];
  }

  // argumentList: expression ( "," expression )*
  argumentList(): Expr[] {
    let args: Expr[] = [];

    this.ignoreLine();
    while (true) {
      args.push(this.expression());
      if (!this.match(Token.comma)) {
        break;
      }

      this.ignoreLine();
    }

    return args;
  }

  // parameterList: name ( "," name )*
  parameterList(): Token[] {
    let parameters: Token[] = [];

    while (true) {
      parameters.push(this.consume(Token.tname, "Expect parameter name."));
      if (!this.match(Token.comma)) {
        break;
      }

      this.ignoreLine();
    }

    return parameters;
  }

  // primary:
  //   | grouping
  //   | listLiteral
  //   | mapLiteral
  //   | "true" | "false" | "null" | "this"
  //   | Field | StaticField | Number
  primary(): Expr {
    if (this.match(Token.leftParen)) { return this.grouping(); }
    if (this.match(Token.leftBracket)) { return this.listLiteral(); }
    if (this.match(Token.leftBrace)) { return this.mapLiteral(); }
    if (this.match(Token.tname)) { return this.methodCall(null, this.previous); }
    if (this.match(Token.superKeyword)) { return this.superCall(); }

    if (this.match(Token.falseKeyword)) { return <BoolExpr>{ type: 'BoolExpr', value: this.previous }; }
    if (this.match(Token.trueKeyword)) { return <BoolExpr>{ type: 'BoolExpr', value: this.previous }; }
    if (this.match(Token.nullKeyword)) { return <NullExpr>{ type: 'NullExpr', value: this.previous }; }
    if (this.match(Token.thisKeyword)) { return <ThisExpr>{ type: 'ThisExpr', keyword: this.previous }; }

    // TODO: Error if not inside class.
    if (this.match(Token.field)) { return <FieldExpr>{ type: 'FieldExpr', name: this.previous }; }
    if (this.match(Token.staticField)) { return <StaticFieldExpr>{ type: 'StaticFieldExpr', name: this.previous }; }

    if (this.match(Token.number)) { return <NumExpr>{ type: 'NumExpr', value: this.previous }; }
    if (this.match(Token.string)) { return <StringExpr>{ type: 'StringExpr', value: this.previous }; }

    if (this.peek() === Token.interpolation) { return this.stringInterpolation(); }
    // TODO: Token.super.

    this.error("Expect expression.");
    // Make a fake node so that we don't have to worry about null later.
    // TODO: Should this be an error node?
    return <NullExpr>{ value: this.previous };
  }

  // Finishes parsing a parenthesized expression.
  //
  // grouping: "(" expressions ")"
  grouping(): GroupingExpr {
    const leftParen = this.previous;
    const expression = this.expression();
    const rightParen = this.consume(Token.rightParen, "Expect ')' after expression.");
    return { type:'GroupingExpr', leftParen, expression, rightParen };
  }

  // Finishes parsing a list literal.
  //
  // listLiteral: "[" ( expression ("," expression)* ","? )? "]"
  listLiteral(): ListExpr {
    const leftBracket = this.previous;
    const elements: Expr[] = [];

    this.ignoreLine();

    while (this.peek() !== Token.rightBracket) {
      elements.push(this.expression());

      this.ignoreLine();
      if (!this.match(Token.comma)) {
        break;
      }
      this.ignoreLine();
    }

    var rightBracket = this.consume(Token.rightBracket, "Expect ']' after list elements.");
    return { type:'ListExpr', leftBracket, elements, rightBracket };
  }

  // Finishes parsing a map literal.
  //
  // mapLiteral: "[" ( mapEntry ("," mapEntry)* ","? )? "}"
  // mapEntry:   expression ":" expression
  mapLiteral(): MapExpr {
    const leftBrace = this.previous;
    const entries: MapEntry[] = [];

    this.ignoreLine();

    while (this.peek() !== Token.rightBrace) {
      const key = this.expression();
      this.consume(Token.colon, "Expect ':' after map key.");

      const value = this.expression();
      entries.push({ type:'MapEntry', key, value });

      this.ignoreLine();
      if (!this.match(Token.comma)) {
        break;
      }

      const rightBrace = this.consume(Token.rightBrace, "Expect '}' after map entries.");
      return { type:'MapExpr', leftBrace, entries, rightBrace };
    }
  }

  superCall(): SuperExpr {
    let name: Token;

    if (this.match(Token.dot)) {
      // It's a named super call.
      name = this.consume(Token.tname, "Expect method name after 'super.'.");
    }

    const args = this.finishCall();
    return { type:'SuperExpr', name, args: args[0], blockArgument: args[1] };
  }

  // stringInterpolation: (interpolation expression )? string
  stringInterpolation(): InterpolationExpr {
    let strings: Token[] = [];
    let expressions: Expr[] = [];

    while (this.match(Token.interpolation)) {
      strings.push(this.previous);
      expressions.push(this.expression());
    }

    // This error should never be reported. It's the lexer's job to ensure we
    // generate the right token sequence.
    strings.push(this.consume(Token.string, "Expect end of string interpolation."));

    return { type:'InterpolationExpr', strings, expressions };
  }

  // Utility methods.

  // Parses a left-associative series of infix operator expressions using any
  // of [tokenTypes] as operators and calling [parseOperand] to parse the left
  // and right operands.
  parseInfix(tokenTypes: string[], parseOperand: Function): InfixExpr {
    let expr = parseOperand();
    while (this.matchAny(tokenTypes)) {
      var operator = this.previous;
      this.ignoreLine();
      var right = parseOperand();
      expr = { type:'InfixExpr', left: expr, operator, right };
    }

    return expr;
  }

  // If the next token has [type], consumes and returns it. Otherwise, returns
  // `null`.
  match(type: string) {
    if (this.peek() !== type) {
      return null;
    }

    return this.consumeNext();
  }

  // Consumes and returns the next token if its type is contained in the list
  // [types].
  matchAny(types: string[]) {
    for (let type of types) {
      var result = this.match(type);
      if (result) {
        return result;
      }
    }

    return null;
  }

  // Consumes zero or more newlines. Returns `true` if at least one was matched.
  matchLine(): boolean {
    if (!this.match(Token.line)) {
      return false;
    }

    while (this.match(Token.line)) { }
    return true;
  }

  // Same as [matchLine()], but makes it clear that the intent is to discard newlines appearing where this is called.
  ignoreLine() {
    this.matchLine();
  }

  // Consumes one or more newlines.
  consumeLine(error) {
    this.consume(Token.line, error);
    this.ignoreLine();
  }

  // Reads and consumes the next token.
  consumeNext(): Token {
    this.peek();
    this.previous = this.current;
    this.current = null;
    return this.previous;
  }

  // Reads the next token if it is of [type]. Otherwise, discards it and
  // reports an error with [message]
  consume(type: string, message: string): Token {
    const token = this.consumeNext();
    if (token.type !== type) {
      this.error(message);
    }

    return token;
  }

  // Returns the type of the next token.
  peek(): string {
    if (this.current === null) { this.current = this.lexer.readToken(); }
    return this.current.type;
  }

  error(message: string): void {
    this.problems.push([message, [this.current !== null ? this.current : this.previous]]);
  }
}

export default Parser;
export { Module, ImportStmt };