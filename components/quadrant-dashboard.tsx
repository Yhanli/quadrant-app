import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

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

const QUADRANT_ORDER: Quadrant[] = ["Q1", "Q2", "Q3", "Q4"];

const QUADRANTS: Record<Quadrant, { title: string; subtitle: string }> = {
  Q1: { title: "🔥 Do Now", subtitle: "Important + Urgent" },
  Q2: { title: "🌱 Grow", subtitle: "Important + Not Urgent" },
  Q3: { title: "📨 Respond", subtitle: "Urgent + Not Important" },
  Q4: { title: "🍃 Let Go", subtitle: "Not Important + Not Urgent" },
};

const VALUE_OPTIONS: Value[] = [
  "Health",
  "Family",
  "Growth",
  "Financial Security",
  "Adventure",
  "Community",
];

const VALUE_STYLES: Record<Value, { backgroundColor: string; color: string }> = {
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

      {task.dueDate ? <Text style={styles.taskDueDate}>Due {task.dueDate}</Text> : null}

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

function QuadrantProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadTasks = async () => {
      try {
        const storedTasks = await AsyncStorage.getItem(TASK_STORAGE_KEY);

        if (!isMounted) return;

        if (storedTasks) {
          setTasks(JSON.parse(storedTasks) as Task[]);
        } else {
          setTasks(INITIAL_TASKS);
        }
      } catch {
        if (isMounted) {
          setTasks(INITIAL_TASKS);
        }
      } finally {
        if (isMounted) {
          setHasHydrated(true);
        }
      }
    };

    loadTasks();

    return () => {
      isMounted = false;
    };
  }, []);

  const persistTasks = (nextTasks: Task[]) => {
    if (!hasHydrated) return;

    void AsyncStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(nextTasks)).catch(() => {
      // Ignore storage write failures so task interactions still work in-memory.
    });
  };

  const updateTasks = (updater: (currentTasks: Task[]) => Task[]) => {
    setTasks((currentTasks) => {
      const nextTasks = updater(currentTasks);
      persistTasks(nextTasks);
      return nextTasks;
    });
  };

  const addTaskToQuadrant = (
    quadrant: Quadrant,
    draft: Omit<TaskDraft, "important" | "urgent">,
  ) => {
    if (!draft.title.trim()) return;

    updateTasks((currentTasks) => [
      ...currentTasks,
      {
        id: Date.now().toString(),
        title: draft.title.trim(),
        quadrant,
        values: draft.values,
        dueDate: draft.dueDate.trim(),
        completed: false,
      },
    ]);
  };

  const toggleTaskCompletion = (taskId: string) => {
    updateTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task,
      ),
    );
  };

  const saveTask = (draft: TaskDraft, editingTaskId: string | null) => {
    if (!draft.title.trim()) return;

    const nextTask: Task = {
      id: editingTaskId ?? Date.now().toString(),
      title: draft.title.trim(),
      quadrant: determineQuadrant(draft.important, draft.urgent),
      values: draft.values.length > 0 ? draft.values : ["Health"],
      dueDate: draft.dueDate.trim(),
      completed: false,
    };

    updateTasks((currentTasks) => {
      if (editingTaskId) {
        return currentTasks.map((task) =>
          task.id === editingTaskId ? { ...nextTask, completed: task.completed } : task,
        );
      }

      return [...currentTasks, nextTask];
    });
  };

  return (
    <QuadrantContext.Provider value={{ tasks, toggleTaskCompletion, addTaskToQuadrant, saveTask }}>
      {children}
    </QuadrantContext.Provider>
  );
}

