const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Event listeners
  onInitialData: (callback) => {
    ipcRenderer.on('initial-data', (event, data) => callback(data));
  },
  
  // Settings management
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  
  // Feedback submission
  submitFeedback: (feedback) => ipcRenderer.invoke('submit-feedback', feedback),
  
  // Project information
  getProjectInfo: () => ipcRenderer.invoke('get-project-info'),
  
  // Window controls
  closeWindow: () => ipcRenderer.invoke('close-window'),
  resizeWindow: (width, height) => ipcRenderer.invoke('resize-window', width, height),
  
  // Remove listeners (cleanup)
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});