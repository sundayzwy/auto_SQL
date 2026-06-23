/**
 * SQL 分析自定义 Hook
 *
 * 封装格式化、性能分析和 DDL 导入的业务逻辑编排。
 * 将引擎层调用与 Zustand 状态管理连接起来，
 * 使组件层只需关注 UI 渲染。
 */

import { useCallback } from 'react';
import { useSqlStore } from '../store/sqlStore';
import { formatSql, analyzeSql, parseDdl } from '../services/sqlService';

/**
 * 提供 SQL 分析相关的操作函数
 *
 * @returns {Object} 包含 format、analyze、importDdl、reset 四个操作函数
 *
 * @example
 * const { format, analyze, importDdl, reset } = useSqlAnalysis();
 * // 在按钮点击时调用: format()
 */
export function useSqlAnalysis() {
  const {
    dialect,
    inputSql,
    formatConfig,
    tables,
    setFormattedSql,
    setOptimizedSql,
    setIssues,
    addTable,
  } = useSqlStore();

  /**
   * 格式化当前输入的 SQL
   */
  const format = useCallback(() => {
    if (!inputSql.trim()) return;

    const result = formatSql(inputSql, formatConfig);
    if (result.success && result.formattedSql) {
      setFormattedSql(result.formattedSql);
    }
  }, [inputSql, dialect, formatConfig, setFormattedSql]);

  /**
   * 分析当前输入的 SQL 性能
   *
   * 流水线：解析 → 规则检查 → 生成优化 SQL
   */
  const analyze = useCallback(() => {
    if (!inputSql.trim()) return;

    const result = analyzeSql(inputSql, dialect, tables);
    setIssues(result.issues);

    if (result.optimizedSql) {
      setOptimizedSql(result.optimizedSql);
    }
  }, [inputSql, dialect, tables, setIssues, setOptimizedSql]);

  /**
   * 导入 DDL 语句，提取并存储表元数据
   *
   * @param ddl - DDL 语句文本
   * @returns 成功导入的表数量
   */
  const importDdl = useCallback(
    (ddl: string): number => {
      const parsedTables = parseDdl(ddl, dialect);
      for (const table of parsedTables) {
        addTable(table);
      }
      return parsedTables.length;
    },
    [dialect, addTable]
  );

  /**
   * 重置所有输出结果
   */
  const reset = useCallback(() => {
    setFormattedSql('');
    setOptimizedSql('');
    setIssues([]);
  }, [setFormattedSql, setOptimizedSql, setIssues]);

  return { format, analyze, importDdl, reset };
}