function useQuadrantData() {
  const context = useContext(QuadrantContext);

  if (!context) {
    throw new Error("useQuadrantData must be used within QuadrantProvider");
  }

  return context;
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

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{task ? "Edit Task" : "New Task"}</Text>

          <TextInput
            placeholder="Task name"
            placeholderTextColor="#A1A1A1"
            value={taskName}
            onChangeText={setTaskName}
            style={styles.input}
          />

          <Text style={styles.sectionLabel}>Important?</Text>
          <View style={styles.rowChoices}>
            <Pressable onPress={() => setImportant(true)}>
              <Text>{important ? "✅ Yes" : "⬜ Yes"}</Text>
            </Pressable>
            <Pressable onPress={() => setImportant(false)}>
              <Text>{!important ? "✅ No" : "⬜ No"}</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>Urgent?</Text>
          <View style={styles.rowChoices}>
            <Pressable onPress={() => setUrgent(true)}>
              <Text>{urgent ? "✅ Yes" : "⬜ Yes"}</Text>
            </Pressable>
            <Pressable onPress={() => setUrgent(false)}>
              <Text>{!urgent ? "✅ No" : "⬜ No"}</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>Values</Text>
          <View style={styles.valueGrid}>
            {VALUE_OPTIONS.map((value) => {
              const isSelected = selectedValues.includes(value);

              return (
                <Pressable
                  key={value}
                  onPress={() => toggleValue(value)}
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

          <Text style={styles.sectionLabel}>Due date</Text>
          <TextInput
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#A1A1A1"
            value={dueDate}
            onChangeText={setDueDate}
            style={styles.input}
          />

          <Pressable style={styles.saveButton} onPress={submit}>
            <Text style={styles.saveText}>{task ? "Update" : "Save"}</Text>
          </Pressable>
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

function QuadrantSummaryCard({ quadrant }: { quadrant: Quadrant }) {
  const { tasks } = useQuadrantData();
  const meta = QUADRANTS[quadrant];
  const quadrantTasks = tasks.filter((task) => task.quadrant === quadrant);
  const previewTasks = getPreviewTasks(quadrantTasks);
  const moreCount = getMoreCount(quadrantTasks);

  return (
    <Pressable
      style={({ pressed }) => [styles.box, pressed ? styles.pressedSummaryCard : null]}
      onPress={() => router.push(`/quadrant/${quadrant}`)}
    >
      <Text style={styles.heading}>
        {meta.title} ({quadrantTasks.length})
      </Text>
      <Text style={styles.label}>{meta.subtitle}</Text>

      <View style={styles.previewStack}>
        {previewTasks.map((task) => (
          <View key={task.id} style={styles.previewTaskCard}>
            <TaskCardContent task={task} />
          </View>
        ))}

        {moreCount > 0 ? <Text style={styles.moreText}>+{moreCount} more</Text> : null}
      </View>
    </Pressable>
  );
}

export function HomeScreen() {
  const { tasks, toggleTaskCompletion, saveTask } = useQuadrantData();
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const completedTasks = tasks.filter((task) => task.completed);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.greeting}>Good afternoon, Joyce</Text>
        <Text style={styles.title}>Quadrant</Text>
        <Text style={styles.focusLabel}>Living your values today</Text>

        <View style={styles.matrix}>
          {QUADRANT_ORDER.map((quadrant) => (
            <QuadrantSummaryCard key={quadrant} quadrant={quadrant} />
          ))}
        </View>

        <View style={styles.completedSection}>
          <Text style={styles.completedHeading}>✓ Completed Today ({completedTasks.length})</Text>

          {completedTasks.length === 0 ? (
            <Text style={styles.completedEmpty}>Completed tasks will appear here.</Text>
          ) : (
            completedTasks.map((task) => (
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
        onClose={() => {
          setEditingTask(null);
        }}
        onSubmit={(draft, editingTaskId) => {
          saveTask(draft, editingTaskId);
          setEditingTask(null);
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
  pressedSummaryCard: {
    opacity: 0.9,
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
  greeting: {
    fontSize: 16,
    color: "#8B8B8B",
    marginBottom: 8,
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
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    maxHeight: "86%",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  sectionLabel: {
    marginBottom: 8,
    color: "#3F3F3F",
    fontWeight: "600",
  },
  rowChoices: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  valueGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  valueOption: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
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
  saveButton: {
    backgroundColor: "#556B4D",
    padding: 16,
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
