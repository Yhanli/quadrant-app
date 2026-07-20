import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AppState } from "react-native";

import { useAuth } from "@/components/auth-provider";
import { supabase } from "@/lib/supabase";

// Miscellaneous to-do lists live outside the values/quadrant system on purpose:
// they're for quick, unstructured to-dos that don't need to track to a value.
export type TodoList = {
  id: string;
  name: string;
  createdAt: string;
};

export type ListItem = {
  id: string;
  listId: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
};

type ListsContextValue = {
  lists: TodoList[];
  items: ListItem[];
  isLoading: boolean;
  createList: (name: string) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  addItem: (listId: string, title: string) => Promise<void>;
  toggleItem: (itemId: string) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
};

const LISTS_STORAGE_KEY = "quadrant_lists";
const ITEMS_STORAGE_KEY = "quadrant_list_items";

const ListsContext = createContext<ListsContextValue | null>(null);

type ListRow = {
  id: string;
  name: string;
  created_at: string;
};

type ListItemRow = {
  id: string;
  list_id: string;
  title: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
};

const LIST_COLUMNS = "id, name, created_at";
const ITEM_COLUMNS = "id, list_id, title, completed, completed_at, created_at";

function rowToList(row: ListRow): TodoList {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

function rowToItem(row: ListItemRow): ListItem {
  return {
    id: row.id,
    listId: row.list_id,
    title: row.title,
    completed: row.completed,
    completedAt: row.completed_at,
  };
}

function listsCacheKey(userId: string) {
  return `${LISTS_STORAGE_KEY}_${userId}`;
}

function itemsCacheKey(userId: string) {
  return `${ITEMS_STORAGE_KEY}_${userId}`;
}

function fetchLists() {
  return supabase.from("lists").select(LIST_COLUMNS).order("created_at", { ascending: true });
}

function fetchItems() {
  return supabase
    .from("list_items")
    .select(ITEM_COLUMNS)
    .order("created_at", { ascending: true });
}

export function ListsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [lists, setLists] = useState<TodoList[]>([]);
  const [items, setItems] = useState<ListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Show the cached copy instantly (works offline), then refresh from Supabase
  // so lists made on another device appear.
  useEffect(() => {
    if (!userId) {
      setLists([]);
      setItems([]);
      setHasHydrated(false);
      setIsLoading(false);
      return;
    }

    let isActive = true;
    setHasHydrated(false);
    setIsLoading(true);

    const load = async () => {
      try {
        const [cachedLists, cachedItems] = await Promise.all([
          AsyncStorage.getItem(listsCacheKey(userId)),
          AsyncStorage.getItem(itemsCacheKey(userId)),
        ]);
        if (isActive && cachedLists) setLists(JSON.parse(cachedLists) as TodoList[]);
        if (isActive && cachedItems) setItems(JSON.parse(cachedItems) as ListItem[]);
      } catch (error) {
        console.warn("Failed to read cached lists", error);
      }

      const [listsResult, itemsResult] = await Promise.all([fetchLists(), fetchItems()]);
      if (!isActive) return;

      if (listsResult.error) {
        console.warn("Failed to fetch lists from Supabase", listsResult.error);
      } else {
        setLists((listsResult.data as ListRow[]).map(rowToList));
      }

      if (itemsResult.error) {
        console.warn("Failed to fetch list items from Supabase", itemsResult.error);
      } else {
        setItems((itemsResult.data as ListItemRow[]).map(rowToItem));
      }

      setHasHydrated(true);
      setIsLoading(false);
    };

    void load();

    return () => {
      isActive = false;
    };
  }, [userId]);

  // Mirror the latest data into AsyncStorage so a cold start (or no network)
  // shows the last-known lists immediately.
  useEffect(() => {
    if (!userId || !hasHydrated) return;
    void AsyncStorage.setItem(listsCacheKey(userId), JSON.stringify(lists)).catch((error) => {
      console.warn("Failed to cache lists", error);
    });
  }, [lists, userId, hasHydrated]);

  useEffect(() => {
    if (!userId || !hasHydrated) return;
    void AsyncStorage.setItem(itemsCacheKey(userId), JSON.stringify(items)).catch((error) => {
      console.warn("Failed to cache list items", error);
    });
  }, [items, userId, hasHydrated]);

  // Refresh when the app returns to the foreground, so changes from another
  // device show up here.
  useEffect(() => {
    if (!userId) return;

    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;

      void Promise.all([fetchLists(), fetchItems()]).then(([listsResult, itemsResult]) => {
        if (!listsResult.error) setLists((listsResult.data as ListRow[]).map(rowToList));
        if (!itemsResult.error) setItems((itemsResult.data as ListItemRow[]).map(rowToItem));
      });
    });

    return () => subscription.remove();
  }, [userId]);

  const createList = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || !userId) return;

    const { data, error } = await supabase
      .from("lists")
      .insert({ user_id: userId, name: trimmed })
      .select(LIST_COLUMNS)
      .single();

    if (error || !data) {
      console.warn("Failed to create list", error);
      return;
    }

    setLists((current) => [...current, rowToList(data as ListRow)]);
  };

  const deleteList = async (listId: string) => {
    const previousLists = lists;
    const previousItems = items;

    // Optimistic: drop the list and its items locally (the DB cascade-deletes
    // the items server-side). Revert both if the write fails.
    setLists((current) => current.filter((list) => list.id !== listId));
    setItems((current) => current.filter((item) => item.listId !== listId));

    const { error } = await supabase.from("lists").delete().eq("id", listId);
    if (error) {
      console.warn("Failed to delete list", error);
      setLists(previousLists);
      setItems(previousItems);
    }
  };

  const addItem = async (listId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed || !userId) return;

    const { data, error } = await supabase
      .from("list_items")
      .insert({ user_id: userId, list_id: listId, title: trimmed, completed: false })
      .select(ITEM_COLUMNS)
      .single();

    if (error || !data) {
      console.warn("Failed to add list item", error);
      return;
    }

    setItems((current) => [...current, rowToItem(data as ListItemRow)]);
  };

  const toggleItem = async (itemId: string) => {
    const target = items.find((item) => item.id === itemId);
    if (!target) return;

    const nextCompleted = !target.completed;
    const nextCompletedAt = nextCompleted ? new Date().toISOString() : null;

    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? { ...item, completed: nextCompleted, completedAt: nextCompletedAt }
          : item,
      ),
    );

    const { error } = await supabase
      .from("list_items")
      .update({ completed: nextCompleted, completed_at: nextCompletedAt })
      .eq("id", itemId);

    if (error) {
      console.warn("Failed to update list item", error);
      setItems((current) =>
        current.map((item) =>
          item.id === itemId
            ? { ...item, completed: target.completed, completedAt: target.completedAt }
            : item,
        ),
      );
    }
  };

  const deleteItem = async (itemId: string) => {
    const previousItems = items;
    setItems((current) => current.filter((item) => item.id !== itemId));

    const { error } = await supabase.from("list_items").delete().eq("id", itemId);
    if (error) {
      console.warn("Failed to delete list item", error);
      setItems(previousItems);
    }
  };

  return (
    <ListsContext.Provider
      value={{ lists, items, isLoading, createList, deleteList, addItem, toggleItem, deleteItem }}
    >
      {children}
    </ListsContext.Provider>
  );
}

export function useListsData() {
  const context = useContext(ListsContext);

  if (!context) {
    throw new Error("useListsData must be used within ListsProvider");
  }

  return context;
}
