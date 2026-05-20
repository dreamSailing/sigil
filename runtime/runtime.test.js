// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

// Runtime tests - run with: node --import ./runtime/setup-globals.js runtime/runtime.test.js

import { signal, computed, effect, h, Fragment, reactiveTemplate, errorBoundary, defineComponent, onMount, onUnmount } from './runtime.js';
import { Button, Card, Input, Badge, Avatar, Stack, Flex, Heading, Text, Divider, Stat } from './ui-testable.js';

function test_signal_get_set() {
    const s = signal(0);
    if (s.get() !== 0) throw new Error('initial value should be 0');
    s.set(5);
    if (s.get() !== 5) throw new Error('value should be 5 after set');
}

function test_signal_notifies_subscribers() {
    const s = signal(0);
    let notified = false;
    effect(() => { s.get(); notified = true; });
    if (!notified) throw new Error('effect should run immediately');
    notified = false;
    s.set(10);
    // Batch updates are now async, wait for microtask
    return Promise.resolve().then(() => {
        if (!notified) throw new Error('effect should re-run after signal change');
    });
}

function test_signal_only_notifies_on_change() {
    const s = signal(5);
    let count = 0;
    effect(() => { s.get(); count++; });
    const initial = count;
    s.set(5);
    if (count !== initial) throw new Error('effect should not re-run for same value');
    s.set(10);
    // Wait for microtask
    return Promise.resolve().then(() => {
        if (count <= initial) throw new Error('effect should re-run for different value');
    });
}

function test_computed_derives_value() {
    const a = signal(2);
    const b = signal(3);
    const sum = computed(() => a.get() + b.get());
    if (sum.get() !== 5) throw new Error('computed should be 2+3=5');
    a.set(10);
    // Wait for microtask
    return Promise.resolve().then(() => {
        if (sum.get() !== 13) throw new Error('computed should update to 10+3=13');
    });
}

function test_computed_is_readonly() {
    const s = signal(1);
    const c = computed(() => s.get() * 2);
    try {
        c.set(10);
        throw new Error('setting computed should not throw in non-dev mode');
    } catch (e) {
        if (e.message === 'setting computed should not throw in non-dev mode') throw e;
        // This is the expected error from the runtime
        if (!e.message.includes('read-only')) throw new Error('expected read-only error, got: ' + e.message);
    }
}

function test_computed_chained() {
    const base = signal(2);
    const doubled = computed(() => base.get() * 2);
    const squared = computed(() => doubled.get() * doubled.get());
    if (squared.get() !== 16) throw new Error('chained computed: 2*2*2*2=16');
    base.set(3);
    // Chained computed needs multiple microtasks to propagate
    return Promise.resolve().then(() => {
        return Promise.resolve().then(() => {
            if (squared.get() !== 36) throw new Error('chained computed after update: 3*2*3*2=36, got ' + squared.get());
        });
    });
}

function test_effect_cleanup() {
    const s = signal(0);
    let cleanupCount = 0;
    effect((onCleanup) => { s.get(); onCleanup(() => { cleanupCount++; }); });
    s.set(1);
    return Promise.resolve().then(() => {
        if (cleanupCount !== 1) throw new Error('cleanup should run on re-run: ' + cleanupCount);
    });
}

function test_effect_dispose() {
    const s = signal(0);
    let runCount = 0;
    const dispose = effect(() => { s.get(); runCount++; });
    const initial = runCount;
    dispose();
    s.set(1);
    if (runCount !== initial) throw new Error('disposed effect should not re-run, count=' + runCount + ' initial=' + initial);
}

function test_h_creates_element() {
    const el = h('div', { id: 'test' }, 'Hello');
    if (el.tagName !== 'DIV') throw new Error('tag should be DIV');
    if (el.id !== 'test') throw new Error('id should be test');
    if (el.textContent !== 'Hello') throw new Error('textContent should be Hello');
}

function test_h_with_children() {
    const el = h('div', null, h('span', null, 'A'), h('span', null, 'B'));
    if (el.childNodes.length !== 2) throw new Error('should have 2 children, got ' + el.childNodes.length);
}

function test_h_calls_component_function() {
    function MyComp(props) { return h('p', null, props.message); }
    const el = h(MyComp, { message: 'hi' });
    if (el.tagName !== 'P') throw new Error('component should return P');
    if (el.textContent !== 'hi') throw new Error('textContent should be hi');
}

