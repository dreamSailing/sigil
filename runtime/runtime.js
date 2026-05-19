// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

// Sigil Framework Runtime — v0.1.0

let currentEffect = null;
const trackingStack = [];

// Lifecycle hooks
let currentComponent = null;
const lifecycleStack = [];

export function onMount(fn) {
    if (currentComponent) {
        currentComponent.onMountCallbacks.push(fn);
    } else if (DEV_MODE) {
        devWarn('onMount called outside of component');
    }
}

export function onUnmount(fn) {
    if (currentComponent) {
        currentComponent.onUnmountCallbacks.push(fn);
    } else if (DEV_MODE) {
        devWarn('onUnmount called outside of component');
    }
}

// --- Dev mode detection ---
const DEV_MODE = typeof window !== 'undefined' && (window.SIGIL_DEV === true || !window.SIGIL_PROD);

function devWarn(msg) {
    if (DEV_MODE) {
        console.warn('[Sigil]', msg);
    }
}

// --- 1. Signal ---
export function signal(initialValue) {
    let value = initialValue;
    const subscribers = new Set();

    const sig = {
        _subs: subscribers,
        get() {
            if (currentEffect) {
                const current = trackingStack[trackingStack.length - 1];
                if (current && !current.dependencies.has(sig)) {
                    current.dependencies.add(sig);
                    subscribers.add(current.run);
                }
            } else if (DEV_MODE) {
                // Warn about reading signal outside of component/effect
                if (arguments.length === 1 && arguments[0] === '__check__') return; // skip
            }
            return value;
        },
        set(newValue) {
            if (value !== newValue) {
                value = newValue;
                // Snapshot subscribers to avoid infinite loop when re-subscribing during notification
                var subs = Array.from(subscribers);
                for (var i = 0; i < subs.length; i++) subs[i]();
            }
        }
    };
    return sig;
}

// --- 2. Computed (readonly, with value-change detection) ---
export function computed(getter) {
    const result = signal();
    effect(() => {
        const newValue = getter();
        if (result._last !== newValue) {
            result._last = newValue;
            result.set(newValue);
        }
    });
    const computedSig = {
        get: () => result.get(),
        _isComputed: true,
        set: () => {
            devWarn('Attempting to set a computed signal — computed values are read-only. Use a regular signal instead.');
            if (DEV_MODE) {
                throw new Error('[Sigil] Computed signals are read-only');
            }
        }
    };
    return computedSig;
}

// --- 3. Effect with cleanup ---
export function effect(fn) {
    const effectContext = { cleanup: null, subscribers: new Set() };
    let firstRun = true;
    let disposed = false;
    const run = () => {
        if (disposed) return;
        if (effectContext.cleanup) {
            try { effectContext.cleanup(); } catch(e) {
                devWarn('Error in effect cleanup: ' + e.message);
            }
            effectContext.cleanup = null;
        }
        // Clear old subscriber tracking for this run
        effectContext.subscribers.forEach(sig => {
            if (sig._subs) sig._subs.delete(run);
        });
        effectContext.subscribers.clear();

        const savedEffect = currentEffect;
        currentEffect = { run, cleanup: null };
        trackingStack.push({ dependencies: new Set(), run });
        try {
            const result = fn((cleanupFn) => { effectContext.cleanup = cleanupFn; });
            if (typeof result === 'function') {
                effectContext.cleanup = result;
            }
        } finally {
            // Track which signals this effect subscribed to
            const ctx = trackingStack[trackingStack.length - 1];
            if (ctx) {
                ctx.dependencies.forEach(sig => {
                    effectContext.subscribers.add(sig);
                });
            }
            trackingStack.pop();
            currentEffect = savedEffect;
        }
        if (firstRun && DEV_MODE) {
            firstRun = false;
            const deps = trackingStack.length > 0 ? trackingStack[trackingStack.length - 1].dependencies : new Set();
            if (deps.size === 0) {
                devWarn('Effect has no dependencies — it will only run once. Use signal.get() inside the effect to create reactive dependencies.');
            }
        }
    };
    run();
    return () => {
        if (disposed) return;
        disposed = true;
        // Unsubscribe from all signal subscribers
        effectContext.subscribers.forEach(sig => {
            if (sig._subs) sig._subs.delete(run);
        });
        effectContext.subscribers.clear();
        if (effectContext.cleanup) {
            try { effectContext.cleanup(); } catch(e) {
                devWarn('Error in effect dispose: ' + e.message);
            }
            effectContext.cleanup = null;
        }
    };
}

