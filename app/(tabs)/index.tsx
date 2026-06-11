import { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
type Task = {
  id: string;
  title: string;
  quadrant: "Q1" | "Q2" | "Q3" | "Q4";
};
export default function HomeScreen() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      title: "Exercise",
      quadrant: "Q2",
    },
  ]);
  const [modalVisible, setModalVisible] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [important, setImportant] = useState(true);
const [urgent, setUrgent] = useState(false);
const determineQuadrant = () => {
  if (important && urgent) return "Q1";
  if (important && !urgent) return "Q2";
  if (!important && urgent) return "Q3";
  return "Q4";
};
  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Good afternoon, Joyce</Text>

      <Text style={styles.title}>Quadrant</Text>

      <Text style={styles.focusLabel}>
        Living your values today
      </Text>

      <Text style={styles.values}>
        Growth • Family • Health
      </Text>

      <View style={styles.matrix}>

  <View style={styles.box}>
    <Text style={styles.heading}>Q1</Text>
    <Text style={styles.label}>Important + Urgent</Text>

    {tasks
      .filter((task) => task.quadrant === "Q1")
      .map((task) => (
        <Text key={task.id} style={styles.task}>
          {task.title}
        </Text>
      ))}
  </View>

  <View style={styles.box}>
    <Text style={styles.heading}>Q2</Text>
    <Text style={styles.label}>Important + Not Urgent</Text>

    {tasks
      .filter((task) => task.quadrant === "Q2")
      .map((task) => (
        <Text key={task.id} style={styles.task}>
          {task.title}
        </Text>
      ))}
  </View>

  <View style={styles.box}>
    <Text style={styles.heading}>Q3</Text>
    <Text style={styles.label}>Not Important + Urgent</Text>

    {tasks
      .filter((task) => task.quadrant === "Q3")
      .map((task) => (
        <Text key={task.id} style={styles.task}>
          {task.title}
        </Text>
      ))}
  </View>

  <View style={styles.box}>
    <Text style={styles.heading}>Q4</Text>
    <Text style={styles.label}>Not Important + Not Urgent</Text>

    {tasks
      .filter((task) => task.quadrant === "Q4")
      .map((task) => (
        <Text key={task.id} style={styles.task}>
          {task.title}
        </Text>
      ))}
  </View>

</View>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              New Task
            </Text>

            <TextInput
              placeholder="What do you need to do?"
              value={taskName}
              onChangeText={setTaskName}
              style={styles.input}
            />
<Text style={{ marginBottom: 8 }}>
  Important?
</Text>

<View style={{ flexDirection: "row", gap: 10 }}>
  <TouchableOpacity
    onPress={() => setImportant(true)}
  >
    <Text>
      {important ? "✅ Yes" : "⬜ Yes"}
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={() => setImportant(false)}
  >
    <Text>
      {!important ? "✅ No" : "⬜ No"}
    </Text>
  </TouchableOpacity>
</View>

<Text
  style={{
    marginTop: 20,
    marginBottom: 8,
  }}
>
  Urgent?
</Text>

<View style={{ flexDirection: "row", gap: 10 }}>
  <TouchableOpacity
    onPress={() => setUrgent(true)}
  >
    <Text>
      {urgent ? "✅ Yes" : "⬜ Yes"}
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={() => setUrgent(false)}
  >
    <Text>
      {!urgent ? "✅ No" : "⬜ No"}
    </Text>
  </TouchableOpacity>
</View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => {
  if (!taskName.trim()) return;

  const newTask: Task = {
    id: Date.now().toString(),
    title: taskName,
    quadrant: determineQuadrant(),
  };

  setTasks([...tasks, newTask]);

  setTaskName("");
  setModalVisible(false);
}}
            >
              <Text style={styles.saveText}>
                Save
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
    minHeight: 180,

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

  task: {
    marginTop: 10,
    fontSize: 14,
    color: "#2F2F2F",
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