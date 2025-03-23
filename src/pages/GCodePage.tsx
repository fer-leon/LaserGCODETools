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
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">GCODE Viewer</h1>
      
      <FileUploader onFileLoaded={handleFileLoaded} />
      
      {gcodeContent ? (
        <>
          {fileName && (
            <div className="mt-4 mb-2">
              <h2 className="text-xl font-semibold">File: {fileName}</h2>
            </div>
          )}
          
          <div className="mt-4">
            <GCodeViewer gcodeContent={gcodeContent} />
          </div>
        </>
      ) : (
        <div className="mt-8 p-6 text-center bg-gray-100 rounded-lg">
          <p className="text-gray-600">Carga un archivo GCODE para visualizarlo</p>
        </div>
      )}
    </div>
  );
};

export default GCodePage;
