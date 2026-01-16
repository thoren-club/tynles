import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Button,
  Card,
  Text,
  Select,
  Stack,
  Group,
  Badge,
  Loader,
  Center,
  TextInput,
  ActionIcon,
  Tooltip,
  CopyButton,
  ThemeIcon,
} from '@mantine/core';
import { IconPlus, IconUsers, IconCopy, IconCheck, IconShield, IconEdit, IconEye } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../api';

const roleIcons = {
  Admin: IconShield,
  Editor: IconEdit,
  Viewer: IconEye,
};

const roleColors = {
  Admin: 'red',
  Editor: 'blue',
  Viewer: 'gray',
};

export default function Members() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'Admin' | 'Editor' | 'Viewer'>('Editor');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const data = await api.getMembers();
      setMembers(data.members);
    } catch (error) {
      console.error('Failed to load members:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load members',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    setCreating(true);
    try {
      const data = await api.createInvite(selectedRole);
      setInviteCode(data.code);
      notifications.show({
        title: 'Success',
        message: 'Invite code created successfully',
        color: 'green',
      });
    } catch (error: any) {
      console.error('Failed to create invite:', error);
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to create invite. Make sure you are an Admin.',
        color: 'red',
      });
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notifications.show({
        title: 'Copied!',
        message: 'Invite code copied to clipboard',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Failed to copy to clipboard',
        color: 'red',
      });
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
            <Title order={1}>Members</Title>
            <Text c="dimmed" size="sm" mt={4}>
              Manage team members and permissions
            </Text>
          </div>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => {
              setShowInvite(!showInvite);
              if (showInvite) {
                setInviteCode(null);
              }
            }}
            variant={showInvite ? 'outline' : 'filled'}
          >
            {showInvite ? 'Cancel' : 'Invite Member'}
          </Button>
        </Group>

        {showInvite && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="md">
              <Select
                label="Role"
                placeholder="Select role"
                value={selectedRole}
                onChange={(value) => setSelectedRole(value as any)}
                data={[
                  { value: 'Admin', label: 'Admin - Full access' },
                  { value: 'Editor', label: 'Editor - Can edit tasks and goals' },
                  { value: 'Viewer', label: 'Viewer - Read-only access' },
                ]}
                required
              />
              <Group justify="flex-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowInvite(false);
                    setInviteCode(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateInvite} loading={creating} leftSection={<IconCheck size={16} />}>
                  Create Invite
                </Button>
              </Group>

              {inviteCode && (
                <Card padding="md" withBorder bg="var(--mantine-color-blue-light)">
                  <Stack gap="sm">
                    <Text size="sm" fw={500}>
                      Invite Code Created
                    </Text>
                    <Group gap="xs">
                      <TextInput
                        value={inviteCode}
                        readOnly
                        style={{ flex: 1 }}
                        styles={{
                          input: {
                            fontFamily: 'monospace',
                            fontWeight: 600,
                          },
                        }}
                      />
                      <CopyButton value={inviteCode}>
                        {({ copied, copy }) => (
                          <Tooltip label={copied ? 'Copied!' : 'Copy'}>
                            <ActionIcon
                              color={copied ? 'teal' : 'blue'}
                              variant="light"
                              onClick={copy}
                              size="lg"
                            >
                              {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </CopyButton>
                    </Group>
                    <Text size="xs" c="dimmed">
                      Share this code with the person you want to invite
                    </Text>
                  </Stack>
                </Card>
              )}
            </Stack>
          </Card>
        )}

        <Stack gap="md">
          {members.length === 0 ? (
            <Card shadow="sm" padding="xl" radius="md" withBorder>
              <Center>
                <Stack gap="md" align="center">
                  <IconUsers size={64} stroke={1} opacity={0.3} />
                  <div>
                    <Text fw={500} size="lg" ta="center">
                      No members yet
                    </Text>
                    <Text c="dimmed" size="sm" ta="center" mt={4}>
                      Invite team members to collaborate
                    </Text>
                  </div>
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => setShowInvite(true)}
                  >
                    Invite Member
                  </Button>
                </Stack>
              </Center>
            </Card>
          ) : (
            members.map((member) => {
              const RoleIcon = roleIcons[member.role as keyof typeof roleIcons] || IconUsers;
              const roleColor = roleColors[member.role as keyof typeof roleColors] || 'gray';

              return (
                <Card key={member.id} shadow="sm" padding="lg" radius="md" withBorder>
                  <Group justify="space-between">
                    <Group gap="md">
                      <ThemeIcon size={40} radius="md" variant="light" color={roleColor}>
                        <RoleIcon size={20} />
                      </ThemeIcon>
                      <div>
                        <Text fw={500} size="lg">
                          {member.firstName || member.username || 'Unknown User'}
                        </Text>
                        <Text size="sm" c="dimmed" mt={2}>
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </Text>
                      </div>
                    </Group>
                    <Badge color={roleColor} variant="light" size="lg">
                      {member.role}
                    </Badge>
                  </Group>
                </Card>
              );
            })
          )}
        </Stack>
      </Stack>
    </Container>
  );
}
