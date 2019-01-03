const Main = imports.ui.main;
const Meta = imports.gi.Meta;
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
    Utils.log('windows.lenght', windows);
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
    struct.addWindow(window);
    //old_struct[window.id] = window;
    let columns = struct.getColumns(window.ws_id, window.mon_id);
    Utils.log('Columns', columns);
    retile_monitor(window.ws_id, window.mon_id, columns, Utils.getMonitor(window.mon_id));
}

function windowDeleted(window, struct, new_struct) {
    Utils.log("Window deleted", window.id);
    let columns = struct.getColumns(window.ws_id, window.mon_id);
    let column = columns[window.col_id];
    for (let i = 0; i < column.length; i++) {
        if (column.hasOwnProperty(i)) {
            column[i].in_col_id = i;
        }
    }
    Utils.log('Columns', columns);
    retile_monitor(window.ws_id, window.mon_id, columns, Utils.getMonitor(window.mon_id));
}

function windowUpdated(old_window, new_window, old_struct, new_struct) {
    // Utils.log("Window updated", new_window.id);
}

function retile_monitor(ws_id, mon_id, columns, monitor) {
    let top_height = 25;        // TODO get from original window
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
        Utils.log('column', column);
        let windows_count = column.length;
        let row_height = Math.floor((monitor.height - top_height) / windows_count);
        let win_id = 0;
        for (let win of column) {
            Utils.log('Win', win);
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



