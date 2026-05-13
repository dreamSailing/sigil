// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

export function CodeBlock(props) {
    const p = props || {};
    const code = p.code || '';
    const lang = p.lang || 'tsx';
    const title = p.title || '';
    return h('div', { style: 'margin: 16px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #1e293b;' },
        h('div', { style: 'display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; background: #0f172a; border-bottom: 1px solid #334155;' },
            h('span', { style: 'font-size: 12px; color: #94a3b8; font-weight: 500;' }, lang),
            title ? h(Badge, { variant: 'info' }, title) : null
        ),
        h('pre', { style: 'padding: 16px; overflow-x: auto; margin: 0;' },
            h('code', { style: 'font-family: monospace; font-size: 14px; color: #e2e8f0; line-height: 1.6;' }, code)
        )
    );
}

export function FeatureCard(props) {
    const p = props || {};
    return h('div', { style: 'padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: white; transition: box-shadow 0.2s;' },
        h('div', { style: 'font-size: 32px; margin-bottom: 12px;' }, p.icon || ''),
        h('h3', { style: 'font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 8px 0;' }, p.title || ''),
        h('p', { style: 'font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0;' }, p.description || '')
    );
}

export function SectionTitle(props) {
    const p = props || {};
    return h('div', { style: 'margin-bottom: 32px;' },
        h('h2', { style: 'font-size: 28px; font-weight: 700; color: #111827; margin: 0 0 8px 0;' }, p.title || ''),
        h('p', { style: 'font-size: 16px; color: #6b7280; margin: 0; line-height: 1.6;' }, p.description || '')
    );
}

export function ApiTable(props) {
    const p = props || {};
    const items = p.items || [];
    return h('div', { style: 'border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin: 16px 0;' },
        h('table', { style: 'width: 100%; border-collapse: collapse;' },
            h('thead', {},
                h('tr', { style: 'background: #f9fafb;' },
                    h('th', { style: 'padding: 12px 16px; text-align: left; font-size: 13px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;' }, 'Name'),
                    h('th', { style: 'padding: 12px 16px; text-align: left; font-size: 13px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;' }, 'Type'),
                    h('th', { style: 'padding: 12px 16px; text-align: left; font-size: 13px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;' }, 'Description')
                )
            ),
            h('tbody', {},
                ...items.map((item, i) =>
                    h('tr', { 'data-key': String(i), style: i % 2 === 0 ? 'background: white;' : 'background: #f9fafb;' },
                        h('td', { style: 'padding: 12px 16px; font-size: 14px; color: #111827; font-family: monospace;' }, item.name || ''),
                        h('td', { style: 'padding: 12px 16px; font-size: 13px; color: #6b7280; font-family: monospace;' }, item.type || ''),
                        h('td', { style: 'padding: 12px 16px; font-size: 14px; color: #4b5563;' }, item.description || '')
                    )
                )
            )
        )
    );
}
