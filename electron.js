const { app, BrowserWindow, Menu, Tray, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

// 应用数据目录
const APP_NAME = 'sparkle-llm';
let appDataPath;

switch (process.platform) {
  case 'win32':
    appDataPath = path.join(process.env.APPDATA, APP_NAME);
    break;
  case 'darwin':
    appDataPath = path.join(os.homedir(), 'Library', 'Application Support', APP_NAME);
    break;
  default: // linux
    appDataPath = path.join(os.homedir(), '.sparkle-llm');
}

// 确保应用数据目录存在并具有正确的权限
const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true, mode: 0o755 });
      console.log(`[Directory]: 创建目录 ${dirPath} 成功`);
    } catch (err) {
      console.error(`[Error]: 创建目录 ${dirPath} 失败:`, err);
    }
  }

  // 确保目录有正确的权限
  try {
    fs.chmodSync(dirPath, 0o755);
    console.log(`[Directory]: 设置目录 ${dirPath} 权限成功`);
  } catch (err) {
    console.error(`[Error]: 设置目录 ${dirPath} 权限失败:`, err);
  }
};

// 创建所需的目录
ensureDir(appDataPath);
ensureDir(path.join(appDataPath, 'data'));
ensureDir(path.join(appDataPath, 'logs'));
ensureDir(path.join(appDataPath, 'snapshots'));
ensureDir(path.join(appDataPath, 'models'));
ensureDir(path.join(appDataPath, 'config'));

// 确保日志文件有正确的权限
// const logFile = path.join(appDataPath, 'logs', 'app.log');
// try {
//   // 如果日志文件不存在，创建一个空文件
//   if (!fs.existsSync(logFile)) {
//     fs.writeFileSync(logFile, '', { mode: 0o644 });
//     console.log(`[File]: 创建日志文件 ${logFile} 成功`);
//   }

//   // 确保日志文件有正确的权限
//   fs.chmodSync(logFile, 0o644);
//   console.log(`[File]: 设置日志文件 ${logFile} 权限成功`);
// } catch (err) {
//   console.error(`[Error]: 设置日志文件 ${logFile} 权限失败:`, err);
// }

// 全局变量
let mainWindow;
let tray;
let serverProcess;
let serverPort = 3001;
let serverReady = false;
let serverLog = '';
let isQuitting = false;

