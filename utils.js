const Main = imports.ui.main;

function omap(object, mapFn) {
    return Object.keys(object).reduce(function(result, key) {
        result[key] = mapFn(key, object[key]);
        return result
    }, {})
}

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
