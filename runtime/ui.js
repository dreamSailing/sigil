// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

// Sigil UI Component Library — v0.1.0
// Headless + inline styles, zero external dependencies

import { h, signal, computed, effect, onMount, onUnmount, range } from '/@runtime';

// --- Theme ---
const theme = {
    colors: {
        primary: '#3b82f6',
        primaryHover: '#2563eb',
        danger: '#ef4444',
        dangerHover: '#dc2626',
        success: '#22c55e',
        warning: '#f59e0b',
        gray: { 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827' },
        white: '#ffffff',
        black: '#000000',
    },
    radii: { sm: '6px', md: '8px', lg: '12px', full: '9999px' },
    shadows: { sm: '0 1px 2px rgba(0,0,0,0.05)', md: '0 4px 6px -1px rgba(0,0,0,0.1)', lg: '0 10px 15px -3px rgba(0,0,0,0.1)' },
    fontSizes: { xs: '12px', sm: '14px', base: '16px', lg: '18px', xl: '20px', '2xl': '24px', '3xl': '30px', '4xl': '36px' },
    fontWeights: { normal: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800' },
    spacing: { 0: '0', 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px', 8: '32px', 10: '40px', 12: '48px', 16: '64px' },
};

function css(obj) {
    return Object.entries(obj).map(([k, v]) => {
        const prop = k.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
        return prop + ': ' + v;
    }).join('; ');
}

// --- Global styles ---
(function injectGlobalStyles() {
    if (document.getElementById('sigil-global')) return;
    const style = document.createElement('style');
    style.id = 'sigil-global';
    const bg = theme.colors.gray[50];
    const fg = theme.colors.gray[900];
    style.textContent = [
        '*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }',
        'body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; color: ' + fg + '; background: ' + bg + '; line-height: 1.5; }',
        'input, button, textarea, select { font: inherit; }',
        'button { cursor: pointer; border: none; outline: none; }',
        '@media (max-width: 640px) { .sigil-responsive-grid { grid-template-columns: 1fr !important; } }',
        '@media (max-width: 768px) { .sigil-responsive-flex { flex-direction: column !important; gap: ' + theme.spacing[3] + ' !important; } }',
        '@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }',
    ].join('\n');
    document.head.appendChild(style);
})();

// --- Layout ---
export function Container(props, ...children) {
    const p = props || {};
    const maxWidth = p.maxWidth || '1200px';
    return h('div', { style: css({ maxWidth: maxWidth, margin: '0 auto', padding: p.padding || (theme.spacing[6] + ' ' + theme.spacing[4]) }) }, ...children);
}

export function Flex(props, ...children) {
    const p = props || {};
    return h('div', { style: css(mergeStyle({ display: 'flex', flexDirection: p.direction || 'row', alignItems: p.align || 'stretch', justifyContent: p.justify || 'flex-start', gap: p.gap || '0', flexWrap: p.wrap || 'nowrap' }, p.style)) }, ...children);
}

function mergeStyle(base, extra) {
    const result = Object.assign({}, base);
    if (extra && typeof extra === 'object') Object.assign(result, extra);
    return result;
}

export function Grid(props, ...children) {
    const p = props || {};
    const cols = Math.max(1, p.cols || 3);
    const responsive = p.responsive !== false;
    const templateCols = responsive
        ? 'repeat(auto-fill, minmax(min(calc(100% / ' + cols + '), 280px), 1fr))'
        : 'repeat(' + cols + ', 1fr)';
    return h('div', {
        className: responsive ? 'sigil-responsive-grid' : undefined,
        style: css(mergeStyle({ display: 'grid', gridTemplateColumns: templateCols, gap: p.gap || theme.spacing[6] }, p.style))
    }, ...children);
}

export function Stack(props, ...children) {
    const p = props || {};
    return h('div', { style: css(mergeStyle({ display: 'flex', flexDirection: 'column', gap: p.gap || theme.spacing[4] }, p.style)) }, ...children);
}

// --- Typography ---
export function Heading(props, ...children) {
    const p = props || {};
    const level = p.level || 'h1';
    const sizeMap = { h1: theme.fontSizes['4xl'], h2: theme.fontSizes['3xl'], h3: theme.fontSizes['2xl'], h4: theme.fontSizes.xl, h5: theme.fontSizes.lg, h6: theme.fontSizes.base };
    const weightMap = { h1: theme.fontWeights.extrabold, h2: theme.fontWeights.extrabold, h3: theme.fontWeights.bold, h4: theme.fontWeights.semibold, h5: theme.fontWeights.semibold, h6: theme.fontWeights.medium };
    return h(level, { style: css(mergeStyle({ fontSize: sizeMap[level] || theme.fontSizes.base, fontWeight: weightMap[level] || theme.fontWeights.normal, color: p.color || theme.colors.gray[900], letterSpacing: p.tight ? '-0.025em' : 'normal' }, p.style)) }, ...children);
}

export function Text(props, ...children) {
    const p = props || {};
    return h('span', { style: css(mergeStyle({ fontSize: p.size || theme.fontSizes.base, fontWeight: p.bold ? theme.fontWeights.bold : theme.fontWeights.normal, color: p.color || theme.colors.gray[600] }, p.style)) }, ...children);
}

// --- Card ---
export function Card(props, ...children) {
    const p = props || {};
    const borderStyle = p.border ? ('1px solid ' + theme.colors.gray[200]) : 'none';
    const shadowStyle = p.shadow !== false ? theme.shadows.md : 'none';
    return h('div', { style: css(mergeStyle({ background: p.bg || theme.colors.white, borderRadius: p.radius || theme.radii.lg, boxShadow: shadowStyle, border: borderStyle, padding: p.padding || theme.spacing[6] }, p.style)) }, ...children);
}

// --- Button ---
export function Button(props, ...children) {
    const p = props || {};
    const variant = p.variant || 'primary';
    const size = p.size || 'md';
    const sizes = {
        sm: { fontSize: theme.fontSizes.sm, padding: theme.spacing[1] + ' ' + theme.spacing[3] },
        md: { fontSize: theme.fontSizes.base, padding: theme.spacing[2] + ' ' + theme.spacing[4] },
        lg: { fontSize: theme.fontSizes.lg, padding: theme.spacing[3] + ' ' + theme.spacing[6] },
    };
    const variantStyles = {
        primary: { background: theme.colors.primary, color: theme.colors.white },
        secondary: { background: theme.colors.gray[100], color: theme.colors.gray[700] },
        danger: { background: theme.colors.danger, color: theme.colors.white },
        ghost: { background: 'transparent', color: theme.colors.gray[700] },
        outline: { background: 'transparent', color: theme.colors.primary, border: '1px solid ' + theme.colors.primary },
    };
    const hoverStyles = {
        primary: { background: theme.colors.primaryHover },
        secondary: { background: theme.colors.gray[200] },
        danger: { background: theme.colors.dangerHover },
        ghost: { background: theme.colors.gray[100] },
        outline: { background: theme.colors.primary + '22' },
    };
    const baseStyle = {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: theme.fontWeights.medium, borderRadius: theme.radii.md,
        transition: 'all 0.15s ease', border: 'none',
        cursor: p.disabled ? 'not-allowed' : 'pointer',
        opacity: p.disabled ? 0.6 : 1,
    };
    const currentVariant = variantStyles[variant] || variantStyles.primary;
    const currentHover = hoverStyles[variant] || hoverStyles.primary;
    const fullStyle = mergeStyle(mergeStyle(baseStyle, sizes[size] || sizes.md), currentVariant);

    return h('button', Object.assign({}, fullStyle, p.style, {
        disabled: p.disabled || undefined,
        onMouseEnter: function(e) { Object.assign(e.target.style, currentHover); },
        onMouseLeave: function(e) { Object.assign(e.target.style, fullStyle); },
    }), ...children);
}

// --- Input ---
export function Input(props) {
    var p = props || {};
    var inputProps = {
        type: p.type || 'text',
        style: css(mergeStyle({
            width: '100%', padding: theme.spacing[3] + ' ' + theme.spacing[4],
            border: '1px solid ' + theme.colors.gray[300], borderRadius: theme.radii.md,
            fontSize: theme.fontSizes.base, color: theme.colors.gray[900],
            background: theme.colors.white, outline: 'none',
        }, typeof p.style === 'object' ? p.style : {})),
    };
    var keys = Object.keys(p);
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (k !== 'style' && k !== 'type') {
            inputProps[k] = p[k];
        }
    }
    return h('input', inputProps);
}

// --- Textarea ---
export function Textarea(props) {
    var p = props || {};
    var textareaProps = {
        style: css(mergeStyle({
            width: '100%', padding: theme.spacing[3] + ' ' + theme.spacing[4],
            border: '1px solid ' + theme.colors.gray[300], borderRadius: theme.radii.md,
            fontSize: theme.fontSizes.base, color: theme.colors.gray[900],
            background: theme.colors.white, outline: 'none',
            fontFamily: 'inherit', resize: p.resize || 'vertical',
            minHeight: p.minHeight || '80px',
        }, typeof p.style === 'object' ? p.style : {})),
    };
    var keys = Object.keys(p);
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (k !== 'style' && k !== 'resize' && k !== 'minHeight') {
            textareaProps[k] = p[k];
        }
    }
    return h('textarea', textareaProps);
}

// --- Badge ---
export function Badge(props, ...children) {
    const p = props || {};
    const variant = p.variant || 'default';
    const colorMap = {
        default: { bg: theme.colors.gray[100], color: theme.colors.gray[700] },
        success: { bg: '#dcfce7', color: '#166534' },
        danger: { bg: '#fee2e2', color: '#991b1b' },
        warning: { bg: '#fef3c7', color: '#92400e' },
        info: { bg: '#dbeafe', color: '#1e40af' },
    };
    const c = colorMap[variant] || colorMap.default;
    return h('span', { style: css(mergeStyle({ display: 'inline-flex', alignItems: 'center', padding: theme.spacing[1] + ' ' + theme.spacing[3], borderRadius: theme.radii.full, fontSize: theme.fontSizes.xs, fontWeight: theme.fontWeights.bold, background: c.bg, color: c.color, letterSpacing: '0.05em', textTransform: 'uppercase' }, p.style)) }, ...children);
}

// --- Avatar ---
export function Avatar(props) {
    const p = props || {};
    const name = (typeof p.name === 'string' && p.name) || '?';
    const size = p.size || 'md';
    const sizeMap = { sm: '32px', md: '40px', lg: '56px' };
    const fontSizeMap = { sm: theme.fontSizes.sm, md: theme.fontSizes.base, lg: theme.fontSizes.xl };
    const s = sizeMap[size] || sizeMap.md;
    return h('div', { style: css(mergeStyle({
        width: s, height: s, borderRadius: '50%',
        background: p.color || theme.colors.gray[200],
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: fontSizeMap[size] || fontSizeMap.md, fontWeight: theme.fontWeights.bold,
        color: theme.colors.gray[600], flexShrink: '0',
    }, p.style)) }, name.charAt(0).toUpperCase());
}

// --- Table ---
export function Table(props, ...children) {
    const p = props || {};
    return h('div', { style: css(mergeStyle({ width: '100%', overflow: 'hidden' }, p.style)) }, ...children);
}

export function TableHeader(props, ...children) {
    const p = props || {};
    return h('div', { style: css(mergeStyle({ padding: theme.spacing[4], background: theme.colors.gray[50], borderBottom: '1px solid ' + theme.colors.gray[200], fontSize: theme.fontSizes.xs, fontWeight: theme.fontWeights.bold, color: theme.colors.gray[500], textTransform: 'uppercase', letterSpacing: '0.05em' }, p.style)) }, ...children);
}

export function TableRow(props, ...children) {
    const p = props || {};
    return h('div', { style: css(mergeStyle({ display: 'flex', alignItems: 'center', padding: theme.spacing[4], borderBottom: '1px solid ' + theme.colors.gray[100] }, p.style)) }, ...children);
}

export function TableBody(props, ...children) {
    const p = props || {};
    return h('div', { style: css(p.style || {}) }, ...children);
}

// --- Stat ---
export function Stat(props) {
    var p = props || {};
    var valueText = p.value;
    if (valueText && typeof valueText.get === 'function') {
        valueText = valueText.get();
    }
    return h('div', { style: css({
        background: theme.colors.white, borderRadius: theme.radii.lg,
        boxShadow: theme.shadows.sm, border: 'none', padding: theme.spacing[5],
        borderLeft: '4px solid ' + (p.accent || theme.colors.primary),
    }) },
        h('div', { style: css({ fontSize: theme.fontSizes.sm, color: theme.colors.gray[500], fontWeight: theme.fontWeights.bold, textTransform: 'uppercase', letterSpacing: '0.05em' }) }, p.label || ''),
        h('div', { style: css({ fontSize: theme.fontSizes['3xl'], fontWeight: theme.fontWeights.extrabold, color: theme.colors.gray[900], marginTop: theme.spacing[2] }) }, String(valueText !== undefined && valueText !== null ? valueText : ''))
    );
}

// --- Checkbox ---
export function Checkbox(props) {
    var p = props || {};
    var labelProps = mergeStyle({
        style: css({ display: 'inline-flex', alignItems: 'center', gap: theme.spacing[2], cursor: 'pointer', fontSize: theme.fontSizes.sm, fontWeight: theme.fontWeights.medium, color: theme.colors.gray[600], userSelect: 'none' })
    }, p.style || {});
    return h('label', labelProps,
        h('input', { type: 'checkbox', checked: p.checked || false, onChange: p.onChange, style: css({ width: '16px', height: '16px', accentColor: theme.colors.primary, cursor: 'pointer' }) }),
        p.label || ''
    );
}

// --- Divider ---
export function Divider(props) {
    const p = props || {};
    return h('hr', { style: css({ border: 'none', borderTop: '1px solid ' + theme.colors.gray[200], margin: p.margin || (theme.spacing[6] + ' 0') }) });
}

// --- Separator ---
export function Separator(props, ...children) {
    const p = props || {};
    return h('div', { style: css(mergeStyle({ display: 'flex', alignItems: 'center', gap: theme.spacing[3] }, p.style)) }, ...children);
}

// --- EmptyState ---
export function EmptyState(props, ...children) {
    const p = props || {};
    return h('div', { style: css(mergeStyle({ textAlign: 'center', padding: theme.spacing[12] + ' ' + theme.spacing[6], color: theme.colors.gray[400] }, p.style)) }, ...children);
}

// --- SearchInput ---
export function SearchInput(props) {
    var p = props || {};
    var inputProps = {
        type: 'text',
        placeholder: p.placeholder || 'Search...',
        style: css({
            width: '100%', padding: theme.spacing[3] + ' ' + theme.spacing[4] + ' ' + theme.spacing[3] + ' ' + theme.spacing[10],
            border: '1px solid ' + theme.colors.gray[300], borderRadius: theme.radii.md,
            fontSize: theme.fontSizes.base, color: theme.colors.gray[900],
            background: theme.colors.white, outline: 'none',
        }),
    };
    // Merge additional props
    var keys = Object.keys(p);
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (k !== 'style' && k !== 'placeholder' && k !== 'type') {
            inputProps[k] = p[k];
        }
    }
    return h('div', { style: css({ position: 'relative' }, p.style || {}) },
        h('input', inputProps),
        h('span', { style: css({ position: 'absolute', left: theme.spacing[3], top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: theme.colors.gray[400], pointerEvents: 'none' }) }, '\u{1F50D}')
    );
}

