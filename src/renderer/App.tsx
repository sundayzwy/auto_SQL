import React from 'react';
import Toolbar from './components/Toolbar';
import SqlInput from './components/SqlInput';
import FormattedOutput from './components/FormattedOutput';
import SuggestionPanel from './components/SuggestionPanel';
import OptimizedOutput from './components/OptimizedOutput';

/**
 * App 根组件
 *
 * 采用四面板布局结构：
 * - 顶部工具栏（Toolbar）：提供格式化、性能分析、DDL 导入等操作按钮
 * - 左侧第一面板（SqlInput）：SQL 原始输入编辑器
 * - 左侧第二面板（FormattedOutput）：格式化后的 SQL 展示
 * - 右侧第一面板（SuggestionPanel）：性能调优建议列表
 * - 右侧第二面板（OptimizedOutput）：优化后的 SQL 展示
 *
 * 四个面板等宽排列，均分可用空间，通过 flex 布局自适应窗口大小。
 */
const App: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Toolbar />
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col border-r border-gray-200">
          <SqlInput />
        </div>
        <div className="flex-1 flex flex-col border-r border-gray-200">
          <FormattedOutput />
        </div>
        <div className="flex-1 flex flex-col border-r border-gray-200">
          <SuggestionPanel />
        </div>
        <div className="flex-1 flex flex-col">
          <OptimizedOutput />
        </div>
      </div>
    </div>
  );
};

export default App;
