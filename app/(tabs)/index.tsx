import { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Quadrant = "Q1" | "Q2" | "Q3" | "Q4";

type Value =
  | "Health"
  | "Family"
  | "Growth"
  | "Financial Security"
  | "Adventure"
  | "Community";

type Task = {
  id: string;
  title: string;
  quadrant: Quadrant;
  values: Value[];
  completed: boolean;
};

const QUADRANT_ORDER: Quadrant[] = ["Q1", "Q2", "Q3", "Q4"];

const QUADRANTS: Record<Quadrant, { title: string; subtitle: string }> = {
  Q1: {
    title: "🔥 Do Now",
    subtitle: "Important + Urgent",
  },
  Q2: {
    title: "🌱 Grow",
    subtitle: "Important + Not Urgent",
  },
  Q3: {
    title: "📨 Respond",
    subtitle: "Urgent + Not Important",
  },
  Q4: {
    title: "🍃 Let Go",
    subtitle: "Not Important + Not Urgent",
  },
};

const VALUE_OPTIONS: Value[] = [
  "Health",
  "Family",
  "Growth",
  "Financial Security",
  "Adventure",
  "Community",
];

const VALUE_STYLES: Record<Value, { backgroundColor: string; color: string }> =
  {
    Health: {
      backgroundColor: "#DCE7D7",
      color: "#53685A",
    },
    Family: {
      backgroundColor: "#E5C9CC",
      color: "#7A4D53",
    },
    Growth: {
      backgroundColor: "#D6E0EA",
      color: "#4E6881",
    },
    "Financial Security": {
      backgroundColor: "#E7DDC3",
      color: "#8A7346",
    },
    Adventure: {
      backgroundColor: "#EAD9AF",
      color: "#8B6A22",
    },
    Community: {
      backgroundColor: "#D8E3D3",
      color: "#5F735F",
    },
  };

export default function HomeScreen() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      title: "Exercise",
      quadrant: "Q2",
      values: ["Health"],
      completed: false,
    },
  ]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskName, setTaskName] = useState("");
  const [important, setImportant] = useState(true);
  const [urgent, setUrgent] = useState(false);
  const [selectedValues, setSelectedValues] = useState<Value[]>(["Health"]);

  const determineQuadrant = (): Quadrant => {
    if (important && urgent) return "Q1";
    if (important && !urgent) return "Q2";
    if (!important && urgent) return "Q3";
    return "Q4";
  };

  const resetForm = () => {
    setTaskName("");
    setImportant(true);
    setUrgent(false);
    setSelectedValues(["Health"]);
    setEditingTaskId(null);
    setModalVisible(false);
  };

  const openNewTask = () => {
    setEditingTaskId(null);
    setTaskName("");
    setImportant(true);
    setUrgent(false);
    setSelectedValues(["Health"]);
    setModalVisible(true);
  };

  const openTaskForEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setTaskName(task.title);
    setImportant(task.quadrant === "Q1" || task.quadrant === "Q2");
    setUrgent(task.quadrant === "Q1" || task.quadrant === "Q3");
    setSelectedValues(task.values);
    setModalVisible(true);
  };

  const toggleTaskCompletion = (taskId: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task,
      ),
    );
  };

  const toggleValue = (value: Value) => {
    setSelectedValues((currentValues) =>
      currentValues.includes(value)
        ? currentValues.filter((currentValue) => currentValue !== value)
        : [...currentValues, value],
    );
  };

  const saveTask = () => {
    if (!taskName.trim()) return;

    const taskValues: Value[] =
      selectedValues.length > 0 ? selectedValues : ["Health"];
    const updatedTask: Task = {
      id: editingTaskId ?? Date.now().toString(),
      title: taskName,
      quadrant: determineQuadrant(),
      values: taskValues,
      completed: false,
    };

    setTasks((currentTasks) => {
      if (editingTaskId) {
        return currentTasks.map((task) =>
          task.id === editingTaskId ? { ...updatedTask, completed: task.completed } : task,
        );
      }

      return [...currentTasks, updatedTask];
    });

    resetForm();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Good afternoon, Joyce</Text>

      <Text style={styles.title}>Quadrant</Text>

      <Text style={styles.focusLabel}>Living your values today</Text>

      <Text style={styles.values}>
        Health • Family • Growth • Financial Security • Adventure • Community
      </Text>

      <View style={styles.matrix}>
        {QUADRANT_ORDER.map((quadrant) => {
          const meta = QUADRANTS[quadrant];

          return (
            <View key={quadrant} style={styles.box}>
              <Text style={styles.heading}>{meta.title}</Text>
              <Text style={styles.label}>{meta.subtitle}</Text>

              {tasks
                .filter((task) => task.quadrant === quadrant)
                .map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    style={[
                      styles.taskCard,
                      task.completed && styles.taskCardCompleted,
                    ]}
                    onPress={() => toggleTaskCompletion(task.id)}
                    onLongPress={() => openTaskForEdit(task)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.taskCardHeader}>
                      <Text
                        style={[
                          styles.taskTitle,
                          task.completed && styles.taskTitleCompleted,
                        ]}
                      >
                        {task.title}
                      </Text>
                      <Text style={styles.taskHint}>
                        {task.completed ? "Done" : "Tap to complete"}
                      </Text>
                    </View>

                    <View style={styles.taskTags}>
                      {task.values.map((value) => (
                        <View
                          key={value}
                          style={[
                            styles.taskChip,
                            {
                              backgroundColor:
                                VALUE_STYLES[value].backgroundColor,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.taskChipText,
                              { color: VALUE_STYLES[value].color },
                            ]}
                          >
                            {value}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                ))}
            </View>
          );
        })}
      </View>

      <TouchableOpacity style={styles.fab} onPress={openNewTask}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Task</Text>

            <TextInput
              placeholder="What do you need to do?"
              value={taskName}
              onChangeText={setTaskName}
              style={styles.input}
            />

            <Text style={styles.sectionLabel}>Important?</Text>

            <View style={styles.rowChoices}>
              <TouchableOpacity onPress={() => setImportant(true)}>
                <Text>{important ? "✅ Yes" : "⬜ Yes"}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setImportant(false)}>
                <Text>{!important ? "✅ No" : "⬜ No"}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Urgent?</Text>

            <View style={styles.rowChoices}>
              <TouchableOpacity onPress={() => setUrgent(true)}>
                <Text>{urgent ? "✅ Yes" : "⬜ Yes"}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setUrgent(false)}>
                <Text>{!urgent ? "✅ No" : "⬜ No"}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Value</Text>

            <View style={styles.valueGrid}>
              {VALUE_OPTIONS.map((value) => {
                const isSelected = selectedValues.includes(value);

                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() => toggleValue(value)}
                    style={[
                      styles.valueOption,
                      isSelected && styles.valueOptionSelected,
                    ]}
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
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveTask}
            >
              <Text style={styles.saveText}>
                {editingTaskId ? "Update" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F6F3",
    paddingTop: 70,
    paddingHorizontal: 20,
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
    minHeight: 200,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  heading: {
    fontSize: 22,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },

  label: {
    fontSize: 12,
    color: "#6B7280",
  },

  taskCard: {
    marginTop: 10,
    gap: 6,
    borderRadius: 16,
    padding: 10,
    backgroundColor: "#FAFAF8",
  },

  taskCardCompleted: {
    opacity: 0.55,
  },

  taskCardHeader: {
    gap: 4,
  },

  taskTitle: {
    fontSize: 14,
    color: "#2F2F2F",
    lineHeight: 18,
  },

  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#7B7B7B",
  },

  taskHint: {
    fontSize: 11,
    color: "#9A9A9A",
  },

  taskTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },

  taskChip: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  taskChipText: {
    fontSize: 12,
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

  values: {
    fontSize: 16,
    color: "#556B4D",
    marginBottom: 24,
  },

  fab: {
    position: "absolute",
    right: 24,
    bottom: 40,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#556B4D",
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },

  fabText: {
    color: "white",
    fontSize: 32,
    marginTop: -2,
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
});