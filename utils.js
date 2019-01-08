const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Ext = Me.imports.extension;

function log(...args) {
    let output = 'gswmii:';
    for (let i = 0; i < args.length; i++) {
        if (i === args.length - 1) {
            output += ' ' + JSON.stringify(args[i]) + ';';
        } else {
            output += ' ' + JSON.stringify(args[i]) + ', ';
        }
    }
    global.log(output);
}

function getFocusedWindow() {
    return global.screen.get_active_workspace().list_windows().filter(win => win.has_focus())[0];
}

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function getMonitor(id) {
    for (let m of Main.layoutManager.monitors) {
        if (m.index === id) {
            return m;
        }
    }
}

function getFocusedWindow() {
    return global.screen.get_active_workspace().list_windows().filter(win => win.has_focus())[0];
}

function isTileable(win) {
    // log(win.window_type);
    return Ext.settings.get_strv('auto-tile-window-types').some(t => win.window_type === Meta.WindowType[t]);
}
