/**
 * 规则模块入口
 *
 * 导出规则引擎的核心抽象类和规则引擎实现。
 * 所有具体的 SQL 优化规则（common、impala、oracle）均继承自 Rule 抽象类，
 * 由 RuleEngine 统一管理和调度执行。
 */
export { Rule } from './Rule';
export { RuleEngine } from './RuleEngine';
