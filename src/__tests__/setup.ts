import '@testing-library/jest-dom';

// Mock the Electron API that might be used in components
window.electronAPI = {
  saveFile: jest.fn().mockResolvedValue({ success: true }),
  openFile: jest.fn().mockResolvedValue({ content: 'Sample GCODE content' }),
};