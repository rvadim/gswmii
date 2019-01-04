const Me = imports.misc.extensionUtils.getCurrentExtension();
const Models = Me.imports.models;
const Utils = Me.imports.utils;


class TestCase {
    constructor() {
        this.errors = [];
    }

    assertEqual(actual, expected, message = '') {
        if (Object.prototype.toString.call(actual) === '[object Array]') {
            // Utils.log(`${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
            if (!actual.every((e) => expected.includes(e)) || !expected.every((e) => actual.includes(e))) {
                this.errors.push(
                    new Error(`actual: ${JSON.stringify(actual)} !== expected ${JSON.stringify(expected)}, ${message}`));
            }
        } else if (actual !== expected) {
            this.errors.push(
                    new Error(`actual: ${JSON.stringify(actual)} !== expected ${JSON.stringify(expected)}, ${message}`));
        }
    }
}

function runTests() {
    let suites = [
        TestStructure,
        TestWindow
    ];
    for (let suite of suites) {
        let s = new suite();
        for (let name of Object.getOwnPropertyNames(Object.getPrototypeOf(s)).sort()) {
            let method = s[name];
            if (!(method instanceof Function) || !name.startsWith('test')) {
                continue;
            }
            Utils.log(`Run test '${s.constructor.name}:${name}'`);
            s[name]();
        }
        if (s.errors.length !== 0) {
            throw s.errors.join('\n');
        }
    }
    Utils.log('*** All tests passed! ***');
}

class WindowMock {
    constructor(id=3, wsID=0, monID=0) {
        this.id = id;
        this.wsID = wsID;
        this.monID = monID;
    }

    get_stable_sequence() {
        return this.id;
    }

    get_workspace() {
        return {index: () => this.wsID};
    }

    get_monitor() {
        return this.monID;
    }
}

class TestWindow extends TestCase {
    testCreation() {
        let w = new WindowMock();
        let win = new Models.Window(w);
        this.assertEqual(win.id, 3);
        this.assertEqual(win.ref, w);
        this.assertEqual(win.ws_id, w.wsID);
        this.assertEqual(win.mon_id, w.monID);
        this.assertEqual(win.col_id, null);
        this.assertEqual(win.in_col_id, null);
    }

    testCopy() {
        let w = new WindowMock();
        let win1 = new Models.Window(w);
        let win2 = win1.copy();
        this.assertEqual(win1.id, win2.id);
        this.assertEqual(JSON.stringify(win1.ref), JSON.stringify(win2.ref));
        this.assertEqual(win1.ws_id, win2.ws_id);
        this.assertEqual(win1.mon_id, win2.mon_id);
        this.assertEqual(win1.col_id, win2.col_id);
        this.assertEqual(win1.in_col_id, win2.in_col_id);
    }

    testEqual() {
        let w = new WindowMock();
        let win1 = new Models.Window(w);
        let win2 = new Models.Window(w);
        this.assertEqual(win1.equal(win2), true, 'Two windows equals, equal should return true');
        win1.id = 99999;
        this.assertEqual(win1.equal(win2), false, 'Two windows not equals, equal should return false');
        win1.id = win2.id;
        win1.ws_id = 9999;
        this.assertEqual(win1.equal(win2), false, 'Two windows not equals, equal should return false');
    }
}

class TestStructure extends TestCase {
    createFixture1() {
        let s = new Models.Structure();
        let win1 = new Models.Window(new WindowMock());
        win1.col_id = 0;
        win1.in_col_id = 0;
        s.addWindow(win1);
        let win2 = new Models.Window(new WindowMock(4));
        win2.col_id = 1;
        win2.in_col_id = 0;
        s.addWindow(win2);
        let win3 = new Models.Window(new WindowMock(5));
        win3.col_id = 2;
        win3.in_col_id = 0;
        s.addWindow(win3);
        return s;
    }
    createFixture2() {
        let s = new Models.Structure();
        let win1 = new Models.Window(new WindowMock());
        win1.col_id = 0;
        win1.in_col_id = 0;
        s.addWindow(win1);
        let win2 = new Models.Window(new WindowMock(4));
        win2.col_id = 0;
        win2.in_col_id = 1;
        s.addWindow(win2);
        let win3 = new Models.Window(new WindowMock(5));
        win3.col_id = 0;
        win3.in_col_id = 2;
        s.addWindow(win3);
        return s;
    }

