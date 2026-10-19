import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Badge } from './badge';

const meta = {
  title: 'UI/Badge',
  component: Badge,
  args: { children: 'New' },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};
export const Primary: Story = { args: { tone: 'primary', children: '12 new' } };
export const Success: Story = { args: { tone: 'success', children: 'Won' } };
export const Warning: Story = { args: { tone: 'warning', children: 'Qualified' } };
export const Danger: Story = { args: { tone: 'danger', children: 'Overdue' } };
