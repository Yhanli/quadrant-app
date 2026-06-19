import { type ChangeEvent, createElement, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatDueDate, type DateFieldProps } from "@/lib/date";

// Web: a styled button that opens the browser's native calendar via a hidden
// <input type="date">. The button always shows dd/mm/yyyy regardless of locale.
export function DateField({ value, onChange, placeholder = "Select date" }: DateFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.focus();
    }
  };

  return (
    <View style={styles.wrapper}>
      <Pressable style={styles.field} onPress={openPicker}>
        <Text style={value ? styles.value : styles.placeholder}>
          {value ? formatDueDate(value) : placeholder}
        </Text>
        <Text style={styles.icon}>📅</Text>
      </Pressable>

      {value ? (
        <Pressable onPress={() => onChange("")} hitSlop={8} style={styles.clearButton}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      ) : null}

      {createElement("input", {
        ref: inputRef,
        type: "date",
        value: value || "",
        onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
        style: {
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          border: 0,
          padding: 0,
          pointerEvents: "none",
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  field: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: "#FAFAF8",
  },
  value: {
    fontSize: 15,
    color: "#2F2F2F",
  },
  placeholder: {
    fontSize: 15,
    color: "#A1A1A1",
  },
  icon: {
    fontSize: 16,
  },
  clearButton: {
    paddingVertical: 6,
  },
  clearText: {
    color: "#8B8B8B",
    fontSize: 13,
    fontWeight: "600",
  },
});
