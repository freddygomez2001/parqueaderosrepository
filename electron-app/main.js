const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ==============================
// 🔒 SINGLE INSTANCE LOCK
// ==============================
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

let fastApiProc = null;
let nextProc = null;
let mainWindow = null;

const isDev = !app.isPackaged;

// Puertos
const FASTAPI_PORT = 8000;
const NEXTJS_PORT = 3000;

// ==============================
// 📌 RUTA CORRECTA PARA SQLITE
// ==============================
const userDataPath = app.getPath('userData');
const dbDir = path.join(userDataPath, 'database');
const dbPath = path.join(dbDir, 'parqueaderos.db');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// ==============================
// 📌 ENCONTRAR PYTHON DEL VENV
// ==============================
function findPythonVenv() {
  if (isDev) {
    // En desarrollo, usar el venv de la carpeta raíz
    const venvPython = path.join(__dirname, '..', 'venv', 'Scripts', 'python.exe');
    
    console.log('[Python] Buscando en venv:', venvPython);
    
    if (fs.existsSync(venvPython)) {
      console.log('[Python] ✅ Encontrado en venv');
      return venvPython;
    } else {
      console.error('[Python] ❌ No encontrado en venv');
      console.error('[Python] Asegúrate de haber creado el venv con: python -m venv venv');
      console.error('[Python] Y haber instalado uvicorn con: pip install uvicorn[standard]');
    }
  } else {
    // En producción, usar el venv empaquetado
    const venvPython = path.join(process.resourcesPath, 'venv', 'Scripts', 'python.exe');
    
    console.log('[Python] Buscando en venv empaquetado:', venvPython);
    
    if (fs.existsSync(venvPython)) {
      console.log('[Python] ✅ Encontrado en venv empaquetado');
      return venvPython;
    } else {
      console.error('[Python] ❌ No encontrado en venv empaquetado');
    }
  }
  
  // Fallback: buscar en PATH
  const possiblePaths = ['python', 'python3', 'py'];
  for (const pythonPath of possiblePaths) {
    try {
      const result = require('child_process').spawnSync(pythonPath, ['--version']);
      if (result.status === 0) {
        console.log('[Python] Usando:', pythonPath);
        return pythonPath;
      }
    } catch (e) { }
  }
  
  throw new Error('Python no encontrado. Asegúrate de tener el venv creado.');
}

// ==============================
// Funciones auxiliares
// ==============================
function killProcessTree(proc) {
  if (!proc || !proc.pid) return;

  if (process.platform === 'win32') {
    try {
      spawn('taskkill', ['/PID', proc.pid, '/T', '/F']);
    } catch (e) {
      console.error('Error cerrando proceso:', e);
    }
  } else {
    try {
      process.kill(-proc.pid);
    } catch (e) {
      console.error('Error cerrando proceso:', e);
    }
  }
}

// ==============================
// Esperar a que un puerto esté disponible
// ==============================
function waitForPort(port, timeout = 60000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const interval = 500;
    let attempts = 0;

    const checkPort = () => {
      attempts++;
      const http = require('http');
      const req = http.get(`http://localhost:${port}`, (res) => {
        console.log(`✅ Puerto ${port} está respondiendo (intento ${attempts})`);
        resolve();
      });

      req.on('error', (err) => {
        const elapsed = Date.now() - startTime;
        if (elapsed > timeout) {
          console.error(`❌ Timeout esperando puerto ${port} después de ${attempts} intentos`);
          reject(new Error(`Timeout esperando puerto ${port}`));
        } else {
          if (attempts % 10 === 0) {
            console.log(`⏳ Esperando puerto ${port}... (intento ${attempts}, ${Math.floor(elapsed/1000)}s)`);
          }
          setTimeout(checkPort, interval);
        }
      });

      req.setTimeout(500);
    };

    checkPort();
  });
}

