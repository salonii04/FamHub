// client/src/hooks/useShoppingList.ts
import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { ShoppingItem } from "@famhub/shared";

export function useShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setItems(await api.get<ShoppingItem[]>("/shopping"));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addItem = async (body: Record<string, unknown>) => {
    await api.post("/shopping", body);
    await load();
  };

  const toggleItem = async (item: ShoppingItem) => {
    await api.put(`/shopping/${item.id}`, { checked: !item.checked });
    await load();
  };

  const removeItem = async (id: string) => {
    await api.delete(`/shopping/${id}`);
    await load();
  };

  const clearChecked = async () => {
    await api.delete("/shopping/checked");
    await load();
  };

  return { items, loading, addItem, toggleItem, removeItem, clearChecked };
}