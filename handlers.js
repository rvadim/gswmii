const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;

function windowCreated(window, struct, new_data) {
    Utils.log("Window created", window.id);
    //let columns = new_struct.getWindowsByColumns(window.ws_id, window.mon_id);
    //let windows = new_struct.getWindows(window.ws_id, window.mon_id);
    // skip, get selected window
    // get it col_id
    // get put new window to col
    //let fID = Utils.getFocusedWindow().get_stable_sequence();
    //Utils.log("fID", fID);
    //let fWin = struct.getWindow(fID);
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
}

function windowDeleted(window, struct, new_struct) {
    Utils.log("Window deleted", window.id);
    let columns = struct.getColumns(window.ws_id, window.mon_id);
    if (columns.length === 0) {
        return;
    }
    let column = columns[window.col_id];
    for (let i = 0; i < column.length; i++) {
        if (column.hasOwnProperty(i)) {
            column[i].in_col_id = i;
        }
    }
}

function windowUpdated(old_window, new_window, struct, new_struct) {
    if (old_window.col_id !== new_window.col_id) {
        setColumn(old_window, new_window, struct);
    }
    // Utils.log("Window updated", new_window.id);
}

function setColumn(old, win, struct) {
    Utils.log("old", old);
    Utils.log("new", win);
    // Utils.log("windows", windows);

    // Moving left
    if (win.col_id < old.col_id) {
        movingLeft(old, win, struct);
    } else { // Moving right
        movingRight(old, win, struct);
    }
}

function movingLeft(old, win, struct) {
    Utils.log('movingLeft');
    if (old.col_id === 0) {
        Utils.log('This is first column, moving left not available, skipping...');
        return;
    }

    let old_wins = struct.getColumnNeighbors(old);

    if (old_wins.length === 1) {
        struct.setWindow(win);
        reorderInColumn(struct.getColumnNeighbors(win));
    }
}

function movingRight(old, win, struct) {
    Utils.log('movingRight');
    let old_wins = struct.getColumnNeighbors(old);
    Utils.log('old_wins', old_wins);
    if (old_wins.length === 1) {
        Utils.log('This is last window column, moving right not available, skipping...');
        return;
    }

    let new_wins = struct.getColumnNeighbors(win);

    if (new_wins.length === 0) {
        win.in_col_id = 0;
        struct.setWindow(win);
        reorderInColumn(old_wins);
        return;
    }

    if (win.in_col_id >= windows.length) {
        win.in_col_id = windows.length;
        struct.setWindow(win);
        reorderInColumn(old_wins);
        return;
    }

    reorderInColumn(new_wins);

    // for (let w of windows) {
    //    if (win.in_col_id > w.in_col_id) {
    //        w.in_col_id += 1;
    //    }
    // }
    struct.setWindow(win);
}

function reorderInColumn(windows) {
    let sorted = windows.sort((a, b) => a.in_col_id - b.in_col_id);
    for (let i = 0; i < sorted.length; i++) {
        sorted[i].in_col_id = i;
    }
}

function getMaxInCol(windows) {

}
