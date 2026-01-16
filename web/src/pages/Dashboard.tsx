import { useEffect, useState } from 'react';
import { 
  Container, 
  Title, 
  Text, 
  Card, 
  Grid, 
  Stack, 
  Badge, 
  Loader, 
  Center,
  ThemeIcon,
  Progress,
  Group,
  Button,
} from '@mantine/core';
import { IconTrophy, IconTarget, IconCheck, IconFolderPlus } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { api } from '../api';

export default function Dashboard() {
  const [space, setSpace] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [spaceData, statsData] = await Promise.all([
        api.getCurrentSpace(),
        api.getMyStats(),
      ]);
      setSpace(spaceData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load dashboard data',
        color: 'red',
      });
    } finally {
      setLoading(false);
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

  if (!space) {
    return (
      <Container size="md" py="xl">
        <Card shadow="sm" padding="xl" radius="md" withBorder>
          <Stack gap="lg" align="center">
            <ThemeIcon size={80} radius="md" variant="light" color="blue">
              <IconFolderPlus size={40} />
            </ThemeIcon>
            <div style={{ textAlign: 'center' }}>
              <Title order={1} mb="xs">Welcome!</Title>
              <Text c="dimmed" size="lg" mb="xl">
                Create your first space to get started with task management
              </Text>
            </div>
            <Button
              component={Link}
              to="/spaces"
              size="lg"
              leftSection={<IconFolderPlus size={20} />}
            >
              Create Your First Space
            </Button>
          </Stack>
        </Card>
      </Container>
    );
  }

  const nextLevelXp = stats?.nextLevelXp || 100;
  const currentLevelXp = stats?.currentLevelXp || 0;
  const xpProgress = ((currentLevelXp / nextLevelXp) * 100) || 0;

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <div>
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={1}>{space.name}</Title>
              <Badge mt="xs" variant="light" size="lg">
                {space.role}
              </Badge>
            </div>
          </Group>
        </div>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <div>
                <Text size="sm" c="dimmed" mb={4}>
                  Level {stats?.level || 1}
                </Text>
                <Text size="xl" fw={700}>
                  {stats?.totalXp || 0} XP
                </Text>
              </div>
              <ThemeIcon size={64} radius="md" variant="light" color="blue">
                <IconTrophy size={32} />
              </ThemeIcon>
            </Group>
            <div>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  Progress to Level {(stats?.level || 1) + 1}
                </Text>
                <Text size="sm" fw={500}>
                  {currentLevelXp} / {nextLevelXp} XP
                </Text>
              </Group>
              <Progress value={xpProgress} size="lg" radius="md" />
            </div>
          </Stack>
        </Card>

        <Grid>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder component={Link} to="/tasks" style={{ textDecoration: 'none', cursor: 'pointer' }}>
              <Group gap="md">
                <ThemeIcon size={48} radius="md" variant="light" color="green">
                  <IconCheck size={24} />
                </ThemeIcon>
                <div style={{ flex: 1 }}>
                  <Text size="xl" fw={700}>
                    {stats?.completedTasks || 0}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Completed Tasks
                  </Text>
                </div>
              </Group>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder component={Link} to="/goals" style={{ textDecoration: 'none', cursor: 'pointer' }}>
              <Group gap="md">
                <ThemeIcon size={48} radius="md" variant="light" color="orange">
                  <IconTarget size={24} />
                </ThemeIcon>
                <div style={{ flex: 1 }}>
                  <Text size="xl" fw={700}>
                    {stats?.completedGoals || 0}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Completed Goals
                  </Text>
                </div>
              </Group>
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