// --- Modal ---
export function Modal(props, ...children) {
    const p = props || {};
    if (p.open === false) return null;
    return h('div', { style: css({
        position: 'fixed', inset: '0', zIndex: '50',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.5)',
    }) },
        h('div', { style: css(mergeStyle({
            background: theme.colors.white, borderRadius: theme.radii.lg,
            boxShadow: theme.shadows.lg, maxWidth: p.maxWidth || '512px',
            width: '90%', maxHeight: '80vh', overflow: 'auto',
            padding: p.padding || theme.spacing[6],
            position: 'relative',
        }, p.style)) },
            h('button', {
                onClick: p.onClose,
                style: css({
                    position: 'absolute', top: theme.spacing[3], right: theme.spacing[3],
                    background: 'transparent', fontSize: '20px', color: theme.colors.gray[400],
                    lineHeight: '1', padding: theme.spacing[1], borderRadius: theme.radii.sm,
                }),
            }, String.fromCharCode(215)),
            ...children
        )
    );
}

// --- Toast ---
var toastContainer = null;
function getToastContainer() {
    if (!toastContainer) {
        toastContainer = h('div', { style: css({
            position: 'fixed', top: theme.spacing[6], right: theme.spacing[6],
            zIndex: '60', display: 'flex', flexDirection: 'column', gap: theme.spacing[3],
        }) });
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
}

export function showToast(message, opts) {
    opts = opts || {};
    var variant = opts.variant || 'info';
    var duration = opts.duration || 3000;
    var colorMap = {
        success: { bg: '#dcfce7', border: '#22c55e', color: '#166534' },
        danger: { bg: '#fee2e2', border: '#ef4444', color: '#991b1b' },
        warning: { bg: '#fef3c7', border: '#f59e0b', color: '#92400e' },
        info: { bg: '#dbeafe', border: '#3b82f6', color: '#1e40af' },
    };
    var c = colorMap[variant] || colorMap.info;
    var toast = h('div', { style: css({
        background: c.bg, borderLeft: '4px solid ' + c.border,
        borderRadius: theme.radii.md, padding: theme.spacing[3] + ' ' + theme.spacing[4],
        color: c.color, fontSize: theme.fontSizes.sm, fontWeight: theme.fontWeights.medium,
        boxShadow: theme.shadows.md, minWidth: '280px', maxWidth: '400px',
    }) }, message);
    getToastContainer().appendChild(toast);
    setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.2s';
        setTimeout(function() { toast.remove(); }, 200);
    }, duration);
}