// --- 4. defineComponent ---
export function defineComponent(componentFn) {
    return function render(props) {
        const container = document.createElement('span');
        container.style.display = 'contents';
        let oldEl = null;

        // Set up lifecycle context
        const lifecycleCtx = { onMountCallbacks: [], onUnmountCallbacks: [] };
        const savedComponent = currentComponent;
        currentComponent = lifecycleCtx;

        const innerFn = componentFn(props);
        const newEl = innerFn();
        container.appendChild(newEl);
        oldEl = newEl;

        // Restore previous component context
        currentComponent = savedComponent;

        // Call onMount callbacks after first render
        for (var i = 0; i < lifecycleCtx.onMountCallbacks.length; i++) {
            try { lifecycleCtx.onMountCallbacks[i](); } catch(e) {
                devWarn('Error in onMount: ' + e.message);
            }
        }

        const dispose = effect(() => {
            const updatedEl = innerFn();
            diff(oldEl, updatedEl);
        });

        // Observe only the container's direct parent, not the whole body subtree
        const parentNode = container.parentNode || document.body;
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const removed of mutation.removedNodes) {
                    if (removed === container) {
                        // Call onUnmount callbacks
                        for (var j = 0; j < lifecycleCtx.onUnmountCallbacks.length; j++) {
                            try { lifecycleCtx.onUnmountCallbacks[j](); } catch(e) {
                                devWarn('Error in onUnmount: ' + e.message);
                            }
                        }
                        dispose();
                        observer.disconnect();
                        return;
                    }
                }
            }
        });
        observer.observe(parentNode, { childList: true });

        return container;
    };
}

// --- 5. Keyed DOM diff/patch ---
const NODE_KEY = Symbol('_key');

function getKey(node) {
    return node[NODE_KEY] || null;
}

function diff(oldNode, newNode) {
    if (!oldNode || !newNode) return;

    const oldKey = getKey(oldNode);
    const newKey = getKey(newNode);

    // If keys differ (or one is keyed and other isn't), replace entirely
    if (oldKey !== newKey && (oldKey !== null || newKey !== null)) {
        if (oldNode.parentNode) {
            oldNode.parentNode.replaceChild(newNode, oldNode);
        }
        return;
    }

    // Same key or both unkeyed - check tag
    if (oldNode.tagName !== newNode.tagName) {
        if (oldNode.parentNode) {
            oldNode.parentNode.replaceChild(newNode, oldNode);
        }
        return;
    }

    // Sync attributes (skip event handlers — they are on the element prototype, not attributes)
    const oldAttrs = oldNode.getAttributeNames();
    const newAttrs = newNode.getAttributeNames();
    oldAttrs.forEach(a => {
        if (!newNode.hasAttribute(a)) oldNode.removeAttribute(a);
    });
    newAttrs.forEach(a => {
        oldNode.setAttribute(a, newNode.getAttribute(a));
    });

    // Style attribute sync
    if (newNode.hasAttribute('style')) {
        const newStyle = newNode.getAttribute('style');
        if (oldNode.getAttribute('style') !== newStyle) {
            oldNode.setAttribute('style', newStyle);
        }
    } else if (oldNode.hasAttribute('style')) {
        oldNode.removeAttribute('style');
    }

    // Checkbox state sync
    if (oldNode.tagName === 'INPUT' && oldNode.type === 'checkbox') {
        if (newNode.checked !== undefined && oldNode.checked !== newNode.checked) {
            oldNode.checked = newNode.checked;
        }
    }

    // Input value sync
    if (oldNode.tagName === 'INPUT' || oldNode.tagName === 'TEXTAREA') {
        if (newNode.value !== undefined && oldNode.value !== newNode.value) {
            oldNode.value = newNode.value;
        }
    }

    // Select value sync
    if (oldNode.tagName === 'SELECT') {
        if (newNode.selectedIndex !== undefined && oldNode.selectedIndex !== newNode.selectedIndex) {
            oldNode.selectedIndex = newNode.selectedIndex;
        }
    }

    // Reconcile children
    const oldChildren = [...oldNode.childNodes];
    const newChildren = [...newNode.childNodes];

    const allKeyed = newChildren.length > 0 && newChildren.every(c => getKey(c) !== null);

    if (allKeyed && oldChildren.length > 0) {
        keyedDiff(oldNode, oldChildren, newChildren);
    } else {
        // Index-based diff
        const maxLen = Math.max(oldChildren.length, newChildren.length);
        for (let i = 0; i < maxLen; i++) {
            if (i < oldChildren.length && i < newChildren.length) {
                const oc = oldChildren[i], nc = newChildren[i];
                if (oc.nodeType === 1 && nc.nodeType === 1) diff(oc, nc);
                else if (oc.nodeType === 3 && nc.nodeType === 3) {
                    if (oc.textContent !== nc.textContent) oc.textContent = nc.textContent;
                } else {
                    oldNode.replaceChild(nc, oc);
                }
            } else if (i < newChildren.length) {
                oldNode.appendChild(newChildren[i]);
            } else {
                oldNode.removeChild(oldChildren[i]);
            }
        }
    }
}

