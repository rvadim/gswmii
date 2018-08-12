const Main = imports.ui.main;

const LAYOUT_DEFAULT = 0;
const LAYOUT_STACKED = 1;

class Column {
    constructor() {
        this._windows = [];
        this._layout = LAYOUT_DEFAULT;
    }

    getWindows() {
        return this._windows;
    }

    getNext(win_id) {
        let index = this._windows.indexOf(win_id);
        if (index === -1) {
            return win_id;
        }
        if (index >= this._windows.length-1) {
            return win_id;
        }
        return this._windows[index+1];
    }

    getPrevious(win_id) {
        let index = this._windows.indexOf(win_id);
        if (index === -1) {
            return win_id;
        }
        if (index === 0) {
            return win_id;
        }
        return this._windows[index-1];
    }

    addWindow(id) {
        this._windows.push(id);
    }

    hasWindow(id) {
        for (let win_id of this._windows) {
            if (win_id === id) {
                return true;
            }
        }
        return false;
    }

    removeWindow(id) {
        this._windows.splice(this._windows.indexOf(id), 1);
    }
}

class Monitor {
    constructor(id, ws) {
        this._id = id;
        this._columns = [];
        this._parent_ws = ws;
        this._columns.push(new Column());
        this.updateMonitorSize();
    }

    getNext(col) {
        let index = this._columns.indexOf(col);
        if (index === -1) {
            return col;
        }
        if (index >= this._columns.length-1) {
            return col;
        }
        return this._columns[index+1];
    }

    getPrevious(col) {
        let index = this._columns.indexOf(col);
        if (index === -1) {
            return col;
        }
        if (index === 0) {
            return col;
        }
        return this._columns[index-1];
    }

    getWindowColumn(win_id) {
        for (let col of this.getColumns()) {
            if (col.hasWindow(win_id)) {
                return col;
            }
        }
        return null;
    }

    updateMonitorSize() {
        for (let mon of Main.layoutManager.monitors) {
            if (this._id === mon.index) {
                this._monitor_width = mon.width;
                this._monitor_height = mon.height;
            }
        }
    }

    getWidth() {
        return this._monitor_width;
    }

    getHeight() {
        return this._monitor_height;
    }

    getId() {
        return this._id;
    }

    getColumns() {
        return this._columns;
    }

    addColumn(column) {
        this._columns.push(column);
    }

    getColumn(position) {
        return this._columns[position];
    }

    removeColumn(column) {
        this._columns.splice(this._columns.indexOf(column), 1);
    }

    getParentWS() {
        return this._parent_ws;
    }

    getWindowById(id) {
        let windows = this.getParentWS().list_windows().filter(win => win.get_stable_sequence() === id);
        if (windows.length > 0) {
            return windows[0];
        }
        return null;
    }
}

class Workspace {
    constructor(id, ws) {
        this._id = id;
        this._monitors = {};
        this._ws = ws;
    }

    getId() {
        return this._id;
    }

    addMonitor(monitor) {
        this._monitors[monitor.getId()] = monitor;
    }

    hasMonitor(id) {
        return this._monitors.hasOwnProperty(id);
    }

    getMonitor(id) {
        return this._monitors[id];
    }

    getMonitors() {
        return this._monitors;
    }
}

class Inventory {
    constructor() {
        this._workspaces = {};
    }

    addWorkspace(workspace) {
        this._workspaces[workspace.getId()] = workspace;
    }

    hasWorkspace(id) {
        return this._workspaces.hasOwnProperty(id);
    }

    removeWorkspace(workspace) {
        delete this._workspaces[workspace.getId()];
    }

    getWorkspace(id) {
        return this._workspaces[id];
    }

    getWorkspaces() {
        return this._workspaces;
    }
}