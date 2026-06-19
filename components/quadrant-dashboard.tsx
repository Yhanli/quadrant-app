import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
    Animated,
    AppState,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";

import { useAuth } from "@/components/auth-provider";
import { DateField } from "@/components/date-field";
import { formatDueDate } from "@/lib/date";
import { supabase } from "@/lib/supabase";

const USE_NATIVE_DRIVER = Platform.OS !== "web";

export type Quadrant = "Q1" | "Q2" | "Q3" | "Q4";

export type Value =
  | "Health"
  | "Family"
  | "Growth"
  | "Financial Security"
  | "Adventure"
  | "Community";

export type Task = {
  id: string;
  title: string;
  quadrant: Quadrant;
  values: Value[];
  dueDate: string;
  completed: boolean;
  completedAt: string | null;
};

type TaskDraft = {
  title: string;
  important: boolean;
  urgent: boolean;
  dueDate: string;
  values: Value[];
};

type QuadrantContextValue = {
  tasks: Task[];
  toggleTaskCompletion: (taskId: string) => void;
  addTaskToQuadrant: (quadrant: Quadrant, draft: Omit<TaskDraft, "important" | "urgent">) => void;
  saveTask: (draft: TaskDraft, editingTaskId: string | null) => void;
};

export const QUADRANT_ORDER: Quadrant[] = ["Q1", "Q2", "Q3", "Q4"];

export const QUADRANTS: Record<Quadrant, { title: string; subtitle: string }> = {
  Q1: { title: "🔥 Do Now", subtitle: "Important + Urgent" },
  Q2: { title: "🌱 Grow", subtitle: "Important + Not Urgent" },
  Q3: { title: "📨 Respond", subtitle: "Urgent + Not Important" },
  Q4: { title: "🍃 Let Go", subtitle: "Not Important + Not Urgent" },
};

export const VALUE_OPTIONS: Value[] = [
  "Health",
  "Family",
  "Growth",
  "Financial Security",
  "Adventure",
  "Community",
];

export const VALUE_STYLES: Record<Value, { backgroundColor: string; color: string }> = {
  Health: { backgroundColor: "#DCE7D7", color: "#53685A" },
  Family: { backgroundColor: "#E5C9CC", color: "#7A4D53" },
  Growth: { backgroundColor: "#D6E0EA", color: "#4E6881" },
  "Financial Security": { backgroundColor: "#E7DDC3", color: "#8A7346" },
  Adventure: { backgroundColor: "#EAD9AF", color: "#8B6A22" },
  Community: { backgroundColor: "#D8E3D3", color: "#5F735F" },
};

const TASK_STORAGE_KEY = "quadrant_tasks";

const INITIAL_TASKS: Task[] = [];

const QuadrantContext = createContext<QuadrantContextValue | null>(null);

function determineQuadrant(important: boolean, urgent: boolean): Quadrant {
  if (important && urgent) return "Q1";
  if (important && !urgent) return "Q2";
  if (!important && urgent) return "Q3";
  return "Q4";
}

function isQuadrant(value: string | undefined): value is Quadrant {
  return value === "Q1" || value === "Q2" || value === "Q3" || value === "Q4";
}

function getIncompleteTasks(tasks: Task[]) {
  return tasks.filter((task) => !task.completed);
}

function getPreviewTasks(tasks: Task[]) {
  return getIncompleteTasks(tasks).slice(0, 3);
}

function getMoreCount(tasks: Task[]) {
  return Math.max(getIncompleteTasks(tasks).length - 3, 0);
}

