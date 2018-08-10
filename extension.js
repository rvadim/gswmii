const Gio = imports.gi.Gio;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const Main = imports.ui.main;
const St = imports.gi.St;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Models = Me.imports.models;

const SchemaSource = Gio.SettingsSchemaSource.new_from_directory(
    Me.dir.get_path(), Gio.SettingsSchemaSource.get_default(), false);

const settings = new Gio.Settings({
    settings_schema: SchemaSource.lookup(Me.metadata['settings-schema'], true)
});

const bindings = new Gio.Settings({
    settings_schema: SchemaSource.lookup(Me.metadata['settings-schema'] + '.keybindings', true)
});

let inventory = new Models.Inventory();


let _handle_settings;
let _handle_screen;
let _handle_wm_map;
let _handle_wm_destroy;

function isTileable(win) {
    return settings.get_strv('auto-tile-window-types').some(t => win.window_type === Meta.WindowType[t]);
}

function addKeybinding(name, handler) {
    Main.wm.addKeybinding(name, bindings, 0, Shell.ActionMode.NORMAL, handler);
}

function log(message, prefix = null) {
    if (prefix === null) {
        global.log('gswmii: ' + JSON.stringify(message));
    } else {
        global.log('gswmii [' + prefix + ']: ' + JSON.stringify(message));
    }
}

function getFocusedWindow() {
    return global.screen.get_active_workspace().list_windows().filter(win => win.has_focus())[0];
}

function switch_default_layout() {
    log('switch-default-layout');
    // let window = getFocusedWindow();
    // _column_properties[get_column_hash(window, getWindowColumn(window))] = LAYOUT_DEFAULT;
    // print_column_structure(_column_properties);
}

function switch_stacked_layout() {
    log('switch-stacked-layout');
    // let window = getFocusedWindow();
    // _column_properties[get_column_hash(window, getWindowColumn(window))] = LAYOUT_STACKED;
    // print_column_structure(_column_properties);
}

function getWindowbyId(ws, id) {
    return ws.list_windows().filter(win => win.get_stable_sequence() === id)[0];
}

function retile(monitor) {
    let columns = monitor.getColumns();
    let columns_count = columns.length;
    let column_width = Math.floor(monitor.getWidth() / columns_count);
    let col_id = 0;
    for (let column of columns) {
        let windows = column.getWindows();
        let windows_count = windows.length;
        let row_height = Math.floor(monitor.getHeight() / windows_count);
        let win_id = 0;
        for (let id of windows) {
            let win = getWindowbyId(monitor.getParentWS(), id);
            // TODO
            // if (!isTileable(win)){
            //     continue;
            // }
            if (columns_count === 1 && windows_count === 1) {
               win.maximize(Meta.MaximizeFlags.BOTH)
            } else {
                win.unmaximize(Meta.MaximizeFlags.BOTH);
                win.move_resize_frame(false,
                    col_id * column_width,
                    win_id * row_height,
                    column_width - 2,
                    row_height - 2 );
            }
            // log('x=' + col_id*column_width + ', y='+ win_id * row_height + ', width=' + column_width + ', height=' + row_height + ', windows=' + column.getWindows().length);
            win_id++;
        }
        col_id++;
    }
}

function cleanup_windows(workspace, monitor) {
    for (let col of monitor.getColumns()) {
        for (let win of col.getWindows()) {

        }
    }
}

function update_monitor(monitor) {
    for (let win of monitor.getParentWS().list_windows()) {
        let win_id = win.get_stable_sequence();
        let col = monitor.getWindowColumn(win_id);
        if (col === null) {
            let focused_window = getFocusedWindow();
            let c_col = monitor.getWindowColumn(focused_window.get_stable_sequence());
            if (c_col === null) {
                monitor.getColumn(0).addWindow(win_id);
            } else {
                c_col.addWindow(win_id);
            }
        }
    }
    retile(monitor);
}

function update_workspace(workspace) {
    let id = workspace.index();
    let ws = null;
    if (!inventory.hasWorkspace(id)) {
        ws = new Models.Workspace(id, global.screen.get_workspace_by_index(id));
        inventory.addWorkspace(ws);
    } else {
        ws = inventory.getWorkspace(id);
    }
    for (let m of Main.layoutManager.monitors) {
        let monitor = null;
        if (!ws.hasMonitor(m.index)) {
            monitor = new Models.Monitor(m.index, workspace);
            ws.addMonitor(monitor);
        } else {
            monitor = ws.getMonitor(m.index);
        }
        update_monitor(monitor);
    }
}

