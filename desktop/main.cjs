const { app, BrowserWindow, dialog, Menu, protocol, session } = require('electron')
const { readFile } = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')

const origin = 'app://flowsync'
const home = `${origin}/index.html`
const dist = path.join(__dirname, '..', 'dist')
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data:",
  "connect-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

app.setName('FlowSync')
// A stable profile and origin retain data when the installation directory/version changes.
app.setPath('userData', path.join(app.getPath('appData'), 'FlowSync'))
const testing = process.env.FLOWSYNC_DESKTOP_TEST === '1'
if (testing) {
  const profile = process.env.FLOWSYNC_TEST_PROFILE
  const relative = profile && path.relative(os.tmpdir(), profile)
  if (
    !profile ||
    !path.isAbsolute(profile) ||
    !relative ||
    relative.startsWith('..') ||
    path.isAbsolute(relative) ||
    !path.basename(profile).startsWith('flowsync-desktop-test-')
  ) {
    throw new Error(
      'Desktop tests require an isolated flowsync-desktop-test-* directory in the system temp directory.',
    )
  }
  app.setPath('userData', profile)
}
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
])

async function serve(request) {
  try {
    const url = new URL(request.url)
    if (url.host !== 'flowsync' || request.method !== 'GET')
      return new Response(null, { status: 403 })
    const filename = path.resolve(
      dist,
      `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`,
    )
    const relative = path.relative(dist, filename)
    if (
      !relative ||
      relative.startsWith('..') ||
      path.isAbsolute(relative) ||
      !mime[path.extname(filename)]
    )
      return new Response(null, { status: 404 })
    return new Response(await readFile(filename), {
      headers: {
        'Content-Type': mime[path.extname(filename)],
        'Content-Security-Policy': csp,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new Response(null, { status: 404 })
  }
}

let mainWindow
function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'FlowSync',
    width: 1440,
    height: 960,
    minWidth: 360,
    minHeight: 540,
    show: false,
    backgroundColor: '#101214',
    icon: path.join(__dirname, 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webviewTag: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: !app.isPackaged || testing,
    },
  })
  const window = mainWindow
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event, url) => {
    if (url.split('#')[0] !== home) event.preventDefault()
  })
  window.webContents.on('will-attach-webview', (event) => event.preventDefault())
  window.webContents.on('will-prevent-unload', (event) => {
    const choice = dialog.showMessageBoxSync(window, {
      type: 'question',
      title: 'Unsaved writing',
      message: 'Close FlowSync without saving your writing?',
      detail: 'Go back to save your check-in or let your journal finish saving.',
      buttons: ['Close without saving', 'Keep writing'],
      defaultId: 1,
      cancelId: 1,
      noLink: true,
    })
    if (choice === 0) event.preventDefault()
  })
  window.webContents.on('did-fail-load', (_event, code, description, url, isMainFrame) => {
    if (isMainFrame && url.split('#')[0] === home && code !== -3)
      dialog.showErrorBox(
        'FlowSync could not open',
        `${description}\nPlease reinstall FlowSync. Your saved data is kept separately.`,
      )
  })
  window.once('ready-to-show', () => {
    if (testing) window.showInactive()
    else window.show()
  })
  window.on('closed', () => {
    mainWindow = null
  })
  void window.loadURL(home)
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })
  app
    .whenReady()
    .then(() => {
      app.setAppUserModelId('com.flowsync.desktop')
      Menu.setApplicationMenu(null)
      protocol.handle('app', serve)
      const currentSession = session.defaultSession
      currentSession.setPermissionRequestHandler((_contents, _permission, callback) =>
        callback(false),
      )
      currentSession.setPermissionCheckHandler(() => false)
      currentSession.webRequest.onBeforeRequest((details, callback) => {
        callback({
          cancel:
            !details.url.startsWith(`${origin}/`) && !details.url.startsWith(`blob:${origin}/`),
        })
      })
      currentSession.on('will-download', (_event, item) => {
        item.setSaveDialogOptions({
          title: 'Export FlowSync backup',
          defaultPath: path.join(app.getPath('downloads'), path.basename(item.getFilename())),
          filters: [{ name: 'JSON backup', extensions: ['json'] }],
        })
      })
      createWindow()
    })
    .catch((error) => {
      dialog.showErrorBox('FlowSync could not start', error.message)
      app.quit()
    })
  app.on('window-all-closed', () => app.quit())
}
