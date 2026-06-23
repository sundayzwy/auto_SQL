import React from 'react';
import Toolbar from './components/Toolbar';
import SqlInput from './components/SqlInput';
import FormattedOutput from './components/FormattedOutput';
import SuggestionPanel from './components/SuggestionPanel';
import OptimizedOutput from './components/OptimizedOutput';

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
