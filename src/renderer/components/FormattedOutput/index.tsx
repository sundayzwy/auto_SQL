import React from 'react';
import Editor from '@monaco-editor/react';
import { useSqlStore } from '../../store/sqlStore';

const FormattedOutput: React.FC = () => {
  const { formattedSql } = useSqlStore();

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedSql);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">格式化结果</h3>
        {formattedSql && (
          <button
            onClick={handleCopy}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            复制
          </button>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language="sql"
          value={formattedSql}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
};

export default FormattedOutput;