// --- Tooltip ---
export function Tooltip(props, ...children) {
    var p = props || {};
    var tip = h('span', { style: css(mergeStyle({
        position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
        background: theme.colors.gray[900], color: theme.colors.white,
        padding: theme.spacing[1] + ' ' + theme.spacing[3], borderRadius: theme.radii.sm,
        fontSize: theme.fontSizes.xs, whiteSpace: 'nowrap', zIndex: '40',
        pointerEvents: 'none', opacity: '0', transition: 'opacity 0.15s',
    }, p.tooltipStyle)) }, p.text || '');
    return h('div', mergeStyle({
        style: css({ position: 'relative', display: 'inline-block', cursor: 'pointer' }),
        onMouseEnter: function() { tip.style.opacity = '1'; },
        onMouseLeave: function() { tip.style.opacity = '0'; },
    }, p.style || {}), ...children, tip);
}

// --- Tabs ---
export function Tabs(props) {
    var p = props || {};
    var tabs = p.tabs || [];
    if (tabs.length === 0) return null;
    var active = Math.max(0, Math.min(tabs.length - 1, p.active !== undefined ? p.active : 0));
    var onTabChange = p.onChange || function() {};
    return h('div', { style: css(p.style || {}) },
        h('div', { style: css({ display: 'flex', borderBottom: '2px solid ' + theme.colors.gray[200] }) },
            tabs.map(function(tab, i) {
                var label = typeof tab === 'string' ? tab : (tab.label || '');
                var isActive = i === active;
                return h('button', {
                    onClick: function() { onTabChange(i); },
                    style: css({
                        padding: theme.spacing[3] + ' ' + theme.spacing[5],
                        fontSize: theme.fontSizes.sm, fontWeight: isActive ? theme.fontWeights.bold : theme.fontWeights.medium,
                        color: isActive ? theme.colors.primary : theme.colors.gray[500],
                        borderBottom: isActive ? ('2px solid ' + theme.colors.primary) : '2px solid transparent',
                        marginBottom: '-2px', background: 'transparent', cursor: 'pointer',
                    }),
                }, label);
            })
        ),
        h('div', { style: css({ padding: theme.spacing[4] + ' 0' }) },
            (tabs[active] && tabs[active].content) || null
        )
    );
}