function TaskCardContent({ task }: { task: Task }) {
  return (
    <>
      <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
        {task.title}
      </Text>

      {task.dueDate ? (
        <Text style={styles.taskDueDate}>Due {formatDueDate(task.dueDate)}</Text>
      ) : null}

      <View style={styles.taskTags}>
        {task.values.map((value) => (
          <View
            key={value}
            style={[
              styles.taskChip,
              { backgroundColor: VALUE_STYLES[value].backgroundColor },
            ]}
          >
            <Text style={[styles.taskChipText, { color: VALUE_STYLES[value].color }]}>
              {value}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

function TaskCard({
  task,
  onPress,
  onLongPress,
}: {
  task: Task;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.taskCard, pressed && onPress ? styles.pressedCard : null]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <TaskCardContent task={task} />
    </Pressable>
  );
}

type TaskRow = {
  id: string;
  title: string;
  quadrant: Quadrant;
  task_values: Value[] | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
};

const TASK_COLUMNS =
  "id, title, quadrant, task_values, due_date, completed, completed_at, created_at";

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    quadrant: row.quadrant,
    values: row.task_values ?? [],
    dueDate: row.due_date ?? "",
    completed: row.completed,
    completedAt: row.completed_at,
  };
}

function cacheKey(userId: string) {
  return `${TASK_STORAGE_KEY}_${userId}`;
}

function fetchTasks() {
  return supabase.from("tasks").select(TASK_COLUMNS).order("created_at", { ascending: true });
}

function QuadrantProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [hasHydrated, setHasHydrated] = useState(false);

  // Load tasks: show the cached copy instantly (works offline), then refresh
  // from Supabase so other devices' changes appear.
  useEffect(() => {
    if (!userId) {
      setTasks(INITIAL_TASKS);
      setHasHydrated(false);
      return;
    }

    let isActive = true;
    setHasHydrated(false);

    const loadTasks = async () => {
      try {
        const cached = await AsyncStorage.getItem(cacheKey(userId));
        if (isActive && cached) {
          setTasks(JSON.parse(cached) as Task[]);
        }
      } catch (error) {
        console.warn("Failed to read cached tasks", error);
      }

      const { data, error } = await fetchTasks();
      if (!isActive) return;

      if (error) {
        console.warn("Failed to fetch tasks from Supabase", error);
      } else {
        setTasks((data as TaskRow[]).map(rowToTask));
      }

      setHasHydrated(true);
    };

    void loadTasks();

    return () => {
      isActive = false;
    };
  }, [userId]);

  // Mirror the latest tasks into AsyncStorage so a cold start (or no network)
  // shows the last-known list immediately.
  useEffect(() => {
    if (!userId || !hasHydrated) return;

    void AsyncStorage.setItem(cacheKey(userId), JSON.stringify(tasks)).catch((error) => {
      console.warn("Failed to cache tasks", error);
    });
  }, [tasks, userId, hasHydrated]);

  // Refresh from the server whenever the app returns to the foreground, so a
  // task added on another device shows up here.
  useEffect(() => {
    if (!userId) return;

    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;

      void fetchTasks().then(({ data, error }) => {
        if (error) {
          console.warn("Failed to refresh tasks", error);
          return;
        }
        setTasks((data as TaskRow[]).map(rowToTask));
      });
    });

    return () => subscription.remove();
  }, [userId]);

  const addTaskToQuadrant = async (
    quadrant: Quadrant,
    draft: Omit<TaskDraft, "important" | "urgent">,
  ) => {
    if (!draft.title.trim() || !userId) return;

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        title: draft.title.trim(),
        quadrant,
        task_values: draft.values,
        due_date: draft.dueDate.trim() || null,
        completed: false,
      })
      .select(TASK_COLUMNS)
      .single();

    if (error || !data) {
      console.warn("Failed to add task", error);
      return;
    }

    setTasks((currentTasks) => [...currentTasks, rowToTask(data as TaskRow)]);
  };

  const toggleTaskCompletion = async (taskId: string) => {
    const target = tasks.find((task) => task.id === taskId);
    if (!target) return;

    const nextCompleted = !target.completed;
    // Stamp when a task is completed (cleared when it's un-completed) so the
    // insights view can attribute it to a time window.
    const nextCompletedAt = nextCompleted ? new Date().toISOString() : null;

    // Optimistic update so the UI reacts instantly; revert if the write fails.
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId
          ? { ...task, completed: nextCompleted, completedAt: nextCompletedAt }
          : task,
      ),
    );

    const { error } = await supabase
      .from("tasks")
      .update({ completed: nextCompleted, completed_at: nextCompletedAt })
      .eq("id", taskId);

    if (error) {
      console.warn("Failed to update task completion", error);
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === taskId
            ? { ...task, completed: target.completed, completedAt: target.completedAt }
            : task,
        ),
      );
    }
  };

  const saveTask = async (draft: TaskDraft, editingTaskId: string | null) => {
    if (!draft.title.trim() || !userId) return;

    const title = draft.title.trim();
    const quadrant = determineQuadrant(draft.important, draft.urgent);
    const values = draft.values.length > 0 ? draft.values : (["Health"] as Value[]);
    const dueDate = draft.dueDate.trim();

    const dbFields = {
      title,
      quadrant,
      task_values: values,
      due_date: dueDate || null,
    };

    if (editingTaskId) {
      // Optimistic edit; completion state is left untouched.
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === editingTaskId ? { ...task, title, quadrant, values, dueDate } : task,
        ),
      );

      const { error } = await supabase.from("tasks").update(dbFields).eq("id", editingTaskId);
      if (error) {
        console.warn("Failed to update task", error);
      }
      return;
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({ user_id: userId, ...dbFields, completed: false })
      .select(TASK_COLUMNS)
      .single();

    if (error || !data) {
      console.warn("Failed to create task", error);
      return;
    }

    setTasks((currentTasks) => [...currentTasks, rowToTask(data as TaskRow)]);
  };

  return (
    <QuadrantContext.Provider value={{ tasks, toggleTaskCompletion, addTaskToQuadrant, saveTask }}>
      {children}
    </QuadrantContext.Provider>
  );
}

