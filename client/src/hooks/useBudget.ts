import { useCallback, useEffect, useState } from 'react';
import type { BudgetSummary, BudgetTransaction, CreateBudgetTransactionInput } from '@famhub/shared';
import { api } from '../lib/api';

interface ApiEnvelope<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export function useBudget(month: string) {
    const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
    const [summary, setSummary] = useState<BudgetSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refetch = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [tx, sum] = await Promise.all([
                api.get<ApiEnvelope<BudgetTransaction[]>>(`/api/budget/transactions?month=${month}`),
                api.get<ApiEnvelope<BudgetSummary>>(`/api/budget/summary?month=${month}`),
            ]);
            if (tx.success && tx.data && sum.success && sum.data) {
                setTransactions(tx.data);
                setSummary(sum.data);
            } else {
                setError(tx.error || sum.error || 'Failed to load budget');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load budget');
        } finally {
            setLoading(false);
        }
    }, [month]);

    useEffect(() => {
        void refetch();
    }, [refetch]);

    const addTransaction = useCallback(
        async (input: CreateBudgetTransactionInput) => {
            const response = await api.post<ApiEnvelope<BudgetTransaction>>('/api/budget/transactions', input);
            if (!response.success) throw new Error(response.error || 'Failed to add transaction');
            await refetch();
        },
        [refetch]
    );

    const deleteTransaction = useCallback(
        async (id: string) => {
            const response = await api.delete<ApiEnvelope<null>>(`/api/budget/transactions/${id}`);
            if (!response.success) throw new Error(response.error || 'Failed to delete transaction');
            await refetch();
        },
        [refetch]
    );

    const saveLimit = useCallback(
        async (category: string, monthly_limit: number) => {
            const response = await api.put<ApiEnvelope<unknown>>('/api/budget/limits', { category, monthly_limit });
            if (!response.success) throw new Error(response.error || 'Failed to save limit');
            await refetch();
        },
        [refetch]
    );

    const removeLimit = useCallback(
        async (category: string) => {
            const response = await api.delete<ApiEnvelope<null>>(
                `/api/budget/limits/${encodeURIComponent(category)}`
            );
            if (!response.success) throw new Error(response.error || 'Failed to remove limit');
            await refetch();
        },
        [refetch]
    );

    return { transactions, summary, loading, error, addTransaction, deleteTransaction, saveLimit, removeLimit };
}