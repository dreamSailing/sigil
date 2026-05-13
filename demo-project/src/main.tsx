// Copyright (c) 2026 DreamSailing
// SPDX-License-Identifier: MIT

// Mock data
const USERS = [
    { id: 1, name: 'Alice', role: 'Admin', status: 'active' },
    { id: 2, name: 'Bob', role: 'Editor', status: 'inactive' },
    { id: 3, name: 'Charlie', role: 'User', status: 'active' },
    { id: 4, name: 'Diana', role: 'Admin', status: 'active' },
    { id: 5, name: 'Eve', role: 'User', status: 'inactive' },
];

// Component: User Row
const UserRow = defineComponent((user: any) => () => {
    const statusMap: Record<string, { variant: string; label: string }> = {
        active: { variant: 'success', label: 'Active' },
        inactive: { variant: 'danger', label: 'Inactive' },
    };
    const status = statusMap[user.status] || statusMap.active;

    return Flex({ gap: '16px', align: 'center', justify: 'space-between', 'data-key': String(user.id) },
        Flex({ gap: '12px', align: 'center' },
            Avatar({ name: user.name, size: 'md' }),
            Stack({ gap: '2px' },
                Text({ bold: true, color: '#111827', size: '16px' }, user.name),
                Text({ size: '14px', color: '#6b7280' }, user.role)
            )
        ),
        Badge({ variant: status.variant as any }, status.label)
    );
});

// Main App
const App = defineComponent(() => {
    // State
    const users = signal(USERS);
    const searchQuery = signal('');
    const showInactive = signal(true);

    // Computed
    const activeCount = computed(() =>
        users.get().filter(u => u.status === 'active').length
    );

    const filteredUsers = computed(() => {
        const query = searchQuery.get().toLowerCase();
        const list = users.get();
        return list.filter(u => {
            const matchName = u.name.toLowerCase().includes(query);
            const matchStatus = showInactive.get() ? true : u.status === 'active';
            return matchName && matchStatus;
        });
    });

    // Effect for logging
    effect(() => {
        console.log(`🔍 [Effect] 搜索: "${searchQuery.get()}" (匹配 ${filteredUsers.get().length} 条)`);
    });

    return () => h('div', { style: 'min-height: 100vh; background: #f9fafb;' },
        // Header
        Container({},
            Stack({ gap: '24px' },
                // Title
                Flex({ align: 'center', justify: 'space-between', wrap: 'wrap' },
                    Stack({ gap: '4px' },
                        Heading({ level: 'h1' }, '🚀 AI-Native Admin'),
                        Text({ color: '#6b7280' }, '基于显式信号与静态分析的高性能框架 MVP')
                    ),
                    Flex({ gap: '8px' },
                        Button({ variant: 'outline', size: 'sm' }, '导出'),
                        Button({ variant: 'primary', size: 'sm' }, '+ 添加用户')
                    )
                ),

                // Stats
                Grid({ cols: 3, gap: '16px' },
                    Stat({ label: '总用户', value: computed(() => users.get().length), accent: '#3b82f6' }),
                    Stat({ label: '活跃用户', value: activeCount, accent: '#22c55e' }),
                    Stat({ label: '搜索结果', value: computed(() => filteredUsers.get().length), accent: '#f59e0b' })
                ),

                // Search + Filter Bar
                Card({},
                    Flex({ gap: '16px', align: 'center', justify: 'space-between' },
                        h('div', { style: 'flex: 1;' },
                            SearchInput({
                                placeholder: '输入姓名搜索...',
                                onInput: (e: any) => searchQuery.set(e.target.value),
                            })
                        ),
                        Checkbox({
                            checked: showInactive.get(),
                            label: '显示非活跃用户',
                            onChange: () => showInactive.set(!showInactive.get()),
                        })
                    )
                ),

                // User List
                Card({ padding: '0' },
                    TableHeader({}, 'User List'),
                    TableBody({},
                        filteredUsers.get().length === 0
                            ? EmptyState({}, '没有找到匹配的用户')
                            : Flex({ direction: 'column' },
                                ...filteredUsers.get().map(u => UserRow(u))
                            )
                    )
                )
            )
        )
    );
});

// Mount
document.body.appendChild(App());
