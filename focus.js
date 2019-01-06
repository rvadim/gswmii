const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;

let previous = null;
let current = null;

function onChange() {
    if (global.display.focusWindow !== null) {
        let id = global.display.focusWindow.get_stable_sequence();
        previous = current;
        current = id;
    }
}

function getPreviousWindowID() {
   return previous;
}

function getCurrentWindowID() {
    return current;
}

