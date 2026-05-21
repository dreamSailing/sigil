// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

import { CodeBlock } from '../components/Widgets.tsx';

// ============================================================
// Example 1: Counter (basic signal + computed)
// ============================================================
const Counter = defineComponent(() => {
    var count = signal(0);
    var doubled = computed(function() { return count.get() * 2; });

    return () => h('div', { style: 'padding: 24px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px;' },
        h('div', { style: 'font-size: 13px; font-weight: 600; color: #0369a1; margin-bottom: 12px;' }, '示例 1：计数器'),
        h('div', { style: 'font-size: 12px; color: #0284c7; margin-bottom: 12px;' },
            '测试能力：signal 基础读写 + computed 派生值'
        ),
        h('div', { style: 'display: flex; align-items: center; gap: 16px;' },
            h('button', {
                style: 'padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;',
                onClick: function() { count.set(count.get() + 1); }
            }, '+'),
            h('span', { style: 'font-size: 28px; font-weight: 700; color: #111827; min-width: 50px; text-align: center;' }, count.get()),
            h('button', {
                style: 'padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;',
                onClick: function() { count.set(count.get() - 1); }
            }, '-')
        ),
        h('div', { style: 'margin-top: 8px; font-size: 14px; color: #6b7280;' },
            '双倍值：', h('span', { style: 'font-weight: 600; color: #3b82f6;' }, doubled.get())
        )
    );
});

// ============================================================
// Example 2: Todo List
// ============================================================
const TodoApp = defineComponent(() => {
    var todos = signal([]);
    var inputVal = signal('');
    var nextId = signal(1);

    function addTodo() {
        var val = inputVal.get();
        if (val.trim()) {
            var newTodos = todos.get().concat([{ id: nextId.get(), text: val, done: false }]);
            todos.set(newTodos);
            nextId.set(nextId.get() + 1);
            inputVal.set('');
        }
    }

    function toggleTodo(id) {
        var list = todos.get();
        var updated = [];
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            if (item.id === id) {
                updated.push({ id: item.id, text: item.text, done: !item.done });
            } else {
                updated.push(item);
            }
        }
        todos.set(updated);
    }

    function removeTodo(id) {
        var list = todos.get();
        var filtered = [];
        for (var i = 0; i < list.length; i++) {
            if (list[i].id !== id) {
                filtered.push(list[i]);
            }
        }
        todos.set(filtered);
    }

    var doneCount = computed(function() {
        var list = todos.get();
        var c = 0;
        for (var i = 0; i < list.length; i++) {
            if (list[i].done) c++;
        }
        return c;
    });

    return () => h('div', { style: 'padding: 24px; background: #fefce8; border: 1px solid #fde047; border-radius: 8px;' },
        h('div', { style: 'font-size: 13px; font-weight: 600; color: #854d0e; margin-bottom: 12px;' }, '示例 2：待办列表'),
        h('div', { style: 'font-size: 12px; color: #a16207; margin-bottom: 12px;' },
            '测试能力：列表 CRUD + 数组 signal 更新 + computed 聚合统计'
        ),
        h('div', { style: 'display: flex; gap: 8px; margin-bottom: 16px;' },
            h('input', {
                value: inputVal.get(),
                placeholder: '输入待办事项...',
                onInput: function(e) { inputVal.set(e.target.value); },
                onKeydown: function(e) { if (e.key === 'Enter') addTodo(); },
                style: 'flex: 1; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;'
            }),
            h('button', {
                style: 'padding: 8px 16px; background: #eab308; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;',
                onClick: function() { addTodo(); }
            }, '添加')
        ),
        h('div', { style: 'font-size: 13px; color: #6b7280; margin-bottom: 8px;' },
            '共 ', h('span', { style: 'font-weight: 600;' }, todos.get().length), ' 项，已完成 ', h('span', { style: 'font-weight: 600;' }, doneCount.get()), ' 项'
        ),
        h('div', { style: 'max-height: 200px; overflow-y: auto;' },
            ...todos.get().map(function(todo) {
                return h('div', {
                    style: 'display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #fde68a;'
                },
                    h('input', {
                        type: 'checkbox',
                        checked: todo.done,
                        onChange: function() { toggleTodo(todo.id); },
                        style: 'width: 18px; height: 18px; cursor: pointer;'
                    }),
                    h('span', {
                        style: 'flex: 1; font-size: 14px; color: #111827; text-decoration: ' + (todo.done ? 'line-through' : 'none') + '; opacity: ' + (todo.done ? '0.5' : '1') + ';'
                    }, todo.text),
                    h('button', {
                        style: 'padding: 4px 8px; background: transparent; border: 1px solid #f59e0b; color: #d97706; border-radius: 4px; cursor: pointer; font-size: 12px;',
                        onClick: function() { removeTodo(todo.id); }
                    }, '删除')
                );
            })
        )
    );
});

