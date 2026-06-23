import React from 'react';
import { useSqlStore } from '../../store/sqlStore';
import { Parser } from '../../engine/parser';
import { Formatter } from '../../engine/formatter';
import { RuleEngine } from '../../engine/rules';
import { SqlOptimizer } from '../../engine/optimizer';
import { DdlParser } from '../../engine/metadata';

const Toolbar: React.FC = () => {
  const {
    dialect,
    setDialect,
    inputSql,
    setFormattedSql,
    setOptimizedSql,
    setIssues,
    tables,
    formatConfig,
    addTable,
  } = useSqlStore();

  const handleFormat = () => {
    if (!inputSql.trim()) return;

    const formatter = new Formatter(formatConfig);
    const result = formatter.format(inputSql, dialect);

    if (result.success && result.formattedSql) {
      setFormattedSql(result.formattedSql);
    }
  };

  const handleAnalyze = () => {
    if (!inputSql.trim()) return;

    const parser = new Parser();
    const parseResult = parser.parse(inputSql, dialect);

    if (!parseResult.success || !parseResult.ast) {
      setIssues([]);
      return;
    }

    const ruleEngine = new RuleEngine();
    const issues = ruleEngine.analyze(parseResult.ast, dialect, tables);
    setIssues(issues);

    if (issues.length > 0) {
      const optimizer = new SqlOptimizer();
      const optimizedSql = optimizer.optimize(inputSql, issues);
      setOptimizedSql(optimizedSql);
    }
  };

  const handleImportDdl = async () => {
    const ddl = prompt('请输入 DDL 语句：');
    if (!ddl) return;

    const ddlParser = new DdlParser();
    const tables = ddlParser.parse(ddl, dialect);

    for (const table of tables) {
      addTable(table);
    }

    alert(`成功导入 ${tables.length} 个表的元数据`);
  };

  const handleReset = () => {
    setFormattedSql('');
    setOptimizedSql('');
    setIssues([]);
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">方言：</label>
        <select
          value={dialect}
          onChange={(e) => setDialect(e.target.value as any)}
          className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="impala">Impala SQL</option>
          <option value="oracle">Oracle SQL</option>
        </select>
      </div>

      <button
        onClick={handleFormat}
        className="px-4 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        格式化
      </button>

      <button
        onClick={handleAnalyze}
        className="px-4 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        性能分析
      </button>

      <button
        onClick={handleImportDdl}
        className="px-4 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        导入 DDL
      </button>

      <button
        onClick={handleReset}
        className="px-4 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      >
        重置
      </button>

      <div className="flex-1" />

      <div className="text-sm text-gray-500">
        已加载 {tables.size} 个表
      </div>
    </div>
  );
};

export default Toolbar;
