import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Button,
  Card,
  Text,
  TextInput,
  NumberInput,
  Stack,
  Group,
  Badge,
  ActionIcon,
  Loader,
  Center,
  Tooltip,
} from '@mantine/core';
import { IconPlus, IconTrash, IconCheck, IconTarget, IconCircleCheck } from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { api } from '../api';

export default function Goals() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', difficulty: 1, xp: 0 });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const data = await api.getGoals();
      setGoals(data.goals);
    } catch (error) {
      console.error('Failed to load goals:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load goals',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!newGoal.title.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Goal title is required',
        color: 'orange',
      });
      return;
    }

    try {
      await api.createGoal(newGoal);
      setNewGoal({ title: '', difficulty: 1, xp: 0 });
      setShowCreate(false);
      loadGoals();
      notifications.show({
        title: 'Success',
        message: 'Goal created successfully',
        color: 'green',
      });
    } catch (error) {
      console.error('Failed to create goal:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to create goal',
        color: 'red',
      });
    }
  };

  const handleToggleGoal = async (goalId: string) => {
    try {
      const result = await api.toggleGoal(goalId) as { isDone: boolean; xp: number };
      loadGoals();
      if (result.isDone) {
        notifications.show({
          title: 'Goal Completed! 🎉',
          message: `You earned ${result.xp} XP!`,
          color: 'green',
        });
      } else {
        notifications.show({
          title: 'Goal Unmarked',
          message: 'Goal marked as incomplete',
          color: 'blue',
        });
      }
    } catch (error) {
      console.error('Failed to toggle goal:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to toggle goal',
        color: 'red',
      });
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    modals.openConfirmModal({
      title: 'Delete Goal',
      children: <Text size="sm">Are you sure you want to delete this goal?</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.deleteGoal(goalId);
          loadGoals();
          notifications.show({
            title: 'Success',
            message: 'Goal deleted successfully',
            color: 'green',
          });
        } catch (error) {
          console.error('Failed to delete goal:', error);
          notifications.show({
            title: 'Error',
            message: 'Failed to delete goal',
            color: 'red',
          });
        }
      },
    });
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
          <Title order={1}>Goals</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setShowCreate(!showCreate)}
            variant={showCreate ? 'outline' : 'filled'}
          >
            {showCreate ? 'Cancel' : 'Add Goal'}
          </Button>
        </Group>

        {showCreate && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="md">
              <TextInput
                placeholder="Goal title"
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                label="Title"
                required
              />
              <Group grow>
                <NumberInput
                  placeholder="Difficulty"
                  value={newGoal.difficulty}
                  onChange={(value) => setNewGoal({ ...newGoal, difficulty: Number(value) || 1 })}
                  label="Difficulty"
                  min={1}
                  max={5}
                />
                <NumberInput
                  placeholder="XP"
                  value={newGoal.xp}
                  onChange={(value) => setNewGoal({ ...newGoal, xp: Number(value) || 0 })}
                  label="XP"
                  min={0}
                />
              </Group>
              <Button onClick={handleCreateGoal} leftSection={<IconCheck size={16} />}>
                Create Goal
              </Button>
            </Stack>
          </Card>
        )}

        <Stack gap="md">
          {goals.length === 0 ? (
            <Card shadow="sm" padding="xl" radius="md" withBorder>
              <Center>
                <Text c="dimmed" size="lg">
                  No goals yet. Create your first goal!
                </Text>
              </Center>
            </Card>
          ) : (
            goals.map((goal) => (
              <Card 
                key={goal.id} 
                shadow="sm" 
                padding="lg" 
                radius="md" 
                withBorder
                style={{
                  opacity: goal.isDone ? 0.7 : 1,
                  textDecoration: goal.isDone ? 'line-through' : 'none',
                }}
              >
                <Group justify="space-between">
                  <div style={{ flex: 1 }}>
                    <Group gap="xs" mb="xs">
                      <IconTarget size={20} />
                      <Text fw={500} size="lg" c={goal.isDone ? 'dimmed' : undefined}>
                        {goal.title}
                      </Text>
                      {goal.isDone && (
                        <Badge color="green" variant="light">
                          Done
                        </Badge>
                      )}
                    </Group>
                    <Group gap="xs">
                      <Badge variant="light" color="blue">
                        Difficulty: {goal.difficulty}
                      </Badge>
                      <Badge variant="light" color="green">
                        {goal.xp} XP
                      </Badge>
                    </Group>
                  </div>
                  <Group gap="xs">
                    <Tooltip label={goal.isDone ? 'Mark as incomplete' : 'Mark as complete'}>
                      <ActionIcon
                        color={goal.isDone ? 'gray' : 'green'}
                        variant="light"
                        onClick={() => handleToggleGoal(goal.id)}
                        size="lg"
                      >
                        {goal.isDone ? <IconCheck size={20} /> : <IconCircleCheck size={20} />}
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete goal">
                      <ActionIcon
                        color="red"
                        variant="light"
                        onClick={() => handleDeleteGoal(goal.id)}
                        size="lg"
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Group>
              </Card>
            ))
          )}
        </Stack>
      </Stack>
    </Container>
  );
}
