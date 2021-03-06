const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;

class Window {
    constructor(window) {
        this.id = window.get_stable_sequence();
        this.ref = window;
        this.ws_id = window.get_workspace().index();
        this.mon_id = window.get_monitor();
        this.col_id = null;
        this.in_col_id = null;
        this.stacked = false;
        this.active = false;
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

    copy() {
        let copy = new Window(this.ref);
        copy.id = this.id;
        copy.ws_id = this.ws_id;
        copy.mon_id = this.mon_id;
        copy.col_id = this.col_id;
        copy.in_col_id = this.in_col_id;
        return copy;
    }
}

class Structure {
    constructor() {
        this.windows = {};
        // this.uuid = Utils.guid();
    }

    addWindow(win) {
        // Utils.log("Structure", this.uuid, "add window", win.id);
        this.windows[win.id] = win;
    }

    setWindow(win) {
        this.windows[win.id] = win;
    }

    async deleteWindow(win) {
        delete this.windows[win.id];
    }

    getWindow(id) {
        if (this.hasWindow(id)) {
            return this.windows[id];
        }
        return null;
    }

    hasWindow(id) {
        return this.windows.hasOwnProperty(id);
    }

    getMaxColID(ws_id, mon_id) {
        let l = this.map((w) => w.col_id);
        if (l.length === 0) {
            return 0;
        }
        l.filter((w) => w.ws_id === ws_id && w.mon_id === mon_id);
        return Math.max(...l);
    }

    getWindows(ws_id, mon_id) {
        let windows = [];
        for (let i in this.windows) {
            if (this.windows.hasOwnProperty(i)) {
                let win = this.windows[i];
                if (win.mon_id === mon_id && win.ws_id === ws_id) {
                    windows.push(win);
                }
            }
        }
        return windows;
    }

    map(f) {
        let output = [];
        for (let i in this.windows) {
            if (this.windows.hasOwnProperty(i)) {
                output.push(f(this.windows[i]));
            }
        }
        return output;
    }

    filter(f) {
        let output = [];
        for (let i in this.windows) {
            if (this.windows.hasOwnProperty(i)) {
                if (f(this.windows[i])) {
                    output.push(this.windows[i]);
                }
            }
        }
        return output;
    }

    getColumns(ws_id, mon_id) {
        let columns = [];
        this.map(function (win) {
            if (win.mon_id === mon_id && win.ws_id === ws_id) {
                if (!columns.hasOwnProperty(win.col_id)) {
                    columns[win.col_id] = [];
                }
                columns[win.col_id][win.in_col_id] = win;
            }
        });
        return columns;
    }

    getPreviousInColumn(win) {
        if (win.in_col_id === 0) {
            return win;
        }
        let column = this.getColumnNeighbors(win);
        if (column.length === 1) {
            return win;
        }
        for (let w of column) {
            if (w.in_col_id === win.in_col_id - 1) {
                return w;
            }
        }
        Utils.log('ERROR', 'Problems with sequence in column', column);
        return win;
    }

    getNextInColumn(win) {
        let column = this.getColumnNeighbors(win);
        if (column.length === 1) {
            return win;
        }
        if (win.in_col_id >= column.length-1) {
            return win;
        }
        for (let w of column) {
            if (w.in_col_id === win.in_col_id + 1) {
                return w;
            }
        }
        Utils.log('ERROR', 'Problems with sequence in column', column);
        return win;
    }

    getColumnNeighbors(win) {
        return this.filter((w) => win.mon_id === w.mon_id && win.ws_id === w.ws_id && win.col_id === w.col_id);
    }

    getLeftWindow(win) {
        if (win.col_id === 0) {
            return win;
        }
        let windows = this.getColumns(win.ws_id, win.mon_id)[win.col_id-1];
        let in_col_id = closest(win.in_col_id, windows.map((w) => w.in_col_id));
        let wins = windows.filter((w) => w.in_col_id === in_col_id);
        if (wins.length === 0) {
            return win;
        } else {
            return wins[0];
        }
    }

    getRightWindow(win) {
        if (win.col_id === this.getMaxColID(win.ws_id, win.mon_id)) {
            return win
        }
        let windows = this.getColumns(win.ws_id, win.mon_id)[win.col_id+1];
        let in_col_id = closest(win.in_col_id, windows.map((w) => w.in_col_id));
        let wins = windows.filter((w) => w.in_col_id === in_col_id);
        if (wins.length === 0) {
            return win;
        } else {
            return wins[0];
        }
    }

    getTopWindow(win) {
        if (win.in_col_id === 0) {
            return win;
        }
        let windows = this.getColumnNeighbors(win);
        return windows.filter((w) => w.in_col_id === win.in_col_id - 1)[0];
    }

    getBottomWindow(win) {
        let windows = this.getColumnNeighbors(win);
        if (windows.length <= 1) {
            return win;
        }
        let maxRow = Math.max(...windows.map((w) => w.in_col_id))
        if (win.in_col_id === maxRow) {
            return win;
        }
        return windows.filter((w) => w.in_col_id === win.in_col_id + 1)[0];
    }

    // reorderWindowColumn(win) {
    //     let windows = this.getColumnNeighbors(win);
    //     // Utils.log("reorder windows", windows.map((w) => `${w.id}:${w.col_id}:${w.in_col_id}`));
    //     let sorted = windows.sort((a, b) => a.in_col_id - b.in_col_id);
    //     for (let i = 0; i < sorted.length; i++) {
    //         sorted[i].in_col_id = i;
    //     }
    // }

    reorderScreen(ws_id, mon_id) {
        let columns = this.groupBy(['ws_id', 'mon_id', 'col_id']);
        for (let i in columns) {
            if (columns.hasOwnProperty(i)) {
                let sorted = columns[i].filter((w) => w !== null).sort((a, b) => a.in_col_id - b.in_col_id);
                for (let i = 0; i < sorted.length; i++) {
                    sorted[i].in_col_id = i;
                }
            }
        }
    }

    groupBy(keys) {
        let output = {};
        for (let i in this.windows) {
            if (this.windows.hasOwnProperty(i)) {
                let win = this.windows[i];
                let winKey = keys.map((k) => win[k]).join('.');
                if (!output.hasOwnProperty(winKey)) {
                    output[winKey] = [];
                }
                output[winKey].push(win);
            }
        }
        return output;
    }
}

function closest(x, list) {
    if (list.length === 0) {
        return 0;
    }
    if (list.includes(x)) {
        return x
    }
    let zip = list.map((n) => [n, Math.abs(n - x)]);
    let closest = zip[0];
    for (let n of zip) {
        if (n[1] < closest[1]) {
            closest = n;
        }
    }
    return closest[0];
}
