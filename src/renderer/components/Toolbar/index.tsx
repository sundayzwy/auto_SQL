/**
 * 工具栏组件
 *
 * 提供方言切换、格式化、性能分析、DDL 导入和重置等操作入口。
 * 通过 useSqlAnalysis Hook 与引擎层解耦，仅负责 UI 渲染。
 */

import React from 'react';
import { useSqlStore } from '../../store/sqlStore';
import { useSqlAnalysis } from '../../hooks/useSqlAnalysis';

const Toolbar: React.FC = () => {
  const { dialect, setDialect, tables } = useSqlStore();
  const { format, analyze, importDdl, reset } = useSqlAnalysis();

  /**
   * 处理 DDL 导入
   * 通过 prompt 弹窗获取用户输入的 DDL 语句
   */
  const handleImportDdl = () => {
    const ddl = prompt('请输入 DDL 语句：');
    if (!ddl) return;

    const count = importDdl(ddl);
    alert(`成功导入 ${count} 个表的元数据`);
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-4">
      {/* 方言选择 */}
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

      {/* 格式化按钮 */}
      <button
        onClick={format}
        className="px-4 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        格式化
      </button>

      {/* 性能分析按钮 */}
      <button
        onClick={analyze}
        className="px-4 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        性能分析
      </button>

      {/* 导入 DDL 按钮 */}
      <button
        onClick={handleImportDdl}
        className="px-4 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        导入 DDL
      </button>

      {/* 重置按钮 */}
      <button
        onClick={reset}
        className="px-4 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
      >
        重置
      </button>

      {/* 弹性空间 */}
      <div className="flex-1" />

      {/* 已加载表数量 */}
      <div className="text-sm text-gray-500">
        已加载 {tables.size} 个表
      </div>
    </div>
  );
};

export default Toolbar;