function switch_focus_down() {
    let win = getFocusedWindow();
    let win_id =win.get_stable_sequence();
    let ws = inventory.getWorkspace(win.get_workspace().index());
    let mon = ws.getMonitor(win.get_monitor());
    let columns = mon.getColumns();
    let new_id = null;
    for (let col of columns) {
        if (col.hasWindow(win_id)) {
            new_id = col.getNext(win_id);
        }
    }
    if (new_id !== null) {
        getWindowbyId(win.get_workspace(), new_id).focus(global.get_current_time());
    }
}

function switch_focus_up() {
    let win = getFocusedWindow();
    let win_id =win.get_stable_sequence();
    let ws = inventory.getWorkspace(win.get_workspace().index());
    let mon = ws.getMonitor(win.get_monitor());
    let columns = mon.getColumns();
    let new_id = null;
    for (let col of columns) {
        if (col.hasWindow(win_id)) {
            new_id = col.getPrevious(win_id);
        }
    }
    if (new_id !== null) {
        getWindowbyId(win.get_workspace(), new_id).focus(global.get_current_time());
    }
}

function move_window_right() {
    // TODO case: move to existed
    // TODO case: delete in existed
    let win = getFocusedWindow();
    let win_id = win.get_stable_sequence();
    let ws = inventory.getWorkspace(win.get_workspace().index());
    let mon = ws.getMonitor(win.get_monitor());
    let columns = mon.getColumns();
    for (let i = 0; i < columns.length; i++) {
        let current_col = columns[i];
        if (current_col.hasWindow(win_id)) {
            if (current_col.getWindows().length === 1) {
                // Do nothing when this is last window in column
                // TODO remove column, move window?
                break;
            }
            if (i === columns.length - 1) {
                // Last column, add new and push win_id to it, remove from current_col
                let new_col = new Models.Column();
                current_col.removeWindow(win_id);
                new_col.addWindow(win_id);
                mon.addColumn(new_col);
                retile(mon);
            }
        }
    }
}


function update_inventory() {
    let ws_count = global.screen.get_n_workspaces();
    for (let i = 0; i < ws_count; i++) {
        update_workspace(global.screen.get_workspace_by_index(i));
    }
}

function rebuild() {
    update_inventory();
}

function remove_window(win) {
    let win_id = win.get_stable_sequence();
    let workspaces = inventory.getWorkspaces();
    for (let id in workspaces) {
        let monitors = workspaces[id].getMonitors();
        for (let mon_id in monitors) {
            let col = monitors[mon_id].getWindowColumn(win_id);
            if (col !== null) {
                col.removeWindow(win_id);
            }
        }
    }
}

function enable() {
    _handle_settings = settings.connect('changed', rebuild);
    _handle_screen = global.screen.connect('restacked', rebuild);
    // global.window_manager.connect('switch-workspace', rebuild);
    _handle_wm_map = global.window_manager.connect('map', (g, w) => {
        rebuild();
    });
    _handle_wm_destroy = global.window_manager.connect('destroy', (g, w) => {
        remove_window(w.meta_window);
    });
    addKeybinding('switch-default-layout', () => {
        switch_default_layout();
    });
    addKeybinding('switch-stacked-layout', () => {
        switch_stacked_layout();
    });
    addKeybinding('switch-focus-down', () => {
        switch_focus_down();
    });
    addKeybinding('switch-focus-up', () => {
        switch_focus_up();
    });
    addKeybinding('move-window-right', () => {
        move_window_right();
    });
    addKeybinding('move-window-left', () => {
        switch_focus_up();
    });

    rebuild();
}

function init() {}

function disable() {
    settings.disconnect(_handle_settings);
    global.screen.disconnect(_handle_screen);
    global.window_manager.disconnect(_handle_wm_map);
    global.window_manager.disconnect(_handle_wm_destroy);
    Main.wm.removeKeybinding('switch-default-layout');
    Main.wm.removeKeybinding('switch-stacked-layout');
    Main.wm.removeKeybinding('switch-focus-down');
    Main.wm.removeKeybinding('switch-focus-up');
    Main.wm.removeKeybinding('move-window-right');
    Main.wm.removeKeybinding('move-window-left');
    inventory = null;
}
