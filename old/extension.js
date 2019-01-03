const Gio = imports.gi.Gio;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const Main = imports.ui.main;
const St = imports.gi.St;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Models = Me.imports.models;
const Structure = Me.imports.structure;

const SchemaSource = Gio.SettingsSchemaSource.new_from_directory(
    Me.dir.get_path(), Gio.SettingsSchemaSource.get_default(), false);

const settings = new Gio.Settings({
    settings_schema: SchemaSource.lookup(Me.metadata['settings-schema'], true)
});

const bindings = new Gio.Settings({
    settings_schema: SchemaSource.lookup(Me.metadata['settings-schema'] + '.keybindings', true)
});

let inventory = new Models.Inventory();
let structure = new Structure.TilingStructure();

let _handle_settings;
let _handle_screen;
let _handle_wm_map;
let _handle_wm_destroy;
let _handle_wm_switch_ws;

function isTileable(win) {
    return settings.get_strv('auto-tile-window-types').some(t => win.window_type === Meta.WindowType[t]);
}

function addKeybinding(name, handler) {
    Main.wm.addKeybinding(name, bindings, 0, Shell.ActionMode.NORMAL, handler);
}

function getFocusedWindow() {
    return global.screen.get_active_workspace().list_windows().filter(win => win.has_focus())[0];
}

function switch_default_layout() {
    log('switch-default-layout');
    let win = getFocusedWindow();
    let win_id = win.get_stable_sequence();
    let mon = inventory.getWorkspace(win.get_workspace().index()).getMonitor(win.get_monitor());
    let col = mon.getWindowColumn(win_id);
    col.setLayout(Models.LAYOUT_DEFAULT);
    // col.setCurrent(win_id);
    retile(mon);
}

function switch_stacked_layout() {
    let win = getFocusedWindow();
    let win_id = win.get_stable_sequence();
    let mon = inventory.getWorkspace(win.get_workspace().index()).getMonitor(win.get_monitor());
    let col = mon.getWindowColumn(win_id);
    col.setLayout(Models.LAYOUT_STACKED);
    retile(mon);
}

function retile(monitor) {
    let columns = monitor.getColumns();
    let columns_count = columns.length;
    let column_width = Math.floor(monitor.getWidth() / columns_count);
    let col_id = 0;
    let top_height = 25;        // TODO get from original window
    for (let column of columns) {
        let windows = column.getWindows();
        let windows_count = windows.length;
        let row_height = Math.floor((monitor.getHeight() - top_height) / windows_count);
        if (column.getLayout() === Models.LAYOUT_DEFAULT) {
            for (let id of windows) {
                let win = monitor.getWindowById(id);
                if (win === null) {
                    monitor.removeWindowById(id);
                    continue
                }
                if (!isTileable(win)) {
                    continue
                }
                if (id === column.getCurrent()) {
                    win.maximize(Meta.MaximizeFlags.BOTH);
                    win.unmaximize(Meta.MaximizeFlags.BOTH);
                    win.move_resize_frame(false,
                        (col_id * column_width) + 50,       // x
                        row_height,                         // y
                        column_width - 2,                   // width
                        row_height - 2);                    // height
                } else {
                   win.minimize();
                }
            }
        } else if (column.getLayout() === Models.LAYOUT_STACKED) {
            let win_id = 0;
            for (let id of windows) {
                let win = monitor.getWindowById(id);
                if (win === null) {
                    monitor.removeWindowById(id);
                    continue
                }
                if (!isTileable(win)) {
                    continue;
                }
                if (columns_count === 1 && windows_count === 1) {
                    win.maximize(Meta.MaximizeFlags.BOTH);
                } else {
                    win.unmaximize(Meta.MaximizeFlags.BOTH);
                    win.move_resize_frame(false,
                        (col_id * column_width),                // x
                        (win_id * row_height) + top_height,     // y
                        column_width - 2,                       // width
                        row_height - 2);                        // height
                }
                // log('x=' + col_id*column_width + ', y='+ win_id * row_height + ', width=' + column_width + ', height=' + row_height + ', windows=' + column.getWindows().length);
                win_id++;
            }
        }
        col_id++;
    }
    // monitor.printStructure();
}

function retile_monitor(ws_id, mon_id, struct) {
    let top_height = 25;        // TODO get from original window
    let monitor = get_monitor(mon_id);
    let columns = struct.getWindowsByColumns(ws_id, mon_id);
    if (columns.length === 0) {
        return;
    } else if (columns.length === 1 && columns[0].length === 1) {
        let win = columns[0][0].ref;
        win.maximize(Meta.MaximizeFlags.BOTH);
        return;
    }
    let columns_count = columns.length;
    let column_width = Math.floor(monitor.getWidth() / columns_count);
    let col_id = 0;
    for (let column in columns) {
        let windows_count = column.length;
        let row_height = Math.floor((monitor.getHeight() - top_height) / windows_count);
        let win_id = 0;
        for (let win of column) {
            win.unmaximize(Meta.MaximizeFlags.BOTH);
            win.move_resize_frame(false,
                (col_id * column_width),                // x
                (win_id * row_height) + top_height,     // y
                column_width - 2,                       // width
                row_height - 2);                        // height
            win_id++;
        }
        col_id++;
    }
}

function get_monitor(id) {
    for (let m of Main.layoutManager.monitors) {
        if (m.index === id) {
            return m;
        }
    }
}