// --- Select ---
export function Select(props) {
    var p = props || {};
    var options = p.options || [];
    var selectProps = {
        style: css({
            width: p.width || '100%', padding: theme.spacing[3] + ' ' + theme.spacing[4],
            border: '1px solid ' + theme.colors.gray[300], borderRadius: theme.radii.md,
            fontSize: theme.fontSizes.base, color: theme.colors.gray[900],
            background: theme.colors.white, outline: 'none', cursor: 'pointer',
        }),
    };
    // Merge only valid HTML attributes, exclude component-specific props
    var keys = Object.keys(p);
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (k !== 'style' && k !== 'options' && k !== 'width' && !k.startsWith('on')) {
            selectProps[k] = p[k];
        } else if (k.startsWith('on') && typeof p[k] === 'function') {
            selectProps[k] = p[k];
        }
    }
    return h('select', selectProps,
        options.map(function(opt) {
            var val = typeof opt === 'string' ? opt : opt.value;
            var label = typeof opt === 'string' ? opt : opt.label;
            return h('option', { value: val }, label);
        })
    );
}

// --- Pagination ---
export function Pagination(props) {
    var p = props || {};
    var page = p.page || 1;
    var total = p.total || 1;
    var onChange = p.onChange || function() {};
    var pages = [];
    var maxVisible = p.maxVisible || 5;

    if (total <= maxVisible + 2) {
        for (var i = 1; i <= total; i++) pages.push(i);
    } else {
        pages.push(1);
        var start = Math.max(2, page - Math.floor(maxVisible / 2));
        var end = Math.min(total - 1, start + maxVisible - 1);
        if (start > 2) pages.push('...');
        for (var j = start; j <= end; j++) pages.push(j);
        if (end < total - 1) pages.push('...');
        pages.push(total);
    }

    var btnStyle = function(disabled, active) {
        return css({
            padding: theme.spacing[1] + ' ' + theme.spacing[3],
            borderRadius: theme.radii.sm, fontSize: theme.fontSizes.sm,
            background: disabled ? theme.colors.gray[100] : (active ? theme.colors.primary : theme.colors.white),
            color: disabled ? theme.colors.gray[400] : (active ? theme.colors.white : theme.colors.gray[700]),
            border: '1px solid ' + (active ? theme.colors.primary : theme.colors.gray[200]),
            cursor: disabled ? 'not-allowed' : 'pointer',
        });
    };
    var pageBtnStyle = function(active) {
        return css({
            width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: theme.radii.sm, fontSize: theme.fontSizes.sm, fontWeight: active ? theme.fontWeights.bold : theme.fontWeights.normal,
            background: active ? theme.colors.primary : theme.colors.white,
            color: active ? theme.colors.white : theme.colors.gray[700],
            border: '1px solid ' + (active ? theme.colors.primary : theme.colors.gray[200]),
            cursor: 'pointer',
        });
    };

    var navBtns = [
        h('button', { disabled: page <= 1, onClick: function() { if (page > 1) onChange(page - 1); }, style: btnStyle(page <= 1, false) }, String.fromCharCode(8249)),
    ];
    var pageBtns = pages.map(function(pg) {
        if (typeof pg === 'number') {
            return h('button', { onClick: function() { onChange(pg); }, style: pageBtnStyle(pg === page) }, String(pg));
        }
        return h('span', { style: css({ color: theme.colors.gray[400], padding: '0 ' + theme.spacing[1] }) }, String.fromCharCode(8230));
    });
    var nextBtn = h('button', { disabled: page >= total, onClick: function() { if (page < total) onChange(page + 1); }, style: btnStyle(page >= total, false) }, String.fromCharCode(8250));

    return h('div', { style: css({ display: 'flex', alignItems: 'center', gap: theme.spacing[2], justifyContent: p.align || 'center' }) },
        navBtns.concat(pageBtns).concat([nextBtn])
    );
}

