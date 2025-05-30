import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  onInitialData: (callback) => {
    return ipcRenderer.on('initial-data', (event, data) => {
      callback(event, data);
    });
  },
  sendFeedback: (feedback) => ipcRenderer.send('feedback-result', feedback),
  submitFeedback: (data) => ipcRenderer.invoke('submit-feedback', data),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});