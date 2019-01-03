const Shell = imports.gi.Shell;
const Main = imports.ui.main;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const Models = Me.imports.models;
const Handlers = Me.imports.handlers;

let structure = new Models.Structure();


function update(first_start=false, win=false) {
    let newStruct = build(win);
    for (let i in structure.windows) {
        if (structure.hasWindow(i)) {
            if (!newStruct.hasOwnProperty(i)) {
                let win = structure.getWindow(i);
                structure.deleteWindow(win);
                Handlers.windowDeleted(win, structure, newStruct)
            }
        }
    }
    for (let i in newStruct) {
        if (newStruct.hasOwnProperty(i)) {
            let  newWin = newStruct[i];
            if (!structure.hasWindow(i)) {
                Handlers.windowCreated(newWin, structure, newStruct);
                structure.addWindow(newWin);
            } else if (!structure.getWindow(i).equal(newWin)) {
                Handlers.windowUpdated(structure.getWindow(i), newWin, structure, newStruct);
                // TODO update?
            }
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

// Keyboard handlers

function switch_focus_up() {
    let win = structure.getWindow(Utils.getFocusedWindow().get_stable_sequence());
    structure.getPreviousInColumn(win).ref.focus(global.get_current_time());
}

function switch_focus_down() {
    let win = structure.getWindow(Utils.getFocusedWindow().get_stable_sequence());
    structure.getNextInColumn(win).ref.focus(global.get_current_time());
}