// ==============================
// Iniciar FastAPI
// ==============================
async function startFastAPI() {
  return new Promise((resolve, reject) => {
    const backendPath = isDev
      ? path.join(__dirname, '../backend')
      : path.join(process.resourcesPath, 'backend');

    console.log('[FastAPI] Iniciando...');
    console.log('[FastAPI] Backend:', backendPath);

    // Verificar que existe main.py
    const mainPyPath = path.join(backendPath, 'app', 'main.py');
    if (!fs.existsSync(mainPyPath)) {
      return reject(new Error('main.py no encontrado en: ' + mainPyPath));
    }

    // Obtener Python del venv
    let pythonCmd;
    try {
      pythonCmd = findPythonVenv();
    } catch (error) {
      return reject(error);
    }

    console.log('[FastAPI] Python:', pythonCmd);

    // Iniciar FastAPI
    fastApiProc = spawn(
      pythonCmd,
      ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', FASTAPI_PORT.toString()],
      {
        cwd: backendPath,
        shell: false,  // Importante: sin shell para evitar problemas
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
          PYTHONPATH: backendPath,
          SQLITE_DB_PATH: dbPath
        }
      }
    );

    let resolved = false;

    fastApiProc.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('[FastAPI]', output);
      if (!resolved && output.includes('Application startup complete')) {
        resolved = true;
        resolve();
      }
    });

    fastApiProc.stderr.on('data', (data) => {
      console.log('[FastAPI]', data.toString());
    });

    fastApiProc.on('error', (err) => {
      console.error('[FastAPI] Error:', err);
      if (!resolved) reject(err);
    });

    // Timeout de 20 segundos
    setTimeout(() => {
      if (!resolved) {
        console.log('[FastAPI] Asumiendo iniciado por timeout');
        resolve();
      }
    }, 20000);
  });
}

