// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

// Sigil Framework — Type Declarations
// Include this file in your tsconfig.json "types" or reference it at the top of your entry file:
// /// <reference path="./types.d.ts" />

declare global {
    /**
     * Create a reactive signal.
     * @param initialValue - The initial value of the signal
     * @example
     * ```ts
     * const count = signal(0);
     * count.get(); // => 0
     * count.set(5);
     * ```
     */
    function signal<T>(initialValue?: T): {
        get(): T;
        set(value: T): void;
    };

    /**
     * Create a computed (read-only derived) value.
     * Automatically tracks signal dependencies.
     * @param getter - Function that returns the computed value
     * @example
     * ```ts
     * const count = signal(0);
     * const doubled = computed(() => count.get() * 2);
     * doubled.get(); // => 0
     * ```
     */
    function computed<T>(getter: () => T): {
        get(): T;
    };

    /**
     * Create a side effect that automatically re-runs when its signal dependencies change.
     * @param fn - Effect function. Return a cleanup function to dispose.
     * @returns Dispose function
     * @example
     * ```ts
     * effect(() => {
     *   console.log('Count:', count.get());
     * });
     *
     * effect(() => {
     *   const timer = setInterval(() => {}, 1000);
     *   return () => clearInterval(timer);
     * });
     * ```
     */
    function effect(fn: (onCleanup: (fn: () => void) => void) => void | (() => void)): () => void;

    /**
     * Define a reactive component.
     * @param componentFn - Function that returns a render function
     * @example
     * ```ts
     * const App = defineComponent(() => {
     *   const count = signal(0);
     *   return () => h('div', {}, 'Count: ' + count.get());
     * });
     * document.body.appendChild(App());
     * ```
     */
    function defineComponent<P = Record<string, any>>(
        componentFn: (props?: P) => () => HTMLElement
    ): (props?: P) => HTMLElement;

    /**
     * HyperScript function — create DOM elements or call components.
     * @param tag - HTML tag name (string) or component function
     * @param props - Element attributes/properties (optional)
     * @param children - Child elements/text
     * @example
     * ```ts
     * h('div', { style: 'color: red;' }, 'Hello');
     * h(Button, { variant: 'primary' }, 'Click');
     * ```
     */
    function h(
        tag: string | ((props: any) => HTMLElement),
        props?: Record<string, any> | null,
        ...children: (string | number | HTMLElement | null | undefined)[]
    ): HTMLElement;

    /**
     * Fragment component — wraps children without adding a DOM element.
     */
    function Fragment(props: { children?: any[] }): HTMLElement;

    /**
     * Reactive template string — creates a reactive text node from a template literal.
     * @example
     * ```ts
     * reactiveTemplate`Count: ${count}`
     * ```
     */
    function reactiveTemplate(
        strings: TemplateStringsArray,
        ...values: any[]
    ): { _isTemplate: true; _resolve(): string };

    /**
     * Error boundary — wraps a component and catches runtime errors.
     */
    function errorBoundary<P = Record<string, any>>(
        fn: (props?: P) => HTMLElement
    ): (props?: P) => HTMLElement;

    /**
     * Register a callback to run after the component is mounted to the DOM.
     * Must be called inside a defineComponent or component function.
     * @example
     * ```ts
     * onMount(() => {
     *   console.log('Component mounted!');
     *   const timer = setInterval(fetchData, 5000);
     *   onUnmount(() => clearInterval(timer));
     * });
     * ```
     */
    function onMount(fn: () => void): void;

    /**
     * Register a callback to run when the component is removed from the DOM.
     * Must be called inside a defineComponent or component function.
     * @example
     * ```ts
     * onUnmount(() => {
     *   console.log('Component unmounted!');
     * });
     * ```
     */
    function onUnmount(fn: () => void): void;
}

// SigUI Components
declare module '/@ui' {
    export interface ButtonProps {
        variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
        size?: 'sm' | 'md' | 'lg';
        disabled?: boolean;
        onClick?: () => void;
        style?: string | Record<string, string>;
    }
    export function Button(props: ButtonProps, ...children: any[]): HTMLElement;

    export interface InputProps {
        type?: string;
        value?: string;
        placeholder?: string;
        onChange?: (e: Event) => void;
        onInput?: (e: Event) => void;
        style?: string | Record<string, string>;
    }
    export function Input(props: InputProps): HTMLElement;

    export interface TextareaProps {
        value?: string;
        placeholder?: string;
        rows?: string | number;
        resize?: 'both' | 'vertical' | 'horizontal' | 'none';
        minHeight?: string;
        onChange?: (e: Event) => void;
        onInput?: (e: Event) => void;
        style?: string | Record<string, string>;
    }
    export function Textarea(props: TextareaProps): HTMLElement;

