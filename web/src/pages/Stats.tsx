import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Card,
  Text,
  Grid,
  Stack,
  Badge,
  Loader,
  Center,
  Group,
  Progress,
  ThemeIcon,
} from '@mantine/core';
import { IconTrophy, IconTrendingUp, IconStar } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../api';

export default function Stats() {
  const [myStats, setMyStats] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [myStatsData, leaderboardData] = await Promise.all([
        api.getMyStats(),
        api.getLeaderboard(),
      ]);
      setMyStats(myStatsData);
      setLeaderboard(leaderboardData.leaderboard);
    } catch (error) {
      console.error('Failed to load stats:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load statistics',
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

  const myRank = leaderboard.findIndex((entry) => entry.userId === myStats?.userId) + 1;
  const nextLevelXp = myStats?.nextLevelXp || 100;
  const currentLevelXp = myStats?.currentLevelXp || 0;
  const xpProgress = ((currentLevelXp / nextLevelXp) * 100) || 0;

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1}>Statistics</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Track your progress and compete with others
          </Text>
        </div>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Title order={3}>Your Progress</Title>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Card padding="md" withBorder>
                  <Stack gap="xs" align="center">
                    <ThemeIcon size={64} radius="md" variant="light" color="blue">
                      <IconTrophy size={32} />
                    </ThemeIcon>
                    <Text size="xl" fw={700}>
                      Level {myStats?.level || 1}
                    </Text>
                    <Text size="sm" c="dimmed">
                      Current Level
                    </Text>
                  </Stack>
                </Card>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Card padding="md" withBorder>
                  <Stack gap="xs" align="center">
                    <ThemeIcon size={64} radius="md" variant="light" color="green">
                      <IconTrendingUp size={32} />
                    </ThemeIcon>
                    <Text size="xl" fw={700}>
                      {myStats?.totalXp || 0}
                    </Text>
                    <Text size="sm" c="dimmed">
                      Total XP
                    </Text>
                  </Stack>
                </Card>
              </Grid.Col>
            </Grid>

            <div>
              <Group justify="space-between" mb="xs">
                <Text size="sm" fw={500}>
                  Progress to Level {(myStats?.level || 1) + 1}
                </Text>
                <Text size="sm" c="dimmed">
                  {currentLevelXp} / {nextLevelXp} XP
                </Text>
              </Group>
              <Progress value={xpProgress} size="lg" radius="md" />
            </div>

            {myRank > 0 && (
              <Card padding="md" withBorder bg="var(--mantine-color-blue-light)">
                <Group gap="md">
                  <ThemeIcon size={48} radius="md" color="blue" variant="light">
                    <IconStar size={24} />
                  </ThemeIcon>
                  <div>
                    <Text fw={500}>Your Rank</Text>
                    <Text size="xl" fw={700} c="blue">
                      #{myRank}
                    </Text>
                  </div>
                </Group>
              </Card>
            )}
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md">
            <Title order={3}>Leaderboard</Title>
            {leaderboard.length === 0 ? (
              <Center py="xl">
                <Stack gap="xs" align="center">
                  <IconTrophy size={48} stroke={1} opacity={0.3} />
                  <Text c="dimmed">No leaderboard data yet</Text>
                </Stack>
              </Center>
            ) : (
              <Stack gap="xs">
                {leaderboard.map((entry, index) => {
                  const isMe = entry.userId === myStats?.userId;
                  return (
                    <Card
                      key={entry.userId}
                      padding="md"
                      radius="md"
                      withBorder
                      style={{
                        borderColor: isMe ? 'var(--mantine-color-blue-6)' : undefined,
                        borderWidth: isMe ? 2 : 1,
                        backgroundColor: isMe ? 'var(--mantine-color-blue-0)' : undefined,
                      }}
                    >
                      <Group justify="space-between">
                        <Group gap="md">
                          <ThemeIcon
                            size={40}
                            radius="md"
                            variant="light"
                            color={
                              index === 0
                                ? 'yellow'
                                : index === 1
                                ? 'gray'
                                : index === 2
                                ? 'orange'
                                : 'blue'
                            }
                          >
                            <Text fw={700} size="sm">
                              {index + 1}
                            </Text>
                          </ThemeIcon>
                          <div>
                            <Text fw={500}>
                              {entry.firstName || entry.username || 'Unknown'}
                              {isMe && (
                                <Badge ml="xs" size="xs" color="blue">
                                  You
                                </Badge>
                              )}
                            </Text>
                            <Group gap="xs" mt={4}>
                              <Badge variant="light" size="sm">
                                Level {entry.level}
                              </Badge>
                              <Badge variant="light" color="green" size="sm">
                                {entry.totalXp} XP
                              </Badge>
                            </Group>
                          </div>
                        </Group>
                        {index < 3 && (
                          <ThemeIcon size={32} radius="md" variant="light" color="yellow">
                            <IconTrophy size={20} />
                          </ThemeIcon>
                        )}
                      </Group>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