    testCreation() {
        let s = new Models.Structure();
        this.assertEqual(JSON.stringify(s.windows), "{}", 'structure should be init with empty windows');
    }
    testMap() {
        let s = new Models.Structure();
        s.addWindow(new Models.Window(new WindowMock()));
        s.addWindow(new Models.Window(new WindowMock(4)));

        let output = s.map((w) => w.id);
        this.assertEqual(output, [3, 4]);
        output = s.map((w) => w.in_col_id);
        this.assertEqual(output, [null, null]);
        s = new Models.Structure();
        output = s.map((w) => w.in_col_id);
        this.assertEqual(output, []);
    }
    testGetMaxColID() {
        let s = this.createFixture1();
        this.assertEqual(s.getMaxColID(), 2);
        s = new Models.Structure();
        this.assertEqual(s.getMaxColID(), 0);

    }
    testAddWindow() {
        let s = new Models.Structure();
        this.assertEqual(s.hasWindow(1), false);
        s.addWindow(new Models.Window(new WindowMock(1))).then(() => this.assertEqual(s.hasWindow(1), true));
    }
    testSetWindow() {
        let s = new Models.Structure();
        s.addWindow(new Models.Window(new WindowMock(1))).then(() => this.assertEqual(s.getWindow(1).ws_id, 0));
        s.setWindow(new Models.Window(new WindowMock(1, 1))).then(function () {
            this.assertEqual(s.getWindow(1).ws_id, 1);
            this.assertEqual(s.map((w) => w.id), [1]);
        });

    }
    testDeleteWindow() {
        let s = new Models.Structure();
        s.addWindow(new Models.Window(new WindowMock(1)));
        this.assertEqual(s.map((w) => w.id), [1]);
        s.deleteWindow(1).then(() => this.assertEqual(s.map((w) => w.id), []));
    }
    testGetWindows() {
        let s = this.createFixture1();
        this.assertEqual(s.getWindows(0, 0).map((w) => w.id), [3, 4, 5]);
        this.assertEqual(s.getWindows(1, 0).map((w) => w.id), []);
        s.getWindow(3).ws_id = 1;
        this.assertEqual(s.getWindows(1, 0).map((w) => w.id), [3]);
        this.assertEqual(s.getWindows(0, 0).map((w) => w.id), [4, 5]);
        s.getWindow(3).mon_id = 1;
        this.assertEqual(s.getWindows(1, 0).map((w) => w.id), []);
        this.assertEqual(s.getWindows(1, 1).map((w) => w.id), [3]);
        this.assertEqual(s.getWindows(0, 0).map((w) => w.id), [4, 5]);
    }
    testGetColumns() {
        let s = this.createFixture1();
        s.getWindow(3).in_col_id = 0;
        s.getWindow(4).in_col_id = 1;
        s.getWindow(5).in_col_id = 2;
        this.assertEqual(s.getColumns(0, 0)[0].map((w) => w.id), [3]);
        this.assertEqual(s.getColumns(0, 0)[1].map((w) => w.id), [4]);
        this.assertEqual(s.getColumns(0, 0)[2].map((w) => w.id), [5]);
        this.assertEqual(s.getColumns(0, 0).length, 3);
        s.getWindow(5).col_id = 0;
        this.assertEqual(s.getColumns(0, 0)[0].map((w) => w.id), [3, 5]);
        this.assertEqual(s.getColumns(0, 0)[1].map((w) => w.id), [4]);
        this.assertEqual(s.getColumns(0, 0).length, 2);
        s.getWindow(5).mon_id = 1;
        this.assertEqual(s.getColumns(0, 0)[0].map((w) => w.id), [3]);
        this.assertEqual(s.getColumns(0, 0)[1].map((w) => w.id), [4]);
        this.assertEqual(s.getColumns(0, 0).length, 2);
        this.assertEqual(s.getColumns(0, 1)[0].map((w) => w.id), [5]);
        this.assertEqual(s.getColumns(0, 1).length, 1);
    }
    testGetPreviousAdnNextInColumn() {
        let s = this.createFixture2();
        this.assertEqual(s.getPreviousInColumn(s.getWindow(3)).id, 3);
        this.assertEqual(s.getPreviousInColumn(s.getWindow(4)).id, 3);
        this.assertEqual(s.getPreviousInColumn(s.getWindow(5)).id, 4);

        this.assertEqual(s.getNextInColumn(s.getWindow(3)).id, 4);
        this.assertEqual(s.getNextInColumn(s.getWindow(4)).id, 5);
        this.assertEqual(s.getNextInColumn(s.getWindow(5)).id, 5);
    }
    testGetColumndNeighbors() {
        let s = this.createFixture2();
        this.assertEqual(s.getColumnNeighbors(s.getWindow(3)).map((w) => w.id), [3, 4, 5]);
        this.assertEqual(s.getColumnNeighbors(s.getWindow(4)).map((w) => w.id), [3, 4, 5]);
        this.assertEqual(s.getColumnNeighbors(s.getWindow(5)).map((w) => w.id), [3, 4, 5]);
        s.getWindow(3).col_id = 1;
        this.assertEqual(s.getColumnNeighbors(s.getWindow(4)).map((w) => w.id), [4, 5]);
        this.assertEqual(s.getColumnNeighbors(s.getWindow(3)).map((w) => w.id), [3]);
        s.getWindow(4).mon_id = 1;
        s.getWindow(4).ws_id = 1;
        s.getWindow(3).col_id = 0;
        this.assertEqual(s.getColumnNeighbors(s.getWindow(5)).map((w) => w.id), [3, 5]);
        this.assertEqual(s.getColumnNeighbors(s.getWindow(4)).map((w) => w.id), [4]);
    }
    testClosest() {
        this.assertEqual(Models.closest(4, []), 0);
        this.assertEqual(Models.closest(1, [0, 1, 2, 3, 4]), 1);
        this.assertEqual(Models.closest(4, [0]), 0);

    }
    testGetLeftWindow() {
        let s = this.createFixture1();
        this.assertEqual(s.getLeftWindow(s.getWindow(3)).id, 3);
        this.assertEqual(s.getLeftWindow(s.getWindow(4)).id, 3);
        this.assertEqual(s.getLeftWindow(s.getWindow(5)).id, 4);
    }
    testGetRightWindow() {
        let s = this.createFixture1();
        this.assertEqual(s.getRightWindow(s.getWindow(3)).id, 4);
        this.assertEqual(s.getRightWindow(s.getWindow(4)).id, 5);
        this.assertEqual(s.getRightWindow(s.getWindow(5)).id, 5);
    }
}
