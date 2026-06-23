import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { PressableScale } from "@/components/animated";
import { useQuadrantData, VALUE_PALETTE, type ValueDef } from "@/components/quadrant-dashboard";
import { ScreenBackground } from "@/components/screen-background";
import { Fonts, softShadow } from "@/lib/theme";

function Swatches({
  selectedIndex,
  onSelect,
}: {
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <View style={styles.swatches}>
      {VALUE_PALETTE.map((palette, index) => (
        <Pressable
          key={palette.color}
          onPress={() => onSelect(index)}
          style={[
            styles.swatch,
            { backgroundColor: palette.color },
            index === selectedIndex && styles.swatchSelected,
          ]}
        />
      ))}
    </View>
  );
}

function ValueRow({
  value,
  onRename,
  onRecolor,
  onDelete,
}: {
  value: ValueDef;
  onRename: (name: string) => void;
  onRecolor: (index: number) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(value.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const selectedIndex = VALUE_PALETTE.findIndex((palette) => palette.color === value.color);

  const commitName = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== value.name) {
      onRename(trimmed);
    } else {
      setName(value.name);
    }
  };

  return (
    <View style={styles.valueCard}>
      <View style={styles.valueRowTop}>
        <View style={[styles.dot, { backgroundColor: value.color }]} />
        <TextInput
          value={name}
          onChangeText={setName}
          onBlur={commitName}
          style={styles.nameInput}
          returnKeyType="done"
          onSubmitEditing={commitName}
        />
        {confirmDelete ? (
          <Pressable onPress={onDelete} hitSlop={8}>
            <Text style={styles.confirmText}>Confirm</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => setConfirmDelete(true)} hitSlop={8}>
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
        )}
      </View>
      <Swatches selectedIndex={selectedIndex} onSelect={onRecolor} />
    </View>
  );
}

export function ValuesScreen() {
  const { values, addValue, updateValue, deleteValue } = useQuadrantData();
  const [newName, setNewName] = useState("");
  const [newColorIndex, setNewColorIndex] = useState(0);

  const submitNew = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const swatch = VALUE_PALETTE[newColorIndex];
    void addValue(trimmed, swatch.color, swatch.textColor);
    setNewName("");
    setNewColorIndex((index) => (index + 1) % VALUE_PALETTE.length);
  };

  return (
    <ScreenBackground style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Your values</Text>
        <Text style={styles.subtitle}>
          Tasks connect to these. Rename, recolour, add your own, or remove ones you don&apos;t use.
        </Text>

        {values.map((value) => (
          <ValueRow
            key={value.id}
            value={value}
            onRename={(name) => updateValue(value.id, { name })}
            onRecolor={(index) =>
              updateValue(value.id, {
                color: VALUE_PALETTE[index].color,
                textColor: VALUE_PALETTE[index].textColor,
              })
            }
            onDelete={() => deleteValue(value.id)}
          />
        ))}

        <View style={styles.addCard}>
          <Text style={styles.addLabel}>Add a value</Text>
          <TextInput
            placeholder="e.g. Faith, Craft, Friendship"
            placeholderTextColor="#A1A1A1"
            value={newName}
            onChangeText={setNewName}
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={submitNew}
          />
          <Swatches selectedIndex={newColorIndex} onSelect={setNewColorIndex} />
          <PressableScale style={styles.addButton} onPress={submitNew}>
            <Text style={styles.addButtonText}>Add value</Text>
          </PressableScale>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    paddingTop: 64,
    paddingHorizontal: 22,
    paddingBottom: 60,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    marginBottom: 18,
  },
  backText: {
    color: "#556B4D",
    fontWeight: "600",
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 36,
    color: "#2B2B2B",
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 22,
    fontSize: 14,
    color: "#7B7B7B",
    lineHeight: 20,
  },
  valueCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    ...softShadow,
  },
  valueRowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    color: "#2F2F2F",
    paddingVertical: 4,
  },
  deleteText: {
    color: "#A1A1A1",
    fontSize: 13,
    fontWeight: "600",
  },
  confirmText: {
    color: "#A6584E",
    fontSize: 13,
    fontWeight: "700",
  },
  swatches: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchSelected: {
    borderColor: "#556B4D",
  },
  addCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginTop: 10,
    ...softShadow,
  },
  addLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2F2F2F",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#2F2F2F",
    backgroundColor: "#FAFAF8",
  },
  addButton: {
    backgroundColor: "#556B4D",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 16,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