// ==============================
// Iniciar Next.js
// ==============================
async function startNextJS() {
  return new Promise((resolve, reject) => {
    if (isDev) {
      const frontendPath = path.join(__dirname, '../frontend');
      console.log('[Next.js] Iniciando en modo desarrollo...');
      console.log('[Next.js] Frontend:', frontendPath);
      
      nextProc = spawn('npm', ['run', 'dev'], {
        cwd: frontendPath,
        shell: true,
        env: {
          ...process.env,
          PORT: NEXTJS_PORT.toString()
        }
      });
    } else {
      const frontendPath = path.join(
        process.resourcesPath.replace('app.asar', 'app.asar.unpacked'),
        'frontend'
      );
      const serverPath = path.join(frontendPath, 'server-production.js');
      const batPath = path.join(frontendPath, 'start-server.bat');
      
      console.log('[Next.js] Iniciando en modo producción...');
      console.log('[Next.js] Frontend:', frontendPath);
      console.log('[Next.js] Server:', serverPath);

      // Verificaciones
      if (!fs.existsSync(serverPath)) {
        return reject(new Error('server-production.js no encontrado: ' + serverPath));
      }

      const nextDir = path.join(frontendPath, '.next');
      if (!fs.existsSync(nextDir)) {
        return reject(new Error('Carpeta .next no encontrada: ' + nextDir));
      }

      const nodeModules = path.join(frontendPath, 'node_modules');
      if (!fs.existsSync(nodeModules)) {
        return reject(new Error('node_modules no encontrado: ' + nodeModules));
      }

      console.log('[Next.js] ✅ Archivos verificados');

      // 🔥 SOLUCIÓN: Usar spawn con configuración más simple
      nextProc = spawn('node', ['server-production.js'], {
        cwd: frontendPath,
        shell: true, // Importante: usar shell en Windows
        detached: false,
        windowsHide: false, // Cambiar a false temporalmente para debug
        env: {
          ...process.env,
          NODE_ENV: 'production',
          PORT: NEXTJS_PORT.toString(),
          HOSTNAME: '0.0.0.0'
        }
      });
    }

    let resolved = false;
    let startTime = Date.now();

    nextProc.stdout.on('data', (data) => {
      const out = data.toString();
      console.log('[Next.js]', out);
      
      if (!resolved && (
        out.includes('ready') || 
        out.includes('Ready') ||
        out.includes('Next.js ready')
      )) {
        console.log('[Next.js] ✅ Servidor confirmado como listo');
        resolved = true;
        
        // Esperar 2 segundos adicionales para asegurar que el servidor esté completamente listo
        setTimeout(() => {
          resolve();
        }, 2000);
      }
    });

    nextProc.stderr.on('data', (data) => {
      const err = data.toString();
      // Ignorar el warning de NODE_OPTIONS
      if (!err.includes('NODE_OPTIONS')) {
        console.error('[Next.js] STDERR:', err);
      }
    });

    nextProc.on('error', (err) => {
      console.error('[Next.js] ❌ Error del proceso:', err);
      if (!resolved) {
        reject(err);
      }
    });

    nextProc.on('exit', (code, signal) => {
      const elapsed = Date.now() - startTime;
      console.error(`[Next.js] Proceso terminó después de ${elapsed}ms. Código: ${code}, Señal: ${signal}`);
      
      // Si el proceso se cierra muy rápido (menos de 5 segundos) es un error
      if (!resolved && elapsed < 5000) {
        reject(new Error(`Next.js se cerró muy rápido (${elapsed}ms). Código: ${code}`));
      }
    });

    // Timeout para verificación activa del puerto
    const checkInterval = setInterval(() => {
      if (resolved) {
        clearInterval(checkInterval);
        return;
      }

      const elapsed = Date.now() - startTime;
      
      // Después de 10 segundos, empezar a verificar el puerto
      if (elapsed > 10000) {
        const http = require('http');
        const req = http.get(`http://localhost:${NEXTJS_PORT}`, (res) => {
          if (!resolved) {
            console.log('[Next.js] ✅ Puerto responde (verificación activa)');
            resolved = true;
            clearInterval(checkInterval);
            resolve();
          }
        });
        
        req.on('error', () => {
          // Silencioso, seguir intentando
        });
        
        req.setTimeout(1000);
        req.end();
      }

      // Timeout final a los 60 segundos
      if (elapsed > 60000) {
        clearInterval(checkInterval);
        if (!resolved) {
          reject(new Error('Next.js no respondió después de 60 segundos'));
        }
      }
    }, 2000); // Verificar cada 2 segundos
  });
}
// ==============================
// Crear ventana
// ==============================
async function createWindow() {
  console.log('Creando ventana...');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    backgroundColor: '#ffffff'
  });

  try {
    console.log('Esperando servidores...');
    
    // Esperar a que los puertos estén disponibles
    await waitForPort(NEXTJS_PORT, 60000);
    console.log('✅ Puerto 3000 OK');
    
    await waitForPort(FASTAPI_PORT, 60000);
    console.log('✅ Puerto 8000 OK');
    
    console.log('✅ Servidores listos, cargando app...');
    
    // Cargar la URL
    const url = `http://localhost:${NEXTJS_PORT}`;
    console.log('📍 Cargando URL:', url);
    
    await mainWindow.loadURL(url);
    
    console.log('✅ Ventana cargada');
    mainWindow.show();
    
    console.log('✅ Aplicación lista');
    
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }

  } catch (err) {
    console.error('❌ Error al crear ventana:', err);
    console.error('❌ Stack:', err.stack);
    dialog.showErrorBox('Error al iniciar', 
      `No se pudo cargar la aplicación.\n\nError: ${err.message}\n\nVerifica que los puertos 3000 y 8000 estén libres.`
    );
    app.quit();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ==============================
// APP READY
// ==============================
app.whenReady().then(async () => {
  console.log('==========================================');
  console.log('INICIANDO SISTEMA DE PARQUEADEROS');
  console.log('==========================================');
  console.log('Modo:', isDev ? 'DESARROLLO' : 'PRODUCCIÓN');
  console.log('Base de datos:', dbPath);
  console.log('==========================================\n');

  try {
    // Iniciar servicios
    await Promise.all([
      startFastAPI(),
      startNextJS()
    ]);

    // Pequeña pausa
    await new Promise(resolve => setTimeout(resolve, 2000));

    await createWindow();

    console.log('\n✅ APLICACIÓN INICIADA\n');

  } catch (err) {
    console.error('❌ Error fatal:', err);
    dialog.showErrorBox('Error Fatal', err.message);
    app.quit();
  }
});

// ==============================
// Cerrar procesos
// ==============================
app.on('window-all-closed', () => {
  console.log('Cerrando aplicación...');
  if (fastApiProc) killProcessTree(fastApiProc);
  if (nextProc) killProcessTree(nextProc);
  app.quit();
});

app.on('before-quit', () => {
  if (fastApiProc) killProcessTree(fastApiProc);
  if (nextProc) killProcessTree(nextProc);
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});