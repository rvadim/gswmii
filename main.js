const Shell = imports.gi.Shell;
const Main = imports.ui.main;
const Meta = imports.gi.Meta;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const Models = Me.imports.models;
const Handlers = Me.imports.handlers;
const Ext = Me.imports.extension;

let structure = new Models.Structure();

let splitRatio = 0.5; //Ext.settings.get_value('split-ratio');;

function handleSettings() {
    splitRatio = Ext.settings.get_double('split-ratio');
    Handlers.setMaxColumns(Ext.settings.get_uint('max-columns'));
}
// const scaleFactor = St.ThemeContext.get_for_stage(global.stage).scale_factor;

async function update(win=false) {
    let newStruct = build(win);
    for (let i in structure.windows) {
        if (structure.hasWindow(i)) {
            if (!newStruct.hasOwnProperty(i)) {
                let win = structure.getWindow(i);
                Handlers.windowDeleted(win, structure, newStruct);
                retileScreen(win.ws_id, win.mon_id);
            }
        }
    }
    for (let i in newStruct) {
        if (newStruct.hasOwnProperty(i)) {
            let newWin = newStruct[i];
            if (!structure.hasWindow(i)) {
                await Handlers.windowCreated(newWin, structure, newStruct);
            } else if (newWin.col_id !== null && !structure.getWindow(i).equal(newWin)) {
                let oldWin = structure.getWindow(i);

                if (oldWin.stacked) {
                    newWin.stacked = true;
                }

                if (oldWin.col_id !== newWin.col_id) {
                    await Handlers.setColumn(oldWin, newWin, structure, newStruct);
                } else if (oldWin.in_col_id !== newWin.in_col_id) {
                    await Handlers.setRow(oldWin, newWin, structure, newStruct);
                } else if (oldWin.ws_id !== newWin.ws_id) {
                    await Handlers.setWorkspace(oldWin, newWin, structure, newStruct);
                }
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
            if (Utils.isTileable(win)) {
                struct[win.get_stable_sequence()] = new Models.Window(win);
            }
        }
    }
    if (win !== false) {
        struct[win.id] = win;
    }
    return struct;
}

function retileScreen(ws_id, mon_id) {
    let wa = global.screen.get_workspace_by_index(ws_id).get_work_area_for_monitor(mon_id);
    let columns = structure.getColumns(ws_id, mon_id);
    if (columns.length === 0) {
        return;
    }
    if (columns.length === 1 && columns[0].length === 1) {
        let win = columns[0][0];
        win.ref.maximize(Meta.MaximizeFlags.BOTH);
        // win.ref.move_resize_frame(false, wa.x, wa.y, wa.width, wa.height);
        return;
    }
    let cx = wa.x;
    let column_width = Math.floor(wa.width / columns.length);
    for (let i=0; i < columns.length; i++) {
        let row_height = Math.floor(wa.height / columns[i].length);
        if (columns.length > 1) {
            column_width = Math.floor(wa.width * (i === 0 ? splitRatio : (1 - splitRatio)));
        }
        for (let w = 0; w < columns[i].length; w++) {
            let win = columns[i][w];
            if (win.stacked && win.active) {
                win.ref.unminimize();
                win.ref.unmaximize(Meta.MaximizeFlags.BOTH);
                // win.ref.maximize(Meta.MaximizeFlags.BOTH);
                win.ref.move_resize_frame(false,
                    cx,
                    wa.y,
                    column_width,
                    wa.height);
            } else if (win.stacked && !win.active) {
                win.ref.unmaximize(Meta.MaximizeFlags.BOTH);
                win.ref.minimize();
            } else {
                win.ref.unminimize();
                win.ref.unmaximize(Meta.MaximizeFlags.BOTH);
                win.ref.move_resize_frame(false,
                    cx,         // x
                    (w * row_height) + wa.y,           // y
                    column_width,                           // width
                    row_height);                            // height
            }
        }
        cx += column_width;
    }
}

// Keyboard handlers

function switch_focus_up() {
    let win = structure.getWindow(Utils.getFocusedWindow().get_stable_sequence());
    win.active = false;
    let prev = structure.getPreviousInColumn(win);
    prev.active = true;
    prev.ref.unminimize(); // Unminimize here due to unable focus minimized window
    prev.ref.focus(global.get_current_time());
    logWindow(prev);
    retileScreen(win.ws_id, win.mon_id);
}

function switch_focus_down() {
    let win = structure.getWindow(Utils.getFocusedWindow().get_stable_sequence());
    win.active = false;
    let next = structure.getNextInColumn(win);
    next.active = true;
    next.ref.unminimize(); // Unminimize here due to unable focus minimized window
    next.ref.focus(global.get_current_time());
    logWindow(next);
    retileScreen(win.ws_id, win.mon_id);
}

function switch_focus_left() {
    let win = structure.getWindow(Utils.getFocusedWindow().get_stable_sequence());
    let left = structure.getLeftWindow(win);
    if (left.stacked) {
        let windows = structure.getColumnNeighbors(left);
        left = windows.filter((w) => w.active)[0];
    }
    left.ref.focus(global.get_current_time());
    logWindow(left);
}

function switch_focus_right() {
    let win = structure.getWindow(Utils.getFocusedWindow().get_stable_sequence());
    let right = structure.getRightWindow(win);
    if (right.stacked) {
        let windows = structure.getColumnNeighbors(right);
        right = windows.filter((w) => w.active)[0];
    }
    right.ref.focus(global.get_current_time());
    logWindow(right);
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

function move_window_up() {
    let win = structure.getWindow(Utils.getFocusedWindow().get_stable_sequence());
    let newWin = win.copy();
    newWin.in_col_id -= 1;
    update(newWin);
}

function move_window_down() {
    let win = structure.getWindow(Utils.getFocusedWindow().get_stable_sequence());
    let newWin = win.copy();
    newWin.in_col_id += 1;
    update(newWin);
}

function move_window_to_ws(id) {
    let win = structure.getWindow(Utils.getFocusedWindow().get_stable_sequence());
    let newWin = win.copy();
    newWin.ws_id = id;
    update(newWin);
}

function switch_default_layout() {
    let win = structure.getWindow(Utils.getFocusedWindow().get_stable_sequence());
    win.active = false;
    let windows = structure.getColumnNeighbors(win);
    windows.map((w) => w.stacked = false)
    retileScreen(win.ws_id, win.mon_id);
}

function switch_stacked_layout() {
    let win = structure.getWindow(Utils.getFocusedWindow().get_stable_sequence());
    win.active = true;
    let windows = structure.getColumnNeighbors(win);
    windows.map((w) => w.stacked = true)
    retileScreen(win.ws_id, win.mon_id);
}

function logWindow(win, message=null) {
    if (message === null) {
        Utils.log(`Window id:${win.id}, title:${win.ref.title}, stacked:${win.stacked}, active:${win.active}`);
    } else {
        Utils.log(message, `window id:${win.id}, title:${win.ref.title}, stacked:${win.stacked}, active:${win.active}`);
    }
}
