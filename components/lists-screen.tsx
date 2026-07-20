import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { FadeInView, PressableScale } from "@/components/animated";
import { useListsData, type ListItem } from "@/components/lists-provider";

// Cross-platform confirm: native gets an Alert, web gets the browser dialog.
function confirmDelete(message: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm(message)) onConfirm();
    return;
  }
  Alert.alert("Delete", message, [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: onConfirm },
  ]);
}

function itemSummary(items: ListItem[]): string {
  if (items.length === 0) return "No items yet";
  const done = items.filter((item) => item.completed).length;
  return `${done} of ${items.length} done`;
}

export function ListsScreen() {
  const { lists, items, createList } = useListsData();
  const [newListName, setNewListName] = useState("");

  const submit = () => {
    const trimmed = newListName.trim();
    if (!trimmed) return;
    void createList(trimmed);
    setNewListName("");
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FadeInView>
          <Text style={styles.title}>Lists</Text>
          <Text style={styles.subtitle}>
            Quick to-dos that don&apos;t need to track to a value.
          </Text>
        </FadeInView>

        <FadeInView delay={60} style={styles.composerCard}>
          <TextInput
            placeholder="Name a new list — e.g. Groceries"
            placeholderTextColor="#A1A1A1"
            value={newListName}
            onChangeText={setNewListName}
            style={styles.composerInput}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <PressableScale style={styles.composerButton} onPress={submit}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.composerButtonText}>Create list</Text>
          </PressableScale>
        </FadeInView>

        {lists.length === 0 ? (
          <FadeInView delay={120} style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No lists yet. Create one above to start jotting down miscellaneous to-dos.
            </Text>
          </FadeInView>
        ) : (
          lists.map((list, index) => {
            const listItems = items.filter((item) => item.listId === list.id);
            return (
              <FadeInView key={list.id} delay={120 + index * 60}>
                <PressableScale
                  style={styles.listCard}
                  onPress={() => router.push(`/list/${list.id}`)}
                >
                  <View style={styles.listCardText}>
                    <Text style={styles.listName}>{list.name}</Text>
                    <Text style={styles.listMeta}>{itemSummary(listItems)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#B7B2A6" />
                </PressableScale>
              </FadeInView>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

export function ListDetailScreen() {
  const params = useLocalSearchParams<{ list?: string | string[] }>();
  const listId = Array.isArray(params.list) ? params.list[0] : params.list;
  const { lists, items, addItem, toggleItem, deleteItem, deleteList } = useListsData();
  const [newItem, setNewItem] = useState("");

  const list = lists.find((entry) => entry.id === listId);

  if (!list) {
    return (
      <View style={styles.container}>
        <View style={styles.detailContent}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
          <Text style={styles.title}>List not found</Text>
        </View>
      </View>
    );
  }

  const listItems = items.filter((item) => item.listId === list.id);

  const submit = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    void addItem(list.id, trimmed);
    setNewItem("");
  };

  const removeList = () => {
    confirmDelete(`Delete “${list.name}” and all its items?`, () => {
      void deleteList(list.id);
      router.back();
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.detailContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.detailHeaderRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
          <Pressable onPress={removeList} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color="#A2685C" />
          </Pressable>
        </View>

        <Text style={styles.title}>{list.name}</Text>
        <Text style={styles.subtitle}>{itemSummary(listItems)}</Text>

        <FadeInView delay={60} style={styles.composerCard}>
          <TextInput
            placeholder="Add an item"
            placeholderTextColor="#A1A1A1"
            value={newItem}
            onChangeText={setNewItem}
            style={styles.composerInput}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <PressableScale style={styles.composerButton} onPress={submit}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.composerButtonText}>Add item</Text>
          </PressableScale>
        </FadeInView>

        <View style={styles.itemsSection}>
          {listItems.length === 0 ? (
            <Text style={styles.emptyText}>No items yet. Add one above.</Text>
          ) : (
            listItems.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <PressableScale
                  style={styles.itemTapZone}
                  onPress={() => toggleItem(item.id)}
                >
                  <Ionicons
                    name={item.completed ? "checkmark-circle" : "ellipse-outline"}
                    size={22}
                    color={item.completed ? "#556B4D" : "#C4C0B6"}
                  />
                  <Text
                    style={[styles.itemTitle, item.completed && styles.itemTitleDone]}
                  >
                    {item.title}
                  </Text>
                </PressableScale>
                <Pressable onPress={() => deleteItem(item.id)} hitSlop={8}>
                  <Ionicons name="close" size={18} color="#B7B2A6" />
                </Pressable>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F6F3",
  },
  content: {
    paddingTop: 70,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  detailContent: {
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "600",
    color: "#2F2F2F",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#7B7B7B",
  },
  composerCard: {
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  composerInput: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#FAFAF8",
    fontSize: 15,
    color: "#2F2F2F",
  },
  composerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#556B4D",
    padding: 14,
    borderRadius: 14,
  },
  composerButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyCard: {
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyText: {
    fontSize: 14,
    color: "#8B8B8B",
    lineHeight: 20,
  },
  listCard: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  listCardText: {
    flexShrink: 1,
    paddingRight: 12,
  },
  listName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#2F2F2F",
  },
  listMeta: {
    marginTop: 4,
    fontSize: 13,
    color: "#8B8B8B",
  },
  detailHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  backButtonText: {
    color: "#556B4D",
    fontWeight: "600",
  },
  itemsSection: {
    marginTop: 22,
    gap: 10,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  itemTapZone: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingRight: 10,
  },
  itemTitle: {
    flexShrink: 1,
    fontSize: 15,
    color: "#2F2F2F",
    lineHeight: 20,
  },
  itemTitleDone: {
    textDecorationLine: "line-through",
    color: "#9A968D",
  },
});
