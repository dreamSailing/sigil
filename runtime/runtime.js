// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

// Sigil Framework Runtime — v0.1.0

let currentEffect = null;
const trackingStack = [];

// Lifecycle hooks
let currentComponent = null;

// Batch update mechanism
let isBatching = false;
let batchQueue = [];
let batchSet = new Set();  // O(1) dedup
let batchScheduled = false;

export function batch(fn) {
    if (isBatching) {
        return fn();
    }
    
    isBatching = true;
    var prevQueue = batchQueue;
    var prevSet = batchSet;
    batchQueue = [];
    batchSet = new Set();
    
    try {
        fn();
        // Flush all queued effects, including any added during flush
        while (batchQueue.length > 0) {
            var currentQueue = batchQueue;
            batchQueue = [];
            for (var i = 0; i < currentQueue.length; i++) {
                try {
                    currentQueue[i]();
                } catch (e) {
                    devWarn('Error in batched effect: ' + e.message);
                }
            }
        }
    } finally {
        isBatching = false;
        batchQueue = prevQueue;
        batchSet = prevSet;
    }
}

function scheduleEffect(effectFn) {
    if (isBatching) {
        // O(1) dedup using Set
        if (!batchSet.has(effectFn)) {
            batchSet.add(effectFn);
            batchQueue.push(effectFn);
        }
    } else if (!batchScheduled) {
        batchScheduled = true;
        batchQueue = [effectFn];
        batchSet = new Set([effectFn]);
        queueMicrotask(function() {
            var queue = batchQueue;
            batchQueue = [];
            batchSet = new Set();
            // Flush all queued effects, including any added during flush
            while (queue.length > 0) {
                for (var i = 0; i < queue.length; i++) {
                    try {
                        queue[i]();
                    } catch (e) {
                        devWarn('Error in async effect: ' + e.message);
                    }
                }
                // Check if new effects were queued during flush
                if (batchQueue.length === 0) break;
                queue = batchQueue;
                batchQueue = [];
                batchSet = new Set();
            }
            batchScheduled = false;
        });
    } else {
        // Already scheduled, just add to queue with dedup
        if (!batchSet.has(effectFn)) {
            batchSet.add(effectFn);
            batchQueue.push(effectFn);
        }
    }
}

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
            // Use Object.is for proper NaN and -0/+0 handling
            // NaN !== NaN is true, but Object.is(NaN, NaN) is true
            // Object.is(0, -0) is false
            if (!Object.is(value, newValue)) {
                value = newValue;
                // Snapshot subscribers to avoid infinite loop when re-subscribing during notification
                var subs = Array.from(subscribers);
                for (var i = 0; i < subs.length; i++) {
                    // Skip the currently running effect to prevent re-entrancy
                    if (currentEffect && subs[i] === currentEffect.run) continue;
                    scheduleEffect(subs[i]);
                }
            }
        }
    };
    return sig;
}

