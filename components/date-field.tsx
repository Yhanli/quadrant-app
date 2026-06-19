import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatDueDate, toISODate, type DateFieldProps } from "@/lib/date";

// Native (iOS/Android): a styled button that opens the platform date picker.
export function DateField({ value, onChange, placeholder = "Select date" }: DateFieldProps) {
  const [show, setShow] = useState(false);
  const current = value ? new Date(`${value}T00:00:00`) : new Date();

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    setShow(false);
    if (event.type === "set" && selected) {
      onChange(toISODate(selected));
    }
  };

  return (
    <View style={styles.wrapper}>
      <Pressable style={styles.field} onPress={() => setShow(true)}>
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

      {show ? (
        <DateTimePicker value={current} mode="date" display="default" onChange={handleChange} />
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
