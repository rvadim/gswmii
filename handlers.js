const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const MyMain = Me.imports.main;

let maxColumns = 2;

function setMaxColumns(n) {
    maxColumns = n;
}

function windowCreated(window, struct, new_data) {
    // Utils.log("Window creating...", window.id);
    //let columns = new_struct.getWindowsByColumns(window.ws_id, window.mon_id);
    //let windows = new_struct.getWindows(window.ws_id, window.mon_id);
    // skip, get selected window
    // get it col_id
    // get put new window to col
    //let fID = Utils.getFocusedWindow().get_stable_sequence();
    //Utils.log("fID", fID);
    //let fWin = struct.getWindow(fID);
    window.col_id = 0;
    let windows = struct.getColumnNeighbors(window);
    window.in_col_id = windows.length;
    // if (windows.length > 0) {
    //     window.in_col_id = windows.length;
    //     // for (let i = 0; i < windows.length; i++) {
    //     //     if (fWin.in_col_id < windows[i].in_col_id) {
    //     //         windows[i].in_col_id = i + 1;
    //     //     }
    //     // }
    // } else {
    //     window.in_col_id = 0;
    // }
    // struct.addWindow(window);
    //retileScreen(window.ws_id, window.mon_id, Utils.getMonitor(window.mon_id));
    struct.addWindow(window);
    Utils.log("Window created", window.id);
}

function windowDeleted(window, struct, new_struct) {
    Utils.log("Window deleted", window.id);
    struct.reorderScreen(window.ws_id, window.mon_id);
}

async function setRow(old, win, struct, newStruct) {
    if (win.in_col_id < old.in_col_id) {
        await movingUp(old, win, struct);
    } else {
        await movingDown(old, win, struct);
    }
}

async function movingUp(old, win, struct) {
    if (old.in_col_id === 0) {
        Utils.log('This is first row, moving up not available, skipping...');
        return;
    }
    let prev = struct.getTopWindow(old);
    if (prev.id === win.id) {
        return;
    }
    prev.in_col_id += 1;
    struct.setWindow(prev);
    struct.setWindow(win);
}

async function movingDown(old, win, struct) {
    let prev = struct.getBottomWindow(old);
    if (prev.id === win.id) {
        return;
    }
    prev.in_col_id -= 1;
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

    struct.setWindow(win);
    await struct.reorderScreen(win.ws_id, win.mon_id);
    // let windows = struct.getColumnNeighbors(win);
    // Utils.log(windows.map((w) => `${w.id}:${w.col_id}:${w.in_col_id}`));
    // await struct.reorderWindowColumn(win);
    // let new_wins = struct.getColumnNeighbors(win);
    //
    // if (new_wins.length === 0) {
    //     win.in_col_id = 0;
    //     struct.setWindow(win);
    //     reorderInColumn(old_wins);
    //     return;
    // }
    //
    // if (win.in_col_id >= new_wins.length) {
    //     win.in_col_id = new_wins.length;
    //     struct.setWindow(win);
    //     reorderInColumn(old_wins);
    //     return;
    // }
    //
    // reorderInColumn(new_wins);
    //
    // struct.setWindow(win);
}
