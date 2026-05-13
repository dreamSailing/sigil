// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

// Sigil UI Component Library — v0.1.0
// Headless + inline styles, zero external dependencies

import { h } from '/@runtime';

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
    return h('div', { style: css({ display: 'flex', flexDirection: p.direction || 'row', alignItems: p.align || 'stretch', justifyContent: p.justify || 'flex-start', gap: p.gap || '0', flexWrap: p.wrap || 'nowrap' }, p.style) }, ...children);
}

function mergeStyle(base, extra) {
    const result = Object.assign({}, base);
    if (extra) Object.assign(result, extra);
    return result;
}

export function Grid(props, ...children) {
    const p = props || {};
    const cols = p.cols || 3;
    const responsive = p.responsive !== false;
    const templateCols = responsive
        ? 'repeat(auto-fill, minmax(min(' + Math.floor(100 / cols) + '%, 280px), 1fr))'
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

    return h('button', Object.assign({}, mergeStyle(mergeStyle(baseStyle, sizes[size] || sizes.md), currentVariant), p.style, {
        disabled: p.disabled || undefined,
        onMouseEnter: function(e) { Object.assign(e.target.style, currentHover); },
        onMouseLeave: function(e) { Object.assign(e.target.style, currentVariant); },
    }), ...children);
}

// --- Input ---
export function Input(props) {
    var p = props || {};
    var inputProps = {
        type: p.type || 'text',
        style: css({
            width: '100%', padding: theme.spacing[3] + ' ' + theme.spacing[4],
            border: '1px solid ' + theme.colors.gray[300], borderRadius: theme.radii.md,
            fontSize: theme.fontSizes.base, color: theme.colors.gray[900],
            background: theme.colors.white, outline: 'none',
        }),
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
        style: css({
            width: '100%', padding: theme.spacing[3] + ' ' + theme.spacing[4],
            border: '1px solid ' + theme.colors.gray[300], borderRadius: theme.radii.md,
            fontSize: theme.fontSizes.base, color: theme.colors.gray[900],
            background: theme.colors.white, outline: 'none',
            fontFamily: 'inherit', resize: p.resize || 'vertical',
            minHeight: p.minHeight || '80px',
        }),
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
    const name = p.name || '?';
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
    var active = p.active || 0;
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
    return h('select', mergeStyle({
        style: css({
            width: p.width || '100%', padding: theme.spacing[3] + ' ' + theme.spacing[4],
            border: '1px solid ' + theme.colors.gray[300], borderRadius: theme.radii.md,
            fontSize: theme.fontSizes.base, color: theme.colors.gray[900],
            background: theme.colors.white, outline: 'none', cursor: 'pointer',
        }),
    }, p),
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
        h('button', { disabled: page <= 1, onClick: function() { onChange(page - 1); }, style: btnStyle(page <= 1, false) }, String.fromCharCode(8249)),
    ];
    var pageBtns = pages.map(function(pg) {
        if (typeof pg === 'number') {
            return h('button', { onClick: function() { onChange(pg); }, style: pageBtnStyle(pg === page) }, String(pg));
        }
        return h('span', { style: css({ color: theme.colors.gray[400], padding: '0 ' + theme.spacing[1] }) }, String.fromCharCode(8230));
    });
    var nextBtn = h('button', { disabled: page >= total, onClick: function() { onChange(page + 1); }, style: btnStyle(page >= total, false) }, String.fromCharCode(8250));

    return h('div', { style: css({ display: 'flex', alignItems: 'center', gap: theme.spacing[2], justifyContent: p.align || 'center' }) },
        navBtns.concat(pageBtns).concat([nextBtn])
    );
}
