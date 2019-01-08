const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const MyMain = Me.imports.main;
const Focus = Me.imports.focus;
const Models = Me.imports.models;

let maxColumns = 2;

function setMaxColumns(n) {
    maxColumns = n;
}

function windowCreated(window, struct, newStruct=null) {
    let prevID = Focus.getPreviousWindowID();
    if (prevID !== null) {
        let prevWin = struct.getWindow(prevID);
        if (prevWin.ws_id === window.ws_id && prevWin.mon_id === window.mon_id) {
            window.col_id = prevWin.col_id;
            window.in_col_id = prevWin.in_col_id;
            if (prevWin.stacked && prevWin.active) {
                window.stacked = true;
                window.active = true;
                prevWin.active = false;
            }
            struct.addWindow(window);
            struct.reorderScreen(window.ws_id, window.mon_id);
            return;
        }
    }
    Utils.log('Warning', 'prevID is null');

    window.col_id = 0;
    window.in_col_id = struct.getColumnNeighbors(window).length;
    struct.addWindow(window);
}

function windowDeleted(window, struct, newStruct) {
    Utils.log("Window deleted", window.id);
    if (window.stacked) { // Switch active in stacked mode
        let back = struct.getPreviousInColumn(window);
        if (back.id === window.id) {
            back = struct.getNextInColumn(window);
        }
        back.active = true;
        back.ref.unminimize();
        back.ref.focus(global.get_current_time());
    }
    if (window.col_id === 0 && struct.getColumnNeighbors(window).length === 1) { // Last window in left column
        let right = struct.getRightWindow(window);
        if (right.id !== window.id) {
            struct.getColumnNeighbors(right).map((w) => w.col_id = 0);
        }
    }
    struct.deleteWindow(window);
    struct.reorderScreen(window.ws_id, window.mon_id);
}

async function setRow(old, win, struct, newStruct) {
    if (win.in_col_id < old.in_col_id) {
        await movingUp(old, win, struct);
    } else {
        await movingDown(old, win, struct);
    }
}

function movingUp(old, win, struct) {
    if (old.in_col_id === 0) {
        Utils.log('This is first row, moving up not available, skipping...');
        return;
    }
    let prev = struct.getTopWindow(old);
    if (prev.id === win.id) {
        return;
    }
    prev.in_col_id += 1;
    if (win.stacked) {
        win.active = true;
    }
    struct.setWindow(prev);
    struct.setWindow(win);
    Utils.log(struct.getColumnNeighbors(win));
}

async function movingDown(old, win, struct) {
    let prev = struct.getBottomWindow(old);
    if (prev.id === win.id) {
        return;
    }
    prev.in_col_id -= 1;
    if (win.stacked) {
        win.active = true;
    }
    struct.setWindow(prev);
    struct.setWindow(win);
}

async function setColumn(old, win, struct, newStruct=null) {
    if (win.col_id < old.col_id) {
        await movingLeft(old, win, struct);
    } else {
        await movingRight(old, win, struct);
    }
}

async function movingLeft(old, win, struct) {
    Utils.log('movingLeft');
    if (old.col_id === 0) {
        Utils.log('This is first column, moving left not available, skipping...');
        return;
    }

    if (old.stacked) {
        let windows = struct.getColumnNeighbors(old);
        let in_col_id = Models.closest(win.in_col_id,
            windows.filter((w) => win.in_col_id !== w.in_col_id ).map((w) => w.in_col_id));
        let right = windows.filter((w) => w.in_col_id === in_col_id)[0];
        right.active = true;
        let left = struct.getLeftWindow(old);
        win.stacked = false;
        if (left.stacked) {
            win.stacked = true;
            win.active = true;
            left.active = false;
        }
    } else {
        struct.getColumnNeighbors(win).map((w) => w.active = false);
        win.stacked = struct.getLeftWindow(old).stacked;
        win.active = win.stacked;
    }

    struct.setWindow(win);
    await struct.reorderScreen(win.ws_id, win.mon_id);
}

async function movingRight(old, win, struct) {
    Utils.log('movingRight');
    let old_wins = struct.getColumnNeighbors(old);
    if (old_wins.length === 1) {
        Utils.log('Warning', 'this is last window column, moving right not available, skipping...');
        return;
    }
    if (win.col_id === maxColumns) {
        Utils.log('Warning', `more then ${maxColumns} columns not allowed`);
        return;
    }

    if (old.stacked) {
        let windows = struct.getColumnNeighbors(old);
        let in_col_id = Models.closest(win.in_col_id,
            windows.filter((w) => win.in_col_id !== w.in_col_id ).map((w) => w.in_col_id));
        let left = windows.filter((w) => w.in_col_id === in_col_id)[0];
        left.active = true;
        let right = struct.getRightWindow(old);
        win.stacked = false;
        if (right.stacked) {
            win.stacked = true;
            win.active = true;
            right.active = false;
        }
    } else {
        struct.getColumnNeighbors(win).map((w) => w.active = false);
        win.stacked = struct.getRightWindow(old).stacked;
        win.active = win.stacked;
    }
    struct.setWindow(win);

    await struct.reorderScreen(win.ws_id, win.mon_id);
}

function setWorkspace(oldWin, newWin, struct, newStruct) {
    let columns = struct.getColumns(newWin.ws_id, newWin.mon_id);
    if (newWin.col_id > columns.length) {
        newWin.col_id = columns.length;
        newWin.in_col_id = 0;
    }
    struct.setWindow(newWin);
    let newWS = global.screen.get_workspace_by_index(newWin.ws_id);
    newWin.ref.change_workspace(newWS);
    struct.reorderScreen(oldWin.ws_id, oldWin.mon_id);
    struct.reorderScreen(newWin.ws_id, newWin.mon_id);
}