// --- Alert ---
export function Alert(props, ...children) {
    var p = props || {};
    var variant = p.variant || 'info';
    var colorMap = {
        success: { bg: '#dcfce7', border: '#22c55e', color: '#166534', icon: '\u2713' },
        danger: { bg: '#fee2e2', border: '#ef4444', color: '#991b1b', icon: '\u26A0' },
        warning: { bg: '#fef3c7', border: '#f59e0b', color: '#92400e', icon: '\u26A0' },
        info: { bg: '#dbeafe', border: '#3b82f6', color: '#1e40af', icon: '\u2139' },
    };
    var c = colorMap[variant] || colorMap.info;
    return h('div', { style: css(mergeStyle({
        background: c.bg, borderLeft: '4px solid ' + c.border,
        borderRadius: theme.radii.md, padding: theme.spacing[4],
        color: c.color, fontSize: theme.fontSizes.sm,
        display: 'flex', gap: theme.spacing[3], alignItems: 'flex-start',
    }, p.style)) },
        h('span', { style: css({ fontSize: theme.fontSizes.lg, lineHeight: '1', flexShrink: '0' }) }, c.icon),
        h('div', { style: css({ flex: 1 }) }, ...children)
    );
}

// --- Progress ---
export function Progress(props) {
    var p = props || {};
    var value = p.value !== undefined ? p.value : 0;
    var max = p.max || 100;
    var percent = max > 0 ? Math.min(100, Math.max(0, (Number(value) / Number(max)) * 100)) : 0;
    if (isNaN(percent)) percent = 0;
    var variant = p.variant || 'primary';
    var colorMap = {
        primary: theme.colors.primary,
        success: theme.colors.success,
        danger: theme.colors.danger,
        warning: theme.colors.warning,
    };
    var barColor = colorMap[variant] || colorMap.primary;
    
    return h('div', { style: css(mergeStyle({
        width: '100%', height: p.height || '8px',
        background: theme.colors.gray[200], borderRadius: theme.radii.full,
        overflow: 'hidden',
    }, p.style)) },
        h('div', { style: css({
            width: percent + '%', height: '100%',
            background: barColor,
            transition: 'width 0.3s ease',
            borderRadius: theme.radii.full,
        }) })
    );
}

// --- Skeleton ---
export function Skeleton(props) {
    var p = props || {};
    var width = p.width || '100%';
    var height = p.height || '20px';
    var circle = p.circle === true;
    return h('div', { style: css(mergeStyle({
        width: width, height: height,
        background: 'linear-gradient(90deg, ' + theme.colors.gray[200] + ' 25%, ' + theme.colors.gray[100] + ' 50%, ' + theme.colors.gray[200] + ' 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-loading 1.5s ease-in-out infinite',
        borderRadius: circle ? '50%' : (p.radius || theme.radii.sm),
    }, p.style)) });
}

// Add skeleton animation to global styles
(function() {
    var style = document.getElementById('sigil-skeleton');
    if (style) return;
    style = document.createElement('style');
    style.id = 'sigil-skeleton';
    style.textContent = '@keyframes skeleton-loading { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }';
    document.head.appendChild(style);
})();

// --- Dropdown ---
export function Dropdown(props, ...children) {
    var p = props || {};
    var isOpen = p.open || false;
    if (!isOpen) return h('div', { style: css(p.style || {}) }, ...children);
    
    var align = p.align || 'left';
    var positionStyle = {
        position: 'absolute', top: 'calc(100% + 4px)',
        zIndex: '50', background: theme.colors.white,
        borderRadius: theme.radii.md, boxShadow: theme.shadows.lg,
        border: '1px solid ' + theme.colors.gray[200],
        padding: theme.spacing[2],
        minWidth: p.minWidth || '160px',
    };
    if (align === 'right') {
        positionStyle.right = '0';
    } else {
        positionStyle.left = '0';
    }
    
    return h('div', { style: css(mergeStyle({ position: 'relative' }, p.style || {})) },
        ...children,
        h('div', { style: css(positionStyle) },
            p.items ? p.items.map(function(item) {
                return h('button', {
                    onClick: item.onClick,
                    style: css({
                        display: 'block', width: '100%', padding: theme.spacing[2] + ' ' + theme.spacing[3],
                        textAlign: 'left', fontSize: theme.fontSizes.sm, color: theme.colors.gray[700],
                        background: 'transparent', border: 'none', borderRadius: theme.radii.sm,
                        cursor: 'pointer',
                    }),
                    onMouseEnter: function(e) { e.currentTarget.style.background = theme.colors.gray[100]; },
                    onMouseLeave: function(e) { e.currentTarget.style.background = 'transparent'; },
                }, item.label || '');
            }) : null
        )
    );
}