function keyedDiff(parent, oldChildren, newChildren) {
    const oldKeyToIdx = new Map();
    const oldNodeByKey = new Map();
    for (let i = 0; i < oldChildren.length; i++) {
        const key = getKey(oldChildren[i]);
        if (key !== null) {
            oldKeyToIdx.set(key, i);
            oldNodeByKey.set(key, oldChildren[i]);
        }
    }

    const newKeys = newChildren.map(c => getKey(c));
    const oldKeysSet = new Set(oldKeyToIdx.keys());
    const newKeysSet = new Set(newKeys);

    // Remove nodes no longer present
    for (const key of oldKeysSet) {
        if (!newKeysSet.has(key)) {
            const oldNode = oldNodeByKey.get(key);
            if (oldNode && oldNode.parentNode) {
                oldNode.parentNode.removeChild(oldNode);
            }
        }
    }

    // LIS-based reorder
    const source = [];
    const newIdxToOldIdx = [];
    for (let i = 0; i < newChildren.length; i++) {
        const key = newKeys[i];
        const oldIdx = oldKeyToIdx.get(key);
        if (oldIdx !== undefined) {
            source.push(oldIdx);
            newIdxToOldIdx[i] = oldIdx;
        } else {
            source.push(-1);
            newIdxToOldIdx[i] = -1;
        }
    }

    const lis = computeLIS(source);

    let anchorIdx = 0;
    for (let i = 0; i < newChildren.length; i++) {
        const newChild = newChildren[i];
        const oldIdx = newIdxToOldIdx[i];

        if (oldIdx === -1) {
            const anchor = parent.childNodes[anchorIdx] || null;
            parent.insertBefore(newChild, anchor);
            anchorIdx++;
        } else {
            const oldChild = oldNodeByKey.get(newKeys[i]);
            diff(oldChild, newChild);

            if (source[i] === -1) continue;

            const shouldMove = !lis.includes(i);
            if (shouldMove) {
                const anchor = parent.childNodes[anchorIdx] || null;
                if (anchor !== oldChild) {
                    parent.insertBefore(oldChild, anchor);
                }
            }
            anchorIdx++;
        }
    }
}

function computeLIS(arr) {
    const positiveIndices = [];
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] >= 0) positiveIndices.push(i);
    }

    const tails = [];
    for (let i = 0; i < positiveIndices.length; i++) {
        const idx = positiveIndices[i];
        const val = arr[idx];

        let lo = 0, hi = tails.length;
        while (lo < hi) {
            const mid = Math.floor((lo + hi) / 2);
            if (arr[tails[mid]] < val) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }

        if (lo < tails.length) {
            tails[lo] = idx;
        } else {
            tails.push(idx);
        }
    }

    if (tails.length === 0) return [];

    const result = [];
    for (const t of tails) {
        result.push(positiveIndices.indexOf(t));
    }
    return result;
}

