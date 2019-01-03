// const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const Handlers = Me.imports.handlers;
// Origin struct: ws_id -> mon_id -> win_id

class Window {
    constructor(window) {
        this.id = window.get_stable_sequence();
        this.ref = window;
        this.ws_id = window.get_workspace().index();
        this.mon_id = window.get_monitor();
        this.col_id = 0;
        this.in_col_id = 0;
    }

    toString() {
        return '<id:' + this.id +
            ', ws_id:' + this.ws_id +
            ', mon_id:' + this.mon_id +
            ', col_id:' + this.col_id +
            ', in_col_id:' + this.in_col_id + '>';
    }

    equal(win) {
        if (win.id === this.id &&
            win.ws_id === this.ws_id &&
            win.mon_id === this.mon_id &&
            win.col_id === this.col_id &&
            win.in_col_id === this.in_col_id
        ) {
            return true;
        }
        return false
    }
}

class TilingStructure {

    build() {
        //Utils.log('Building structure');
        let struct = {};
        let ws_count = global.screen.get_n_workspaces();
        for (let i = 0; i < ws_count; i++) {
            let ws = global.screen.get_workspace_by_index(i);
            for (let win of ws.list_windows()) {
                struct[win.get_stable_sequence()] = new Window(win);
            }
        }
        this._struct = struct;
    }

    getDiff(s) {
        let new_struct = s.getStruct();
        for (let i in new_struct) {
            if (new_struct.hasOwnProperty(i)) {
                let  new_win = new_struct[i];
                if (!this._struct.hasOwnProperty(i)) {
                    Handlers.windowCreated(new_win, this._struct, s);
                } else if (!this._struct[i].equal(new_win)) {
                    Handlers.windowUpdated(this._struct[i], new_win, this._struct[i], s)
                }
            }
        }
        for (let i in this._struct) {
            if (this._struct.hasOwnProperty(i)) {
                if (!new_struct.hasOwnProperty(i)) {
                    Handlers.windowDeleted(this._struct[i], this._struct, s)
                }
            }
        }
    }

    getStruct() {
       return this._struct;
    }

    toString() {
       let output = '';
       for (let i in this._struct) {
           if (this._struct.hasOwnProperty(i)) {
               output += this._struct[i].toString() + '\n';
           }
       }
       return output;
    }

    getWindows(ws_id, mon_id) {
        let windows = [];
        for (let i in this._struct) {
            if (this._struct.hasOwnProperty(i)) {
                let win = this._struct[i];
                if (win.mon_id === mon_id && win.ws_id === ws_id) {
                    windows.push(win);
                }
            }
        }
        return windows;
    }

    getWindowsByColumns(ws_id, mon_id) {
        let columns = [];
        for (let i in this._struct) {
            if (this._struct.hasOwnProperty(i)) {
                let win = this._struct[i];
                if (win.mon_id === mon_id && win.ws_id === ws_id) {
                    if (!columns.hasOwnProperty(win.col_id)) {
                        columns[win.col_id] = [];
                    }
                    Utils.log(win.id, win.mon_id, win.ws_id);
                    columns[win.col_id][win.in_col_id] = win;
                }
            }
        }
        return columns;
    }
}

//
// function isEqual(win1, win2) {
//     for (let key in win1) {
//         if (win1.hasOwnProperty(key) && win2.hasOwnProperty(key)) {
//             if (win1[key] !== win2[key]) {
//                 return false;
//             }
//         }
//     }
//     return true;
// }
//
// function get_diff(new_struct, old_struct) {
//     let diff = [];
//     for (let win_id1 in new_struct) {
//         if (!old_struct.hasOwnProperty(win_id1)) {
//             diff.push({
//                 action: 'delete',
//                 win_id: win_id1
//             });
//         }
//         if (!isEqual(new_struct[win_id1], old_struct[win_id1])) {
//             diff.push({
//                 action: 'update',
//                 win_id: win_id1
//             });
//         }
//
//     }
//     return diff;
// }

// function build_workspace(ws) {
//     let workspace = {
//         ref: ws,
//         monitors: {}
//     };
//     for (let m of Main.layoutManager.monitors) {
//         workspace['monitors'][m.index] = {
//             ref: m
//         };
//         workspace['monitors'][m.index]['windows'] = build_monitor(ws, m.index);
//     }
//     return workspace;
// }
//
// function build_monitor(ws, mon_id) {
//     let windows = [];
//     for (let win of ws.list_windows()){
//         // if (!isTileable(win)){
//         //     continue;
//         // }
//         if (win.get_monitor() === mon_id) {
//             windows.push(build_window(win));
//         }
//     }
//     return windows;
// }
//
// function build_window(win) {
//     return {
//         ref: win,
//         layout: 0,
//     }
// }
//
// function toString(struct) {
//     Utils.log('+++');
//     for (let ws_id in struct) {
//         for (let mon_id in struct[ws_id].monitors) {
//             // Utils.log(struct[ws_id].monitors[mon_id].windows);
//             for (let win of struct[ws_id].monitors[mon_id].windows) {
//                 Utils.log('ws:' + ws_id + ', mon: ' + mon_id + ', win: ' + win.ref.get_stable_sequence());
//             }
//         }
//     }
//     Utils.log('---');
//     // Utils.omap(structure, function (ws_id, ws) {
//     //     Utils.log(ws);
//     //     Utils.omap(ws.monitors, function (mon_id, mon) {
//     //         for (let win of mon.windows) {
//     //             // Utils.log(ws.ref);
//     //         }
//     //     });
//     // });
// }
