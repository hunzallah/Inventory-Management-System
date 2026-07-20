const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow;
let serverInstance;

const SERVER_PORT = 3001;

function waitForServer(url, maxRetries = 30, interval = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      http.get(url, (res) => {
        res.resume();
        resolve();
      }).on('error', () => {
        if (++attempts >= maxRetries) {
          reject(new Error('Server failed to start after ' + maxRetries + ' attempts'));
        } else {
          setTimeout(check, interval);
        }
      });
    };
    check();
  });
}

function startServer() {
  const userDataPath = app.getPath('userData');
  process.env.NODE_ENV = 'production';
  process.env.SERVER_PORT = String(SERVER_PORT);
  process.env.DB_PATH = path.join(userDataPath, 'inventory.db');
  process.env.UPLOADS_PATH = path.join(userDataPath, 'uploads');

  const serverApp = require('../server/index.js');
  serverInstance = serverApp.listen(SERVER_PORT, '127.0.0.1', () => {
    console.log('Server started on port ' + SERVER_PORT);
  });

  serverInstance.on('error', (err) => {
    console.error('Server listen error:', err);
  });
}

function createWindow(startUrl) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 650,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'default',
    show: false,
    icon: path.join(__dirname, '..', 'public', 'icon.ico'),
  });

  mainWindow.loadURL(startUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (!app.isPackaged && process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(async () => {
  try {
    if (app.isPackaged) {
      startServer();
      await waitForServer('http://127.0.0.1:' + SERVER_PORT + '/api/health');
      const startUrl = 'file://' + path.join(__dirname, '..', 'build', 'index.html');
      createWindow(startUrl);
    } else {
      const startUrl = 'http://localhost:3000';
      createWindow(startUrl);
    }
  } catch (err) {
    dialog.showErrorBox('Startup Error', err.message + '\n\n' + err.stack);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (serverInstance) {
    serverInstance.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow(app.isPackaged
      ? 'file://' + path.join(__dirname, '..', 'build', 'index.html')
      : 'http://localhost:3000');
  }
});

ipcMain.handle('get-app-path', () => app.getPath('userData'));
