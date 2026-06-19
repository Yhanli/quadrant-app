import { router } from "expo-router";
import { useMemo, useState } from "react";
import { type DimensionValue, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  QUADRANT_ORDER,
  QUADRANTS,
  useQuadrantData,
  VALUE_OPTIONS,
  VALUE_STYLES,
  type Quadrant,
  type Task,
  type Value,
} from "@/components/quadrant-dashboard";

type Range = "week" | "all";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Calm, muted bar colours per quadrant (aligned with the app's palette).
const QUADRANT_BAR_COLOR: Record<Quadrant, string> = {
  Q1: "#C98A6A", // Do Now — terracotta
  Q2: "#7E9B6E", // Grow — sage
  Q3: "#7E93B0", // Respond — muted blue
  Q4: "#B7B2A6", // Let Go — warm grey
};

function completedInRange(tasks: Task[], range: Range): Task[] {
  const completed = tasks.filter((task) => task.completed);
  if (range === "all") return completed;

  const cutoff = Date.now() - WEEK_MS;
  return completed.filter(
    (task) => task.completedAt !== null && new Date(task.completedAt).getTime() >= cutoff,
  );
}

function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function barWidth(p: number): DimensionValue {
  return `${p}%`;
}

function coachingLine(topQuadrant: Quadrant, topPercent: number): string {
  switch (topQuadrant) {
    case "Q2":
      return `Beautiful — ${topPercent}% of what you finished was in 🌱 Grow: the important-but-not-urgent work that builds the life you want.`;
    case "Q1":
      return `${topPercent}% of your completed work was 🔥 Do Now. You're handling what's urgent — notice if there's room to invest more in Grow.`;
    case "Q3":
      return `${topPercent}% landed in 📨 Respond — urgent for others, less important to you. What could you let go of or hand off?`;
    default:
      return `${topPercent}% of your completed work was 🍃 Let Go. Gently ask whether these were worth your time.`;
  }
}

export function InsightsScreen() {
  const { tasks } = useQuadrantData();
  const [range, setRange] = useState<Range>("week");

  const stats = useMemo(() => {
    const completed = completedInRange(tasks, range);
    const total = completed.length;

    const quadrantCounts: Record<Quadrant, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    const valueCounts = Object.fromEntries(VALUE_OPTIONS.map((v) => [v, 0])) as Record<Value, number>;
    let valueMentions = 0;

    completed.forEach((task) => {
      quadrantCounts[task.quadrant] += 1;
      task.values.forEach((value) => {
        valueCounts[value] += 1;
        valueMentions += 1;
      });
    });

    return { total, quadrantCounts, valueCounts, valueMentions };
  }, [tasks, range]);

  const { total, quadrantCounts, valueCounts, valueMentions } = stats;

  const topQuadrant = QUADRANT_ORDER.reduce(
    (best, quadrant) => (quadrantCounts[quadrant] > quadrantCounts[best] ? quadrant : best),
    "Q1" as Quadrant,
  );

  const valueRows = VALUE_OPTIONS.map((value) => ({ value, count: valueCounts[value] }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.title}>Reflection</Text>
        <Text style={styles.subtitle}>Am I spending my time on what matters most?</Text>

        <View style={styles.toggle}>
          {(["week", "all"] as Range[]).map((option) => {
            const active = range === option;
            return (
              <Pressable
                key={option}
                onPress={() => setRange(option)}
                style={[styles.toggleOption, active && styles.toggleOptionActive]}
              >
                <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
                  {option === "week" ? "This week" : "All time"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {total === 0 ? (
          <View style={styles.headlineCard}>
            <Text style={styles.headlineText}>
              Complete a few tasks and your reflection will appear here.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.headlineCard}>
              <Text style={styles.headlineText}>
                {coachingLine(topQuadrant, percent(quadrantCounts[topQuadrant], total))}
              </Text>
              <Text style={styles.headlineMeta}>
                {total} task{total === 1 ? "" : "s"} completed
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Where your energy went</Text>
            <View style={styles.card}>
              {QUADRANT_ORDER.map((quadrant) => {
                const p = percent(quadrantCounts[quadrant], total);
                return (
                  <View key={quadrant} style={styles.barRow}>
                    <Text style={styles.barLabel}>{QUADRANTS[quadrant].title}</Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { width: barWidth(p), backgroundColor: QUADRANT_BAR_COLOR[quadrant] },
                        ]}
                      />
                    </View>
                    <Text style={styles.barPct}>{p}%</Text>
                  </View>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>Values you supported</Text>
            <View style={styles.card}>
              {valueRows.length === 0 ? (
                <Text style={styles.emptyText}>No values tagged on these tasks yet.</Text>
              ) : (
                valueRows.map((row) => {
                  const p = percent(row.count, valueMentions);
                  return (
                    <View key={row.value} style={styles.barRow}>
                      <Text style={styles.barLabel}>{row.value}</Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              width: barWidth(p),
                              backgroundColor: VALUE_STYLES[row.value].backgroundColor,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.barPct}>{p}%</Text>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
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
    paddingTop: 64,
    paddingHorizontal: 20,
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
    fontSize: 32,
    fontWeight: "600",
    color: "#2F2F2F",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#7B7B7B",
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: "#ECEAE3",
    borderRadius: 999,
    padding: 4,
    marginTop: 20,
    alignSelf: "flex-start",
  },
  toggleOption: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  toggleOptionActive: {
    backgroundColor: "#FFFFFF",
  },
  toggleText: {
    fontSize: 14,
    color: "#7B7B7B",
    fontWeight: "600",
  },
  toggleTextActive: {
    color: "#2F2F2F",
  },
  headlineCard: {
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  headlineText: {
    fontSize: 17,
    lineHeight: 24,
    color: "#2F2F2F",
  },
  headlineMeta: {
    marginTop: 10,
    fontSize: 13,
    color: "#8B8B8B",
  },
  sectionTitle: {
    marginTop: 26,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: "600",
    color: "#2F2F2F",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  barLabel: {
    width: 96,
    fontSize: 13,
    color: "#3F3F3F",
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#F0EEE8",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
  },
  barPct: {
    width: 40,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "600",
    color: "#5F5F5F",
  },
  emptyText: {
    fontSize: 14,
    color: "#8B8B8B",
  },
});