// --- Accordion ---
export function Accordion(props) {
    var p = props || {};
    var items = p.items || [];
    var activeIndex = p.active !== undefined ? p.active : -1;
    var onChange = p.onChange || function() {};
    
    return h('div', { style: css(mergeStyle({
        border: '1px solid ' + theme.colors.gray[200],
        borderRadius: theme.radii.md,
        overflow: 'hidden',
    }, p.style)) },
        items.map(function(item, i) {
            var isActive = i === activeIndex;
            return h('div', {
                style: css({
                    borderBottom: i < items.length - 1 ? ('1px solid ' + theme.colors.gray[200]) : 'none',
                })
            },
                h('button', {
                    onClick: function() { onChange(isActive ? -1 : i); },
                    style: css({
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: theme.spacing[4],
                        background: isActive ? theme.colors.gray[50] : theme.colors.white,
                        border: 'none', cursor: 'pointer',
                        fontSize: theme.fontSizes.base, fontWeight: theme.fontWeights.medium,
                        color: theme.colors.gray[900],
                    }),
                    onMouseEnter: function(e) { if (!isActive) e.currentTarget.style.background = theme.colors.gray[50]; },
                    onMouseLeave: function(e) { if (!isActive) e.currentTarget.style.background = theme.colors.white; },
                },
                    item.title || '',
                    h('span', {
                        style: css({
                            transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                            fontSize: theme.fontSizes.sm,
                            color: theme.colors.gray[500],
                        })
                    }, '\u25BC')
                ),
                isActive && item.content ? h('div', {
                    style: css({ padding: theme.spacing[4], background: theme.colors.white })
                }, item.content) : null
            );
        })
    );
}

// --- Breadcrumbs ---
export function Breadcrumbs(props) {
    var p = props || {};
    var items = p.items || [];
    var separator = p.separator || '/';
    
    return h('nav', { style: css(mergeStyle({ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }, p.style)) },
        items.map(function(item, i) {
            var isLast = i === items.length - 1;
            return h('div', { style: css({ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }) },
                i > 0 ? h('span', { style: css({ color: theme.colors.gray[400], fontSize: theme.fontSizes.sm }) }, separator) : null,
                isLast
                    ? h('span', { style: css({ color: theme.colors.gray[900], fontSize: theme.fontSizes.sm, fontWeight: theme.fontWeights.medium }) }, item.label)
                    : h('a', {
                        href: item.href || '#',
                        onClick: item.onClick,
                        style: css({ color: theme.colors.primary, fontSize: theme.fontSizes.sm, textDecoration: 'none' }),
                    }, item.label)
            );
        })
    );
}

// --- Steps ---
export function Steps(props) {
    var p = props || {};
    var items = p.items || [];
    var current = p.current || 0;
    var direction = p.direction || 'horizontal';
    
    if (direction === 'horizontal') {
        return h('div', { style: css(mergeStyle({ display: 'flex', alignItems: 'center', gap: theme.spacing[4] }, p.style)) },
            items.map(function(item, i) {
                var isCompleted = i < current;
                var isCurrent = i === current;
                var circleStyle = {
                    width: '32px', height: '32px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: theme.fontSizes.sm, fontWeight: theme.fontWeights.bold,
                    background: isCompleted ? theme.colors.primary : (isCurrent ? theme.colors.primary : theme.colors.gray[200]),
                    color: (isCompleted || isCurrent) ? theme.colors.white : theme.colors.gray[500],
                    flexShrink: '0',
                };
                return h('div', { style: css({ display: 'flex', alignItems: 'center', gap: theme.spacing[2], flex: 1 }) },
                    h('div', { style: css(circleStyle) }, String(i + 1)),
                    h('div', { style: css({ flex: 1 }) },
                        h('div', { style: css({ fontSize: theme.fontSizes.sm, fontWeight: theme.fontWeights.medium, color: theme.colors.gray[900] }) }, item.title || ''),
                        item.description ? h('div', { style: css({ fontSize: theme.fontSizes.xs, color: theme.colors.gray[500] }) }, item.description) : null
                    ),
                    i < items.length - 1 ? h('div', { style: css({ flex: 1, height: '2px', background: isCompleted ? theme.colors.primary : theme.colors.gray[200] }) }) : null
                );
            })
        );
    }
    
    // Vertical direction
    return h('div', { style: css(mergeStyle({ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }, p.style)) },
        items.map(function(item, i) {
            var isCompleted = i < current;
            var isCurrent = i === current;
            var circleStyle = {
                width: '32px', height: '32px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: theme.fontSizes.sm, fontWeight: theme.fontWeights.bold,
                background: isCompleted ? theme.colors.primary : (isCurrent ? theme.colors.primary : theme.colors.gray[200]),
                color: (isCompleted || isCurrent) ? theme.colors.white : theme.colors.gray[500],
                flexShrink: '0',
            };
            return h('div', { style: css({ display: 'flex', gap: theme.spacing[3] }) },
                h('div', { style: css({ display: 'flex', flexDirection: 'column', alignItems: 'center' }) },
                    h('div', { style: css(circleStyle) }, String(i + 1)),
                    i < items.length - 1 ? h('div', { style: css({ width: '2px', flex: 1, background: isCompleted ? theme.colors.primary : theme.colors.gray[200], marginTop: theme.spacing[2] }) }) : null
                ),
                h('div', { style: css({ flex: 1, paddingBottom: theme.spacing[4] }) },
                    h('div', { style: css({ fontSize: theme.fontSizes.base, fontWeight: theme.fontWeights.medium, color: theme.colors.gray[900] }) }, item.title || ''),
                    item.description ? h('div', { style: css({ fontSize: theme.fontSizes.sm, color: theme.colors.gray[500], marginTop: theme.spacing[1] }) }, item.description) : null
                )
            );
        })
    );
}