function test_h_reactive_prop() {
    const s = signal('hello');
    const el = h('div', { title: s });
    if (el.getAttribute('title') !== 'hello') throw new Error('title should be hello');
    s.set('world');
    return Promise.resolve().then(() => {
        if (el.getAttribute('title') !== 'world') throw new Error('title should update to world');
    });
}

function test_h_class_name_object() {
    const el = h('div', { className: { active: true, hidden: false } });
    if (el.className !== 'active') throw new Error('className should be "active", got: ' + el.className);
}

function test_fragment_wraps_children() {
    const frag = Fragment({ children: [h('span', null, 'A'), h('span', null, 'B')] });
    if (!frag._isFragment) throw new Error('should be marked as fragment');
    if (frag.childNodes.length !== 2) throw new Error('fragment should have 2 children');
}

function test_reactive_template_resolves() {
    const count = signal(5);
    const tpl = reactiveTemplate`Count: ${count}`;
    if (tpl._resolve() !== 'Count: 5') throw new Error('template should resolve to Count: 5');
    count.set(10);
    if (tpl._resolve() !== 'Count: 10') throw new Error('template should update to Count: 10');
}

function test_error_boundary_catches() {
    function BadComp() { throw new Error('boom'); }
    const Safe = errorBoundary(BadComp);
    const el = Safe();
    if (el.tagName !== 'DIV') throw new Error('error boundary should render a div');
    if (!el.textContent.includes('Error')) throw new Error('should show error message');
}

function test_error_boundary_passes_through() {
    function GoodComp() { return h('span', null, 'OK'); }
    const Safe = errorBoundary(GoodComp);
    const el = Safe();
    if (el.tagName !== 'SPAN') throw new Error('should pass through normal render');
    if (el.textContent !== 'OK') throw new Error('textContent should be OK');
}

function test_define_component() {
    const App = defineComponent(() => {
        const count = signal(0);
        return () => h('div', null, 'Count: ' + count.get());
    });
    const el = App();
    if (!el) throw new Error('defineComponent should return an element');
}

function test_lifecycle_onMount() {
    let mounted = false;
    const App = defineComponent(() => {
        onMount(() => { mounted = true; });
        return () => h('div', null, 'Hello');
    });
    App();
    if (!mounted) throw new Error('onMount should have been called');
}

function test_lifecycle_onUnmount() {
    let unmounted = false;
    // Create a parent container and append the component
    const parent = document.createElement('div');
    document.body = parent;

    const App = defineComponent(() => {
        onUnmount(() => { unmounted = true; });
        return () => h('div', null, 'Hello');
    });
    const el = App();
    parent.appendChild(el);

    // Simulate removal
    parent.removeChild(el);

    if (!unmounted) throw new Error('onUnmount should have been called');
}

function test_lifecycle_onMount_runs_after_render() {
    let elCaptured = null;
    const App = defineComponent(() => {
        const count = signal(42);
        onMount(() => { elCaptured = count.get(); });
        return () => h('div', null, 'Count: ' + count.get());
    });
    App();
    if (elCaptured !== 42) throw new Error('onMount should run after component function, got ' + elCaptured);
}

// --- UI Component Tests ---

function test_button_creates_element() {
    const btn = Button({ variant: 'primary' }, 'Click Me');
    if (btn.tagName !== 'BUTTON') throw new Error('Button should render a button element');
    if (!btn.textContent.includes('Click Me')) throw new Error('Button should contain text');
}

function test_button_variants() {
    const variants = ['primary', 'secondary', 'danger', 'ghost', 'outline'];
    for (const v of variants) {
        const btn = Button({ variant: v }, v);
        if (btn.tagName !== 'BUTTON') throw new Error('Button variant ' + v + ' should render button');
    }
}

function test_button_disabled() {
    const btn = Button({ disabled: true }, 'Disabled');
    if (btn.getAttribute('disabled') !== 'true') throw new Error('Button should be disabled');
}

function test_card_creates_element() {
    const card = Card({ shadow: true }, 'Content');
    if (card.tagName !== 'DIV') throw new Error('Card should render a div');
    if (!card.textContent.includes('Content')) throw new Error('Card should contain text');
}

function test_card_border() {
    const card = Card({ border: true }, 'Bordered');
    if (card.tagName !== 'DIV') throw new Error('Card should render div with border');
}

function test_input_creates_element() {
    const input = Input({ placeholder: 'Enter text', type: 'text' });
    if (input.tagName !== 'INPUT') throw new Error('Input should render an input element');
    if (input.getAttribute('placeholder') !== 'Enter text') throw new Error('Input should have placeholder');
}

