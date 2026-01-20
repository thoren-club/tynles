const API_BASE = (import.meta.env?.PROD ? '/api' : 'http://localhost:3000/api') as string;

console.log('API_BASE configured as:', API_BASE, 'PROD:', import.meta.env?.PROD);

let authHeader: string | null = null;

// Типы для API ответов
// Экспортируем типы для использования в компонентах
export interface SpacesResponse {
  spaces: Array<{
    id: string;
    name: string;
    role: string;
    isCurrent: boolean;
    avatarUrl?: string | null;
  }>;
}

export interface TasksResponse {
  tasks: Array<{
    id: string;
    title: string;
    description?: string;
    difficulty: number;
    xp: number;
    dueAt: string | null;
    isPaused: boolean;
    recurrenceType: string | null;
    recurrencePayload: { daysOfWeek?: number[] } | null;
    assigneeUserId?: string | null;
    assigneeScope?: 'user' | 'space';
    createdAt: string;
  }>;
}

export interface GoalsResponse {
  goals: Array<{
    id: string;
    title: string;
    description?: string;
    difficulty: number;
    xp: number;
    isDone: boolean;
    assigneeUserId?: string | null;
    assigneeScope?: 'user' | 'space';
    targetType?: 'year' | 'month' | 'unlimited';
    targetYear?: number | null;
    targetMonth?: number | null;
    createdAt: string;
  }>;
}

export interface MembersResponse {
  members: Array<{
    id: string;
    username: string | null;
    firstName: string | null;
    photoUrl?: string | null;
    role: string;
    joinedAt: string;
  }>;
}

export interface InviteResponse {
  code: string;
  role: string;
  expiresAt: string;
}

export interface LeaderboardResponse {
  leaderboard: Array<{
    userId: string;
    username: string | null;
    firstName: string | null;
    level: number;
    totalXp: number;
    league?: number;
    leagueName?: string;
    leaguePosition?: number;
  }>;
  periodDays?: number;
}

export interface SpaceLeaderboardResponse {
  leaderboard: Array<{
    userId: string;
    username: string | null;
    firstName: string | null;
    totalXp: number;
    photoUrl?: string | null;
    league?: number;
    leagueName?: string;
    leaguePosition?: number;
    canPoke?: boolean;
    isPokedToday?: boolean;
  }>;
  periodDays: number;
  note?: string;
}

