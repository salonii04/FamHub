import { useCallback, useEffect, useState } from 'react';
import type { Note, NoteInput } from '@famhub/shared';
import { api } from '../lib/api';

interface ApiEnvelope<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export function useNotes() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get<ApiEnvelope<Note[]>>('/api/notes');
            if (response.success && response.data) {
                setNotes(response.data);
            } else {
                setError(response.error || 'Failed to load notes');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load notes');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refetch();
    }, [refetch]);

    const createNote = useCallback(
        async (input: NoteInput) => {
            const response = await api.post<ApiEnvelope<{ id: string }>>('/api/notes', input);
            if (!response.success) throw new Error(response.error || 'Failed to create note');
            await refetch();
        },
        [refetch]
    );

    const updateNote = useCallback(
        async (id: string, input: NoteInput) => {
            const response = await api.put<ApiEnvelope<{ id: string }>>(`/api/notes/${id}`, input);
            if (!response.success) throw new Error(response.error || 'Failed to update note');
            await refetch();
        },
        [refetch]
    );

    const deleteNote = useCallback(
        async (id: string) => {
            const response = await api.delete<ApiEnvelope<null>>(`/api/notes/${id}`);
            if (!response.success) throw new Error(response.error || 'Failed to delete note');
            await refetch();
        },
        [refetch]
    );

    return { notes, loading, error, createNote, updateNote, deleteNote };
}