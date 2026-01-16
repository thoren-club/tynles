import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Card,
  Text,
  Stack,
  Group,
  Badge,
  Loader,
  Center,
  Button,
  TextInput,
  Divider,
  Select,
} from '@mantine/core';
import { IconUser, IconLanguage, IconBell, IconShield, IconUsers } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../api';

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await api.getUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load user data',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSpace = async () => {
    if (!inviteCode.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Please enter an invite code',
        color: 'orange',
      });
      return;
    }

    setJoining(true);
    try {
      const result = await api.useInviteCode(inviteCode.trim().toUpperCase());
      setInviteCode('');
      notifications.show({
        title: 'Success! 🎉',
        message: `You've joined "${result.space.name}" as ${result.space.role}`,
        color: 'green',
      });
      // Reload page to update spaces
      setTimeout(() => window.location.href = '/spaces', 1000);
    } catch (error: any) {
      console.error('Failed to join space:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to join space. Please check the invite code.',
        color: 'red',
      });
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <Container size="md" py="xl">
        <Center>
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={1}>Settings</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Manage your account and preferences
          </Text>
        </div>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="md">
              <IconUser size={24} />
              <div>
                <Title order={4}>Profile</Title>
                <Text size="sm" c="dimmed">
                  Your account information
                </Text>
              </div>
            </Group>
            <Divider />
            <Group justify="space-between">
              <div>
                <Text fw={500}>Name</Text>
                <Text size="sm" c="dimmed">
                  {user?.firstName || 'Not set'}
                </Text>
              </div>
            </Group>
            <Group justify="space-between">
              <div>
                <Text fw={500}>Username</Text>
                <Text size="sm" c="dimmed">
                  @{user?.username || 'Not set'}
                </Text>
              </div>
            </Group>
            <Group justify="space-between">
              <div>
                <Text fw={500}>Telegram ID</Text>
                <Text size="sm" c="dimmed" style={{ fontFamily: 'monospace' }}>
                  {user?.tgId || 'N/A'}
                </Text>
              </div>
            </Group>
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="md">
              <IconUsers size={24} />
              <div>
                <Title order={4}>Join Space</Title>
                <Text size="sm" c="dimmed">
                  Enter an invite code to join a space
                </Text>
              </div>
            </Group>
            <Divider />
            <Group gap="xs" align="flex-end">
              <TextInput
                placeholder="Enter invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                style={{ flex: 1 }}
                label="Invite Code"
              />
              <Button onClick={handleJoinSpace} loading={joining}>
                Join
              </Button>
            </Group>
            <Text size="xs" c="dimmed">
              You can also use the /invite_use command in the Telegram bot
            </Text>
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="md">
              <IconLanguage size={24} />
              <div>
                <Title order={4}>Language</Title>
                <Text size="sm" c="dimmed">
                  Change your preferred language
                </Text>
              </div>
            </Group>
            <Divider />
            <Text size="sm" c="dimmed">
              Language settings are managed through Telegram bot commands
            </Text>
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="md">
              <IconShield size={24} />
              <div>
                <Title order={4}>Privacy & Security</Title>
                <Text size="sm" c="dimmed">
                  Your data is securely stored and encrypted
                </Text>
              </div>
            </Group>
            <Divider />
            <Text size="sm" c="dimmed">
              All data is stored securely and only accessible through authenticated sessions.
            </Text>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
