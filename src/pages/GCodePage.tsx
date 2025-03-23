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
    <div className="flex flex-col h-full overflow-hidden p-2">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold">GCODE Viewer</h1>
        {fileName && (
          <h2 className="text-sm font-semibold bg-gray-100 px-2 py-1 rounded truncate max-w-xs">
            Archivo: {fileName}
          </h2>
        )}
      </div>
      
      <div className="flex flex-1 min-h-0">
        <div className="w-56 mr-2 flex flex-col">
          <FileUploader onFileLoaded={handleFileLoaded} />
          {!gcodeContent && (
            <div className="mt-2 p-2 text-center bg-gray-100 rounded-lg">
              <p className="text-gray-600 text-xs">Carga un archivo GCODE para visualizarlo</p>
            </div>
          )}
        </div>
        
        <div className="flex-1 border border-gray-200 rounded min-h-0">
          {gcodeContent ? (
            <GCodeViewer gcodeContent={gcodeContent} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
