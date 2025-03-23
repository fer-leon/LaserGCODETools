import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  readFile: (path: string) => ipcRenderer.invoke('file:read', path),
  saveFile: (content: string, suggestedName?: string) => 
    ipcRenderer.invoke('dialog:saveFile', content, suggestedName)
});
