const electron = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const {BrowserWindow, systemPreferences} = electron;

const path = require('path')
const url = require('url')
const fs = require('fs')
var https = require('https');
var packageConfig = require('./package.json');

let browserOptions = {width: 800, height: 400, frame: false}

// Make the window transparent only if the platform supports it.
if (process.platform !== 'win32' || systemPreferences.isAeroGlassEnabled()) {
  browserOptions.transparent = true
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let initWindow



function createInitWindow () {

  initWindow = new BrowserWindow(browserOptions)

  // and load the index.html of the app.
  initWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'init.html'),
    protocol: 'file:',
    slashes: true
  }))

  initWindow.on('closed', function () {
    initWindow = null
    app.quit();
  })
}

function createMainWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 1024, height: 800, frame: false})

  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createInitWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createInitWindow()
  }
})

function checkUpdate() {
  getHttpsData('https://raw.githubusercontent.com/guanyuxin/snow/master/package.json', function (res) {
    var data = JSON.parse(res);
    if (packageConfig.buildVer < data.buildVer) {
      console.log('need update');
      for (var i = 0; i < data.files.length; i++) {
        update(data.files[i]);
      }
    }
  })
}
checkUpdate();

function update(file) {
  getHttpsData('https://raw.githubusercontent.com/guanyuxin/snow/master/' + file, function (res) {
      console.log(file + ' updated');
    fs.writeFileSync(file, res);
  })
}



function getHttpsData(filepath, success, error) {
  // 回调缺省时候的处理
  success = success || function () {};
  error = error || function () {};

  var url = 'https://raw.githubusercontent.com/username/project-name/master/' + filepath + '?r=' + Math.random();

  https.get(url, function (res) {
    var statusCode = res.statusCode;

    if (statusCode !== 200) {
        // 出错回调
        error();
        // 消耗响应数据以释放内存
        res.resume();
        return;
    }

    res.setEncoding('utf8');
    var rawData = '';
    res.on('data', function (chunk) {
      rawData += chunk;
    });

    // 请求结束
    res.on('end', function () {
      // 成功回调
      success(rawData);
    }).on('error', function (e) {
      // 出错回调
      error();
    });
  });
};