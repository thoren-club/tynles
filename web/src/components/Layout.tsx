import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppShell, NavLink, Stack, Text } from '@mantine/core';
import { IconHome, IconFolder, IconCheck, IconTarget, IconChartBar, IconUsers, IconSettings } from '@tabler/icons-react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: IconHome },
    { path: '/spaces', label: 'Spaces', icon: IconFolder },
    { path: '/tasks', label: 'Tasks', icon: IconCheck },
    { path: '/goals', label: 'Goals', icon: IconTarget },
    { path: '/stats', label: 'Stats', icon: IconChartBar },
    { path: '/members', label: 'Members', icon: IconUsers },
    { path: '/settings', label: 'Settings', icon: IconSettings },
  ];

  return (
    <AppShell
      navbar={{
        width: { base: 70, sm: 200 },
        breakpoint: 'sm',
      }}
      padding="md"
    >
      <AppShell.Navbar p="md">
        <Stack gap="xs">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              component={Link}
              to={item.path}
              label={<Text size="sm">{item.label}</Text>}
              leftSection={<item.icon size={20} />}
              active={location.pathname === item.path}
              variant="light"
            />
          ))}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
