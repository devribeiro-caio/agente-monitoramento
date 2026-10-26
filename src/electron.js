const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

app.setName('Formis Painel');
app.setPath('userData', path.join(app.getPath('appData'), 'Formis Painel'));

let backend = null;
let mainWindow = null;
let isClosing = false;

function configureEnvironment() {
  const packagedEnv = path.join(app.getPath('userData'), '.env');
  const developmentEnv = path.join(__dirname, '..', '.env');
  const envFile = app.isPackaged ? packagedEnv : developmentEnv;

  fs.mkdirSync(path.dirname(envFile), { recursive: true });
  if (app.isPackaged && !fs.existsSync(envFile)) {
    fs.writeFileSync(envFile, 'MONGO_URI=mongodb://127.0.0.1:27017/formis_monitor\n', { flag: 'wx' });
  }
  dotenv.config({ path: envFile });
  if (!process.env.MONGO_URI) process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/formis_monitor';
  return envFile;
}

async function openDashboard() {
  const envFile = configureEnvironment();
  try {
    const { startServer } = require('./index');
    backend = await startServer({ host: '127.0.0.1', port: 0 });
    const address = backend.address();
    const url = `http://127.0.0.1:${address.port}`;

    mainWindow = new BrowserWindow({
      width: 1440,
      height: 940,
      minWidth: 1024,
      minHeight: 700,
      autoHideMenuBar: true,
      title: 'Formis · Painel de monitoramento',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    mainWindow.on('closed', () => { mainWindow = null; });
    await mainWindow.loadURL(url);
  } catch (err) {
    console.error('[Formis Painel] Falha ao iniciar:', err);
    dialog.showMessageBoxSync({
      type: 'error',
      title: 'Não foi possível iniciar o Formis Painel',
      message: 'Confira se o MongoDB 5.0 ou superior está instalado e em execução.',
      detail: `O aplicativo usa a configuração MONGO_URI no arquivo:\n${envFile}\n\nSe o MongoDB estiver em outro computador, ajuste esse arquivo para apontar para o banco existente e abra o painel novamente.`,
    });
    app.quit();
  }
}

app.whenReady().then(openDashboard);

app.on('window-all-closed', () => app.quit());
app.on('before-quit', event => {
  if (isClosing || !backend) return;
  event.preventDefault();
  isClosing = true;
  backend.close(async () => {
    try {
      const mongoose = require('mongoose');
      await mongoose.disconnect();
    } finally {
      app.quit();
    }
  });
});
