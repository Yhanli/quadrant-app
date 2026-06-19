import { type ChangeEvent, createElement } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatDueDate, type DateFieldProps } from "@/lib/date";

// Web: show dd/mm/yyyy in a styled field, with a real (but transparent) native
// <input type="date"> laid over the top. Tapping the field taps the input
// directly, which reliably opens the browser/OS calendar on desktop AND mobile
// (programmatic showPicker() is unreliable on phones).
export function DateField({ value, onChange, placeholder = "Select date" }: DateFieldProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.field}>
        <Text style={value ? styles.value : styles.placeholder}>
          {value ? formatDueDate(value) : placeholder}
        </Text>
        <Text style={styles.icon}>📅</Text>

        {createElement("input", {
          type: "date",
          value: value || "",
          "aria-label": "Due date",
          onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
          style: {
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            margin: 0,
            padding: 0,
            border: 0,
            background: "transparent",
            opacity: 0,
            cursor: "pointer",
          },
        })}
      </View>

      {value ? (
        <Pressable onPress={() => onChange("")} hitSlop={8} style={styles.clearButton}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      ) : null}
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
    position: "relative",
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
