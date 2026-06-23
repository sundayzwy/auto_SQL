import { Token, TokenType } from '../../shared/types';
import { SQL_KEYWORDS, OPERATORS, PUNCTUATION } from '../../shared/constants';

/**
 * SQL 词法分析器（Tokenizer）
 *
 * 将输入的 SQL 字符串拆分为 Token 序列，是 SQL 解析流程的第一步。
 * 支持 Impala 等多种 SQL 方言，能够识别关键字、标识符、字符串、数字、
 * 操作符、标点符号、单行注释和块注释等 Token 类型。
 *
 * 使用方式：
 * ```
 * const tokenizer = new Tokenizer();
 * const tokens = tokenizer.tokenize('SELECT * FROM table1', 'impala');
 * ```
 */
export class Tokenizer {
  /** 当前待解析的 SQL 字符串 */
  private sql: string = '';
  /** 当前字符在 sql 中的索引位置 */
  private pos: number = 0;
  /** 当前行号（从 1 开始） */
  private line: number = 1;
  /** 当前列号（从 1 开始） */
  private column: number = 1;

  /**
   * 对 SQL 字符串进行完整的词法分析，返回 Token 序列
   *
   * @param sql - 待解析的 SQL 字符串
   * @param dialect - SQL 方言，默认为 'impala'
   * @returns 解析后的 Token 数组，末尾带有一个 EOF 类型的 Token
   */
  tokenize(sql: string): Token[] {
    this.sql = sql;
    this.pos = 0;
    this.line = 1;
    this.column = 1;

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

  /**
   * 读取下一个 Token
   *
   * 先跳过空白字符，然后根据当前字符的类型分派到对应的读取方法：
   * 注释（-- 或 /*）、字符串（' 或 "）、数字、标识符/关键字、操作符、标点符号。
   * 如果所有类型都不匹配，则将当前字符作为标点符号处理。
   *
   * @returns 解析出的 Token，如果已到达字符串末尾则返回 null
   */
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

  /**
   * 跳过空白字符（空格、制表符、回车、换行）
   *
   * 遇到换行符时会同步更新行号和列号计数器，
   * 确保后续 Token 的位置信息准确。
   */
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

  /**
   * 读取单行注释（以 -- 开头，直到行尾）
   *
   * 注释内容包含起始的 -- 以及直到换行符之前的所有字符。
   * 返回的 Token 类型为 'COMMENT'。
   *
   * @param startLine - 注释起始行号
   * @param startColumn - 注释起始列号
   * @returns 注释 Token
   */
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

  /**
   * 读取块注释（以 /* 开头，以 *\/ 结尾，可跨多行）
   *
   * 注释内容包含起始的 /* 和结束的 *\/。
   * 在解析过程中会正确处理跨行的情况，更新行号和列号。
   * 返回的 Token 类型为 'COMMENT'。
   *
   * @param startLine - 注释起始行号
   * @param startColumn - 注释起始列号
   * @returns 注释 Token
   */
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

  /**
   * 读取字符串字面量（以单引号或双引号包裹）
   *
   * 支持转义引号：连续两个相同的引号字符（如 '' 或 ""）视为一个转义引号，
   * 不会结束字符串。
   * 返回的 Token 类型为 'STRING'，值包含两端的引号。
   *
   * @param startLine - 字符串起始行号
   * @param startColumn - 字符串起始列号
   * @returns 字符串 Token
   */
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

  /**
   * 读取数字字面量（整数或小数）
   *
   * 只允许一个小数点，遇到第二个小数点或非数字字符时停止读取。
   * 返回的 Token 类型为 'NUMBER'。
   *
   * @param startLine - 数字起始行号
   * @param startColumn - 数字起始列号
   * @returns 数字 Token
   */
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

  /**
   * 读取标识符或关键字
   *
   * 读取由字母、数字、下划线或 $ 组成的连续字符序列。
   * 读取完成后与 SQL 关键字集合进行比对：如果匹配则为 'KEYWORD' 类型，
   * 否则为 'IDENTIFIER' 类型。比对时不区分大小写。
   *
   * @param startLine - 标识符起始行号
   * @param startColumn - 标识符起始列号
   * @returns 关键字或标识符 Token
   */
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

  /**
   * 读取操作符
   *
   * 读取单字符操作符，并检查其后字符是否构成双字符操作符
   *（如 <=, >=, <>, !=, ||, &&）。返回的 Token 类型为 'OPERATOR'。
   *
   * @param startLine - 操作符起始行号
   * @param startColumn - 操作符起始列号
   * @returns 操作符 Token
   */
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

  /**
   * 读取标点符号（如逗号、分号、括号等）
   *
   * 读取单个字符作为标点符号。返回的 Token 类型为 'PUNCTUATION'。
   *
   * @param startLine - 标点符号起始行号
   * @param startColumn - 标点符号起始列号
   * @returns 标点符号 Token
   */
  private readPunctuation(startLine: number, startColumn: number): Token {
    const value = this.sql[this.pos];
    this.advance();

    return {
      type: 'PUNCTUATION',
      value,
      location: { line: startLine, column: startColumn },
    };
  }

  /**
   * 向前移动一个字符
   *
   * 将位置指针 pos 和列号 column 同时加 1。
   * 注意：换行时行号的更新在 skipWhitespace 中处理。
   */
  private advance(): void {
    this.pos++;
    this.column++;
  }

  /**
   * 判断字符是否为数字（0-9）
   *
   * @param char - 待判断的字符
   * @returns 如果是数字则返回 true，否则返回 false
   */
  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  /**
   * 判断字符是否可以作为标识符的起始字符
   *
   * 标识符起始字符包括：字母（a-z, A-Z）、下划线（_）、美元符号（$）。
   *
   * @param char - 待判断的字符
   * @returns 如果可以起始标识符则返回 true，否则返回 false
   */
  private isIdentifierStart(char: string): boolean {
    return (char >= 'a' && char <= 'z') || 
           (char >= 'A' && char <= 'Z') || 
           char === '_' || 
           char === '$';
  }

  /**
   * 判断字符是否可以作为标识符的后续字符
   *
   * 标识符后续字符包括：标识符起始字符 + 数字（0-9）。
   *
   * @param char - 待判断的字符
   * @returns 如果可以作为标识符的一部分则返回 true，否则返回 false
   */
  private isIdentifierPart(char: string): boolean {
    return this.isIdentifierStart(char) || this.isDigit(char);
  }
}