function test_badge_creates_element() {
    const badge = Badge({ variant: 'success' }, 'Active');
    if (badge.tagName !== 'SPAN') throw new Error('Badge should render a span');
    if (!badge.textContent.includes('Active')) throw new Error('Badge should contain text');
}

function test_avatar_creates_element() {
    const avatar = Avatar({ name: 'John Doe' });
    if (avatar.tagName !== 'DIV') throw new Error('Avatar should render a div, got ' + avatar.tagName);
    if (!avatar.textContent.includes('J')) throw new Error('Avatar should show initials');
}

function test_heading_creates_element() {
    const heading = Heading({ level: 'h1' }, 'Title');
    if (heading.tagName !== 'H1') throw new Error('Heading h1 should render h1 tag');
    if (!heading.textContent.includes('Title')) throw new Error('Heading should contain text');

    const h2 = Heading({ level: 'h2' }, 'Subtitle');
    if (h2.tagName !== 'H2') throw new Error('Heading h2 should render h2 tag');
}

function test_text_creates_element() {
    const text = Text({}, 'Hello World');
    if (text.tagName !== 'SPAN') throw new Error('Text should render a span, got ' + text.tagName);
    if (!text.textContent.includes('Hello World')) throw new Error('Text should contain text');
}

function test_divider_creates_element() {
    const divider = Divider({});
    if (divider.tagName !== 'HR') throw new Error('Divider should render hr');
}

function test_stat_creates_element() {
    const stat = Stat({ label: 'Users', value: '1,234' });
    if (stat.tagName !== 'DIV') throw new Error('Stat should render a div');
    if (!stat.textContent.includes('1,234')) throw new Error('Stat should show value');
    if (!stat.textContent.includes('Users')) throw new Error('Stat should show label');
}

function test_flex_creates_element() {
    const flex = Flex({ gap: '8px' },
        h('span', null, 'A'),
        h('span', null, 'B')
    );
    if (flex.tagName !== 'DIV') throw new Error('Flex should render a div');
    if (flex.childNodes.length < 2) throw new Error('Flex should have children');
}

function test_stack_creates_element() {
    const stack = Stack({ gap: '16px' },
        h('div', null, 'Item 1'),
        h('div', null, 'Item 2')
    );
    if (stack.tagName !== 'DIV') throw new Error('Stack should render a div');
}

const tests = [
    test_signal_get_set, test_signal_notifies_subscribers, test_signal_only_notifies_on_change,
    test_computed_derives_value, test_computed_is_readonly, test_computed_chained,
    test_effect_cleanup, test_effect_dispose,
    test_h_creates_element, test_h_with_children, test_h_calls_component_function,
    test_h_reactive_prop, test_h_class_name_object,
    test_fragment_wraps_children, test_reactive_template_resolves,
    test_error_boundary_catches, test_error_boundary_passes_through,
    test_define_component,
    test_lifecycle_onMount, test_lifecycle_onUnmount, test_lifecycle_onMount_runs_after_render,
    // UI Components
    test_button_creates_element, test_button_variants, test_button_disabled,
    test_card_creates_element, test_card_border,
    test_input_creates_element,
    test_badge_creates_element,
    test_avatar_creates_element,
    test_heading_creates_element,
    test_text_creates_element,
    test_divider_creates_element,
    test_stat_creates_element,
    test_flex_creates_element,
    test_stack_creates_element,
];

let passed = 0, failed = 0;
console.log('\nRuntime Tests:');

function runTests(tests, index) {
    if (index >= tests.length) {
        console.log('\n' + passed + ' passed, ' + failed + ' failed');
        if (failed > 0) process.exit(1);
        return;
    }
    
    var test = tests[index];
    try {
        var result = test();
        
        // Check if test returned a promise
        if (result && typeof result.then === 'function') {
            result.then(function() {
                console.log('  ✓ ' + test.name);
                passed++;
                runTests(tests, index + 1);
            }).catch(function(e) {
                console.error('  ✗ ' + test.name + ': ' + e.message);
                failed++;
                runTests(tests, index + 1);
            });
        } else {
            console.log('  ✓ ' + test.name);
            passed++;
            runTests(tests, index + 1);
        }
    } catch (e) {
        console.error('  ✗ ' + test.name + ': ' + e.message);
        failed++;
        runTests(tests, index + 1);
    }
}

runTests(tests, 0);
