import React, { useState } from 'react';
import FileUploader from '../components/FileUploader';
import GCodeViewer from '../components/GCodeViewer';

const GCodePage: React.FC = () => {
  const [gcodeContent, setGcodeContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleFileLoaded = (content: string, name: string) => {
    setGcodeContent(content);
    setFileName(name);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden p-2">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold">GCODE Viewer</h1>
        {fileName && (
          <h2 className="text-sm font-semibold bg-gray-100 px-2 py-1 rounded">Archivo: {fileName}</h2>
        )}
      </div>
      
      <div className="flex h-[calc(100vh-60px)]">
        <div className="w-64 mr-2">
          <FileUploader onFileLoaded={handleFileLoaded} />
          {!gcodeContent && (
            <div className="mt-4 p-4 text-center bg-gray-100 rounded-lg">
              <p className="text-gray-600 text-sm">Carga un archivo GCODE para visualizarlo</p>
            </div>
          )}
        </div>
        
        <div className="flex-1 border border-gray-200 rounded">
          {gcodeContent ? (
            <GCodeViewer gcodeContent={gcodeContent} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GCodePage;
