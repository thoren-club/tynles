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
import { IconPlus, IconTrash, IconCheck, IconCircleCheck } from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { api } from '../api';

export default function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', difficulty: 1, xp: 0 });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await api.getTasks();
      setTasks(data.tasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load tasks',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      notifications.show({
        title: 'Validation Error',
        message: 'Task title is required',
        color: 'orange',
      });
      return;
    }

    try {
      await api.createTask(newTask);
      setNewTask({ title: '', difficulty: 1, xp: 0 });
      setShowCreate(false);
      loadTasks();
      notifications.show({
        title: 'Success',
        message: 'Task created successfully',
        color: 'green',
      });
    } catch (error) {
      console.error('Failed to create task:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to create task',
        color: 'red',
      });
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const result = await api.completeTask(taskId) as { xpEarned: number; newLevel: number | null };
      loadTasks();
      notifications.show({
        title: 'Task Completed! 🎉',
        message: `You earned ${result.xpEarned} XP${result.newLevel ? ` and reached level ${result.newLevel}!` : '!'}`,
        color: 'green',
      });
    } catch (error) {
      console.error('Failed to complete task:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to complete task',
        color: 'red',
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    modals.openConfirmModal({
      title: 'Delete Task',
      children: <Text size="sm">Are you sure you want to delete this task?</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.deleteTask(taskId);
          loadTasks();
          notifications.show({
            title: 'Success',
            message: 'Task deleted successfully',
            color: 'green',
          });
        } catch (error) {
          console.error('Failed to delete task:', error);
          notifications.show({
            title: 'Error',
            message: 'Failed to delete task',
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
          <Title order={1}>Tasks</Title>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setShowCreate(!showCreate)}
            variant={showCreate ? 'outline' : 'filled'}
          >
            {showCreate ? 'Cancel' : 'Add Task'}
          </Button>
        </Group>

        {showCreate && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="md">
              <TextInput
                placeholder="Task title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                label="Title"
                required
              />
              <Group grow>
                <NumberInput
                  placeholder="Difficulty"
                  value={newTask.difficulty}
                  onChange={(value) => setNewTask({ ...newTask, difficulty: Number(value) || 1 })}
                  label="Difficulty"
                  min={1}
                  max={5}
                />
                <NumberInput
                  placeholder="XP"
                  value={newTask.xp}
                  onChange={(value) => setNewTask({ ...newTask, xp: Number(value) || 0 })}
                  label="XP"
                  min={0}
                />
              </Group>
              <Button onClick={handleCreateTask} leftSection={<IconCheck size={16} />}>
                Create Task
              </Button>
            </Stack>
          </Card>
        )}

        <Stack gap="md">
          {tasks.length === 0 ? (
            <Card shadow="sm" padding="xl" radius="md" withBorder>
              <Center>
                <Text c="dimmed" size="lg">
                  No tasks yet. Create your first task!
                </Text>
              </Center>
            </Card>
          ) : (
            tasks.map((task) => (
              <Card key={task.id} shadow="sm" padding="lg" radius="md" withBorder>
                <Group justify="space-between">
                  <div style={{ flex: 1 }}>
                    <Text fw={500} size="lg">
                      {task.title}
                    </Text>
                    <Group gap="xs" mt="xs">
                      <Badge variant="light" color="blue">
                        Difficulty: {task.difficulty}
                      </Badge>
                      <Badge variant="light" color="green">
                        {task.xp} XP
                      </Badge>
                    </Group>
                  </div>
                  <Group gap="xs">
                    <Tooltip label="Complete task">
                      <ActionIcon
                        color="green"
                        variant="light"
                        onClick={() => handleCompleteTask(task.id)}
                        size="lg"
                      >
                        <IconCircleCheck size={20} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Delete task">
                      <ActionIcon
                        color="red"
                        variant="light"
                        onClick={() => handleDeleteTask(task.id)}
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
