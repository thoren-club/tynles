import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppShell, NavLink, Stack } from '@mantine/core';
import { IconHome, IconFolder, IconCheck, IconTarget, IconChartBar } from '@tabler/icons-react';

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
  ];

  return (
    <AppShell
      navbar={{
        width: 80,
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
              label={item.label}
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
