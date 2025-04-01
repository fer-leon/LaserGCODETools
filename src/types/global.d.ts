// Custom window interface to include electronAPI
interface Window {
  electronAPI: {
    saveFile: (content: string, options?: any) => Promise<{success: boolean, filePath?: string}>;
    openFile: () => Promise<{content: string, filePath?: string}>;
  }
}