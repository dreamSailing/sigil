// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

// DOM mock setup - run BEFORE runtime.js is loaded
// Usage: node --import ./runtime/setup-globals.js ./runtime/runtime.test.js

class MockElement {
    constructor(tag) {
        this.tagName = tag.toUpperCase();
        this.children = [];
        this.childNodes = [];
        this.attrs = {};
        this._text = '';
        this.style = {};
        this._eventListeners = [];
        this._isFragment = false;
    }
    get textContent() { return this.childNodes.map(c => c.textContent || '').join(''); }
    set textContent(val) { this.childNodes = []; this._text = val; this.childNodes.push(new MockText(val)); }
    getAttribute(name) { return this.attrs[name] || null; }
    setAttribute(name, val) { this.attrs[name] = String(val); }
    removeAttribute(name) { delete this.attrs[name]; }
    hasAttribute(name) { return name in this.attrs; }
    getAttributeNames() { return Object.keys(this.attrs); }
    appendChild(child) { this.childNodes.push(child); if (child.nodeType === 1) this.children.push(child); return child; }
    replaceChild(newNode, oldNode) { const i = this.childNodes.indexOf(oldNode); if (i !== -1) this.childNodes[i] = newNode; return oldNode; }
    insertBefore(newNode, ref) { if (!ref) return this.appendChild(newNode); const i = this.childNodes.indexOf(ref); this.childNodes.splice(i, 0, newNode); return newNode; }
    removeChild(child) { const i = this.childNodes.indexOf(child); if (i !== -1) this.childNodes.splice(i, 1); return child; }
    get id() { return this.attrs['id'] || ''; }
    set id(val) { this.attrs['id'] = val; }
    get value() { return this.attrs['value'] || ''; }
    set value(val) { this.attrs['value'] = val; }
    get checked() { return this.attrs['checked'] === true; }
    set checked(val) { this.attrs['checked'] = val; }
    get selectedIndex() { return parseInt(this.attrs['selectedIndex']) || 0; }
    set selectedIndex(val) { this.attrs['selectedIndex'] = val; }
    get type() { return this.attrs['type'] || ''; }
    addEventListener(ev, fn) { this._eventListeners.push({ event: ev, handler: fn }); }
}
MockElement.prototype.nodeType = 1;

class MockText {
    constructor(text) { this.textContent = String(text); }
}
MockText.prototype.nodeType = 3;

const mockHead = new MockElement('head');
globalThis.window = { SIGIL_DEV: true, SIGIL_PROD: false };
globalThis.document = {
    createElement(tag) { return new MockElement(tag); },
    createTextNode(text) { return new MockText(text); },
    getElementById() { return null; },
    head: mockHead,
    body: { parentNode: null, appendChild() {}, removeChild() {} }
};
globalThis.HTMLElement = MockElement;
globalThis.Element = MockElement;
globalThis.MutationObserver = class {
    constructor(cb) { this.cb = cb; this.observing = false; }
    observe(target, options) {
        this.target = target;
        this.options = options;
        this.observing = true;
        // Patch removeChild to trigger callback
        const origRemove = target.removeChild.bind(target);
        const self = this;
        target.removeChild = function(child) {
            const result = origRemove(child);
            if (self.observing && self.cb) {
                self.cb([{
                    removedNodes: [child],
                    addedNodes: []
                }]);
            }
            return result;
        };
    }
    disconnect() { this.observing = false; }
};

// Suppress console
globalThis.console.warn = () => {};
globalThis.console.error = () => {};
