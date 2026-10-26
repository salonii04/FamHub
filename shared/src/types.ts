export interface User {
  id: string;
  name: string;
  email: string;
  familyId: string;
  role: 'admin' | 'member';
}

export interface Family {
  id: string;
  name: string;
  createdAt: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_completed: boolean;
  due_date: string | null;
  frequency: string | null;
  priority: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  due_date?: string;
  frequency?: string;
  priority?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  is_completed?: boolean;
  due_date?: string;
  frequency?: string;
  priority?: string;
}

export interface TaskStatistics {
  total: number;
  completed: number;
  pending: number;
  completionRate: number;
  byPriority: {
    Haute: number;
    Moyenne: number;
    Basse: number;
  };
}