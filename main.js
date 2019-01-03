const Shell = imports.gi.Shell;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const Models = Me.imports.models;
const Handlers = Me.imports.handlers;

let structure = new Models.Structure();


function update(win=false) {
    let newStruct = build(win);
    for (let i in structure.windows) {
        if (structure.hasWindow(i)) {
            if (!newStruct.hasOwnProperty(i)) {
                let win = structure.getWindow(i);
                structure.deleteWindow(win);
                Handlers.windowDeleted(win, structure, newStruct);
                retileScreen(win.ws_id, win.mon_id);
            }
        }
    }
    for (let i in newStruct) {
        if (newStruct.hasOwnProperty(i)) {
            let newWin = newStruct[i];
            if (!structure.hasWindow(i)) {
                Handlers.windowCreated(newWin, structure, newStruct);
            } else if (!structure.getWindow(i).equal(newWin)) {
                Handlers.windowUpdated(structure.getWindow(i), newWin, structure, newStruct);
            }
            retileScreen(newWin.ws_id, newWin.mon_id);
        }
    }
}

function build(win=false) {
    let struct = {};
    let ws_count = global.screen.get_n_workspaces();
    for (let i = 0; i < ws_count; i++) {
        let ws = global.screen.get_workspace_by_index(i);
        for (let win of ws.list_windows()) {
            struct[win.get_stable_sequence()] = new Models.Window(win);
        }
    }
    if (win !== false) {
        struct[win.id] = win;
    }
    return struct;
}

function retileScreen(ws_id, mon_id) {
    let top_height = 25;        // TODO get from original window
    let columns = structure.getColumns(ws_id, mon_id);
    let monitor = Utils.getMonitor(mon_id);
    if (columns.length === 0) {
        return;
    } else if (columns.length === 1 && columns[0].length === 1) {
        let win = columns[0][0].ref;
        win.maximize(Meta.MaximizeFlags.BOTH);
        return;
    }
    let columns_count = columns.length;
    let column_width = Math.floor(monitor.width / columns_count);
    let col_id = 0;
    for (let column of columns) {
        let windows_count = column.length;
        let row_height = Math.floor((monitor.height - top_height) / windows_count);
        let win_id = 0;
        for (let win of column) {
            win.ref.unmaximize(Meta.MaximizeFlags.BOTH);
            win.ref.move_resize_frame(false,
                (col_id * column_width),                // x
                (win_id * row_height) + top_height,     // y
                column_width - 2,                       // width
                row_height - 2);                        // height
            win_id++;
        }
        col_id++;
    }
}

// Keyboard handlers

function switch_focus_up() {
    let win = structure.getWindow(Utils.getFocusedWindow().get_stable_sequence());
    structure.getPreviousInColumn(win).ref.focus(global.get_current_time());
}

function switch_focus_down() {
    let win = structure.getWindow(Utils.getFocusedWindow().get_stable_sequence());
    structure.getNextInColumn(win).ref.focus(global.get_current_time());
}

function move_window_right() {
    let win = structure.getWindow(Utils.getFocusedWindow().get_stable_sequence());
    let newWin = win.copy();
    newWin.col_id += 1;
    update(newWin);
}

function move_window_left() {
    let win = structure.getWindow(Utils.getFocusedWindow().get_stable_sequence());
    let newWin = win.copy();
    newWin.col_id -= 1;
    update(newWin);
}