    export interface CardProps {
        border?: boolean;
        shadow?: boolean;
        bg?: string;
        radius?: string;
        padding?: string;
        style?: string | Record<string, string>;
    }
    export function Card(props: CardProps, ...children: any[]): HTMLElement;

    export interface BadgeProps {
        variant?: 'default' | 'success' | 'danger' | 'warning' | 'info';
        style?: string | Record<string, string>;
    }
    export function Badge(props: BadgeProps, ...children: any[]): HTMLElement;

    export interface AvatarProps {
        name?: string;
        size?: 'sm' | 'md' | 'lg' | string;
        color?: string;
        style?: string | Record<string, string>;
    }
    export function Avatar(props: AvatarProps): HTMLElement;

    export interface StatProps {
        label?: string;
        value?: string | number;
        accent?: string;
        style?: string | Record<string, string>;
    }
    export function Stat(props: StatProps): HTMLElement;

    export interface FlexProps {
        direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
        align?: string;
        justify?: string;
        gap?: string;
        wrap?: string;
        style?: string | Record<string, string>;
    }
    export function Flex(props: FlexProps, ...children: any[]): HTMLElement;

    export interface GridProps {
        cols?: number;
        gap?: string;
        responsive?: boolean;
        style?: string | Record<string, string>;
    }
    export function Grid(props: GridProps, ...children: any[]): HTMLElement;

    export interface ContainerProps {
        maxWidth?: string;
        padding?: string;
        style?: string | Record<string, string>;
    }
    export function Container(props: ContainerProps, ...children: any[]): HTMLElement;

    export interface StackProps {
        gap?: string;
        style?: string | Record<string, string>;
    }
    export function Stack(props: StackProps, ...children: any[]): HTMLElement;

    export interface HeadingProps {
        level?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
        color?: string;
        tight?: boolean;
        style?: string | Record<string, string>;
    }
    export function Heading(props: HeadingProps, ...children: any[]): HTMLElement;

    export interface TextProps {
        size?: string;
        bold?: boolean;
        color?: string;
        style?: string | Record<string, string>;
    }
    export function Text(props: TextProps, ...children: any[]): HTMLElement;

    export interface CheckboxProps {
        checked?: boolean;
        label?: string;
        onChange?: (e: Event) => void;
        style?: string | Record<string, string>;
    }
    export function Checkbox(props: CheckboxProps): HTMLElement;

    export interface DividerProps {
        margin?: string;
        style?: string | Record<string, string>;
    }
    export function Divider(props: DividerProps): HTMLElement;

    export interface EmptyStateProps {
        title?: string;
        description?: string;
        style?: string | Record<string, string>;
    }
    export function EmptyState(props: EmptyStateProps, ...children: any[]): HTMLElement;

    export interface SearchInputProps {
        placeholder?: string;
        value?: string;
        onInput?: (e: Event) => void;
        style?: string | Record<string, string>;
    }
    export function SearchInput(props: SearchInputProps): HTMLElement;

    export interface TableProps {
        style?: string | Record<string, string>;
    }
    export function Table(props: TableProps, ...children: any[]): HTMLElement;
    export function TableHeader(props: any, ...children: any[]): HTMLElement;
    export function TableBody(props: any, ...children: any[]): HTMLElement;
    export function TableRow(props: any, ...children: any[]): HTMLElement;

    export interface SeparatorProps {
        style?: string | Record<string, string>;
    }
    export function Separator(props: SeparatorProps, ...children: any[]): HTMLElement;

    export interface TabsProps {
        tabs?: Array<{ label: string; content?: any }>;
        active?: number | string;
        onChange?: (index: number) => void;
        style?: string | Record<string, string>;
    }
    export function Tabs(props: TabsProps): HTMLElement;

    export interface TooltipProps {
        text?: string;
        tooltipStyle?: string | Record<string, string>;
        style?: string | Record<string, string>;
    }
    export function Tooltip(props: TooltipProps, ...children: any[]): HTMLElement;

    export interface ModalProps {
        open?: boolean;
        onClose?: () => void;
        maxWidth?: string;
        padding?: string;
        style?: string | Record<string, string>;
    }
    export function Modal(props: ModalProps, ...children: any[]): HTMLElement;

    export interface SelectProps {
        options?: Array<string | { label: string; value: string }>;
        value?: string;
        onChange?: (e: Event) => void;
        width?: string;
        style?: string | Record<string, string>;
    }
    export function Select(props: SelectProps): HTMLElement;

    export interface PaginationProps {
        page?: number;
        total?: number;
        maxVisible?: number;
        align?: string;
        onChange?: (page: number) => void;
        style?: string | Record<string, string>;
    }
    export function Pagination(props: PaginationProps): HTMLElement;

    export interface ToastOptions {
        variant?: 'success' | 'danger' | 'warning' | 'info';
        duration?: number;
    }
    export function showToast(message: string, opts?: ToastOptions): void;
}

export {};
