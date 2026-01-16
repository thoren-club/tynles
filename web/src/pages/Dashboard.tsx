import { useEffect, useState } from 'react';
import { Container, Title, Text, Card, Grid, Stack, Badge, Loader, Center } from '@mantine/core';
import { IconTrophy, IconTarget, IconCheck, IconTrendingUp } from '@tabler/icons-react';
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
        <Stack gap="md">
          <Title order={1}>Welcome!</Title>
          <Text>Create your first space to get started.</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={1}>{space.name}</Title>
          <Badge mt="xs" variant="light">
            {space.role}
          </Badge>
        </div>

        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Stack gap="xs">
                <IconTrophy size={32} stroke={1.5} />
                <Text size="lg" fw={700}>
                  Level {stats?.level || 0}
                </Text>
                <Text size="sm" c="dimmed">
                  Current Level
                </Text>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Stack gap="xs">
                <IconTrendingUp size={32} stroke={1.5} />
                <Text size="lg" fw={700}>
                  {stats?.totalXp || 0} XP
                </Text>
                <Text size="sm" c="dimmed">
                  Total Experience
                </Text>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Stack gap="xs">
                <IconCheck size={32} stroke={1.5} />
                <Text size="lg" fw={700}>
                  {stats?.completedTasks || 0}
                </Text>
                <Text size="sm" c="dimmed">
                  Completed Tasks
                </Text>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Stack gap="xs">
                <IconTarget size={32} stroke={1.5} />
                <Text size="lg" fw={700}>
                  {stats?.completedGoals || 0}
                </Text>
                <Text size="sm" c="dimmed">
                  Completed Goals
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
          <div className="stat-value">{stats?.level || 1}</div>
          <div className="stat-label">Level</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.totalXp || 0}</div>
          <div className="stat-label">XP</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{space.stats.tasks}</div>
          <div className="stat-label">Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{space.stats.goals}</div>
          <div className="stat-label">Goals</div>
        </div>
      </div>
    </div>
  );
}
