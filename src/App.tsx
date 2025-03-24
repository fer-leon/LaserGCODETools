import React, { useState } from 'react';
import GCodePage from './pages/GCodePage';
import TestGeneratorPage from './pages/TestGeneratorPage';

type TabType = 'gcode' | 'test-generator';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('gcode');

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Tab Navigation */}
      <div className="bg-gray-100 border-b">
        <div className="flex">
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'gcode'
                ? 'bg-white text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('gcode')}
          >
            GCODE Tools
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'test-generator'
                ? 'bg-white text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab('test-generator')}
          >
            Test Generator
          </button>
        </div>
      </div>

      {/* Page Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {activeTab === 'gcode' && <GCodePage />}
        {activeTab === 'test-generator' && <TestGeneratorPage />}
      </div>
    </div>
  );
}