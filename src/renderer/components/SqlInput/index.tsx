import React from 'react';
import Editor from '@monaco-editor/react';
import { useSqlStore } from '../../store/sqlStore';

/**
 * SQL 输入面板组件
 *
 * 提供基于 Monaco Editor 的 SQL 代码编辑区域，支持语法高亮。
 * 顶部显示面板标题，底部状态栏显示当前输入的行数和字符数。
 * 编辑器内容变更时自动同步到全局 store。
 */
const SqlInput: React.FC = () => {
  const { inputSql, setInputSql } = useSqlStore();

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <h3 className="text-sm font-medium text-gray-700">SQL 输入</h3>
      </div>
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language="sql"
          value={inputSql}
          onChange={(value) => setInputSql(value || '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
      <div className="bg-white border-t border-gray-200 px-4 py-1 text-xs text-gray-500">
        {inputSql.split('\n').length} 行 | {inputSql.length} 字符
      </div>
    </div>
  );
};

export default SqlInput;
