import { useCallback, useEffect, useState } from 'react';
import type { CreateTaskInput, Task, UpdateTaskInput } from '@famhub/shared';
import { api } from '../lib/api';

interface ApiEnvelope<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export function useTasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get<ApiEnvelope<Task[]>>('/api/tasks');
            if (response.success && response.data) {
                setTasks(response.data);
            } else {
                setError(response.error || 'Failed to load tasks');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load tasks');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchTasks();
    }, [fetchTasks]);

    const createTask = useCallback(async (input: CreateTaskInput) => {
        const response = await api.post<ApiEnvelope<Task>>('/api/tasks', input);
        if (response.success && response.data) {
            setTasks((prev) => [response.data!, ...prev]);
            return response.data;
        }
        throw new Error(response.error || 'Failed to create task');
    }, []);

    const updateTask = useCallback(async (id: string, input: UpdateTaskInput) => {
        const response = await api.put<ApiEnvelope<Task>>(`/api/tasks/${id}`, input);
        if (response.success && response.data) {
            setTasks((prev) => prev.map((t) => (t.id === id ? response.data! : t)));
            return response.data;
        }
        throw new Error(response.error || 'Failed to update task');
    }, []);

    const toggleComplete = useCallback(
        (task: Task) => updateTask(task.id, { is_completed: !task.is_completed }),
        [updateTask]
    );

    const deleteTask = useCallback(async (id: string) => {
        const response = await api.delete<ApiEnvelope<null>>(`/api/tasks/${id}`);
        if (response.success) {
            setTasks((prev) => prev.filter((t) => t.id !== id));
            return;
        }
        throw new Error(response.error || 'Failed to delete task');
    }, []);

    return { tasks, loading, error, refetch: fetchTasks, createTask, updateTask, toggleComplete, deleteTask };
}