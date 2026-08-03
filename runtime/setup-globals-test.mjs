// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

// Test setup - mock /@runtime import for Node.js testing
import fs from 'node:fs';
import * as runtime from './runtime.js';

// Create a mock UI module that imports h from runtime instead of /@runtime
const mockUI = `
// Mock UI components for testing - imports h from runtime module
${
    // Read ui.js and replace the framework runtime entry with the local test runtime.
    fs.readFileSync(new URL('./ui.js', import.meta.url), 'utf-8')
        .replace(
            /from '\/@runtime';/,
            "from './runtime.js';"
        )
}
`;

// Write temporary testable UI file
fs.writeFileSync(
    new URL('./ui-testable-temp.js', import.meta.url),
    mockUI
);

// Export runtime for tests
globalThis.signal = runtime.signal;
globalThis.computed = runtime.computed;
globalThis.effect = runtime.effect;
globalThis.h = runtime.h;
globalThis.defineComponent = runtime.defineComponent;
globalThis.onMount = runtime.onMount;
globalThis.onUnmount = runtime.onUnmount;
globalThis.Fragment = runtime.Fragment;
globalThis.reactiveTemplate = runtime.reactiveTemplate;
globalThis.errorBoundary = runtime.errorBoundary;

console.log('Test setup complete - runtime globals available');
