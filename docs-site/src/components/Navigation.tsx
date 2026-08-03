// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

import { SIGIL_VERSION } from '../generated/contracts.ts';

const navItems = [
    { id: 'home', label: '首页', icon: '🏠' },
    { id: 'guide', label: '快速开始', icon: '' },
    { id: 'concepts', label: '核心概念', icon: '💡' },
    { id: 'api', label: 'API 参考', icon: '📖' },
    { id: 'components', label: 'UI 组件', icon: '🧩' },
    { id: 'examples', label: '示例', icon: '✨' },
    { id: 'comparison', label: '框架对比', icon: '️' },
];

export function Sidebar(props) {
    const p = props || {};
    const activePage = p.activePage || 'home';
    const onPageChange = p.onPageChange || function() {};

    return h('nav', { style: 'width: 240px; min-height: 100vh; background: #0f172a; padding: 24px 0; position: fixed; left: 0; top: 0; overflow-y: auto;' },
        h('div', { style: 'padding: 0 24px 24px; border-bottom: 1px solid #1e293b;' },
            h('div', { style: 'font-size: 20px; font-weight: 700; color: #f8fafc;' }, '⚡ Sigil'),
            h('div', { style: 'font-size: 12px; color: #64748b; margin-top: 4px;' }, 'Framework v' + SIGIL_VERSION)
        ),
        h('div', { style: 'padding: 16px 0;' },
            ...navItems.map(function(item) {
                var isActive = activePage === item.id;
                return h('a', {
                    href: 'javascript:void(0)',
                    onClick: function() { onPageChange(item.id); },
                    style: 'display: flex; align-items: center; gap: 12px; padding: 10px 24px; font-size: 14px; color: ' + (isActive ? '#f8fafc' : '#94a3b8') + '; text-decoration: none; background: ' + (isActive ? '#1e293b' : 'transparent') + '; border-right: 3px solid ' + (isActive ? '#3b82f6' : 'transparent') + '; cursor: pointer; transition: all 0.15s;'
                },
                    h('span', {}, item.icon || ''),
                    item.label
                );
            })
        ),
        h('div', { style: 'position: absolute; bottom: 16px; left: 24px; right: 24px; padding: 12px; background: #1e293b; border-radius: 8px;' },
            h('div', { style: 'font-size: 12px; color: #64748b; line-height: 1.5;' },
                '本文档由 Sigil 框架驱动'
            )
        )
    );
}

export function TopBar(props) {
    const p = props || {};
    return h('header', { style: 'height: 64px; background: white; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; position: fixed; top: 0; left: 240px; right: 0; z-index: 10;' },
        h('div', { style: 'font-size: 16px; font-weight: 600; color: #111827;' }, p.title || ''),
        h('div', { style: 'display: flex; gap: 12px;' },
            h('a', { href: 'https://github.com/DreamSailing/sigil', target: '_blank', style: 'padding: 6px 12px; font-size: 13px; color: #6b7280; text-decoration: none; border: 1px solid #e5e7eb; border-radius: 6px;' }, 'GitHub'),
            h('span', { style: 'padding: 6px 12px; font-size: 13px; color: #3b82f6; background: #eff6ff; border-radius: 6px; font-weight: 500;' }, 'v' + SIGIL_VERSION)
        )
    );
}
