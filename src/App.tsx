import React from 'react';
import GCodePage from './pages/GCodePage';

export default function App() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden min-h-0">
        <GCodePage />
      </div>
    </div>
  );
}