export const api = {
  setAuthHeader(initData: string) {
    authHeader = initData;
  },

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Build URL - prefer header over query parameter for initData
    let url = `${API_BASE}${endpoint}`;
    
    // Only add to URL if we don't have authHeader (fallback for direct access)
    // But prefer header method as it's more reliable
    if (authHeader && !endpoint.includes('?')) {
      // Add as query param only if header method might not work
      url = `${url}?_auth=${encodeURIComponent(authHeader)}`;
    }

    console.log('API request:', {
      url,
      method: options.method || 'GET',
      hasAuthHeader: !!authHeader,
      authHeaderLength: authHeader?.length,
    });

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          // Always send in header - this is the preferred method
          ...(authHeader && { 'x-telegram-init-data': authHeader }),
          ...options.headers,
        },
      });
    } catch (networkError: any) {
      console.error('Network error:', networkError);
      throw new Error(`Network error: ${networkError.message || 'Failed to connect to server'}`);
    }

    console.log('API response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('API error:', error);
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  },

  // Auth
  async getUser() {
    return this.request('/auth/me');
  },

  async updateUserName(firstName: string) {
    return this.request('/auth/me', {
      method: 'PUT',
      body: JSON.stringify({ firstName }),
    });
  },

  async getSpaces(): Promise<SpacesResponse> {
    return this.request<SpacesResponse>('/auth/spaces');
  },

  async switchSpace(spaceId: string) {
    return this.request(`/auth/spaces/${spaceId}/switch`, { method: 'POST' });
  },

  async useInviteCode(code: string) {
    const result = await this.request<any>('/auth/invites/use', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    // После подключения автоматически переключаемся на новое пространство
    if (result?.space?.id) {
      await this.switchSpace(result.space.id);
    }
    return result;
  },

  // Spaces
  async getCurrentSpace() {
    return this.request('/spaces/current');
  },

  async createSpace(name: string) {
    return this.request('/spaces/create', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async deleteSpace(spaceId: string) {
    return this.request(`/spaces/${spaceId}`, {
      method: 'DELETE',
    });
  },

  async leaveSpace(spaceId: string) {
    return this.request(`/spaces/${spaceId}/leave`, {
      method: 'POST',
    });
  },

  // Tasks
  async getTasks(): Promise<TasksResponse> {
    return this.request<TasksResponse>('/tasks');
  },

  async createTask(data: { 
    title: string; 
    difficulty?: number; 
    xp?: number; 
    dueAt?: string;
    timeOfDay?: string;
    description?: string;
    isRecurring?: boolean;
    daysOfWeek?: number[];
    assigneeUserId?: string | null;
    assigneeScope?: 'user' | 'space';
  }) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async completeTask(taskId: string) {
    return this.request(`/tasks/${taskId}/complete`, { method: 'POST' });
  },

  async updateTask(taskId: string, data: {
    title?: string;
    difficulty?: number;
    xp?: number;
    dueAt?: string;
    timeOfDay?: string;
    description?: string;
    isRecurring?: boolean;
    daysOfWeek?: number[];
    assigneeUserId?: string | null;
    assigneeScope?: 'user' | 'space';
  }) {
    return this.request(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteTask(taskId: string) {
    return this.request(`/tasks/${taskId}`, { method: 'DELETE' });
  },

  async setTaskAssignee(taskId: string, userId: string | null) {
    return this.request(`/tasks/${taskId}/assignee`, {
      method: 'PUT',
      body: JSON.stringify({ userId }),
    });
  },

  // Goals
  async getGoals(): Promise<GoalsResponse> {
    return this.request<GoalsResponse>('/goals');
  },

  async createGoal(data: { 
    title: string; 
    difficulty?: number; 
    xp?: number;
    description?: string;
    assigneeUserId?: string | null;
    assigneeScope?: 'user' | 'space';
    targetType?: 'year' | 'month' | 'unlimited';
    targetYear?: number;
    targetMonth?: number;
  }) {
    return this.request('/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async toggleGoal(goalId: string) {
    return this.request(`/goals/${goalId}/toggle`, { method: 'POST' });
  },

  async updateGoal(goalId: string, data: {
    title?: string;
    difficulty?: number;
    xp?: number;
    description?: string;
    assigneeUserId?: string | null;
    assigneeScope?: 'user' | 'space';
    targetType?: 'year' | 'month' | 'unlimited';
    targetYear?: number;
    targetMonth?: number;
  }) {
    return this.request(`/goals/${goalId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteGoal(goalId: string) {
    return this.request(`/goals/${goalId}`, { method: 'DELETE' });
  },

  // Stats
  async getMyStats() {
    return this.request('/stats/me');
  },

  async getWeeklyXp(): Promise<{ days: Array<{ date: string; xp: number }> }> {
    return this.request('/stats/weekly-xp');
  },

  async getLeaderboard(): Promise<LeaderboardResponse> {
    return this.request<LeaderboardResponse>('/stats/leaderboard');
  },

  async getGlobalLeaderboard(page: number = 1): Promise<any> {
    return this.request(`/stats/leaderboard/global?page=${page}`);
  },

  async pokeUser(userId: string): Promise<any> {
    return this.request(`/stats/leaderboard/${userId}/poke`, {
      method: 'POST',
    });
  },

  // Space leaderboard (based on completed tasks in last 30 days)
  async getSpaceLeaderboard(): Promise<SpaceLeaderboardResponse> {
    // Space leaderboard (with poke flags) lives in /stats/leaderboard
    // NOTE: /spaces/current/leaderboard is a legacy endpoint.
    return this.request<SpaceLeaderboardResponse>('/stats/leaderboard');
  },

  // Members
  async getMembers(spaceId?: string): Promise<MembersResponse> {
    const url = spaceId ? `/members?spaceId=${spaceId}` : '/members';
    return this.request<MembersResponse>(url);
  },

  async createInvite(role: 'Admin' | 'Editor' | 'Viewer', spaceId?: string): Promise<InviteResponse> {
    const url = spaceId ? `/members/invites?spaceId=${spaceId}` : '/members/invites';
    return this.request<InviteResponse>(url, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  },

  async updateMemberRole(userId: string, role: 'Admin' | 'Editor' | 'Viewer', spaceId?: string) {
    const url = spaceId ? `/members/${userId}/role?spaceId=${spaceId}` : `/members/${userId}/role`;
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },

  // Level Rewards
  async getLevelRewards(spaceId?: string) {
    const url = spaceId ? `/spaces/${spaceId}/rewards` : '/spaces/current/rewards';
    return this.request<{ rewards: Array<{ level: number; text: string }> }>(url);
  },
  
  async getSpaceInfo(spaceId: string) {
    return this.request<{ id: string; name: string; role: string; isOwner: boolean; avatarUrl?: string | null }>(`/spaces/${spaceId}/info`);
  },

  async updateSpaceName(spaceId: string, name: string) {
    return this.request<{ success: boolean; name?: string }>(`/spaces/${spaceId}/name`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  },

  async updateSpaceAvatar(spaceId: string, avatarData: string) {
    return this.request<{ avatarUrl?: string | null }>(`/spaces/${spaceId}/avatar`, {
      method: 'PUT',
      body: JSON.stringify({ avatarData }),
    });
  },

  async updateLevelReward(level: number, text: string, spaceId?: string) {
    const url = spaceId ? `/spaces/${spaceId}/rewards/${level}` : `/spaces/current/rewards/${level}`;
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify({ text }),
    });
  },

  // Stories
  async getStories() {
    return this.request<{ stories: Array<{
      id: string;
      type: 'Weekly' | 'Admin';
      data: {
        tasksCompleted?: number;
        levelsGained?: number;
        leaderboardChange?: number; // может быть отрицательным
      };
      weekStartDate: string;
      createdAt: string;
    }> }>('/stories');
  },

  // Notifications
  async getNotificationSettings() {
    return this.request<{
      taskRemindersEnabled: boolean;
      reminderHoursBefore: number;
      pokeEnabled: boolean;
    }>('/notifications/settings');
  },

  async updateNotificationSettings(settings: {
    taskRemindersEnabled?: boolean;
    reminderHoursBefore?: number;
    pokeEnabled?: boolean;
  }) {
    return this.request('/notifications/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },
};
