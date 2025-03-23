import React, { useState, useCallback } from 'react';

interface FileUploaderProps {
  onFileLoaded: (content: string, fileName: string) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);

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

  // Drag and drop event handlers
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Set the drop effect to copy to show a "+" cursor
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // Check if files were dropped
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      // Check file extension for GCODE
      const validExtensions = ['.gcode', '.nc', '.g', '.ngc'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!validExtensions.includes(fileExtension)) {
        alert('Por favor, arrastra solo archivos GCODE (.gcode, .nc, .g, .ngc)');
        return;
      }

      try {
        // Read the file content
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target && typeof event.target.result === 'string') {
            onFileLoaded(event.target.result, file.name);
          }
        };
        reader.readAsText(file);
      } catch (error) {
        console.error('Error reading dropped file:', error);
      }
    }
  }, [onFileLoaded]);

  return (
    <div
      className={`h-28 p-2 border-2 border-dashed rounded-lg transition-colors ${
        isDragging 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400'
      }`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="text-center mb-1">
        <p className="text-gray-700 text-xs">
          Arrastra tu archivo GCODE
        </p>
      </div>
      
      <div className="flex justify-center">
        <button
          onClick={handleFileSelect}
          className="bg-blue-500 hover:bg-blue-700 text-white text-xs font-bold py-1 px-2 rounded"
        >
          Seleccionar archivo
        </button>
      </div>
    </div>
  );
};

export default FileUploader;
