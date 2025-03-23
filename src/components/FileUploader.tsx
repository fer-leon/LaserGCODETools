import React from 'react';

interface FileUploaderProps {
  onFileLoaded: (content: string, fileName: string) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileLoaded }) => {
  const handleFileSelect = async () => {
    try {
      // Access the exposed API from preload.ts
      const electronAPI = (window as any).electronAPI;
      if (!electronAPI) {
        console.error('Electron API not available');
        return;
      }

      const filePath = await electronAPI.openFile();
      if (!filePath) return; // User canceled

      const content = await electronAPI.readFile(filePath);
      if (content) {
        // Extract filename from path
        const fileName = filePath.split(/[/\\]/).pop() || 'file.gcode';
        onFileLoaded(content, fileName);
      }
    } catch (error) {
      console.error('Error loading file:', error);
    }
  };

  return (
    <div className="mt-6">
      <button
        onClick={handleFileSelect}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Load GCODE File
      </button>
    </div>
  );
};

export default FileUploader;
