import { signal, defineComponent, h } from '/@runtime';
import { Button, Heading, Text, Stack } from '/@ui';

export const App = defineComponent(() => {
  const count = signal(0);

  return () => h(Stack, { gap: '16px', style: { padding: '40px' } },
    h(Heading, { level: 'h1' }, 'Hello Sigil!'),
    h(Text, {}, 'Count: ' + count.get()),
    h(Button, {
      variant: 'primary',
      onClick: () => count.set(count.get() + 1),
    }, 'Increment'),
  );
});

document.body.appendChild(App());
