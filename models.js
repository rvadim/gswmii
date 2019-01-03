const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;

class Window {
    constructor(window) {
        this.id = window.get_stable_sequence();
        this.ref = window;
        this.ws_id = window.get_workspace().index();
        this.mon_id = window.get_monitor();
        this.col_id = 0;
        this.in_col_id = null;
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
        this.uuid = Utils.guid();
    }

    addWindow(win) {
        return new Promise((resolve, reject) => {
        // Utils.log("Structure", this.uuid, "add window", win.id);
        this.windows[win.id] = win;
        });
    }

    setWindow(win) {
        return new Promise((resolve, reject) => {
            this.windows[win.id] = win;
        });
    }

    deleteWindow(win) {
        return new Promise((resolve, reject) => {
            delete this.windows[win.id];
        });
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

    getColumns(ws_id, mon_id) {
        let columns = [];
        for (let i in this.windows) {
            if (this.windows.hasOwnProperty(i)) {
                let win = this.windows[i];
                if (win.mon_id === mon_id && win.ws_id === ws_id) {
                    if (!columns.hasOwnProperty(win.col_id)) {
                        columns[win.col_id] = [];
                    }
                    columns[win.col_id][win.in_col_id] = win;
                }
            }
        }
        return columns;
    }

    getPreviousInColumn(win) {
        if (win.in_col_id === 0) {
            return win;
        }
        let column = this.getColumnNeighbors(win);
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

    getColumnNeighbors(w) {
        let windows = [];
        for (let i in this.windows) {
            if (this.windows.hasOwnProperty(i)) {
                let win = this.windows[i];
                if (win.mon_id === w.mon_id && win.ws_id === w.ws_id && win.col_id === w.col_id) {
                    windows.push(win);
                }
            }
        }
        return windows;
    }
}