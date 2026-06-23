import React from 'react';
import { useSqlStore } from '../../store/sqlStore';

const SuggestionPanel: React.FC = () => {
  const { issues } = useSqlStore();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <h3 className="text-sm font-medium text-gray-700">
          调优建议 {issues.length > 0 && `(${issues.length})`}
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {issues.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">
            暂无建议
          </div>
        ) : (
          issues.map((issue, index) => (
            <div
              key={index}
              className={`p-3 rounded border ${getSeverityColor(issue.severity)}`}
            >
              <div className="flex items-start justify-between mb-1">
                <span className="font-medium text-sm">{issue.title}</span>
                <span className="text-xs opacity-75">{issue.ruleId}</span>
              </div>
              <p className="text-xs mb-2">{issue.description}</p>
              <p className="text-xs font-medium">建议：{issue.suggestion}</p>
              <div className="text-xs opacity-75 mt-1">
                位置：第 {issue.location.line} 行，第 {issue.location.column} 列
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SuggestionPanel;
