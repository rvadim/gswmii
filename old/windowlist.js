class WindowList {
    constructor(perMonitor, monitor) {
        this._perMonitor = perMonitor;
        this._monitor = monitor;

        this.actor = new St.Widget({ name: 'panel',
            style_class: 'bottom-panel solid',
            reactive: true,
            track_hover: true,
            layout_manager: new Clutter.BinLayout()});
        this.actor.connect('destroy', this._onDestroy.bind(this));

        let box = new St.BoxLayout({ x_expand: true, y_expand: true });
        this.actor.add_actor(box);

        let layout = new Clutter.BoxLayout({ homogeneous: true });
        this._windowList = new St.Widget({ style_class: 'window-list',
            reactive: true,
            layout_manager: layout,
            x_align: Clutter.ActorAlign.START,
            x_expand: true,
            y_expand: true });
        box.add(this._windowList, { expand: true });

        this._windowList.connect('style-changed', () => {
            let node = this._windowList.get_theme_node();
            let spacing = node.get_length('spacing');
            this._windowList.layout_manager.spacing = spacing;
        });
        this._windowList.connect('scroll-event', this._onScrollEvent.bind(this));

        let indicatorsBox = new St.BoxLayout({ x_align: Clutter.ActorAlign.END });
        box.add(indicatorsBox);

        this._workspaceIndicator = new WorkspaceIndicator();
        indicatorsBox.add(this._workspaceIndicator.container, { expand: false, y_fill: true });

        this._mutterSettings = new Gio.Settings({ schema_id: 'org.gnome.mutter' });
        this._workspaceSettings = this._getWorkspaceSettings();
        this._workspacesOnlyOnPrimaryChangedId =
            this._workspaceSettings.connect('changed::workspaces-only-on-primary',
                this._updateWorkspaceIndicatorVisibility.bind(this));
        this._dynamicWorkspacesSettings = this._getDynamicWorkspacesSettings();
        this._dynamicWorkspacesChangedId =
            this._dynamicWorkspacesSettings.connect('changed::dynamic-workspaces',
                this._updateWorkspaceIndicatorVisibility.bind(this));
        this._updateWorkspaceIndicatorVisibility();

        this._menuManager = new PopupMenu.PopupMenuManager(this);
        this._menuManager.addMenu(this._workspaceIndicator.menu);

        Main.layoutManager.addChrome(this.actor, { affectsStruts: true,
            trackFullscreen: true });
        Main.uiGroup.set_child_above_sibling(this.actor, Main.layoutManager.panelBox);
        Main.ctrlAltTabManager.addGroup(this.actor, _("Window List"), 'start-here-symbolic');

        this.actor.width = this._monitor.width;
        this.actor.connect('notify::height', this._updatePosition.bind(this));
        this._updatePosition();

        this._appSystem = Shell.AppSystem.get_default();
        this._appStateChangedId =
            this._appSystem.connect('app-state-changed',
                this._onAppStateChanged.bind(this));

        this._keyboardVisiblechangedId =
            Main.layoutManager.connect('keyboard-visible-changed',
                (o, state) => {
                    Main.layoutManager.keyboardBox.visible = state;
                    let keyboardBox = Main.layoutManager.keyboardBox;
                    keyboardBox.visible = state;
                    if (state)
                        Main.uiGroup.set_child_above_sibling(this.actor, keyboardBox);
                    else
                        Main.uiGroup.set_child_above_sibling(this.actor,
                            Main.layoutManager.panelBox);
                    this._updateKeyboardAnchor();
                });

        let workspaceManager = global.workspace_manager;

        this._workspaceSignals = new Map();
        this._nWorkspacesChangedId =
            workspaceManager.connect('notify::n-workspaces',
                this._onWorkspacesChanged.bind(this));
        this._onWorkspacesChanged();

        this._switchWorkspaceId =
            global.window_manager.connect('switch-workspace',
                this._checkGrouping.bind(this));

        this._overviewShowingId =
            Main.overview.connect('showing', () => {
                this.actor.hide();
                this._updateKeyboardAnchor();
            });

        this._overviewHidingId =
            Main.overview.connect('hiding', () => {
                this.actor.visible = !Main.layoutManager.primaryMonitor.inFullscreen;
                this._updateKeyboardAnchor();
            });

        this._fullscreenChangedId =
            global.display.connect('in-fullscreen-changed', () => {
                this._updateKeyboardAnchor();
            });

        this._dragBeginId =
            Main.xdndHandler.connect('drag-begin',
                this._onDragBegin.bind(this));
        this._dragEndId =
            Main.xdndHandler.connect('drag-end',
                this._onDragEnd.bind(this));
        this._dragMonitor = {
            dragMotion: this._onDragMotion.bind(this)
        };

        this._dndTimeoutId = 0;
        this._dndWindow = null;

        this._settings = Convenience.getSettings();
        this._groupingModeChangedId =
            this._settings.connect('changed::grouping-mode',
                this._groupingModeChanged.bind(this));
        this._grouped = undefined;
        this._groupingModeChanged();
    }

    _getDynamicWorkspacesSettings() {
        if (this._workspaceSettings.list_keys().includes('dynamic-workspaces'))
            return this._workspaceSettings;
        return this._mutterSettings;
    }

    _getWorkspaceSettings() {
        let settings = global.get_overrides_settings() || this._mutterSettings;
        if (settings.list_keys().includes('workspaces-only-on-primary'))
            return settings;
        return this._mutterSettings;
    }

    _onScrollEvent(actor, event) {
        let direction = event.get_scroll_direction();
        let diff = 0;
        if (direction == Clutter.ScrollDirection.DOWN)
            diff = 1;
        else if (direction == Clutter.ScrollDirection.UP)
            diff = -1;
        else
            return;

        let children = this._windowList.get_children().map(a => a._delegate);
        let active = 0;
        for (let i = 0; i < children.length; i++) {
            if (children[i].active) {
                active = i;
                break;
            }
        }

        active = Math.max(0, Math.min(active + diff, children.length-1));
        children[active].activate();
    }

    _updatePosition() {
        this.actor.set_position(this._monitor.x,
            this._monitor.y + this._monitor.height - this.actor.height);
    }

    _updateWorkspaceIndicatorVisibility() {
        let workspaceManager = global.workspace_manager;
        let hasWorkspaces = this._dynamicWorkspacesSettings.get_boolean('dynamic-workspaces') ||
            workspaceManager.n_workspaces > 1;
        let workspacesOnMonitor = this._monitor == Main.layoutManager.primaryMonitor ||
            !this._workspaceSettings.get_boolean('workspaces-only-on-primary');

        this._workspaceIndicator.actor.visible = hasWorkspaces && workspacesOnMonitor;
    }

    _getPreferredUngroupedWindowListWidth() {
        if (this._windowList.get_n_children() == 0)
            return this._windowList.get_preferred_width(-1)[1];

        let children = this._windowList.get_children();
        let [, childWidth] = children[0].get_preferred_width(-1);
        let spacing = this._windowList.layout_manager.spacing;

        let workspace = global.workspace_manager.get_active_workspace();
        let windows = global.display.get_tab_list(Meta.TabList.NORMAL, workspace);
        if (this._perMonitor)
            windows = windows.filter(w => w.get_monitor() == this._monitor.index);
        let nWindows = windows.length;
        if (nWindows == 0)
            return this._windowList.get_preferred_width(-1)[1];

        return nWindows * childWidth + (nWindows - 1) * spacing;
    }

    _getMaxWindowListWidth() {
        let indicatorsBox = this._workspaceIndicator.actor.get_parent();
        return this.actor.width - indicatorsBox.get_preferred_width(-1)[1];
    }

    _groupingModeChanged() {
        this._groupingMode = this._settings.get_enum('grouping-mode');

        if (this._groupingMode == GroupingMode.AUTO) {
            this._checkGrouping();
        } else {
            this._grouped = this._groupingMode == GroupingMode.ALWAYS;
            this._populateWindowList();
        }
    }

    _checkGrouping() {
        if (this._groupingMode != GroupingMode.AUTO)
            return;

        let maxWidth = this._getMaxWindowListWidth();
        let natWidth = this._getPreferredUngroupedWindowListWidth();

        let grouped = (maxWidth < natWidth);
        if (this._grouped !== grouped) {
            this._grouped = grouped;
            this._populateWindowList();
        }
    }

    _populateWindowList() {
        this._windowList.destroy_all_children();

        if (!this._grouped) {
            let windows = global.get_window_actors().sort((w1, w2) => {
                return w1.metaWindow.get_stable_sequence() -
                    w2.metaWindow.get_stable_sequence();
            });
            for (let i = 0; i < windows.length; i++)
                this._onWindowAdded(null, windows[i].metaWindow);
        } else {
            let apps = this._appSystem.get_running().sort((a1, a2) => {
                return _getAppStableSequence(a1) -
                    _getAppStableSequence(a2);
            });
            for (let i = 0; i < apps.length; i++)
                this._addApp(apps[i]);
        }
    }

    _updateKeyboardAnchor() {
        if (!Main.keyboard.actor)
            return;

        let anchorY = Main.overview.visible ? 0 : this.actor.height;
        Main.keyboard.actor.anchor_y = anchorY;
    }

    _onAppStateChanged(appSys, app) {
        if (!this._grouped)
            return;

        if (app.state == Shell.AppState.RUNNING)
            this._addApp(app);
        else if (app.state == Shell.AppState.STOPPED)
            this._removeApp(app);
    }

    _addApp(app) {
        let button = new AppButton(app, this._perMonitor, this._monitor.index);
        this._windowList.layout_manager.pack(button.actor,
            true, true, true,
            Clutter.BoxAlignment.START,
            Clutter.BoxAlignment.START);
    }

    _removeApp(app) {
        let children = this._windowList.get_children();
        for (let i = 0; i < children.length; i++) {
            if (children[i]._delegate.app == app) {
                children[i].destroy();
                return;
            }
        }
    }

    _onWindowAdded(ws, win) {
        if (win.skip_taskbar)
            return;

        if (!this._grouped)
            this._checkGrouping();

        if (this._grouped)
            return;

        let children = this._windowList.get_children();
        for (let i = 0; i < children.length; i++) {
            if (children[i]._delegate.metaWindow == win)
                return;
        }

        let button = new WindowButton(win, this._perMonitor, this._monitor.index);
        this._windowList.layout_manager.pack(button.actor,
            true, true, true,
            Clutter.BoxAlignment.START,
            Clutter.BoxAlignment.START);
    }

    _onWindowRemoved(ws, win) {
        if (this._grouped)
            this._checkGrouping();

        if (this._grouped)
            return;

        if (win.get_compositor_private())
            return; // not actually removed, just moved to another workspace

        let children = this._windowList.get_children();
        for (let i = 0; i < children.length; i++) {
            if (children[i]._delegate.metaWindow == win) {
                children[i].destroy();
                return;
            }
        }
    }

    _onWorkspacesChanged() {
        let workspaceManager = global.workspace_manager;
        let numWorkspaces = workspaceManager.n_workspaces;

        for (let i = 0; i < numWorkspaces; i++) {
            let workspace = workspaceManager.get_workspace_by_index(i);
            if (this._workspaceSignals.has(workspace))
                continue;

            let signals = { windowAddedId: 0, windowRemovedId: 0 };
            signals._windowAddedId =
                workspace.connect_after('window-added',
                    this._onWindowAdded.bind(this));
            signals._windowRemovedId =
                workspace.connect('window-removed',
                    this._onWindowRemoved.bind(this));
            this._workspaceSignals.set(workspace, signals);
        }

        this._updateWorkspaceIndicatorVisibility();
    }

    _disconnectWorkspaceSignals() {
        let workspaceManager = global.workspace_manager;
        let numWorkspaces = workspaceManager.n_workspaces;

        for (let i = 0; i < numWorkspaces; i++) {
            let workspace = workspaceManager.get_workspace_by_index(i);
            let signals = this._workspaceSignals.get(workspace);
            this._workspaceSignals.delete(workspace);
            workspace.disconnect(signals._windowAddedId);
            workspace.disconnect(signals._windowRemovedId);
        }
    }

    _onDragBegin() {
        DND.addDragMonitor(this._dragMonitor);
    }

    _onDragEnd() {
        DND.removeDragMonitor(this._dragMonitor);
        this._removeActivateTimeout();
    }

    _onDragMotion(dragEvent) {
        if (Main.overview.visible ||
            !this.actor.contains(dragEvent.targetActor)) {
            this._removeActivateTimeout();
            return DND.DragMotionResult.CONTINUE;
        }

        let hoveredWindow = null;
        if (dragEvent.targetActor._delegate)
            hoveredWindow = dragEvent.targetActor._delegate.metaWindow;

        if (!hoveredWindow ||
            this._dndWindow == hoveredWindow)
            return DND.DragMotionResult.CONTINUE;

        this._removeActivateTimeout();

        this._dndWindow = hoveredWindow;
        this._dndTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT,
            DND_ACTIVATE_TIMEOUT,
            this._activateWindow.bind(this));

        return DND.DragMotionResult.CONTINUE;
    }

    _removeActivateTimeout() {
        if (this._dndTimeoutId)
            GLib.source_remove (this._dndTimeoutId);
        this._dndTimeoutId = 0;
        this._dndWindow = null;
    }

    _activateWindow() {
        let [x, y] = global.get_pointer();
        let pickedActor = global.stage.get_actor_at_pos(Clutter.PickMode.ALL, x, y);

        if (this._dndWindow && this.actor.contains(pickedActor))
            this._dndWindow.activate(global.get_current_time());
        this._dndWindow = null;
        this._dndTimeoutId = 0;

        return false;
    }

    _onDestroy() {
        this._workspaceSettings.disconnect(this._workspacesOnlyOnPrimaryChangedId);
        this._dynamicWorkspacesSettings.disconnect(this._dynamicWorkspacesChangedId);

        this._workspaceIndicator.destroy();

        Main.ctrlAltTabManager.removeGroup(this.actor);

        this._appSystem.disconnect(this._appStateChangedId);
        this._appStateChangedId = 0;

        Main.layoutManager.disconnect(this._keyboardVisiblechangedId);
        this._keyboardVisiblechangedId = 0;

        Main.layoutManager.hideKeyboard();

        this._disconnectWorkspaceSignals();
        global.workspace_manager.disconnect(this._nWorkspacesChangedId);
        this._nWorkspacesChangedId = 0;

        global.window_manager.disconnect(this._switchWorkspaceId);
        this._switchWorkspaceId = 0;


        Main.overview.disconnect(this._overviewShowingId);
        Main.overview.disconnect(this._overviewHidingId);

        global.display.disconnect(this._fullscreenChangedId);

        Main.xdndHandler.disconnect(this._dragBeginId);
        Main.xdndHandler.disconnect(this._dragEndId);

        this._settings.disconnect(this._groupingModeChangedId);

        let windows = global.get_window_actors();
        for (let i = 0; i < windows.length; i++)
            windows[i].metaWindow.set_icon_geometry(null);
    }
};