// ============================================================
// Example 3: Filter List
// ============================================================
const FilterList = defineComponent(() => {
    var search = signal('');
    var items = signal(['React', 'Vue', 'Angular', 'Svelte', 'Solid', 'Preact', 'Alpine', 'Lit']);

    var filtered = computed(function() {
        var q = search.get().toLowerCase();
        var result = [];
        var list = items.get();
        for (var i = 0; i < list.length; i++) {
            if (list[i].toLowerCase().indexOf(q) !== -1) {
                result.push(list[i]);
            }
        }
        return result;
    });

    return () => h('div', { style: 'padding: 24px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;' },
        h('div', { style: 'font-size: 13px; font-weight: 600; color: #166534; margin-bottom: 12px;' }, '示例 3：搜索过滤'),
        h('div', { style: 'font-size: 12px; color: #15803d; margin-bottom: 12px;' },
            '测试能力：computed 实时过滤 + 动态列表渲染'
        ),
        h('input', {
            value: search.get(),
            placeholder: '搜索框架...',
            onInput: function(e) { search.set(e.target.value); },
            style: 'width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;'
        }),
        h('div', { style: 'margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px;' },
            ...filtered.get().map(function(item) {
                return h('span', {
                    style: 'padding: 6px 14px; background: white; border: 1px solid #86efac; border-radius: 20px; font-size: 13px; color: #166534;'
                }, item);
            })
        ),
        filtered.get().length === 0 ? h('div', { style: 'padding: 16px; text-align: center; color: #6b7280; font-size: 14px;' }, '没有找到匹配的框架') : null
    );
});