// --- 6. h (HyperScript) ---
export function h(tag, props, ...children) {
    if (typeof tag === 'function') {
        const componentProps = Object.assign({}, props || {}, { children });
        return tag(componentProps);
    }

    const el = document.createElement(tag);
    const eventListeners = [];
    const signalEffects = []; // Track effects for cleanup

    if (props) {
        Object.keys(props).forEach(key => {
            const value = props[key];
            if (key === 'className' || key === 'class') {
                if (typeof value === 'string') el.className = value;
                else if (typeof value === 'object' && value !== null) {
                    el.className = Object.entries(value).filter(([,v]) => v).map(([k]) => k).join(' ');
                }
            } else if (key.startsWith('on') && typeof value === 'function') {
                el.addEventListener(key.slice(2).toLowerCase(), value);
                eventListeners.push({ event: key.slice(2).toLowerCase(), handler: value });
            } else if (key === 'style' && typeof value === 'object' && value !== null) {
                el.style.cssText = Object.entries(value)
                    .map(([k, v]) => k.replace(/[A-Z]/g, m => '-' + m.toLowerCase()) + ': ' + v)
                    .join('; ');
            } else if (key === 'value' && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) {
                el.value = value;
            } else if (key === 'checked' && el.tagName === 'INPUT') {
                el.checked = value;
            } else if (key === 'selectedIndex' && el.tagName === 'SELECT') {
                el.selectedIndex = value;
            } else if (key === 'data-key') {
                el[NODE_KEY] = value;
            } else if (typeof value === 'object' && value !== null && value.get && !value._isTemplate) {
                // Reactive attribute (signal) - with effect tracking for cleanup
                if (key === 'value' && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
                    el.value = value.get();
                    const dispose = effect(() => {
                        const v = value.get();
                        if (document.activeElement !== el) el.value = v;
                    });
                    signalEffects.push(dispose);
                } else {
                    el.setAttribute(key, value.get());
                    const dispose = effect(() => el.setAttribute(key, value.get()));
                    signalEffects.push(dispose);
                }
            } else if (value !== undefined && value !== null && typeof value !== 'function') {
                el.setAttribute(key, value);
            }
        });
    }

    // Store event listeners and effects for potential cleanup
    if (eventListeners.length > 0) {
        el._eventListeners = eventListeners;
    }
    if (signalEffects.length > 0) {
        el._signalEffects = signalEffects;
    }

    children.flat().forEach(child => {
        if (child === null || child === undefined) return;
        if (typeof child === 'string' || typeof child === 'number') {
            el.appendChild(document.createTextNode(String(child)));
        } else if (typeof child === 'object' && child !== null && child.get && !child._isTemplate) {
            const textNode = document.createTextNode(child.get());
            el.appendChild(textNode);
            const dispose = effect(() => { textNode.textContent = child.get(); });
            // Track effect on parent element
            if (!el._signalEffects) el._signalEffects = [];
            el._signalEffects.push(dispose);
        } else if (typeof child === 'object' && child !== null && child._isTemplate) {
            const tplNode = document.createTextNode(child._resolve());
            el.appendChild(tplNode);
            const dispose = effect(() => { tplNode.textContent = child._resolve(); });
            if (!el._signalEffects) el._signalEffects = [];
            el._signalEffects.push(dispose);
        } else if (child instanceof HTMLElement || (child instanceof Element && child._isFragment)) {
            el.appendChild(child);
        }
    });

    return el;
}

// --- 7. Fragment ---
export function Fragment(props) {
    const wrapper = document.createElement('span');
    wrapper.style.display = 'contents';
    wrapper._isFragment = true;

    const children = (props && props.children) || [];
    children.flat().forEach(child => {
        if (child === null || child === undefined) return;
        if (typeof child === 'string' || typeof child === 'number') {
            wrapper.appendChild(document.createTextNode(String(child)));
        } else if (child instanceof HTMLElement || (child instanceof Element && child._isFragment)) {
            wrapper.appendChild(child);
        }
    });
    return wrapper;
}

// --- 8. Reactive template string helper ---
export function reactiveTemplate(strings, ...values) {
    return {
        _isTemplate: true,
        _resolve() {
            let result = strings[0];
            for (let i = 0; i < values.length; i++) {
                result += (typeof values[i].get === 'function') ? values[i].get() : values[i];
                result += strings[i + 1];
            }
            return result;
        }
    };
}

// --- 9. Error boundary ---
export function errorBoundary(fn) {
    return function(...args) {
        try {
            return fn(...args);
        } catch (e) {
            console.error('[Sigil] Error boundary caught:', e);
            const el = document.createElement('div');
            el.style.cssText = 'padding: 20px; background: #fee2e2; border: 1px solid #ef4444; border-radius: 8px; color: #991b1b; font-family: monospace;';
            el.textContent = 'Error: ' + (e.message || String(e));
            return el;
        }
    };
}