// --- Timeline ---
export function Timeline(props) {
    var p = props || {};
    var items = p.items || [];
    
    return h('div', { style: css(mergeStyle({ position: 'relative', paddingLeft: '24px' }, p.style)) },
        h('div', { style: css({ position: 'absolute', left: '8px', top: '8px', bottom: '8px', width: '2px', background: theme.colors.gray[200] }) }),
        items.map(function(item, i) {
            return h('div', { style: css({ position: 'relative', paddingBottom: theme.spacing[6] }) },
                h('div', { style: css({
                    position: 'absolute', left: '-20px', top: '4px',
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: item.color || theme.colors.primary,
                    border: '2px solid ' + theme.colors.white,
                }) }),
                h('div', { style: css({ fontSize: theme.fontSizes.sm, fontWeight: theme.fontWeights.medium, color: theme.colors.gray[900] }) }, item.title || ''),
                item.description ? h('div', { style: css({ fontSize: theme.fontSizes.sm, color: theme.colors.gray[500], marginTop: theme.spacing[1] }) }, item.description) : null,
                item.time ? h('div', { style: css({ fontSize: theme.fontSizes.xs, color: theme.colors.gray[400], marginTop: theme.spacing[1] }) }, item.time) : null
            );
        })
    );
}

// --- VirtualList (Virtual Scrolling) ---
var virtualListInstances = new WeakMap();

export function VirtualList(props) {
    var p = props || {};
    var items = p.items || [];
    var itemHeight = Math.max(1, p.itemHeight || 50);
    var containerHeight = p.height || 400;
    var overscan = p.overscan || 5;
    var renderItem = p.renderItem || function(item, index) { return String(item); };
    
    // Use WeakMap to persist state across re-renders
    var instance = virtualListInstances.get(props);
    if (!instance) {
        instance = {
            scrollTop: signal(0),
            containerRef: { current: null },
            scrollHandler: null
        };
        virtualListInstances.set(props, instance);
    }
    
    var scrollTop = instance.scrollTop;
    var containerRef = instance.containerRef;
    var scrollHandler = instance.scrollHandler;
    
    var visibleStart = computed(function() {
        return Math.floor(scrollTop.get() / itemHeight);
    });
    
    var visibleEnd = computed(function() {
        return Math.min(
            items.length,
            Math.ceil((scrollTop.get() + containerHeight) / itemHeight) + overscan
        );
    });
    
    var totalHeight = items.length * itemHeight;
    var offsetY = visibleStart.get() * itemHeight;
    
    onMount(function() {
        if (containerRef.current && !scrollHandler) {
            // Read actual scroll position from DOM
            scrollTop.set(containerRef.current.scrollTop);
            
            scrollHandler = function(e) {
                scrollTop.set(e.target.scrollTop);
            };
            containerRef.current.addEventListener('scroll', scrollHandler);
            instance.scrollHandler = scrollHandler;
        }
    });
    
    onUnmount(function() {
        if (containerRef.current && scrollHandler) {
            containerRef.current.removeEventListener('scroll', scrollHandler);
            instance.scrollHandler = null;
        }
    });
    
    var visibleItems = [];
    for (var i = visibleStart.get(); i < visibleEnd.get(); i++) {
        if (i < items.length) {
            visibleItems.push({ item: items[i], index: i });
        }
    }
    
    return h('div', {
        style: css(mergeStyle({
            height: containerHeight + 'px',
            overflow: 'auto',
            position: 'relative',
        }, p.style)),
        ref: function(el) { containerRef.current = el; }
    },
        h('div', { style: css({ height: totalHeight + 'px', position: 'relative' }) },
            h('div', { style: css({
                position: 'absolute',
                top: offsetY + 'px',
                left: '0',
                right: '0',
            }) },
                visibleItems.map(function(data) {
                    return h('div', {
                        'data-key': p.keyField ? data.item[p.keyField] : data.index,
                        style: css({ height: itemHeight + 'px', overflow: 'hidden' })
                    },
                        renderItem(data.item, data.index)
                    );
                })
            )
        )
    );
}

// --- AutoComplete ---
var autoCompleteInstances = new WeakMap();

export function AutoComplete(props) {
    var p = props || {};
    var options = p.options || [];
    
    // Persist state across re-renders
    var instance = autoCompleteInstances.get(props);
    if (!instance) {
        instance = {
            value: signal(p.value || ''),
            isOpen: signal(false),
            blurTimer: null
        };
        autoCompleteInstances.set(props, instance);
    }
    
    var value = instance.value;
    var isOpen = instance.isOpen;
    var blurTimer = instance.blurTimer;
    
    var filteredOptions = computed(function() {
        var query = value.get().toLowerCase();
        if (!query) return [];
        return options.filter(function(opt) {
            var label = typeof opt === 'string' ? opt : opt.label;
            return label.toLowerCase().includes(query);
        });
    });
    
    return h('div', { style: css(mergeStyle({ position: 'relative' }, p.style)) },
        h(Input, {
            value: value.get(),
            placeholder: p.placeholder || 'Search...',
            onInput: function(e) {
                value.set(e.target.value);
                isOpen.set(true);
                if (blurTimer) { clearTimeout(blurTimer); instance.blurTimer = null; }
            },
            onFocus: function() { isOpen.set(true); },
            onBlur: function() {
                blurTimer = setTimeout(function() { isOpen.set(false); }, 200);
                instance.blurTimer = blurTimer;
            }
        }),
        isOpen.get() && filteredOptions.get().length > 0 ? h('div', {
            style: css({
                position: 'absolute', top: '100%', left: '0', right: '0',
                zIndex: '50', background: theme.colors.white,
                border: '1px solid ' + theme.colors.gray[200],
                borderRadius: theme.radii.md,
                boxShadow: theme.shadows.lg,
                maxHeight: '200px', overflow: 'auto',
                marginTop: theme.spacing[1],
            })
        },
            filteredOptions.get().map(function(opt) {
                var label = typeof opt === 'string' ? opt : opt.label;
                var val = typeof opt === 'string' ? opt : opt.value;
                return h('div', {
                    onClick: function() {
                        value.set(label);
                        isOpen.set(false);
                        if (blurTimer) { clearTimeout(blurTimer); instance.blurTimer = null; }
                        if (p.onSelect) p.onSelect(val);
                    },
                    style: css({
                        padding: theme.spacing[2] + ' ' + theme.spacing[3],
                        cursor: 'pointer',
                        fontSize: theme.fontSizes.sm,
                    }),
                    onMouseEnter: function(e) { e.currentTarget.style.background = theme.colors.gray[100]; },
                    onMouseLeave: function(e) { e.currentTarget.style.background = 'transparent'; },
                }, label);
            })
        ) : null
    );
}

