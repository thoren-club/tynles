const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';

let authHeader: string | null = null;

export const api = {
  setAuthHeader(initData: string) {
    authHeader = initData;
  },

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Add initData to URL if available (for direct web access)
    const url = authHeader 
      ? `${API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}_auth=${encodeURIComponent(authHeader)}`
      : `${API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
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

  async getSpaces() {
    return this.request('/auth/spaces');
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
  async getTasks() {
    return this.request('/tasks');
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
  async getGoals() {
    return this.request('/goals');
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

  async getLeaderboard() {
    return this.request('/stats/leaderboard');
  },

  // Members
  async getMembers() {
    return this.request('/members');
  },

  async createInvite(role: 'Admin' | 'Editor' | 'Viewer') {
    return this.request('/members/invites', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  },
};