export function useQuadrantData() {
  const context = useContext(QuadrantContext);

  if (!context) {
    throw new Error("useQuadrantData must be used within QuadrantProvider");
  }

  return context;
}

function ValueChip({
  value,
  selected,
  onToggle,
}: {
  value: Value;
  selected: boolean;
  onToggle: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.93, duration: 90, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();
    onToggle();
  };

  return (
    <Animated.View style={[styles.valueChipWrapper, { transform: [{ scale }] }]}>
      <Pressable
        onPress={handlePress}
        style={[styles.valueOption, styles.valueOptionFull, selected && styles.valueOptionSelected]}
      >
        <View
          style={[styles.valueDot, { backgroundColor: VALUE_STYLES[value].backgroundColor }]}
        />
        <Text style={[styles.valueOptionText, selected && styles.valueOptionTextSelected]}>
          {value}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function TaskEditorModal({
  visible,
  task,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onSubmit: (draft: TaskDraft, editingTaskId: string | null) => void;
}) {
  const [taskName, setTaskName] = useState("");
  const [important, setImportant] = useState(true);
  const [urgent, setUrgent] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [selectedValues, setSelectedValues] = useState<Value[]>(["Health"]);

  useEffect(() => {
    if (!visible) return;

    if (task) {
      setTaskName(task.title);
      setImportant(task.quadrant === "Q1" || task.quadrant === "Q2");
      setUrgent(task.quadrant === "Q1" || task.quadrant === "Q3");
      setDueDate(task.dueDate);
      setSelectedValues(task.values);
      return;
    }

    setTaskName("");
    setImportant(true);
    setUrgent(false);
    setDueDate("");
    setSelectedValues(["Health"]);
  }, [task, visible]);

  const toggleValue = (value: Value) => {
    setSelectedValues((currentValues) =>
      currentValues.includes(value)
        ? currentValues.filter((currentValue) => currentValue !== value)
        : [...currentValues, value],
    );
  };

  const submit = () => {
    onSubmit(
      { title: taskName, important, urgent, dueDate, values: selectedValues },
      task?.id ?? null,
    );
    onClose();
  };

  const targetQuadrant = determineQuadrant(important, urgent);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.modalTitle}>{task ? "Edit task" : "New task"}</Text>

            <TextInput
              placeholder="Task name"
              placeholderTextColor="#A1A1A1"
              value={taskName}
              onChangeText={setTaskName}
              style={styles.input}
            />

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextGroup}>
                <Text style={styles.toggleLabel}>Important</Text>
                <Text style={styles.toggleHint}>Matters to your values</Text>
              </View>
              <Switch
                value={important}
                onValueChange={setImportant}
                trackColor={{ false: "#E2E0D9", true: "#AEC1A1" }}
                thumbColor={Platform.OS === "android" ? (important ? "#556B4D" : "#FFFFFF") : "#FFFFFF"}
                ios_backgroundColor="#E2E0D9"
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleTextGroup}>
                <Text style={styles.toggleLabel}>Urgent</Text>
                <Text style={styles.toggleHint}>Needs attention soon</Text>
              </View>
              <Switch
                value={urgent}
                onValueChange={setUrgent}
                trackColor={{ false: "#E2E0D9", true: "#AEC1A1" }}
                thumbColor={Platform.OS === "android" ? (urgent ? "#556B4D" : "#FFFFFF") : "#FFFFFF"}
                ios_backgroundColor="#E2E0D9"
              />
            </View>

            <View style={styles.quadrantPreview}>
              <Text style={styles.quadrantPreviewLabel}>Lands in</Text>
              <Text style={styles.quadrantPreviewValue}>{QUADRANTS[targetQuadrant].title}</Text>
            </View>

            <Text style={styles.sectionLabel}>Values</Text>
            <View style={styles.valueGrid}>
              {VALUE_OPTIONS.map((value) => (
                <ValueChip
                  key={value}
                  value={value}
                  selected={selectedValues.includes(value)}
                  onToggle={() => toggleValue(value)}
                />
              ))}
            </View>

            <Text style={styles.sectionLabel}>Due date</Text>
            <DateField value={dueDate} onChange={setDueDate} placeholder="Pick a date" />

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={submit}>
                <Text style={styles.saveText}>{task ? "Update" : "Save"}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function QuadrantTaskComposer({
  quadrant,
  onAddTask,
}: {
  quadrant: Quadrant;
  onAddTask: (title: string, values: Value[], dueDate: string) => void;
}) {
  const [taskTitle, setTaskTitle] = useState("");
  const [taskValues, setTaskValues] = useState<Value[]>([]);
  const [taskDueDate, setTaskDueDate] = useState("");

  const toggleComposerValue = (value: Value) => {
    setTaskValues((currentValues) =>
      currentValues.includes(value)
        ? currentValues.filter((currentValue) => currentValue !== value)
        : [...currentValues, value],
    );
  };

  const submitTask = () => {
    onAddTask(taskTitle, taskValues, taskDueDate);
    setTaskTitle("");
    setTaskValues([]);
    setTaskDueDate("");
  };

  return (
    <View style={styles.composerCard}>
      <Text style={styles.composerLabel}>Add a task to this quadrant</Text>
      <TextInput
        placeholder={`Write a task for ${QUADRANTS[quadrant].title}`}
        placeholderTextColor="#A1A1A1"
        value={taskTitle}
        onChangeText={setTaskTitle}
        style={styles.composerInput}
        returnKeyType="done"
        onSubmitEditing={submitTask}
      />

      <Text style={styles.composerSectionLabel}>Values, if relevant</Text>
      <View style={styles.valueGrid}>
        {VALUE_OPTIONS.map((value) => {
          const isSelected = taskValues.includes(value);

          return (
            <Pressable
              key={value}
              onPress={() => toggleComposerValue(value)}
              style={[styles.valueOption, isSelected && styles.valueOptionSelected]}
            >
              <View
                style={[
                  styles.valueDot,
                  { backgroundColor: VALUE_STYLES[value].backgroundColor },
                ]}
              />
              <Text
                style={[
                  styles.valueOptionText,
                  isSelected && styles.valueOptionTextSelected,
                ]}
              >
                {value}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.composerSectionLabel}>Due date</Text>
      <TextInput
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#A1A1A1"
        value={taskDueDate}
        onChangeText={setTaskDueDate}
        style={styles.composerInput}
      />

      <Pressable style={styles.composerButton} onPress={submitTask}>
        <Text style={styles.composerButtonText}>Add task</Text>
      </Pressable>
    </View>
  );
}

function QuadrantSummaryCard({
  quadrant,
  onEditTask,
}: {
  quadrant: Quadrant;
  onEditTask: (task: Task) => void;
}) {
  const { tasks, toggleTaskCompletion } = useQuadrantData();
  const meta = QUADRANTS[quadrant];
  const quadrantTasks = tasks.filter((task) => task.quadrant === quadrant);
  const previewTasks = getPreviewTasks(quadrantTasks);
  const moreCount = getMoreCount(quadrantTasks);

  return (
    <View style={styles.box}>
      <Text style={styles.heading}>
        {meta.title} ({quadrantTasks.length})
      </Text>
      <Text style={styles.label}>{meta.subtitle}</Text>

      <View style={styles.previewStack}>
        {previewTasks.map((task) => (
          // Tap to complete, long-press to edit — no screen change.
          <Pressable
            key={task.id}
            style={({ pressed }) => [styles.previewTaskCard, pressed ? styles.pressedCard : null]}
            onPress={() => toggleTaskCompletion(task.id)}
            onLongPress={() => onEditTask(task)}
          >
            <TaskCardContent task={task} />
          </Pressable>
        ))}

        {/* The detail screen is only needed to reach tasks hidden by the preview. */}
        {moreCount > 0 ? (
          <Pressable onPress={() => router.push(`/quadrant/${quadrant}`)} hitSlop={6}>
            <Text style={styles.moreText}>+{moreCount} more →</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function isCompletedToday(task: Task): boolean {
  if (!task.completedAt) return false;

  const completedAt = new Date(task.completedAt);
  const now = new Date();
  return (
    completedAt.getFullYear() === now.getFullYear() &&
    completedAt.getMonth() === now.getMonth() &&
    completedAt.getDate() === now.getDate()
  );
}

export function HomeScreen() {
  const { tasks, toggleTaskCompletion, saveTask } = useQuadrantData();
  const { session, signOut } = useAuth();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [composing, setComposing] = useState(false);

  const completedToday = tasks.filter(isCompletedToday);
  const displayName = session?.user.email?.split("@")[0] ?? "there";

  const closeEditor = () => {
    setEditingTask(null);
    setComposing(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.greeting}>Hello, {displayName}</Text>
          <Pressable onPress={signOut} hitSlop={8}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>Quadrant</Text>
        <Text style={styles.focusLabel}>Living your values today</Text>

        <View style={styles.matrix}>
          {QUADRANT_ORDER.map((quadrant) => (
            <QuadrantSummaryCard key={quadrant} quadrant={quadrant} onEditTask={setEditingTask} />
          ))}
        </View>

        <View style={styles.completedSection}>
          <Text style={styles.completedHeading}>✓ Completed Today ({completedToday.length})</Text>

          {completedToday.length === 0 ? (
            <Text style={styles.completedEmpty}>Completed tasks will appear here.</Text>
          ) : (
            completedToday.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onPress={() => toggleTaskCompletion(task.id)}
                onLongPress={() => setEditingTask(task)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <Pressable
        style={({ pressed }) => [styles.fab, pressed ? styles.fabPressed : null]}
        onPress={() => setComposing(true)}
        accessibilityLabel="Add a task"
      >
        <Text style={styles.fabIcon}>＋</Text>
      </Pressable>

      <TaskEditorModal
        visible={editingTask !== null || composing}
        task={editingTask}
        onClose={closeEditor}
        onSubmit={(draft, editingTaskId) => {
          saveTask(draft, editingTaskId);
          closeEditor();
        }}
      />
    </View>
  );
}

export function QuadrantDetailScreen() {
  const params = useLocalSearchParams<{ quadrant?: string | string[] }>();
  const quadrantParam = Array.isArray(params.quadrant) ? params.quadrant[0] : params.quadrant;
  const { tasks, toggleTaskCompletion, addTaskToQuadrant, saveTask } = useQuadrantData();
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  if (!isQuadrant(quadrantParam)) {
    return (
      <View style={styles.detailContainer}>
        <Text style={styles.detailTitle}>Quadrant not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
      </View>
    );
  }

  const meta = QUADRANTS[quadrantParam];
  const quadrantTasks = tasks.filter((task) => task.quadrant === quadrantParam);

  return (
    <View style={styles.detailContainer}>
      <ScrollView
        style={styles.detailScroll}
        contentContainerStyle={styles.detailContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.detailHeaderRow}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </Pressable>
        </View>

        <Text style={styles.detailTitle}>{meta.title}</Text>
        <Text style={styles.detailDescription}>{meta.subtitle}</Text>

        <QuadrantTaskComposer
          quadrant={quadrantParam}
          onAddTask={(title, values, dueDate) =>
            addTaskToQuadrant(quadrantParam, { title, values, dueDate })
          }
        />

        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>All tasks ({quadrantTasks.length})</Text>

          {quadrantTasks.length === 0 ? (
            <Text style={styles.emptyState}>No tasks in this quadrant yet.</Text>
          ) : (
            quadrantTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onPress={() => toggleTaskCompletion(task.id)}
                onLongPress={() => setEditingTask(task)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <TaskEditorModal
        visible={editingTask !== null}
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onSubmit={(draft, editingTaskId) => {
          saveTask(draft, editingTaskId);
          setEditingTask(null);
        }}
      />
    </View>
  );
}

export function QuadrantAppProvider({ children }: { children: ReactNode }) {
  return <QuadrantProvider>{children}</QuadrantProvider>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F6F3",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 70,
    paddingHorizontal: 20,
    paddingBottom: 130,
  },
  title: {
    fontSize: 34,
    fontWeight: "600",
    color: "#2F2F2F",
    marginBottom: 24,
  },
  matrix: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  box: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#556B4D",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  fabPressed: {
    opacity: 0.9,
  },
  fabIcon: {
    color: "#FFFFFF",
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "400",
  },
  heading: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    color: "#6B7280",
  },
  previewStack: {
    marginTop: 10,
    gap: 8,
  },
  previewTaskCard: {
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#FAFAF8",
  },
  moreText: {
    fontSize: 13,
    color: "#6F6A60",
    fontWeight: "600",
    paddingLeft: 2,
  },
  composerCard: {
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  composerLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2F2F2F",
    marginBottom: 10,
  },
  composerSectionLabel: {
    marginBottom: 8,
    color: "#3F3F3F",
    fontWeight: "600",
    marginTop: 2,
  },
  composerInput: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    backgroundColor: "#FAFAF8",
  },
  composerButton: {
    backgroundColor: "#556B4D",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 2,
  },
  composerButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  taskCard: {
    marginTop: 10,
    gap: 6,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#FAFAF8",
  },
  pressedCard: {
    opacity: 0.9,
  },
  taskTitle: {
    fontSize: 14,
    color: "#2F2F2F",
    lineHeight: 20,
    width: "100%",
  },
  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#7B7B7B",
  },
  taskDueDate: {
    fontSize: 11,
    color: "#7C7C7C",
  },
  taskTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  taskChip: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  taskChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  greeting: {
    fontSize: 16,
    color: "#8B8B8B",
  },
  signOutText: {
    fontSize: 14,
    color: "#556B4D",
    fontWeight: "600",
  },
  focusLabel: {
    fontSize: 14,
    color: "#8B8B8B",
    marginTop: 8,
  },
  completedSection: {
    marginTop: 26,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#ECE7DD",
  },
  completedHeading: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2F2F2F",
    marginBottom: 12,
  },
  completedEmpty: {
    fontSize: 14,
    color: "#8B8B8B",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    maxHeight: "86%",
    overflow: "hidden",
  },
  modalScrollContent: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#2F2F2F",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    fontSize: 15,
    color: "#2F2F2F",
    backgroundColor: "#FAFAF8",
  },
  sectionLabel: {
    marginBottom: 10,
    color: "#3F3F3F",
    fontWeight: "600",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EEE8",
  },
  toggleTextGroup: {
    flexShrink: 1,
    paddingRight: 12,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2F2F2F",
  },
  toggleHint: {
    fontSize: 12,
    color: "#8B8B8B",
    marginTop: 2,
  },
  quadrantPreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 22,
    backgroundColor: "#F3F5EE",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  quadrantPreviewLabel: {
    fontSize: 13,
    color: "#6F6A60",
    fontWeight: "600",
  },
  quadrantPreviewValue: {
    fontSize: 15,
    color: "#2F2F2F",
    fontWeight: "600",
  },
  valueGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 22,
  },
  valueChipWrapper: {
    width: "48%",
  },
  valueOption: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  valueOptionFull: {
    width: "100%",
  },
  valueOptionSelected: {
    borderColor: "#556B4D",
    backgroundColor: "#F3F5EE",
  },
  valueOptionText: {
    color: "#3F3F3F",
    fontSize: 13,
    flexShrink: 1,
  },
  valueOptionTextSelected: {
    color: "#2F2F2F",
    fontWeight: "600",
  },
  valueDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#F0EEE8",
  },
  cancelText: {
    color: "#5F5F5F",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#556B4D",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  saveText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  detailContainer: {
    flex: 1,
    backgroundColor: "#F7F6F3",
  },
  detailScroll: {
    flex: 1,
  },
  detailContent: {
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  detailHeaderRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
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
  detailTitle: {
    fontSize: 32,
    fontWeight: "600",
    color: "#2F2F2F",
  },
  detailDescription: {
    marginTop: 6,
    fontSize: 14,
    color: "#7B7B7B",
  },
  detailSection: {
    marginTop: 22,
  },
  detailSectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2F2F2F",
    marginBottom: 12,
  },
  emptyState: {
    fontSize: 14,
    color: "#8B8B8B",
  },
});