// --- ColorPicker ---
var colorPickerInstances = new WeakMap();

export function ColorPicker(props) {
    var p = props || {};
    
    var instance = colorPickerInstances.get(props);
    if (!instance) {
        instance = { value: signal(p.value || '#3b82f6') };
        colorPickerInstances.set(props, instance);
    }
    
    var value = instance.value;
    
    return h('div', { style: css(mergeStyle({ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }, p.style)) },
        h('input', {
            type: 'color',
            value: value.get(),
            onInput: function(e) {
                value.set(e.target.value);
                if (p.onChange) p.onChange(e.target.value);
            },
            style: css({
                width: '40px', height: '40px',
                border: 'none', cursor: 'pointer',
                borderRadius: theme.radii.sm,
            })
        }),
        h('span', { style: css({ fontSize: theme.fontSizes.sm, color: theme.colors.gray[600], fontFamily: 'monospace' }) },
            value.get()
        )
    );
}

// --- Rating ---
var ratingInstances = new WeakMap();

export function Rating(props) {
    var p = props || {};
    var max = p.max || 5;
    var size = p.size || '24px';
    var readOnly = p.readOnly || false;
    
    var instance = ratingInstances.get(props);
    if (!instance) {
        instance = { value: signal(p.value || 0) };
        ratingInstances.set(props, instance);
    }
    
    var value = instance.value;
    
    return h('div', { style: css(mergeStyle({ display: 'flex', gap: '2px' }, p.style)) },
        range(1, max + 1).map(function(i) {
            var filled = i <= value.get();
            return h('span', {
                onClick: function() {
                    if (!readOnly) {
                        value.set(i);
                        if (p.onChange) p.onChange(i);
                    }
                },
                style: css({
                    fontSize: size,
                    color: filled ? '#fbbf24' : theme.colors.gray[300],
                    cursor: readOnly ? 'default' : 'pointer',
                    transition: 'color 0.15s',
                }),
                onMouseEnter: function(e) { if (!readOnly) e.currentTarget.style.color = '#fbbf24'; },
                onMouseLeave: function(e) { if (!readOnly) e.currentTarget.style.color = i <= value.get() ? '#fbbf24' : theme.colors.gray[300]; },
            }, '\u2605');
        })
    );
}

// --- Tree ---
var treeInstances = new WeakMap();

export function Tree(props) {
    var p = props || {};
    var nodes = p.nodes || [];
    
    var instance = treeInstances.get(props);
    if (!instance) {
        instance = { expandedKeys: signal(p.defaultExpandedKeys || []) };
        treeInstances.set(props, instance);
    }
    
    var expandedKeys = instance.expandedKeys;
    
    function toggleKey(key) {
        var keys = expandedKeys.get();
        var index = keys.indexOf(key);
        // Create new array to trigger reactive update
        var newKeys;
        if (index >= 0) {
            newKeys = keys.slice(0, index).concat(keys.slice(index + 1));
        } else {
            newKeys = keys.concat([key]);
        }
        expandedKeys.set(newKeys);
    }
    
    function renderNode(node, depth) {
        var isExpanded = expandedKeys.get().indexOf(node.key) >= 0;
        var hasChildren = node.children && node.children.length > 0;
        var paddingLeft = depth * 20;
        
        return h('div', { style: css({ marginLeft: paddingLeft + 'px' }) },
            h('div', {
                onClick: function() { if (hasChildren) toggleKey(node.key); },
                style: css({
                    padding: theme.spacing[2],
                    cursor: hasChildren ? 'pointer' : 'default',
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                }),
                onMouseEnter: function(e) { e.currentTarget.style.background = theme.colors.gray[100]; },
                onMouseLeave: function(e) { e.currentTarget.style.background = 'transparent'; },
            },
                hasChildren ? h('span', {
                    style: css({
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        fontSize: theme.fontSizes.xs,
                        color: theme.colors.gray[500],
                    })
                }, '\u25B6') : h('span', { style: css({ width: '12px' }) }),
                node.icon ? h('span', { style: css({ fontSize: theme.fontSizes.base }) }, node.icon) : null,
                h('span', { style: css({ fontSize: theme.fontSizes.sm, color: theme.colors.gray[700] }) }, node.label)
            ),
            isExpanded && hasChildren ? h('div', { style: css({ marginLeft: theme.spacing[4] }) },
                node.children.map(function(child) { return renderNode(child, depth + 1); })
            ) : null
        );
    }
    
    return h('div', { style: css(mergeStyle({ userSelect: 'none' }, p.style)) },
        nodes.map(function(node) { return renderNode(node, 0); })
    );
}
