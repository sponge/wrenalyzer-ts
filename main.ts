import Lexer from './lexer'
import Parser from './parser'
import SourceFile from './sourcefile'
import * as fs from 'fs'

class Startup {
  public static main(): number {
    const path = 'C:\\source\\sdlgame\\clive\\scripts\\main.wren';
    const contents = fs.readFileSync(path);

    const source = new SourceFile(path, contents.toString());
    const lexer = new Lexer(source);
    const parser = new Parser(lexer);
    const ast = parser.parseModule();

    //console.log(ast);

    return 0;
  }
}

Startup.main();