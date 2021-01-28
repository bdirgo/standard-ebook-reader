const {app, BrowserWindow} = require('electron');
const serve = require('electron-serve');

const loadURL = serve({directory: 'public'});

let mainWindow;

(async () => {
	await app.whenReady();

	mainWindow = new BrowserWindow({
        width: 1024,
        height: 800,
        icon: './public/icon.png'
    });

    await loadURL(mainWindow);
})();