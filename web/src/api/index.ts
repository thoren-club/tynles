const API_BASE = (import.meta.env?.PROD ? '/api' : 'http://localhost:3000/api') as string;

let authHeader: string | null = null;

// Типы для API ответов
// Экспортируем типы для использования в компонентах
export interface SpacesResponse {
  spaces: Array<{
    id: string;
    name: string;
    role: string;
    isCurrent: boolean;
  }>;
}

export interface TasksResponse {
  tasks: Array<{
    id: string;
    title: string;
    difficulty: number;
    xp: number;
    dueAt: string | null;
    isPaused: boolean;
    createdAt: string;
  }>;
}

export interface GoalsResponse {
  goals: Array<{
    id: string;
    title: string;
    difficulty: number;
    xp: number;
    isDone: boolean;
    createdAt: string;
  }>;
}

export interface MembersResponse {
  members: Array<{
    id: string;
    username: string | null;
    firstName: string | null;
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
  }>;
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

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        // Always send in header - this is the preferred method
        ...(authHeader && { 'x-telegram-init-data': authHeader }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  },

  // Auth
  async getUser() {
    return this.request('/auth/me');
  },

  async getSpaces(): Promise<SpacesResponse> {
    return this.request<SpacesResponse>('/auth/spaces');
  },

  async switchSpace(spaceId: string) {
    return this.request(`/auth/spaces/${spaceId}/switch`, { method: 'POST' });
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

  // Tasks
  async getTasks(): Promise<TasksResponse> {
    return this.request<TasksResponse>('/tasks');
  },

  async createTask(data: { title: string; difficulty?: number; xp?: number; dueAt?: string }) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteTask(taskId: string) {
    return this.request(`/tasks/${taskId}`, { method: 'DELETE' });
  },

  // Goals
  async getGoals(): Promise<GoalsResponse> {
    return this.request<GoalsResponse>('/goals');
  },

  async createGoal(data: { title: string; difficulty?: number; xp?: number }) {
    return this.request('/goals', {
      method: 'POST',
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

  async getLeaderboard(): Promise<LeaderboardResponse> {
    return this.request<LeaderboardResponse>('/stats/leaderboard');
  },

  // Members
  async getMembers(): Promise<MembersResponse> {
    return this.request<MembersResponse>('/members');
  },

  async createInvite(role: 'Admin' | 'Editor' | 'Viewer'): Promise<InviteResponse> {
    return this.request<InviteResponse>('/members/invites', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  },
};