// ============================================================
// Example 4: Dashboard (NEW)
// ============================================================
const DashboardDemo = defineComponent(() => {
    var users = signal(12847);
    var revenue = signal(89432);
    var orders = signal(3672);
    var conversion = signal(3.2);
    var prevUsers = signal(12847);
    var prevRevenue = signal(89432);

    var userGrowth = computed(function() {
        var curr = users.get();
        var prev = prevUsers.get();
        if (prev === 0) return '0.0';
        return ((curr - prev) / prev * 100).toFixed(1);
    });

    var revenueGrowth = computed(function() {
        var curr = revenue.get();
        var prev = prevRevenue.get();
        if (prev === 0) return '0.0';
        return ((curr - prev) / prev * 100).toFixed(1);
    });

    // Simulate real-time data updates
    var tick = signal(0);
    effect(function() {
        // Read tick to establish reactive dependency for periodic updates
        tick.get();
        var timer = setInterval(function() {
            prevUsers.set(users.get());
            users.set(users.get() + Math.floor(Math.random() * 5) + 1);
            prevRevenue.set(revenue.get());
            revenue.set(revenue.get() + Math.floor(Math.random() * 200));
            orders.set(orders.get() + (Math.random() > 0.5 ? 1 : 0));
            var c = conversion.get();
            conversion.set(+(c + (Math.random() - 0.5) * 0.2).toFixed(1));
            tick.set(tick.get() + 1); // trigger effect re-run for next cycle
        }, 2000);
        return function() { clearInterval(timer); };
    });

    function fmtNum(n) {
        return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function statCard(label, value, accent, growth) {
        var g = typeof growth === 'object' && growth !== null && typeof growth.get === 'function' ? growth.get() : '';
        var isPositive = g !== undefined && parseFloat(g) >= 0;
        return h('div', { style: 'padding: 20px; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border-left: 4px solid ' + accent + ';' },
            h('div', { style: 'font-size: 13px; color: #6b7280; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;' }, label),
            h('div', { style: 'font-size: 28px; font-weight: 700; color: #111827; margin-top: 4px;' }, value),
            g !== '' ? h('div', { style: 'font-size: 12px; color: ' + (isPositive ? '#16a34a' : '#dc2626') + '; margin-top: 4px; font-weight: 500;' },
                (isPositive ? '+ ' : '- ') + (isPositive ? g : String(Math.abs(parseFloat(g))).toFixed(1)) + '% 较上次'
            ) : null
        );
    }

    return () => h('div', { style: 'padding: 24px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 8px;' },
        h('div', { style: 'font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 12px;' }, '示例 4：实时数据仪表板'),
        h('div', { style: 'font-size: 12px; color: #475569; margin-bottom: 16px;' },
            '测试能力：多信号独立管理 + computed 聚合 + effect 定时器实时更新 + 条件渲染'
        ),
        h('div', { style: 'display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;' },
            statCard('用户数', fmtNum(users.get()), '#3b82f6', userGrowth),
            statCard('收入', '$' + fmtNum(revenue.get()), '#22c55e', revenueGrowth),
            statCard('订单数', fmtNum(orders.get()), '#f59e0b', ''),
            statCard('转化率', conversion.get() + '%', '#8b5cf6', '')
        )
    );
});

// ============================================================
// Example 5: Form Validation (NEW)
// ============================================================
const FormValidationDemo = defineComponent(() => {
    var username = signal('');
    var email = signal('');
    var password = signal('');
    var confirmPassword = signal('');
    var errors = signal({});
    var submitted = signal(false);

    function validateField(name) {
        var e = Object.assign({}, errors.get());
        var val;
        if (name === 'username') {
            val = username.get();
            if (!val) e.username = '用户名不能为空';
            else if (val.length < 3) e.username = '用户名至少 3 个字符';
            else delete e.username;
        } else if (name === 'email') {
            val = email.get();
            if (!val) e.email = '邮箱不能为空';
            else if (val.indexOf('@') === -1 || val.indexOf('.') === -1) e.email = '请输入有效的邮箱地址';
            else delete e.email;
        } else if (name === 'password') {
            val = password.get();
            if (!val) e.password = '密码不能为空';
            else if (val.length < 6) e.password = '密码至少 6 个字符';
            else delete e.password;
        } else if (name === 'confirmPassword') {
            val = confirmPassword.get();
            if (val !== password.get()) e.confirmPassword = '两次密码输入不一致';
            else if (!val) e.confirmPassword = '请再次输入密码';
            else delete e.confirmPassword;
        }
        errors.set(e);
    }

    function isFormValid() {
        var e = errors.get();
        return Object.keys(e).length === 0
            && username.get().length >= 3
            && email.get().indexOf('@') !== -1
            && password.get().length >= 6
            && confirmPassword.get() === password.get();
    }

    function handleSubmit() {
        validateField('username');
        validateField('email');
        validateField('password');
        validateField('confirmPassword');
        if (isFormValid()) {
            submitted.set(true);
            showToast('注册成功！欢迎加入，' + username.get());
        }
    }

    function fieldError(name) {
        var e = errors.get();
        return e[name] || '';
    }

    function inputStyle(name) {
        var err = fieldError(name);
        return 'width: 100%; padding: 10px 14px; border: 1px solid ' + (err ? '#ef4444' : '#d1d5db') + '; border-radius: 6px; font-size: 14px; box-sizing: border-box; outline: none;';
    }

    return () => h('div', { style: 'padding: 24px; background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 8px;' },
        h('div', { style: 'font-size: 13px; font-weight: 600; color: #7c3aed; margin-bottom: 12px;' }, '示例 5：表单验证'),
        h('div', { style: 'font-size: 12px; color: #9333ea; margin-bottom: 16px;' },
            '测试能力：受控输入 + 实时验证 + 条件渲染 + Toast 反馈'
        ),

        submitted.get()
            ? h('div', { style: 'padding: 20px; background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; text-align: center;' },
                h('div', { style: 'font-size: 32px; margin-bottom: 8px;' }, '\u2705'),
                h('div', { style: 'font-size: 16px; font-weight: 600; color: #166534;' }, '注册成功'),
                h('div', { style: 'font-size: 14px; color: #15803d; margin-top: 4px;' }, '欢迎，' + username.get() + '!')
              )
            : h('div', {},
                // Username
                h('div', { style: 'margin-bottom: 16px;' },
                    h('label', { style: 'display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 4px;' }, '用户名'),
                    h('input', {
                        value: username.get(),
                        placeholder: '至少 3 个字符',
                        onInput: function(e) { username.set(e.target.value); validateField('username'); },
                        style: inputStyle('username')
                    }),
                    fieldError('username') ? h('div', { style: 'font-size: 12px; color: #ef4444; margin-top: 4px;' }, fieldError('username')) : null
                ),
                // Email
                h('div', { style: 'margin-bottom: 16px;' },
                    h('label', { style: 'display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 4px;' }, '邮箱'),
                    h('input', {
                        value: email.get(),
                        placeholder: 'example@mail.com',
                        type: 'email',
                        onInput: function(e) { email.set(e.target.value); validateField('email'); },
                        style: inputStyle('email')
                    }),
                    fieldError('email') ? h('div', { style: 'font-size: 12px; color: #ef4444; margin-top: 4px;' }, fieldError('email')) : null
                ),
                // Password
                h('div', { style: 'margin-bottom: 16px;' },
                    h('label', { style: 'display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 4px;' }, '密码'),
                    h('input', {
                        value: password.get(),
                        placeholder: '至少 6 个字符',
                        type: 'password',
                        onInput: function(e) { password.set(e.target.value); validateField('password'); },
                        style: inputStyle('password')
                    }),
                    fieldError('password') ? h('div', { style: 'font-size: 12px; color: #ef4444; margin-top: 4px;' }, fieldError('password')) : null
                ),
                // Confirm Password
                h('div', { style: 'margin-bottom: 20px;' },
                    h('label', { style: 'display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 4px;' }, '确认密码'),
                    h('input', {
                        value: confirmPassword.get(),
                        placeholder: '再次输入密码',
                        type: 'password',
                        onInput: function(e) { confirmPassword.set(e.target.value); validateField('confirmPassword'); },
                        style: inputStyle('confirmPassword')
                    }),
                    fieldError('confirmPassword') ? h('div', { style: 'font-size: 12px; color: #ef4444; margin-top: 4px;' }, fieldError('confirmPassword')) : null
                ),
                // Submit button
                h('button', {
                    style: 'width: 100%; padding: 12px; font-size: 15px; font-weight: 600; background: ' + (isFormValid() ? '#7c3aed' : '#d1d5db') + '; color: white; border: none; border-radius: 6px; cursor: ' + (isFormValid() ? 'pointer' : 'not-allowed') + ';',
                    onClick: function() { handleSubmit(); },
                    disabled: !isFormValid()
                }, '注册')
              )
    );
});

// ============================================================
// Example 6: Data Table with Sort/Search/Pagination (NEW)
// ============================================================
const DataTableDemo = defineComponent(() => {
    var allData = signal([
        { id: 1, name: '张三', dept: '技术部', role: '前端工程师', status: '在职' },
        { id: 2, name: '李四', dept: '产品部', role: '产品经理', status: '在职' },
        { id: 3, name: '王五', dept: '技术部', role: '后端工程师', status: '在职' },
        { id: 4, name: '赵六', dept: '设计部', role: 'UI 设计师', status: '休假' },
        { id: 5, name: '孙七', dept: '技术部', role: 'DevOps', status: '在职' },
        { id: 6, name: '周八', dept: '市场部', role: '市场专员', status: '在职' },
        { id: 7, name: '吴九', dept: '技术部', role: '测试工程师', status: '离职' },
        { id: 8, name: '郑十', dept: '产品部', role: '产品助理', status: '在职' },
        { id: 9, name: '刘一一', dept: '技术部', role: '架构师', status: '在职' },
        { id: 10, name: '陈二二', dept: '设计部', role: '平面设计师', status: '在职' },
        { id: 11, name: '林三三', dept: '技术部', role: '全栈工程师', status: '在职' },
        { id: 12, name: '黄四四', dept: '市场部', role: '市场经理', status: '休假' },
    ]);
    var search = signal('');
    var sortCol = signal('');
    var sortDir = signal('asc');
    var page = signal(1);
    var pageSize = 5;

    var filtered = computed(function() {
        var q = search.get().toLowerCase();
        var data = allData.get();
        var result = [];
        for (var i = 0; i < data.length; i++) {
            var row = data[i];
            if (!q || row.name.toLowerCase().indexOf(q) !== -1 || row.dept.toLowerCase().indexOf(q) !== -1 || row.role.toLowerCase().indexOf(q) !== -1) {
                result.push(row);
            }
        }
        return result;
    });

    var sorted = computed(function() {
        var col = sortCol.get();
        var dir = sortDir.get();
        var data = filtered.get().slice();
        if (!col) return data;
        data.sort(function(a, b) {
            var va = a[col] || '';
            var vb = b[col] || '';
            var cmp = va < vb ? -1 : (va > vb ? 1 : 0);
            return dir === 'asc' ? cmp : -cmp;
        });
        return data;
    });

    var totalPages = computed(function() {
        var len = sorted.get().length;
        return Math.max(1, Math.ceil(len / pageSize));
    });

    var paged = computed(function() {
        var data = sorted.get();
        var p = page.get();
        var start = (p - 1) * pageSize;
        var result = [];
        for (var i = start; i < start + pageSize && i < data.length; i++) {
            result.push(data[i]);
        }
        return result;
    });

    function doSort(col) {
        if (sortCol.get() === col) {
            sortDir.set(sortDir.get() === 'asc' ? 'desc' : 'asc');
        } else {
            sortCol.set(col);
            sortDir.set('asc');
        }
        page.set(1);
    }

    function gotoPage(p) {
        if (p >= 1 && p <= totalPages.get()) page.set(p);
    }

    function colHeader(col, label) {
        var isActive = sortCol.get() === col;
        var arrow = isActive ? (sortDir.get() === 'asc' ? ' \u2191' : ' \u2193') : '';
        return h('div', {
            style: 'flex: 1; padding: 8px; font-size: 12px; font-weight: 600; color: ' + (isActive ? '#7c3aed' : '#6b7280') + '; cursor: pointer; text-transform: uppercase; letter-spacing: 0.05em; user-select: none;',
            onClick: function() { doSort(col); }
        }, label + arrow);
    }

    function statusBadge(status) {
        var colors = { '在职': { bg: '#dcfce7', color: '#166534', border: '#86efac' }, '休假': { bg: '#fef3c7', color: '#92400e', border: '#fcd34d' }, '离职': { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' } };
        var c = colors[status] || colors['在职'];
        return h('span', { style: 'display: inline-block; padding: 2px 10px; background: ' + c.bg + '; color: ' + c.color + '; border-radius: 12px; font-size: 12px; font-weight: 500;' }, status);
    }

    return () => h('div', { style: 'padding: 24px; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px;' },
        h('div', { style: 'font-size: 13px; font-weight: 600; color: #7c3aed; margin-bottom: 12px;' }, '示例 6：数据表格'),
        h('div', { style: 'font-size: 12px; color: #8b5cf6; margin-bottom: 16px;' },
            '测试能力：复杂状态管理 + 多 computed 链式计算 + 排序/搜索/分页'
        ),

        // Search
        h('div', { style: 'margin-bottom: 16px;' },
            h('input', {
                value: search.get(),
                placeholder: '搜索姓名、部门、职位...',
                onInput: function(e) { search.set(e.target.value); page.set(1); },
                style: 'width: 100%; padding: 8px 14px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; box-sizing: border-box;'
            })
        ),

        // Table header
        h('div', { style: 'display: flex; background: #f9fafb; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; border-radius: 6px 6px 0 0;' },
            colHeader('name', '姓名'),
            colHeader('dept', '部门'),
            colHeader('role', '职位'),
            h('div', { style: 'flex: 1; padding: 8px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;' }, '状态')
        ),

        // Table rows
        h('div', { style: 'background: white; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 6px 6px;' },
            ...paged.get().map(function(row) {
                return h('div', {
                    style: 'display: flex; border-bottom: 1px solid #f3f4f6; padding: 0;'
                },
                    h('div', { style: 'flex: 1; padding: 12px 8px; font-size: 14px; color: #111827;' }, row.name),
                    h('div', { style: 'flex: 1; padding: 12px 8px; font-size: 14px; color: #6b7280;' }, row.dept),
                    h('div', { style: 'flex: 1; padding: 12px 8px; font-size: 14px; color: #6b7280;' }, row.role),
                    h('div', { style: 'flex: 1; padding: 12px 8px;' }, statusBadge(row.status))
                );
            }),
            paged.get().length === 0 ? h('div', { style: 'padding: 32px; text-align: center; color: #9ca3af; font-size: 14px;' }, '没有找到匹配的数据') : null
        ),

        // Pagination
        h('div', { style: 'display: flex; justify-content: space-between; align-items: center; margin-top: 12px; font-size: 13px; color: #6b7280;' },
            h('span', {}, '共 ' + sorted.get().length + ' 条'),
            h('div', { style: 'display: flex; gap: 4px;' },
                h('button', {
                    style: 'padding: 4px 10px; border: 1px solid #e5e7eb; background: white; border-radius: 4px; cursor: pointer; font-size: 13px; color: ' + (page.get() <= 1 ? '#d1d5db' : '#374151') + ';',
                    onClick: function() { gotoPage(page.get() - 1); },
                    disabled: page.get() <= 1
                }, '\u2039'),
                ...Array.from({ length: totalPages.get() }, function(_, i) {
                    var p = i + 1;
                    var isActive = page.get() === p;
                    return h('button', {
                        style: 'width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 1px solid ' + (isActive ? '#7c3aed' : '#e5e7eb') + '; background: ' + (isActive ? '#7c3aed' : 'white') + '; color: ' + (isActive ? 'white' : '#374151') + '; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: ' + (isActive ? '600' : '400') + ';',
                        onClick: function() { gotoPage(p); }
                    }, String(p));
                }),
                h('button', {
                    style: 'padding: 4px 10px; border: 1px solid #e5e7eb; background: white; border-radius: 4px; cursor: pointer; font-size: 13px; color: ' + (page.get() >= totalPages.get() ? '#d1d5db' : '#374151') + ';',
                    onClick: function() { gotoPage(page.get() + 1); },
                    disabled: page.get() >= totalPages.get()
                }, '\u203a')
            )
        )
    );
});

// ============================================================
// Example 7: Shopping Cart (NEW)
// ============================================================
const ShoppingCartDemo = defineComponent(() => {
    var products = signal([
        { id: 1, name: '机械键盘', price: 299, qty: 1, emoji: '\u2328\uFE0F' },
        { id: 2, name: '无线鼠标', price: 149, qty: 2, emoji: '\uD83D\uDDB1\uFE0F' },
        { id: 3, name: 'USB-C 扩展坞', price: 199, qty: 0, emoji: '\uD83D\uDD0C' },
        { id: 4, name: '显示器支架', price: 399, qty: 1, emoji: '\uD83D\uDCAA' },
        { id: 5, name: '降噪耳机', price: 599, qty: 0, emoji: '\uD83C\uDFA7' },
    ]);
    var shipping = signal(0);

    var cartItems = computed(function() {
        var items = products.get();
        var result = [];
        for (var i = 0; i < items.length; i++) {
            if (items[i].qty > 0) result.push(items[i]);
        }
        return result;
    });

    var subtotal = computed(function() {
        var items = cartItems.get();
        var total = 0;
        for (var i = 0; i < items.length; i++) {
            total += items[i].price * items[i].qty;
        }
        return total;
    });

    var total = computed(function() {
        return subtotal.get() + shipping.get();
    });

    var cartCount = computed(function() {
        return cartItems.get().length;
    });

    function changeQty(id, delta) {
        var list = products.get();
        var updated = [];
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            if (item.id === id) {
                var newQty = Math.max(0, item.qty + delta);
                updated.push({ id: item.id, name: item.name, price: item.price, qty: newQty, emoji: item.emoji });
                if (delta > 0 && item.qty === 0) {
                    showToast(item.name + ' 已加入购物车', { variant: 'success' });
                }
            } else {
                updated.push(item);
            }
        }
        products.set(updated);
        shipping.set(cartItems.get().length > 0 && subtotal.get() < 500 ? 15 : 0);
    }

    return () => h('div', { style: 'padding: 24px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px;' },
        h('div', { style: 'font-size: 13px; font-weight: 600; color: #c2410c; margin-bottom: 12px;' }, '示例 7：购物车'),
        h('div', { style: 'font-size: 12px; color: #ea580c; margin-bottom: 16px;' },
            '测试能力：列表数量操作 + computed 多步聚合 + 条件渲染 + 空状态'
        ),

        cartItems.get().length === 0
            ? h('div', { style: 'padding: 32px; text-align: center; color: #9ca3af;' },
                h('div', { style: 'font-size: 48px; margin-bottom: 8px;' }, '\uD83D\uDED2'),
                h('div', { style: 'font-size: 14px;' }, '购物车是空的，点击 + 号添加商品')
              )
            : h('div', {},
                // Cart items
                ...cartItems.get().map(function(item) {
                    return h('div', {
                        style: 'display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #fed7aa;'
                    },
                        h('div', { style: 'width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: #fff; border-radius: 8px; font-size: 20px;' }, item.emoji),
                        h('div', { style: 'flex: 1;' },
                            h('div', { style: 'font-size: 14px; font-weight: 500; color: #111827;' }, item.name),
                            h('div', { style: 'font-size: 13px; color: #6b7280;' }, '\u00A5' + item.price)
                        ),
                        h('div', { style: 'display: flex; align-items: center; gap: 8px;' },
                            h('button', {
                                style: 'width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 16px; color: #374151; cursor: pointer;',
                                onClick: function() { changeQty(item.id, -1); }
                            }, '\u2212'),
                            h('span', { style: 'font-size: 14px; font-weight: 600; color: #111827; min-width: 20px; text-align: center;' }, String(item.qty)),
                            h('button', {
                                style: 'width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 16px; color: #374151; cursor: pointer;',
                                onClick: function() { changeQty(item.id, 1); }
                            }, '+')
                        ),
                        h('div', { style: 'font-size: 14px; font-weight: 600; color: #c2410c; min-width: 70px; text-align: right;' }, '\u00A5' + (item.price * item.qty))
                    );
                }),

                // Summary
                h('div', { style: 'margin-top: 16px; padding-top: 12px; border-top: 2px solid #fed7aa;' },
                    h('div', { style: 'display: flex; justify-content: space-between; font-size: 14px; color: #6b7280; margin-bottom: 4px;' },
                        h('span', {}, '小计'), h('span', {}, '\u00A5' + subtotal.get())
                    ),
                    h('div', { style: 'display: flex; justify-content: space-between; font-size: 14px; color: #6b7280; margin-bottom: 8px;' },
                        h('span', {}, '运费'), h('span', {}, shipping.get() === 0 ? '免运费' : '\u00A5' + shipping.get())
                    ),
                    h('div', { style: 'display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; color: #c2410c; padding-top: 8px; border-top: 1px solid #fed7aa;' },
                        h('span', {}, '总计'), h('span', {}, '\u00A5' + total.get())
                    )
                )
              ),

        // Available products to add
        h('div', { style: 'margin-top: 20px; padding-top: 12px; border-top: 1px dashed #fed7aa;' },
            h('div', { style: 'font-size: 12px; font-weight: 500; color: #92400e; margin-bottom: 8px;' }, '可添加的商品：'),
            h('div', { style: 'display: flex; flex-wrap: wrap; gap: 8px;' },
                ...products.get().filter(function(p) { return p.qty === 0; }).map(function(item) {
                    return h('button', {
                        style: 'display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: white; border: 1px solid #fdba74; border-radius: 20px; font-size: 13px; color: #9a3412; cursor: pointer;',
                        onClick: function() { changeQty(item.id, 1); }
                    }, item.emoji, ' ', item.name, ' \u00A5' + item.price);
                })
            )
        )
    );
});

// ============================================================
// Examples Page
// ============================================================
export const ExamplesPage = defineComponent(() => {
    return () => h('div', { style: 'max-width: 800px; padding: 32px 0;' },
        h('h1', { style: 'font-size: 32px; font-weight: 700; color: #111827; margin: 0 0 8px 0;' }, '✨ 示例'),
        h('p', { style: 'font-size: 16px; color: #6b7280; margin: 0 0 16px 0; line-height: 1.6;' },
            '交互式示例，展示框架的核心能力。每个示例都在测试不同的框架特性。'
        ),
        h('div', { style: 'padding: 16px 20px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; margin-bottom: 48px; font-size: 14px; color: #1e40af; line-height: 1.6;' },
            '\uD83D\uDCA1 这些示例覆盖了日常开发中最常见的场景：状态管理、表单处理、数据表格、电商购物车。React 和 Vue 能实现的功能，Sigil 同样能实现，且对 AI Agent 更友好。'
        ),

        h('div', { style: 'margin-bottom: 48px;' }),
        Counter(),
        h('div', { style: 'margin-top: 12px;' }),
        CodeBlock({ lang: 'tsx', title: 'signal + computed', code: 'const count = signal(0)\nconst doubled = computed(() => count.get() * 2)\n\n// 读写分离：.get() 读取，.set() 写入\n// 无闭包捕获，无依赖数组' }),

        h('div', { style: 'margin-top: 48px;' }),
        TodoApp(),
        h('div', { style: 'margin-top: 12px;' }),
        CodeBlock({ lang: 'tsx', title: '列表 CRUD', code: 'const todos = signal([])\n\n// 不可变数组更新，每次都是新引用\n// 自动触发 effect 和 DOM 更新\nfunction addTodo(text) {\n  todos.set([...todos.get(), { id: Date.now(), text }])\n}' }),

        h('div', { style: 'margin-top: 48px;' }),
        FilterList(),
        h('div', { style: 'margin-top: 12px;' }),
        CodeBlock({ lang: 'tsx', title: 'computed 实时过滤', code: 'const search = signal(\'\')\nconst filtered = computed(() =>\n  items.filter(item =>\n    item.toLowerCase().includes(search.get())\n  )\n)\n// 自动追踪 search 依赖，变化时重新计算' }),

        h('div', { style: 'margin-top: 48px;' }),
        DashboardDemo(),
        h('div', { style: 'margin-top: 12px;' }),
        CodeBlock({ lang: 'tsx', title: '多信号 + 实时更新', code: 'const users = signal(12847)\nconst revenue = signal(89432)\n\n// effect 自动追踪内部 .get() 调用\n// 返回清理函数，自动管理生命周期\neffect(() => {\n  const timer = setInterval(() => {\n    users.set(users.get() + random())\n  }, 2000)\n  return () => clearInterval(timer)\n})' }),

        h('div', { style: 'margin-top: 48px;' }),
        FormValidationDemo(),
        h('div', { style: 'margin-top: 12px;' }),
        CodeBlock({ lang: 'tsx', title: '表单验证', code: 'const username = signal(\'\')\nconst errors = signal({})\n\n// onInput 时验证，实时反馈\nfunction validate() {\n  if (username.get().length < 3) {\n    errors.set({ ...errors.get(), username: \'至少3个字符\' })\n  }\n}\n\n// 计算属性判断表单是否有效\nconst isValid = computed(() =>\n  username.get().length >= 3 && password.get().length >= 6\n)' }),

        h('div', { style: 'margin-top: 48px;' }),
        DataTableDemo(),
        h('div', { style: 'margin-top: 12px;' }),
        CodeBlock({ lang: 'tsx', title: '数据表格', code: '// 多 computed 链式计算\nconst filtered = computed(() => search(data.get()))\nconst sorted = computed(() => sort(filtered.get(), col, dir))\nconst paged = computed(() => paginate(sorted.get(), page))\n\n// 点击列头排序\n// 搜索框实时过滤\n// 分页组件导航' }),

        h('div', { style: 'margin-top: 48px;' }),
        ShoppingCartDemo(),
        h('div', { style: 'margin-top: 12px;' }),
        CodeBlock({ lang: 'tsx', title: '购物车', code: '// 数量增减，computed 自动计算总价\nfunction changeQty(id, delta) {\n  const items = products.get().map(item =>\n    item.id === id ? { ...item, qty: max(0, item.qty + delta) } : item\n  )\n  products.set(items)\n}\n\nconst subtotal = computed(() =>\n  cartItems().reduce((sum, i) => sum + i.price * i.qty, 0)\n)\nconst total = computed(() => subtotal.get() + shipping.get())' }),
    );
});