function update_monitor(monitor) {
    for (let win of monitor.getParentWS().list_windows()) {
        if (!isTileable(win)){
            continue;
        }
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
    let win_id = win.get_stable_sequence();
    let mon = inventory.getWorkspace(win.get_workspace().index()).getMonitor(win.get_monitor());
    let col = mon.getWindowColumn(win_id);
    mon.getWindowById(col.getNext(win_id)).focus(global.get_current_time());
}

function switch_focus_up() {
    let win = getFocusedWindow();
    let win_id = win.get_stable_sequence();
    let mon = inventory.getWorkspace(win.get_workspace().index()).getMonitor(win.get_monitor());
    let col = mon.getWindowColumn(win_id);
    mon.getWindowById(col.getPrevious(win_id)).focus(global.get_current_time());
}

function move_window_right() {
    let win = getFocusedWindow();
    let win_id = win.get_stable_sequence();
    let ws = inventory.getWorkspace(win.get_workspace().index());
    let mon = ws.getMonitor(win.get_monitor());
    let col = mon.getWindowColumn(win_id);
    if (col.getWindows().length === 1) {
        // Do nothing when this is last window in column
        // TODO remove column, move window?
        return;
    }
    let next_col = mon.getNext(col);
    if (col === next_col) {
        // Last column, add new and push win_id to it, remove from current_col
        let new_col = new Models.Column();
        new_col.addWindow(win_id);
        mon.addColumn(new_col);
    } else {
        next_col.addWindow(win_id);
    }

    col.removeWindow(win_id);
    retile(mon);
}

function move_window_left() {
    let win = getFocusedWindow();
    let win_id = win.get_stable_sequence();
    let ws = inventory.getWorkspace(win.get_workspace().index());
    let mon = ws.getMonitor(win.get_monitor());

    let col = mon.getWindowColumn(win_id);

    let prev_col = mon.getPrevious(col);
    if (col === prev_col) {
        // Nothing to do last column
        return;
    } else {
        prev_col.addWindow(win_id);
    }
    col.removeWindow(win_id);
    if (col.getWindows().length === 0) {
        mon.removeColumn(col);
    }
    retile(mon);
}

function switch_focus_right() {
    let win = getFocusedWindow();
    let win_id = win.get_stable_sequence();
    let ws = inventory.getWorkspace(win.get_workspace().index());
    let mon = ws.getMonitor(win.get_monitor());
    let col = mon.getWindowColumn(win_id);
    let new_col = mon.getNext(col);
    if (col === new_col) {
        return;
    }
    mon.getWindowById(new_col.getWindows()[0]).focus(global.get_current_time());
}

function switch_focus_left() {
    let win = getFocusedWindow();
    let win_id = win.get_stable_sequence();
    let ws = inventory.getWorkspace(win.get_workspace().index());
    let mon = ws.getMonitor(win.get_monitor());
    let col = mon.getWindowColumn(win_id);
    let new_col = mon.getPrevious(col);
    if (col === new_col) {
        return;
    }
    mon.getWindowById(new_col.getWindows()[0]).focus(global.get_current_time());
}

function update_inventory() {
    let ws_count = global.screen.get_n_workspaces();
    for (let i = 0; i < ws_count; i++) {
        update_workspace(global.screen.get_workspace_by_index(i));
    }
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
                if (col.getWindows().length === 0) {
                    monitors[mon_id].removeColumn(col);
                }
                retile(monitors[mon_id]);
            }
        }
    }
}

function rebuild(first_run=false) {
   // update_inventory();

    let struct = new Structure.TilingStructure();
    struct.build();
    // TODO get diff and update
    get_diff(structure, struct);
    structure = struct;
    //retile_new(structure);
}

function retile_new(struct) {
    for (let i = 0; i < global.screen.get_n_workspaces(); i++) {
        for (let m of Main.layoutManager.monitors) {
            retile_monitor(i, m.index, struct);
        }
    }
}

function enable() {
    //TODO move window to different workspace
    _handle_settings = settings.connect('changed', function() {
        log('setting changed');
        rebuild();
    });
    _handle_screen = global.screen.connect('restacked', function() {
        rebuild();
    });
    _handle_wm_switch_ws = global.window_manager.connect('switch-workspace', function() {
        rebuild();
    });
    _handle_wm_map = global.window_manager.connect('map', (g, w) => {
        log()
        // rebuild();
    });
    _handle_wm_destroy = global.window_manager.connect('destroy', (g, w) => {
        // ROLLBACK remove_window(w.meta_window);
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
    addKeybinding('switch-focus-right', () => {
        switch_focus_right();
    });
    addKeybinding('switch-focus-left', () => {
        switch_focus_left();
    });
    addKeybinding('move-window-right', () => {
        move_window_right();
    });
    addKeybinding('move-window-left', () => {
        move_window_left();
    });
    rebuild(true);
}

function init() {}

function disable() {
    settings.disconnect(_handle_settings);
    global.screen.disconnect(_handle_screen);
    global.window_manager.disconnect(_handle_wm_map);
    global.window_manager.disconnect(_handle_wm_destroy);
    global.window_manager.disconnect(_handle_wm_switch_ws);
    Main.wm.removeKeybinding('switch-default-layout');
    Main.wm.removeKeybinding('switch-stacked-layout');
    Main.wm.removeKeybinding('switch-focus-down');
    Main.wm.removeKeybinding('switch-focus-up');
    Main.wm.removeKeybinding('switch-focus-right');
    Main.wm.removeKeybinding('switch-focus-left');
    Main.wm.removeKeybinding('move-window-right');
    Main.wm.removeKeybinding('move-window-left');
    // inventory = null;
}
