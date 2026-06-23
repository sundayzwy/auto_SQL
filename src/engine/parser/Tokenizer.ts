import { Token, TokenType, IssueLocation, SqlDialect } from '../shared/types';
import { SQL_KEYWORDS, OPERATORS, PUNCTUATION } from '../shared/constants';

export class Tokenizer {
  private sql: string = '';
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private dialect: SqlDialect = 'impala';

  tokenize(sql: string, dialect: SqlDialect = 'impala'): Token[] {
    this.sql = sql;
    this.pos = 0;
    this.line = 1;
    this.column = 1;
    this.dialect = dialect;

    const tokens: Token[] = [];

    while (this.pos < this.sql.length) {
      const token = this.nextToken();
      if (token) {
        tokens.push(token);
      }
    }

    tokens.push({
      type: 'EOF',
      value: '',
      location: { line: this.line, column: this.column },
    });

    return tokens;
  }

  private nextToken(): Token | null {
    this.skipWhitespace();

    if (this.pos >= this.sql.length) {
      return null;
    }

    const startLine = this.line;
    const startColumn = this.column;
    const char = this.sql[this.pos];

    // 注释
    if (char === '-' && this.sql[this.pos + 1] === '-') {
      return this.readLineComment(startLine, startColumn);
    }
    if (char === '/' && this.sql[this.pos + 1] === '*') {
      return this.readBlockComment(startLine, startColumn);
    }

    // 字符串
    if (char === "'" || char === '"') {
      return this.readString(startLine, startColumn);
    }

    // 数字
    if (this.isDigit(char)) {
      return this.readNumber(startLine, startColumn);
    }

    // 标识符或关键字
    if (this.isIdentifierStart(char)) {
      return this.readIdentifier(startLine, startColumn);
    }

    // 操作符
    if (OPERATORS.has(char)) {
      return this.readOperator(startLine, startColumn);
    }

    // 标点符号
    if (PUNCTUATION.has(char)) {
      return this.readPunctuation(startLine, startColumn);
    }

    // 其他字符
    this.advance();
    return {
      type: 'PUNCTUATION',
      value: char,
      location: { line: startLine, column: startColumn },
    };
  }

  private skipWhitespace(): void {
    while (this.pos < this.sql.length) {
      const char = this.sql[this.pos];
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else if (char === '\n') {
        this.advance();
        this.line++;
        this.column = 1;
      } else {
        break;
      }
    }
  }

  private readLineComment(startLine: number, startColumn: number): Token {
    let value = '';
    while (this.pos < this.sql.length && this.sql[this.pos] !== '\n') {
      value += this.sql[this.pos];
      this.advance();
    }
    return {
      type: 'COMMENT',
      value,
      location: { line: startLine, column: startColumn },
    };
  }

  private readBlockComment(startLine: number, startColumn: number): Token {
    let value = '';
    this.advance(); // /
    this.advance(); // *

    while (this.pos < this.sql.length) {
      if (this.sql[this.pos] === '*' && this.sql[this.pos + 1] === '/') {
        value += '*/';
        this.advance();
        this.advance();
        break;
      }
      if (this.sql[this.pos] === '\n') {
        this.line++;
        this.column = 1;
      }
      value += this.sql[this.pos];
      this.advance();
    }

    return {
      type: 'COMMENT',
      value,
      location: { line: startLine, column: startColumn },
    };
  }

  private readString(startLine: number, startColumn: number): Token {
    const quote = this.sql[this.pos];
    let value = quote;
    this.advance();

    while (this.pos < this.sql.length) {
      const char = this.sql[this.pos];
      value += char;
      this.advance();

      if (char === quote) {
        // 检查转义引号
        if (this.pos < this.sql.length && this.sql[this.pos] === quote) {
          value += this.sql[this.pos];
          this.advance();
        } else {
          break;
        }
      }
    }

    return {
      type: 'STRING',
      value,
      location: { line: startLine, column: startColumn },
    };
  }

  private readNumber(startLine: number, startColumn: number): Token {
    let value = '';
    let hasDecimal = false;

    while (this.pos < this.sql.length) {
      const char = this.sql[this.pos];
      if (this.isDigit(char)) {
        value += char;
        this.advance();
      } else if (char === '.' && !hasDecimal) {
        hasDecimal = true;
        value += char;
        this.advance();
      } else {
        break;
      }
    }

    return {
      type: 'NUMBER',
      value,
      location: { line: startLine, column: startColumn },
    };
  }

  private readIdentifier(startLine: number, startColumn: number): Token {
    let value = '';

    while (this.pos < this.sql.length) {
      const char = this.sql[this.pos];
      if (this.isIdentifierPart(char)) {
        value += char;
        this.advance();
      } else {
        break;
      }
    }

    const upperValue = value.toUpperCase();
    const type: TokenType = SQL_KEYWORDS.has(upperValue) ? 'KEYWORD' : 'IDENTIFIER';

    return {
      type,
      value,
      location: { line: startLine, column: startColumn },
    };
  }

  private readOperator(startLine: number, startColumn: number): Token {
    let value = this.sql[this.pos];
    this.advance();

    // 检查双字符操作符
    if (this.pos < this.sql.length) {
      const nextChar = this.sql[this.pos];
      const twoChar = value + nextChar;
      if (twoChar === '<=' || twoChar === '>=' || twoChar === '<>' || 
          twoChar === '!=' || twoChar === '||' || twoChar === '&&') {
        value = twoChar;
        this.advance();
      }
    }

    return {
      type: 'OPERATOR',
      value,
      location: { line: startLine, column: startColumn },
    };
  }

  private readPunctuation(startLine: number, startColumn: number): Token {
    const value = this.sql[this.pos];
    this.advance();

    return {
      type: 'PUNCTUATION',
      value,
      location: { line: startLine, column: startColumn },
    };
  }

  private advance(): void {
    this.pos++;
    this.column++;
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isIdentifierStart(char: string): boolean {
    return (char >= 'a' && char <= 'z') || 
           (char >= 'A' && char <= 'Z') || 
           char === '_' || 
           char === '$';
  }

  private isIdentifierPart(char: string): boolean {
    return this.isIdentifierStart(char) || this.isDigit(char);
  }
}
