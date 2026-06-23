/**
 * SQL 解析器模块
 *
 * 负责将 SQL 字符串解析为抽象语法树（AST）。
 * 解析流程分为两个阶段：
 * 1. 词法分析（Tokenizer）：将 SQL 字符串拆分为 Token 序列
 * 2. 语法分析（Parser）：将 Token 序列解析为 AST
 *
 * 导出：
 * - Tokenizer：SQL 词法分析器
 * - Parser：SQL 递归下降语法分析器
 */
export { Tokenizer } from './Tokenizer';
export { Parser } from './Parser';
