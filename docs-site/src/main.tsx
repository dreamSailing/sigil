// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

import { Sidebar, TopBar } from './components/Navigation.tsx';
import { HomePage } from './pages/Home.tsx';
import { GuidePage } from './pages/Guide.tsx';
import { ConceptsPage } from './pages/Concepts.tsx';
import { ApiPage } from './pages/API.tsx';
import { ComponentsPage } from './pages/Components.tsx';
import { ExamplesPage } from './pages/Examples.tsx';
import { ComparisonPage } from './pages/Comparison.tsx';

var pageNames = {
    home: '首页',
    guide: '快速开始',
    concepts: '核心概念',
    api: 'API 参考',
    components: 'UI 组件',
    examples: '示例',
    comparison: '框架对比'
};

// Create all page component instances once
var homeComp = HomePage();
var guideComp = GuidePage();
var conceptsComp = ConceptsPage();
var apiComp = ApiPage();
var componentsComp = ComponentsPage();
var examplesComp = ExamplesPage();
var comparisonComp = ComparisonPage();

var pageComponentsMap = {
    home: homeComp,
    guide: guideComp,
    concepts: conceptsComp,
    api: apiComp,
    components: componentsComp,
    examples: examplesComp,
    comparison: comparisonComp
};

function getPageFromHash() {
    var hash = window.location.hash;
    if (hash && hash.length > 1) {
        var page = hash.substring(1);
        if (pageComponentsMap[page]) {
            return page;
        }
    }
    return 'home';
}

var App = defineComponent(function() {
    var currentPage = signal(getPageFromHash());

    effect(function() {
        // Read signal to establish reactive dependency
        currentPage.get();
        var hashChange = function() {
            currentPage.set(getPageFromHash());
        };
        window.addEventListener('hashchange', hashChange);
        return function() {
            window.removeEventListener('hashchange', hashChange);
        };
    });

    function navigate(page) {
        window.location.hash = '#' + page;
    }

    return () => h('div', { style: 'display: flex; min-height: 100vh; background: #f8fafc;' },
        h('div', { 'data-key': currentPage.get(), style: 'display: contents;' },
            h(Sidebar, { activePage: currentPage.get(), onPageChange: navigate }),
            h('div', { style: 'flex: 1; margin-left: 240px;' },
                h(TopBar, { title: pageNames[currentPage.get()] || '首页' }),
                h('main', { style: 'padding: 88px 32px 32px;' },
                    pageComponentsMap[currentPage.get()]
                )
            )
        )
    );
});

document.body.style.margin = '0';
document.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
document.body.appendChild(App());