// 创建主窗口
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      // 在Linux AppImage环境中禁用沙盒以避免权限问题
      sandbox: false
    },
    icon: path.join(__dirname, 'build/icons/icon.png'),
    show: false // 先不显示窗口，等待服务器启动
  });

  // 显示加载界面
  mainWindow.loadFile(path.join(__dirname, 'loading.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });
}

// 启动后端服务器
function startServer() {
  // 确定后端路径

  // 尝试多个可能的路径
  let serverPath;
  const possiblePaths = [
    // 禁用asar时的路径
    path.join(process.resourcesPath, 'app', 'dist', 'index.js'),
    // 启用asar时的路径
    path.join(process.resourcesPath, 'app.asar', 'dist', 'index.js'),
    // 相对路径
    path.join(__dirname, 'dist', 'index.js')
  ];

  // 查找第一个存在的路径
  for (const p of possiblePaths) {
    console.log(`[Path Check]: 检查路径 ${p}`);
    try {
      if (fs.existsSync(p)) {
        serverPath = p;
        console.log(`[Path Found]: 找到服务器路径 ${serverPath}`);
        break;
      }
    } catch (err) {
      console.error(`[Path Error]: 检查路径出错 ${p}`, err);
    }
  }

  // 如果没有找到有效路径，使用第一个路径
  if (!serverPath) {
    serverPath = possiblePaths[0];
    console.warn(`[Warning]: 未找到有效路径，使用默认路径 ${serverPath}`);
  }

  // 设置环境变量
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: serverPort.toString(),
    DATABASE_PATH: path.join(appDataPath, 'data', 'database.sqlite'),
    VECTOR_DB_PATH: path.join(appDataPath, 'data', 'vector_db'),
    LOG_FILE: path.join(appDataPath, 'logs', 'app.log'),
    // 添加模型缓存目录环境变量
    TRANSFORMERS_CACHE: path.join(appDataPath, 'models'),
    // 添加前端静态文件路径环境变量
    FRONTEND_PATH: path.join(process.resourcesPath, 'frontend', 'dist'),
    // 添加NODE_PATH环境变量，帮助Node.js找到依赖
    NODE_PATH: [
      // 应用根目录下的node_modules
      path.join(process.resourcesPath, 'app', 'node_modules'),
      // 后端目录下的node_modules
      path.join(process.resourcesPath, 'app', 'backend', 'node_modules'),
      // 当前目录下的node_modules
      path.join(__dirname, 'node_modules'),
      // 如果存在，添加全局node_modules
      process.env.NODE_PATH
    ].filter(Boolean).join(path.delimiter)
  };

  // 检查文件是否存在
  try {
    if (!fs.existsSync(serverPath)) {
      console.error(`[Fatal Error]: 服务器文件不存在: ${serverPath}`);
      dialog.showErrorBox(
        'Server Error',
        `无法找到服务器文件: ${serverPath}\n\n请检查应用安装是否完整。`
      );
      return;
    }
  } catch (err) {
    console.error(`[Fatal Error]: 检查服务器文件时出错:`, err);
    dialog.showErrorBox(
      'Server Error',
      `检查服务器文件时出错: ${err.message}\n\n请检查应用安装是否完整。`
    );
    return;
  }

  console.log(`[Server]: 正在启动服务器，路径: ${serverPath}`);

  // 启动服务器进程
  try {
    serverProcess = spawn('node', [serverPath], { env });
  } catch (err) {
    console.error(`[Fatal Error]: 启动服务器进程失败:`, err);
    dialog.showErrorBox(
      'Server Error',
      `启动服务器进程失败: ${err.message}\n\n请检查Node.js是否正确安装。`
    );
    return;
  }

  // 收集服务器日志
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    serverLog += output;
    console.log(`[Server]: ${output}`);

    // 检测服务器是否已准备好
    if (output.includes('Server is running on port') || output.includes('Server started on port')) {
      serverReady = true;
      console.log(`[Electron]: 服务器已准备就绪，正在加载应用 http://localhost:${serverPort}`);

      // 延迟一秒再加载，确保服务器完全启动
      setTimeout(() => {
        try {
          // 加载应用
          mainWindow.loadURL(`http://localhost:${serverPort}`);

          // 添加加载事件监听
          mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
            console.error(`[Electron Error]: 加载失败: ${errorDescription} (${errorCode})`);

            // 如果加载失败，尝试重新加载
            setTimeout(() => {
              console.log(`[Electron]: 尝试重新加载应用...`);
              mainWindow.loadURL(`http://localhost:${serverPort}`);
            }, 2000);
          });

          mainWindow.webContents.on('did-finish-load', () => {
            console.log(`[Electron]: 应用加载成功`);
          });
        } catch (err) {
          console.error(`[Electron Error]: 加载URL时出错:`, err);
        }
      }, 1000);
    }
  });

  serverProcess.stderr.on('data', (data) => {
    const error = data.toString();
    serverLog += error;
    console.error(`[Server Error]: ${error}`);
  });

  serverProcess.on('error', (err) => {
    console.error(`[Server Process Error]: ${err.message}`);
    serverLog += `[Process Error]: ${err.message}\n`;
    dialog.showErrorBox(
      'Server Process Error',
      `服务器进程启动错误: ${err.message}\n\n请检查应用安装是否完整。`
    );
  });

  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    if (!isQuitting && code !== 0) {
      const errorMessage = `服务器进程意外终止，退出代码: ${code}\n\n日志:\n${serverLog.slice(-1000)}`;
      console.error(errorMessage);

      // 如果是依赖问题，记录错误但不尝试启动备用服务器
      if (serverLog.includes('Cannot find module')) {
        console.log(`[Server]: 检测到依赖问题，请检查日志`);
      }

      dialog.showErrorBox(
        'Server Error',
        `服务器进程意外终止，退出代码: ${code}。请重启应用。\n\n如果问题持续存在，请查看日志文件: ${path.join(appDataPath, 'logs', 'app.log')}`
      );
    }
    serverProcess = null;
  });

  // 设置超时，如果服务器在指定时间内没有启动，显示错误
  setTimeout(() => {
    if (!serverReady) {
      const timeoutMessage = `服务器启动超时。\n\n服务器路径: ${serverPath}\n\n最近的日志:\n${serverLog.slice(-1000)}`;
      console.error(timeoutMessage);

      dialog.showErrorBox(
        '服务器启动超时',
        `服务器启动超时，请检查日志并重启应用。\n\n如果问题持续存在，请查看日志文件: ${path.join(appDataPath, 'logs', 'app.log')}`
      );
    } else {
      // 如果服务器已准备好但窗口未加载，尝试再次加载
      console.log(`[Electron]: 检查应用是否已加载...`);
      try {
        const currentURL = mainWindow.webContents.getURL();
        console.log(`[Electron]: 当前URL: ${currentURL}`);

        // 如果当前URL不是应用URL，尝试再次加载
        if (!currentURL.includes(`localhost:${serverPort}`)) {
          console.log(`[Electron]: 应用未加载，尝试再次加载...`);
          mainWindow.loadURL(`http://localhost:${serverPort}`);
        }
      } catch (err) {
        console.error(`[Electron Error]: 检查URL时出错:`, err);
      }
    }
  }, 30000); // 30秒超时
}

// 创建系统托盘
function createTray() {
  tray = new Tray(path.join(__dirname, 'build/icons/icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => mainWindow.show() },
    { type: 'separator' },
    { label: 'View Logs', click: () => shell.openPath(path.join(appDataPath, 'logs')) },
    { label: 'Open Data Folder', click: () => shell.openPath(appDataPath) },
    { type: 'separator' },
    {
      label: 'Reload App', click: () => {
        if (mainWindow) {
          console.log(`[Electron]: 手动重新加载应用...`);
          mainWindow.loadURL(`http://localhost:${serverPort}`);
        }
      }
    },
    { label: 'Restart Server', click: restartServer },
    { type: 'separator' },
    {
      label: 'Quit', click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setToolTip('Sparkle LLM');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    mainWindow.show();
  });
}

// 重启服务器
function restartServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  serverReady = false;
  serverLog = '';
  mainWindow.loadFile(path.join(__dirname, 'loading.html'));
  startServer();
}

// 在Linux环境下禁用沙盒以避免AppImage权限问题
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('--no-sandbox');
  app.commandLine.appendSwitch('--disable-setuid-sandbox');
}

// 应用准备就绪
app.whenReady().then(() => {
  createWindow();
  createTray();
  startServer();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

// 应用退出
app.on('before-quit', () => {
  isQuitting = true;
  if (serverProcess) {
    serverProcess.kill();
  }
});

// 所有窗口关闭
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
