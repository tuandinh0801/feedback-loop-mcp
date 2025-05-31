import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  onSetUiData: (callback) => { // Renamed from onInitialData
    // Ensure we remove any previous listener to avoid duplicates if this is called multiple times
    ipcRenderer.removeAllListeners('set-ui-data'); 
    return ipcRenderer.on('set-ui-data', (event, data) => { // Changed channel name
      callback(event, data);
    });
  },
  sendFeedback: (feedback) => ipcRenderer.send('feedback-result', feedback),
  submitFeedback: (data) => ipcRenderer.invoke('submit-feedback', data),
  requestResize: (height) => ipcRenderer.send('request-resize', height),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});