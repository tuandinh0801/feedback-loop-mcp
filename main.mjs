#!/usr/bin/env node
import { app, screen, BrowserWindow, ipcMain } from 'electron';
import Store from 'electron-store';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';

// recreate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Command line arguments
let projectDirectory = process.cwd();
let promptText = '';
let mainWindow;
let store;

// Parse command line arguments
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--project-directory' && i + 1 < args.length) {
    projectDirectory = args[i + 1];
    i++;
  } else if (args[i] === '--prompt' && i + 1 < args.length) {
    promptText = args[i + 1];
    i++;
  }
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const windowWidth = 400;
  const windowHeight = 380;

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: Math.round((screenWidth - windowWidth) / 2),
    y: Math.round((screenHeight - windowHeight) * 0.9), // Position at 70% down from top
    alwaysOnTop: true,
    visibleOnAllWorkspaces: true,
    fullscreenable: false,
    skipTaskbar: false,
    frame: false,
    titleBarStyle: 'hidden',
    type: process.platform === 'darwin' ? 'panel' : 'normal',
    icon: path.join(__dirname, 'assets', 'feedback.png'),
    vibrancy: 'under-window',
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.mjs')
    }
  });

  if (process.platform === 'darwin') {
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    // Set window level to screen saver level to appear above fullscreen apps
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    // Try to set the highest possible window level
    if (mainWindow.setLevel) {
      mainWindow.setLevel(1000); // Very high level to ensure it's above everything
    }
  }

  mainWindow.loadFile('renderer/index.html');

  // Ensure window stays on top when focus changes
  mainWindow.on('blur', () => {
    if (process.platform === 'darwin') {
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      if (mainWindow.setLevel) {
        mainWindow.setLevel(1000);
      }
    }
  });

  mainWindow.on('focus', () => {
    if (process.platform === 'darwin') {
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      if (mainWindow.setLevel) {
        mainWindow.setLevel(1000);
      }
    }
  });

  // Send initial data to renderer
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.webContents.send('initial-data', {
      projectDirectory,
      promptText
    });

    // Ensure window is properly positioned on top after load
    if (process.platform === 'darwin') {
      setTimeout(() => {
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
        if (mainWindow.setLevel) {
          mainWindow.setLevel(1000);
        }
        mainWindow.focus();
      }, 100);
    }
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;

    // Send empty feedback response to MCP server
    const result = {
      feedback: '',
      cancelled: true,
      timestamp: new Date().toISOString(),
      projectDirectory
    };

    // Write result to stdout
    process.stdout.write(JSON.stringify(result));

    // Now actually quit the app
    setTimeout(() => {
      app.exit();
    }, 100);
  });
}

async function initializeApp() {
  store = new Store();

  createWindow();
}

app.whenReady().then(initializeApp);

// Handle app quit - send response before quitting
app.on('before-quit', (event) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Prevent default quit to send response first
    event.preventDefault();
    
    // Send empty feedback response to MCP server
    const result = {
      feedback: '',
      cancelled: true,
      timestamp: new Date().toISOString(),
      projectDirectory
    };
    
    // Write result to stdout
    process.stdout.write(JSON.stringify(result));
    
    // Now actually quit the app
    setTimeout(() => {
      app.exit();
    }, 100);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else if (mainWindow && process.platform === 'darwin') {
    // Ensure window stays on top when app is activated
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    if (mainWindow.setLevel) {
      mainWindow.setLevel(1000);
    }
    mainWindow.focus();
  }
});

// Handle system events that might affect window layering
if (process.platform === 'darwin') {
  app.on('browser-window-focus', (event, window) => {
    if (window === mainWindow) {
      window.setAlwaysOnTop(true, 'screen-saver');
      if (window.setLevel) {
        window.setLevel(1000);
      }
    }
  });

  app.on('browser-window-blur', (event, window) => {
    if (window === mainWindow) {
      // Keep window on top even when blurred
      setTimeout(() => {
        window.setAlwaysOnTop(true, 'screen-saver');
        if (window.setLevel) {
          window.setLevel(1000);
        }
      }, 50);
    }
  });
}

// IPC Handlers

ipcMain.handle('submit-feedback', async (event, data) => {
  try {
    const result = {
      feedback: data.feedback,
      timestamp: new Date().toISOString(),
      projectDirectory
    };

    // Write result to stdout
    process.stdout.write(JSON.stringify(result));

    // Close the application after feedback submission
    setTimeout(() => {
      app.quit();
    }, 500);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});


ipcMain.handle('close-window', async () => {
  try {
    // Treat close as empty input submission
    const result = {
      feedback: '',
      cancelled: true,
      timestamp: new Date().toISOString(),
      projectDirectory
    };

    // Write result to stdout
    process.stdout.write(JSON.stringify(result));

    // Close the application
    setTimeout(() => {
      app.quit();
    }, 100);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});