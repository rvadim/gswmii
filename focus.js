const Me = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;

let previous = null;
let current = null;

function onChange() {
    let id = global.display.focusWindow.get_stable_sequence();
    previous = current;
    current = id;
    Utils.log('Foxus changed to window id', getCurrentWindowID());
    Utils.log('Previous focused window', getPreviousWindowID());
}

function getPreviousWindowID() {
   return previous;
}

function getCurrentWindowID() {
    return current;
}

