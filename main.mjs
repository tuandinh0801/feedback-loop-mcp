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
let quickFeedbackOptions = [];
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
  } else if (args[i] === '--quick-feedback-options' && i + 1 < args.length) {
    try {
      quickFeedbackOptions = JSON.parse(args[i + 1]);
    } catch (e) {
      console.error('Failed to parse quick feedback options in main.mjs:', e);
      quickFeedbackOptions = []; // Default to empty array on error
    }
    i++;
  }
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const windowWidth = 400;
  // Initial height, will be adjusted by renderer
  let windowHeight = 300; 

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
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('set-ui-data', {
      projectDirectory,
      promptText, // This is our 'prompt' parameter from the tool call
      quickFeedbackOptions
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

ipcMain.on('request-resize', (event, newHeight) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { height: screenHeight } = primaryDisplay.workAreaSize;
    
    // Ensure new height is not more than screen height (minus a small buffer)
    const maxHeight = screenHeight - 50;
    const adjustedHeight = Math.min(newHeight, maxHeight);
    
    // Get current width to maintain it
    const [currentWidth] = mainWindow.getSize();
    mainWindow.setSize(currentWidth, adjustedHeight, true); // true for animate

    // Recalculate and set window position to keep it centered and on-screen
    const newBounds = mainWindow.getBounds();
    const newX = Math.round(primaryDisplay.workArea.x + (primaryDisplay.workArea.width - newBounds.width) / 2);
    const desiredBottomMargin = 50; // Pixels from the bottom of the work area
    const newY = Math.round(primaryDisplay.workArea.y + primaryDisplay.workArea.height - newBounds.height - desiredBottomMargin);
    
    mainWindow.setPosition(newX, newY, true);
  }
});

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