import Lexer from './lexer';
import Parser from './parser';
// import Token from './token';
import SourceFile from './sourcefile';
import * as fs from 'fs';

class Startup {
  public static main(): number {
    const path = 'C:\\source\\sdlgame\\clive\\scripts\\td.wren';
    const contents = fs.readFileSync(path);

    const source = new SourceFile(path, contents.toString());
    const lexer = new Lexer(source);

    // let token = lexer.readToken();
    // let i = 1;
    // let str = '';
    // while (token.type !== Token.eof) {
    //   console.log(++i, token);
    //   token = lexer.readToken();
    //   str += token.type + ',';
    // }
    // console.log(str);

    const parser = new Parser(lexer);
    const ast = parser.parseModule();

    console.log(parser.problems);
    console.log(ast);
    console.log(ast.statements.length);

    return 0;
  }
}

Startup.main();