// --- 2. Computed (readonly, with value-change detection) ---
export function computed(getter) {
    const result = signal();
    let isComputing = false;
    let firstRun = true;

    effect(() => {
        if (isComputing) {
            devWarn('Circular dependency detected in computed — this may cause infinite recursion');
            return;
        }
        isComputing = true;
        try {
            const newValue = getter();
            if (firstRun || !Object.is(result._last, newValue)) {
                result._last = newValue;
                result.set(newValue);
                firstRun = false;
            }
        } finally {
            isComputing = false;
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
export function effect(fn, opts) {
    const effectContext = { cleanup: null, subscribers: new Set(), _internal: opts && opts._internal };
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
            
            // Check for no dependencies warning BEFORE popping
            // Skip internal effects (used by defineComponent's reactivity loop)
            if (firstRun && DEV_MODE && !effectContext._internal) {
                firstRun = false;
                const currentCtx = trackingStack[trackingStack.length - 1];
                if (currentCtx && currentCtx.dependencies.size === 0) {
                    devWarn('Effect has no dependencies — it will only run once. Use signal.get() inside the effect to create reactive dependencies.');
                }
            }
            
            trackingStack.pop();
            currentEffect = savedEffect;
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

// --- Watch (like Vue's watch) ---
export function watch(source, callback, options) {
    options = options || {};
    const immediate = options.immediate || false;
    let oldValue;
    let getter;
    let skipFirstCallback = immediate;

    if (Array.isArray(source)) {
        getter = function() {
            return source.map(function(s) {
                return typeof s.get === 'function' ? s.get() : s;
            });
        };
    } else if (typeof source.get === 'function') {
        getter = function() { return source.get(); };
    } else if (typeof source === 'function') {
        getter = source;
    } else {
        devWarn('Invalid watch source');
        return function() {};
    }

    if (immediate) {
        oldValue = getter();
        if (callback) callback(oldValue, undefined);
    }

    return effect(function() {
        var newValue = getter();
        if (callback) {
            if (skipFirstCallback) {
                skipFirstCallback = false;
            } else {
                callback(newValue, oldValue);
            }
        }
        oldValue = newValue;
    });
}

// --- WatchEffect (like Vue's watchEffect) ---
export function watchEffect(fn, options) {
    return effect(fn);
}

// --- Ref (wrapper for signal compatibility) ---
export function ref(value) {
    var sig = signal(value);
    return {
        get value() { return sig.get(); },
        set value(v) { sig.set(v); },
        _isRef: true
    };
}

export function unref(ref) {
    return ref && ref._isRef ? ref.value : ref;
}

export function toRef(obj, key) {
    return {
        get value() { return obj[key]; },
        set value(v) { obj[key] = v; },
        _isRef: true
    };
}

export function toRefs(obj) {
    var result = {};
    Object.keys(obj).forEach(function(key) {
        result[key] = toRef(obj, key);
    });
    return result;
}

// --- Memo (cached computed) ---
export function memo(fn) {
    var cache = null;
    var hasCache = false;
    return function() {
        if (!hasCache) {
            cache = fn();
            hasCache = true;
        }
        return cache;
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
        }, { _internal: true });

        // Observe document.body with subtree:true to catch removal at any depth
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const removed of mutation.removedNodes) {
                    if (removed === container || containsNode(removed, container)) {
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
        observer.observe(document.body, { childList: true, subtree: true });

        return container;
    };
}

// --- 5. Keyed DOM diff/patch ---
function containsNode(parent, child) {
    while (child) {
        if (child === parent) return true;
        child = child.parentNode;
    }
    return false;
}

function cleanupNodeEffects(node) {
    if (node._signalEffects && Array.isArray(node._signalEffects)) {
        for (var i = 0; i < node._signalEffects.length; i++) {
            try { node._signalEffects[i](); } catch(e) {}
        }
        node._signalEffects = [];
    }
    if (node._eventListeners && Array.isArray(node._eventListeners)) {
        for (var j = 0; j < node._eventListeners.length; j++) {
            var listener = node._eventListeners[j];
            try { node.removeEventListener(listener.event, listener.handler); } catch(e) {}
        }
        node._eventListeners = [];
    }
    // Recursively clean child elements that are being replaced
    for (var k = 0; k < node.childNodes.length; k++) {
        var child = node.childNodes[k];
        if (child._signalEffects || child._eventListeners || child.nodeType === 1) {
            cleanupNodeEffects(child);
        }
    }
}

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
        // Clean up old node's effects before replacing
        cleanupNodeEffects(oldNode);
        if (oldNode.parentNode) {
            oldNode.parentNode.replaceChild(newNode, oldNode);
        }
        return;
    }

    // Same key or both unkeyed - check tag
    if (oldNode.tagName !== newNode.tagName) {
        // Clean up old node's effects before replacing
        cleanupNodeEffects(oldNode);
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

    // Sync event listeners: remove old, add new
    if (oldNode._eventListeners && Array.isArray(oldNode._eventListeners)) {
        for (var li = 0; li < oldNode._eventListeners.length; li++) {
            var oldL = oldNode._eventListeners[li];
            try { oldNode.removeEventListener(oldL.event, oldL.handler); } catch(e) {}
        }
        oldNode._eventListeners = [];
    }
    if (newNode._eventListeners && Array.isArray(newNode._eventListeners)) {
        // Copy listeners from newNode to oldNode so future diffs can clean them up
        oldNode._eventListeners = newNode._eventListeners.slice();
        for (var lj = 0; lj < oldNode._eventListeners.length; lj++) {
            var newL = oldNode._eventListeners[lj];
            try { oldNode.addEventListener(newL.event, newL.handler); } catch(e) {}
        }
    }

    // Sync signal effects: dispose old, transfer new
    if (oldNode._signalEffects && Array.isArray(oldNode._signalEffects)) {
        for (var si = 0; si < oldNode._signalEffects.length; si++) {
            try { oldNode._signalEffects[si](); } catch(e) {}
        }
        oldNode._signalEffects = [];
    }
    if (newNode._signalEffects && Array.isArray(newNode._signalEffects)) {
        oldNode._signalEffects = newNode._signalEffects.slice();
    }

    // Checkbox state sync — only sync if checked was explicitly set
    if (oldNode.tagName === 'INPUT' && oldNode.type === 'checkbox' && newNode._checkedExplicit) {
        if (oldNode.checked !== newNode.checked) {
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
                    // oc stays in DOM with its effects intact; nc is discarded
                } else {
                    cleanupNodeEffects(oc);
                    oldNode.replaceChild(nc, oc);
                }
            } else if (i < newChildren.length) {
                oldNode.appendChild(newChildren[i]);
            } else {
                cleanupNodeEffects(oldChildren[i]);
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

    // Iterate in reverse to avoid live NodeList index shifts from insertBefore/removeChild
    for (let i = newChildren.length - 1; i >= 0; i--) {
        const newChild = newChildren[i];
        const oldIdx = newIdxToOldIdx[i];

        if (oldIdx === -1) {
            // New node: insert before the next sibling (or append if last)
            const nextSibling = newChildren[i + 1];
            if (nextSibling && nextSibling.parentNode === parent) {
                parent.insertBefore(newChild, nextSibling);
            } else {
                parent.appendChild(newChild);
            }
        } else {
            const oldChild = oldNodeByKey.get(newKeys[i]);
            diff(oldChild, newChild);

            if (source[i] === -1) continue;

            const shouldMove = !lis.includes(i);
            if (shouldMove) {
                const nextSibling = newChildren[i + 1];
                if (nextSibling && nextSibling.parentNode === parent) {
                    parent.insertBefore(oldChild, nextSibling);
                } else {
                    parent.appendChild(oldChild);
                }
            }
        }
    }

    // Clean up old children that had no key (keyedDiff only processes keyed nodes)
    for (let j = 0; j < oldChildren.length; j++) {
        const oldChild = oldChildren[j];
        if (getKey(oldChild) === null && oldChild.parentNode === parent) {
            cleanupNodeEffects(oldChild);
            parent.removeChild(oldChild);
        }
    }
}

function computeLIS(arr) {
    // LIS (Longest Increasing Subsequence) - optimized O(n log n)
    // Returns indices of newChildren that are in correct relative order (don't need to move)
    const positiveIndices = [];
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] >= 0) positiveIndices.push(i);
    }

    // tails[len] = { oldIdx, newIdx } of smallest tail for increasing subsequence of length len+1
    const tails = [];
    // predecessors[i] = index in positiveIndices of predecessor element in LIS
    const predecessors = new Array(positiveIndices.length);
    // tailIndices[len] = index in positiveIndices of the tail element for length len+1
    const tailIndices = [];

    for (let i = 0; i < positiveIndices.length; i++) {
        const newIdx = positiveIndices[i];
        const oldIdx = arr[newIdx];

        let lo = 0, hi = tails.length;
        while (lo < hi) {
            const mid = Math.floor((lo + hi) / 2);
            if (tails[mid].oldIdx < oldIdx) {
                lo = mid + 1;
            } else {
                hi = mid;
            }
        }

        predecessors[i] = lo > 0 ? tailIndices[lo - 1] : -1;
        const entry = { oldIdx: oldIdx, newIdx: newIdx };
        if (lo < tails.length) {
            tails[lo] = entry;
            tailIndices[lo] = i;
        } else {
            tails.push(entry);
            tailIndices.push(i);
        }
    }

    if (tails.length === 0) return [];

    // Backtrack to reconstruct the actual LIS
    const result = [];
    let idx = tailIndices[tails.length - 1];
    while (idx !== -1) {
        result.unshift(positiveIndices[idx]);
        idx = predecessors[idx];
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
                if (typeof value === 'object' && value !== null && value.get && !value._isTemplate) {
                    el.className = value.get();
                    const dispose = effect(() => { el.className = value.get(); });
                    signalEffects.push(dispose);
                } else if (typeof value === 'string') {
                    el.className = value;
                } else if (typeof value === 'object' && value !== null) {
                    el.className = Object.entries(value).filter(([,v]) => v).map(([k]) => k).join(' ');
                }
            } else if (key.startsWith('on') && typeof value === 'function') {
                el.addEventListener(key.slice(2).toLowerCase(), value);
                eventListeners.push({ event: key.slice(2).toLowerCase(), handler: value });
            } else if (key === 'style' && typeof value === 'object' && value !== null) {
                if (typeof value.get === 'function' && !value._isTemplate) {
                    var applyStyle = function() {
                        var s = value.get();
                        if (typeof s === 'object' && s !== null) {
                            el.style.cssText = Object.entries(s)
                                .map(function(entry) { return entry[0].replace(/[A-Z]/g, function(m) { return '-' + m.toLowerCase(); }) + ': ' + entry[1]; })
                                .join('; ');
                        }
                    };
                    applyStyle();
                    const dispose = effect(applyStyle);
                    signalEffects.push(dispose);
                } else {
                    el.style.cssText = Object.entries(value)
                        .map(function(entry) { return entry[0].replace(/[A-Z]/g, function(m) { return '-' + m.toLowerCase(); }) + ': ' + entry[1]; })
                        .join('; ');
                }
            } else if (key === 'value' && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) {
                el.value = value;
            } else if (key === 'checked' && el.tagName === 'INPUT' && (el.type === 'checkbox' || el.type === 'radio')) {
                el.checked = value;
                el._checkedExplicit = true;
            } else if (key === 'selectedIndex' && el.tagName === 'SELECT') {
                el.selectedIndex = value;
            } else if (key === 'data-key') {
                el[NODE_KEY] = value;
            } else if (key === 'key') {
                el[NODE_KEY] = value;
            } else if ((key === 'ref' || key === 'data-ref') && typeof value === 'function') {
                value(el);
            } else if (typeof value === 'object' && value !== null && value.get && !value._isTemplate) {
                // Reactive attribute (signal) - with effect tracking for cleanup
                if (key === 'value' && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
                    el.value = value.get();
                    const dispose = effect(() => {
                        const v = value.get();
                        if (document.activeElement !== el) el.value = v;
                    });
                    signalEffects.push(dispose);
                } else if (key === 'value' && el.tagName === 'SELECT') {
                    el.value = value.get();
                    const dispose = effect(() => { el.value = value.get(); });
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
        } else if (child instanceof Node) {
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
    const signalEffects = [];

    const children = (props && props.children) || [];
    children.flat().forEach(child => {
        if (child === null || child === undefined) return;
        if (typeof child === 'string' || typeof child === 'number') {
            wrapper.appendChild(document.createTextNode(String(child)));
        } else if (typeof child === 'object' && child !== null && child.get && !child._isTemplate) {
            const textNode = document.createTextNode(child.get());
            wrapper.appendChild(textNode);
            const dispose = effect(() => { textNode.textContent = child.get(); });
            signalEffects.push(dispose);
        } else if (typeof child === 'object' && child !== null && child._isTemplate) {
            const tplNode = document.createTextNode(child._resolve());
            wrapper.appendChild(tplNode);
            const dispose = effect(() => { tplNode.textContent = child._resolve(); });
            signalEffects.push(dispose);
        } else if (child instanceof Node) {
            wrapper.appendChild(child);
        }
    });

    if (signalEffects.length > 0) {
        wrapper._signalEffects = signalEffects;
    }
    return wrapper;
}

// --- 8. Reactive template string helper ---
export function reactiveTemplate(strings, ...values) {
    return {
        _isTemplate: true,
        _resolve() {
            let result = strings[0];
            for (let i = 0; i < values.length; i++) {
                result += (typeof values[i].get === 'function' && !values[i]._isTemplate) ? values[i].get() : values[i];
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

// --- 10. Router ---
const routerState = {
    routes: [],
    currentPath: '',
    currentParams: {},
    listeners: new Set(),
    basePath: '',
};

function normalizePath(path) {
    return path.replace(/\/+$/, '').replace(/^([^/])/, '/$1') || '/';
}

function matchRoute(routePath, currentPath) {
    const routeParts = routePath.split('/').filter(Boolean);
    const pathParts = currentPath.split('/').filter(Boolean);

    // Handle wildcard routes
    if (routePath === '*' || routePath === '**') {
        return {}; // Match everything with empty params
    }

    if (routeParts.length !== pathParts.length) {
        // Check for catch-all wildcard (e.g., '/users/*')
        if (routeParts.length > 0 && routeParts[routeParts.length - 1] === '*') {
            const routePrefix = routeParts.slice(0, -1);
            if (routePrefix.length <= pathParts.length) {
                const params = {};
                for (let i = 0; i < routePrefix.length; i++) {
                    if (routePrefix[i].startsWith(':')) {
                        params[routePrefix[i].slice(1)] = pathParts[i];
                    } else if (routePrefix[i] !== pathParts[i]) {
                        return null;
                    }
                }
                // Capture the rest of the path
                params['*'] = pathParts.slice(routePrefix.length).join('/');
                return params;
            }
        }
        return null;
    }

    const params = {};
    for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(':')) {
            params[routeParts[i].slice(1)] = pathParts[i];
        } else if (routeParts[i] !== pathParts[i]) {
            return null;
        }
    }
    return params;
}

// Active router reference for Link/Navigate/useParams
let activeRouterState = null;

export function createRouter(options) {
    options = options || {};
    const state = {
        routes: [],
        currentPath: '',
        currentParams: {},
        listeners: new Set(),
        basePath: options.basePath || '',
    };

    return {
        addRoute(path, component) {
            state.routes.push({ path: normalizePath(path), component });
            return this;
        },
        navigate(path) {
            const fullPath = state.basePath + normalizePath(path);
            window.history.pushState({}, '', fullPath);
            state.currentPath = normalizePath(path);
            state.listeners.forEach(fn => fn(state.currentPath));
        },
        mount(container) {
            // Register as active router
            activeRouterState = state;
            state.currentPath = normalizePath(window.location.pathname.replace(state.basePath, ''));

            const popstateHandler = () => {
                state.currentPath = normalizePath(window.location.pathname.replace(state.basePath, ''));
                render();
            };

            const render = () => {
                let matched = null;
                let params = null;

                for (const route of state.routes) {
                    params = matchRoute(route.path, state.currentPath);
                    if (params !== null) {
                        matched = route.component;
                        state.currentParams = params;
                        break;
                    }
                }

                if (matched) {
                    const el = matched(params);
                    container.innerHTML = '';
                    container.appendChild(el);
                } else {
                    container.innerHTML = '';
                    const errorDiv = document.createElement('div');
                    errorDiv.style.padding = '40px';
                    errorDiv.style.textAlign = 'center';
                    const h1 = document.createElement('h1');
                    h1.textContent = '404';
                    const p = document.createElement('p');
                    p.textContent = 'Page not found';
                    errorDiv.appendChild(h1);
                    errorDiv.appendChild(p);
                    container.appendChild(errorDiv);
                }
            };

            window.addEventListener('popstate', popstateHandler);
            state.listeners.add(render);
            render();

            return () => {
                window.removeEventListener('popstate', popstateHandler);
                state.listeners.delete(render);
                if (activeRouterState === state) {
                    activeRouterState = null;
                }
            };
        }
    };
}

export function useParams() {
    return (activeRouterState || routerState).currentParams;
}

export function useQuery() {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    const result = {};
    for (const [key, value] of params) {
        result[key] = value;
    }
    return result;
}

export function Link(props, ...children) {
    const p = props || {};
    const rs = activeRouterState || routerState;
    return h('a', {
        href: rs.basePath + normalizePath(p.to),
        onClick: function(e) {
            e.preventDefault();
            if (p.onClick) p.onClick();
            const fullPath = rs.basePath + normalizePath(p.to);
            window.history.pushState({}, '', fullPath);
            rs.currentPath = normalizePath(p.to);
            rs.listeners.forEach(fn => fn(rs.currentPath));
        },
        style: p.style || '',
        className: p.className || '',
    }, ...children);
}

export function Navigate(props) {
    const p = props || {};
    const rs = activeRouterState || routerState;
    const to = p.to || '/';
    const replace = p.replace === true;

    if (replace) {
        window.history.replaceState({}, '', rs.basePath + normalizePath(to));
    } else {
        window.history.pushState({}, '', rs.basePath + normalizePath(to));
    }

    rs.currentPath = normalizePath(to);
    rs.listeners.forEach(fn => fn(rs.currentPath));

    return null;
}

// --- 11. Internationalization (i18n) ---
let activeI18nInstance = null;

function deepMerge(target, source) {
    const result = Object.assign({}, target);
    for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(target[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }
    return result;
}

function getNestedValue(obj, path) {
    if (!path) return obj;
    if (obj === null || obj === undefined) return undefined;
    return path.split('.').reduce(function(current, key) { return current && current[key]; }, obj);
}

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function createI18n(options) {
    options = options || {};
    const state = {
        locale: options.locale || 'en',
        fallbackLocale: options.fallbackLocale || 'en',
        messages: options.messages ? deepMerge({}, options.messages) : {},
        listeners: new Set(),
    };

    function t(key, params) {
        let message = getNestedValue(state.messages[state.locale], key);

        // Fallback to fallback locale
        if (!message && state.locale !== state.fallbackLocale) {
            message = getNestedValue(state.messages[state.fallbackLocale], key);
        }

        // If still not found, return the key
        if (!message) {
            return key;
        }

        // Interpolate parameters
        if (params) {
            Object.keys(params).forEach(function(paramKey) {
                message = message.replace(new RegExp('\\{' + escapeRegExp(paramKey) + '\\}', 'g'), String(params[paramKey]));
            });
        }

        return message;
    }

    const instance = {
        setLocale(locale) {
            state.locale = locale;
            state.listeners.forEach(fn => fn(locale));
        },
        getLocale() {
            return state.locale;
        },
        addMessages(locale, messages) {
            if (!state.messages[locale]) {
                state.messages[locale] = {};
            }
            state.messages[locale] = deepMerge(state.messages[locale], messages);
        },
        t: t,
        subscribe(fn) {
            state.listeners.add(fn);
            return () => state.listeners.delete(fn);
        }
    };

    activeI18nInstance = instance;
    return instance;
}

export function useTranslation() {
    return {
        t: activeI18nInstance ? activeI18nInstance.t : function(key) { return key; },
        locale: activeI18nInstance ? activeI18nInstance.getLocale() : 'en',
        setLocale: function(locale) {
            if (activeI18nInstance) activeI18nInstance.setLocale(locale);
        }
    };
}

export function Translate(props) {
    const p = props || {};
    const i18n = useTranslation();
    const text = i18n.t(p.i18nKey || p.id, p.params);
    return h('span', { style: p.style || '' }, text);
}

// --- 12. CSS-in-JS / Scoped Styles ---
const styleRegistry = new Map();
let styleCounter = 0;

function generateScopeId() {
    styleCounter++;
    return 'sigil-' + styleCounter.toString(36);
}

export function createStyleSheet(styles) {
    const scopeId = generateScopeId();
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-sigil-scope', scopeId);

    // Process styles to add scope - only wrap the entire selector, don't mangle individual characters
    const processedStyles = Object.keys(styles).map(selector => {
        const scopedSelector = '[' + scopeId + '] ' + selector;
        const rules = styles[selector];
        const cssText = Object.keys(rules).map(prop => {
            const cssProp = prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
            return cssProp + ': ' + rules[prop];
        }).join('; ');
        return scopedSelector + ' { ' + cssText + ' }';
    }).join('\n');
    
    styleEl.textContent = processedStyles;
    document.head.appendChild(styleEl);
    
    styleRegistry.set(scopeId, styleEl);
    
    return {
        scopeId,
        dispose() {
            if (styleEl.parentNode) {
                styleEl.parentNode.removeChild(styleEl);
            }
            styleRegistry.delete(scopeId);
        }
    };
}

export function withScope(scopeId, element) {
    if (element && element.setAttribute) {
        element.setAttribute(scopeId, '');
    }
    return element;
}

// Helper to create scoped styles inline
export function cssScoped(styles) {
    const scopeId = generateScopeId();
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-sigil-scope', scopeId);
    
    const cssText = Object.keys(styles).map(prop => {
        const cssProp = prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
        return cssProp + ': ' + styles[prop];
    }).join('; ');
    
    styleEl.textContent = '[data-' + scopeId + '] { ' + cssText + ' }';
    document.head.appendChild(styleEl);
    
    var attrs = {};
    attrs['data-' + scopeId] = '';
    return attrs;
}

// Keyframes helper
export function keyframes(frames) {
    const name = 'kf-' + generateScopeId();
    const styleEl = document.createElement('style');
    
    let cssText = '@keyframes ' + name + ' {\n';
    Object.keys(frames).forEach(percent => {
        cssText += '  ' + percent + ' {\n';
        Object.keys(frames[percent]).forEach(prop => {
            const cssProp = prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
            cssText += '    ' + cssProp + ': ' + frames[percent][prop] + ';\n';
        });
        cssText += '  }\n';
    });
    cssText += '}';
    
    styleEl.textContent = cssText;
    document.head.appendChild(styleEl);
    
    return name;
}

// --- 13. Utility Functions ---

// Debounce
export function debounce(fn, delay, immediate) {
    delay = delay || 300;
    var timer = null;
    var result;
    
    return function() {
        var args = arguments;
        var context = this;
        
        if (timer) clearTimeout(timer);
        
        if (immediate && !timer) {
            result = fn.apply(context, args);
        }
        
        timer = setTimeout(function() {
            timer = null;
            if (!immediate) {
                result = fn.apply(context, args);
            }
        }, delay);
        
        return result;
    };
}

// Throttle
export function throttle(fn, delay) {
    delay = delay || 300;
    var lastTime = 0;
    var timer = null;
    
    return function() {
        var args = arguments;
        var context = this;
        var now = Date.now();
        
        if (now - lastTime >= delay) {
            lastTime = now;
            return fn.apply(context, args);
        }
        
        if (!timer) {
            timer = setTimeout(function() {
                timer = null;
                lastTime = Date.now();
                fn.apply(context, args);
            }, delay - (now - lastTime));
        }
    };
}

// Deep clone
export function deepClone(obj, seen) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags);
    if (obj instanceof ArrayBuffer) return obj.slice(0);
    if (ArrayBuffer.isView(obj)) return new obj.constructor(obj);

    seen = seen || new WeakMap();
    if (seen.has(obj)) return seen.get(obj); // Return cloned reference for circular refs
    
    if (obj instanceof Map) {
        var clone = new Map();
        seen.set(obj, clone);
        obj.forEach(function(value, key) {
            clone.set(deepClone(key, seen), deepClone(value, seen));
        });
        return clone;
    }
    
    if (obj instanceof Set) {
        var clone2 = new Set();
        seen.set(obj, clone2);
        obj.forEach(function(value) {
            clone2.add(deepClone(value, seen));
        });
        return clone2;
    }
    
    var clone3 = Array.isArray(obj) ? [] : {};
    seen.set(obj, clone3);
    Object.keys(obj).forEach(function(key) {
        clone3[key] = deepClone(obj[key], seen);
    });
    return clone3;
}

// Deep equal
export function deepEqual(a, b, seen) {
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (typeof a !== typeof b) return false;
    
    // Handle Map
    if (a instanceof Map) {
        if (!(b instanceof Map) || a.size !== b.size) return false;
        seen = seen || new WeakSet();
        if (seen.has(a)) return false;
        seen.add(a);
        for (var _iterator = a.entries(), _step; !(_step = _iterator()).done; ) {
            var _step$value = _step.value,
                key = _step$value[0],
                valA = _step$value[1];
            if (!b.has(key) || !deepEqual(valA, b.get(key), seen)) return false;
        }
        return true;
    }
    
    // Handle Set
    if (a instanceof Set) {
        if (!(b instanceof Set) || a.size !== b.size) return false;
        seen = seen || new WeakSet();
        if (seen.has(a)) return false;
        seen.add(a);
        for (var _iterator2 = a.values(), _step2; !(_step2 = _iterator2()).done; ) {
            var val = _step2.value;
            var found = false;
            for (var _iterator3 = b.values(), _step3; !(_step3 = _iterator3()).done; ) {
                if (deepEqual(val, _step3.value, seen)) { found = true; break; }
            }
            if (!found) return false;
        }
        return true;
    }
    
    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) return false;
        seen = seen || new WeakSet();
        if (seen.has(a)) return false;
        seen.add(a);
        for (var i = 0; i < a.length; i++) {
            if (!deepEqual(a[i], b[i], seen)) return false;
        }
        return true;
    }
    
    if (typeof a === 'object') {
        seen = seen || new WeakSet();
        if (seen.has(a)) return false;
        seen.add(a);
        
        var keysA = Object.keys(a);
        var keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        
        for (var j = 0; j < keysA.length; j++) {
            var key = keysA[j];
            if (!(key in b) || !deepEqual(a[key], b[key], seen)) return false;
        }
        return true;
    }
    
    return false;
}

// Next tick
export function nextTick(fn) {
    return new Promise(function(resolve) {
        queueMicrotask(function() {
            if (fn) fn();
            resolve();
        });
    });
}

// Clamp
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Range
export function range(start, end, step) {
    if (end === undefined) {
        end = start;
        start = 0;
    }
    step = step || 1;
    
    var result = [];
    for (var i = start; i < end; i += step) {
        result.push(i);
    }
    return result;
}

// Unique ID generator
var idCounter = 0;
export function uniqueId(prefix) {
    idCounter++;
    return (prefix || 'id') + '-' + idCounter;
}

// Event emitter
export function createEventEmitter() {
    var listeners = {};
    
    return {
        on(event, fn) {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push(fn);
            return this;
        },
        off(event, fn) {
            if (!listeners[event]) return this;
            if (fn) {
                listeners[event] = listeners[event].filter(function(f) { return f !== fn; });
            } else {
                delete listeners[event];
            }
            return this;
        },
        emit(event) {
            var args = Array.prototype.slice.call(arguments, 1);
            if (!listeners[event]) return this;
            listeners[event].forEach(function(fn) {
                try { fn.apply(null, args); } catch(e) { devWarn('Error in event listener: ' + e.message); }
            });
            return this;
        },
        once(event, fn) {
            var self = this;
            function wrapper() {
                fn.apply(null, arguments);
                self.off(event, wrapper);
            }
            return this.on(event, wrapper);
        }
    };
}

// Form validation helper
export function createValidator(rules) {
    rules = rules || {};
    
    return {
        validate(data) {
            var errors = {};
            var isValid = true;
            
            Object.keys(rules).forEach(function(field) {
                var fieldRules = rules[field];
                var value = data[field];
                
                for (var i = 0; i < fieldRules.length; i++) {
                    var rule = fieldRules[i];
                    var error = rule.validate(value, data);
                    if (error) {
                        errors[field] = error;
                        isValid = false;
                        break;
                    }
                }
            });
            
            return { isValid: isValid, errors: errors };
        },
        addRule(field, rule) {
            if (!rules[field]) rules[field] = [];
            rules[field].push(rule);
            return this;
        }
    };
}

// Common validation rules
export var validators = {
    required: function(message) {
        return {
            validate: function(value) {
                if (value === undefined || value === null || value === '') {
                    return message || 'This field is required';
                }
                return null;
            }
        };
    },
    minLength: function(min, message) {
        return {
            validate: function(value) {
                if (value && value.length < min) {
                    return message || 'Minimum length is ' + min;
                }
                return null;
            }
        };
    },
    maxLength: function(max, message) {
        return {
            validate: function(value) {
                if (value && value.length > max) {
                    return message || 'Maximum length is ' + max;
                }
                return null;
            }
        };
    },
    pattern: function(regex, message) {
        return {
            validate: function(value) {
                if (value && !regex.test(value)) {
                    return message || 'Invalid format';
                }
                return null;
            }
        };
    },
    email: function(message) {
        return {
            validate: function(value) {
                if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    return message || 'Invalid email address';
                }
                return null;
            }
        };
    }
};
