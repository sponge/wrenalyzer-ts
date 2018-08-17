import Lexer from './lexer';
import Parser from './parser';
//import Token from './token';
import SourceFile from './sourcefile';
import * as fs from 'fs';

class Startup {
  public static main(): number {
    const path = 'C:\\source\\sdlgame\\base\\scripts\\engine.wren';
    const contents = fs.readFileSync(path);

    const source = new SourceFile(path, contents.toString());
    const lexer = new Lexer(source);

    // let token = lexer.readToken();
    // let i = 1;
    // while (token.type !== Token.eof) {
    //   console.log(++i, token);
    //   token = lexer.readToken();
    // }

    const parser = new Parser(lexer);
    const ast = parser.parseModule();

    console.log(parser.problems);
    console.log(ast.statements.length);

    return 0;
  }
}

Startup.main();