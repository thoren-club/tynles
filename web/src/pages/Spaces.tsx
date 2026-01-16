import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Button,
  Card,
  Text,
  TextInput,
  Stack,
  Group,
  Badge,
  Loader,
  Center,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { IconPlus, IconFolder, IconCheck, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../api';

export default function Spaces() {
  const [spaces, setSpaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [creating, setCreating] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    loadSpaces();
  }, []);

  const loadSpaces = async () => {
    try {
      const data = await api.getSpaces();
      setSpaces(data.spaces);
    } catch (error) {
      console.error('Failed to load spaces:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load spaces',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Space name is required',
        color: 'orange',
      });
      return;
    }

    setCreating(true);
    try {
      await api.createSpace(newSpaceName);
      setNewSpaceName('');
      setShowCreate(false);
      await loadSpaces();
      notifications.show({
        title: 'Success',
        message: 'Space created successfully',
        color: 'green',
      });
    } catch (error) {
      console.error('Failed to create space:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to create space',
        color: 'red',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSwitchSpace = async (spaceId: string) => {
    setSwitching(spaceId);
    try {
      await api.switchSpace(spaceId);
      notifications.show({
        title: 'Success',
        message: 'Space switched successfully',
        color: 'green',
      });
      // Reload to update all data
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error('Failed to switch space:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to switch space',
        color: 'red',
      });
      setSwitching(null);
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
        <Group justify="space-between">
          <div>
            <Title order={1}>Spaces</Title>
            <Text c="dimmed" size="sm" mt={4}>
              Manage your workspaces
            </Text>
          </div>
          <Group gap="xs">
            <Tooltip label="Refresh">
              <ActionIcon variant="light" onClick={loadSpaces} loading={loading}>
                <IconRefresh size={18} />
              </ActionIcon>
            </Tooltip>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setShowCreate(!showCreate)}
              variant={showCreate ? 'outline' : 'filled'}
            >
              {showCreate ? 'Cancel' : 'Create Space'}
            </Button>
          </Group>
        </Group>

        {showCreate && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="md">
              <TextInput
                placeholder="Enter space name"
                value={newSpaceName}
                onChange={(e) => setNewSpaceName(e.target.value)}
                label="Space Name"
                required
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !creating) {
                    handleCreateSpace();
                  }
                }}
              />
              <Group justify="flex-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreate(false);
                    setNewSpaceName('');
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateSpace} loading={creating} leftSection={<IconCheck size={16} />}>
                  Create Space
                </Button>
              </Group>
            </Stack>
          </Card>
        )}

        <Stack gap="md">
          {spaces.length === 0 ? (
            <Card shadow="sm" padding="xl" radius="md" withBorder>
              <Center>
                <Stack gap="md" align="center">
                  <IconFolder size={64} stroke={1} opacity={0.3} />
                  <div>
                    <Text fw={500} size="lg" ta="center">
                      No spaces yet
                    </Text>
                    <Text c="dimmed" size="sm" ta="center" mt={4}>
                      Create your first space to get started
                    </Text>
                  </div>
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => setShowCreate(true)}
                  >
                    Create Space
                  </Button>
                </Stack>
              </Center>
            </Card>
          ) : (
            spaces.map((space) => (
              <Card
                key={space.id}
                shadow="sm"
                padding="lg"
                radius="md"
                withBorder
                style={{
                  cursor: space.isCurrent ? 'default' : 'pointer',
                  borderColor: space.isCurrent ? 'var(--mantine-color-blue-6)' : undefined,
                  borderWidth: space.isCurrent ? 2 : 1,
                }}
                onClick={() => !space.isCurrent && !switching && handleSwitchSpace(space.id)}
              >
                <Group justify="space-between">
                  <Group gap="md">
                    <IconFolder size={24} />
                    <div>
                      <Group gap="xs" mb={4}>
                        <Text fw={500} size="lg">
                          {space.name}
                        </Text>
                        {space.isCurrent && (
                          <Badge color="blue" variant="light">
                            Current
                          </Badge>
                        )}
                      </Group>
                      <Badge variant="light" color="gray">
                        {space.role}
                      </Badge>
                    </div>
                  </Group>
                  {!space.isCurrent && (
                    <Button
                      variant="light"
                      loading={switching === space.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSwitchSpace(space.id);
                      }}
                    >
                      Switch
                    </Button>
                  )}
                  {space.isCurrent && (
                    <Badge color="blue" size="lg">
                      Active
                    </Badge>
                  )}
                </Group>
              </Card>
            ))
          )}
        </Stack>
      </Stack>
    </Container>
  );
}
