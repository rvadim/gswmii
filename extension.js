const Gio = imports.gi.Gio;
const Meta = imports.gi.Meta;
const Shell = imports.gi.Shell;
const Main = imports.ui.main;
const St = imports.gi.St;
const Me = imports.misc.extensionUtils.getCurrentExtension();
const MyMain = Me.imports.main;
const Tests = Me.imports.tests;
const Utils = Me.imports.utils;
const Focus = Me.imports.focus;

const SchemaSource = Gio.SettingsSchemaSource.new_from_directory(
    Me.dir.get_path(), Gio.SettingsSchemaSource.get_default(), false);

let settings = new Gio.Settings({
    settings_schema: SchemaSource.lookup(Me.metadata['settings-schema'], true)
});

const bindings = new Gio.Settings({
    settings_schema: SchemaSource.lookup(Me.metadata['settings-schema'] + '.keybindings', true)
});

function addKeybinding(name, handler) {
    Main.wm.addKeybinding(name, bindings, 0, Shell.ActionMode.NORMAL, handler);
}

let _handle_settings;
let _handle_screen;
// let _handle_wm_map;
// let _handle_wm_destroy;
let _handle_window_focus;
// let _handle_wm_switch_ws;

function enable() {
    Tests.runTests();

    _handle_window_focus = global.display.connect('notify::focus-window', Focus.onChange);
    _handle_settings = settings.connect('changed', function() {
        MyMain.handleSettings();
        MyMain.update();
    });

    _handle_screen = global.screen.connect('restacked', function() {
        MyMain.update();
    });

    // _handle_wm_switch_ws = global.window_manager.connect('switch-workspace', function() {
    //     MyMain.update();
    // });

    // _handle_wm_map = global.window_manager.connect('map', (g, w) => {
        // MyMain.update();
    // });

    // _handle_wm_destroy = global.window_manager.connect('destroy', (g, w) => {
    //     // ROLLBACK remove_window(w.meta_window);
    // });
    enableKeybindings();
    MyMain.handleSettings();

    MyMain.update();
}

function init() {}

function disable() {
    settings.disconnect(_handle_settings);
    global.screen.disconnect(_handle_screen);
    // global.window_manager.disconnect(_handle_wm_map);
    // global.window_manager.disconnect(_handle_wm_destroy);
    global.display.disconnect(_handle_window_focus);
    // global.window_manager.disconnect(_handle_wm_switch_ws);

    disableKeybindings();
}

function enableKeybindings() {
    addKeybinding('switch-default-layout', () => {
        MyMain.switch_default_layout();
    });
    addKeybinding('switch-stacked-layout', () => {
        MyMain.switch_stacked_layout();
    });
    addKeybinding('switch-focus-down', () => {
         MyMain.switch_focus_down();
    });
    addKeybinding('switch-focus-up', () => {
        MyMain.switch_focus_up();
    });
    addKeybinding('switch-focus-right', () => {
        MyMain.switch_focus_right();
    });
    addKeybinding('switch-focus-left', () => {
        MyMain.switch_focus_left();
    });
    addKeybinding('move-window-right', () => {
        MyMain.move_window_right();
    });
    addKeybinding('move-window-left', () => {
        MyMain.move_window_left();
    });
    addKeybinding('move-window-up', () => {
        MyMain.move_window_up();
    });
    addKeybinding('move-window-down', () => {
        MyMain.move_window_down();
    });
    for (let i = 0; i < 9; i++) {
        addKeybinding(`move-window-to-ws-${i + 1}`, () => {
            MyMain.move_window_to_ws(i);
        });
    }
}

function disableKeybindings() {
    Main.wm.removeKeybinding('switch-focus-down');
    Main.wm.removeKeybinding('switch-focus-up');
    Main.wm.removeKeybinding('move-window-left');
    Main.wm.removeKeybinding('move-window-right');
    Main.wm.removeKeybinding('move-window-up');
    Main.wm.removeKeybinding('move-window-down');
    Main.wm.removeKeybinding('switch-focus-right');
    Main.wm.removeKeybinding('switch-focus-left');
    for (let i = 0; i < 9; i++) {
        Main.wm.removeKeybinding(`move-window-to-ws-${i + 1}`);
    }
    Main.wm.removeKeybinding('switch-default-layout');
    Main.wm.removeKeybinding('switch-stacked-layout');
}
