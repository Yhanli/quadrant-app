import { useMemo, useState } from "react";
import { type DimensionValue, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AnimatedBar, FadeInView } from "@/components/animated";
import {
  QUADRANT_ORDER,
  QUADRANTS,
  useQuadrantData,
  type Quadrant,
  type Task,
} from "@/components/quadrant-dashboard";
import { ScreenBackground } from "@/components/screen-background";
import { toISODate } from "@/lib/date";
import { Fonts, softShadow } from "@/lib/theme";

type Range = "week" | "all";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.statTile}>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

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
  const { tasks, valueColor } = useQuadrantData();
  const [range, setRange] = useState<Range>("week");

  const stats = useMemo(() => {
    const completed = completedInRange(tasks, range);
    const total = completed.length;

    const quadrantCounts: Record<Quadrant, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    const valueCounts = new Map<string, number>();
    let valueMentions = 0;

    completed.forEach((task) => {
      quadrantCounts[task.quadrant] += 1;
      task.values.forEach((value) => {
        valueCounts.set(value, (valueCounts.get(value) ?? 0) + 1);
        valueMentions += 1;
      });
    });

    // Average days from creation to completion, over completed-in-range tasks.
    const durations = completed
      .filter((task) => task.completedAt && task.createdAt)
      .map(
        (task) =>
          (new Date(task.completedAt as string).getTime() - new Date(task.createdAt).getTime()) /
          DAY_MS,
      )
      .filter((days) => days >= 0);
    const avgDaysToDone =
      durations.length > 0
        ? Math.round((durations.reduce((sum, days) => sum + days, 0) / durations.length) * 10) / 10
        : null;

    // Current-state counts (independent of the week/all-time toggle).
    const openTasks = tasks.filter((task) => !task.completed);
    const openCount = openTasks.length;
    const todayISO = toISODate(new Date());
    const overdueCount = openTasks.filter(
      (task) => task.dueDate && task.dueDate < todayISO,
    ).length;

    // Completions per day for the last 7 calendar days.
    const doneWithDate = tasks.filter((task) => task.completed && task.completedAt);
    const last7 = Array.from({ length: 7 }, (_, index) => {
      const day = new Date();
      day.setDate(day.getDate() - (6 - index));
      const key = toISODate(day);
      const count = doneWithDate.filter(
        (task) => toISODate(new Date(task.completedAt as string)) === key,
      ).length;
      return { label: DAY_INITIALS[day.getDay()], count, isToday: index === 6 };
    });

    return {
      total,
      quadrantCounts,
      valueCounts,
      valueMentions,
      avgDaysToDone,
      openCount,
      overdueCount,
      last7,
    };
  }, [tasks, range]);

  const {
    total,
    quadrantCounts,
    valueCounts,
    valueMentions,
    avgDaysToDone,
    openCount,
    overdueCount,
    last7,
  } = stats;

  const maxDay = Math.max(1, ...last7.map((day) => day.count));

  const topQuadrant = QUADRANT_ORDER.reduce(
    (best, quadrant) => (quadrantCounts[quadrant] > quadrantCounts[best] ? quadrant : best),
    "Q1" as Quadrant,
  );

  const valueRows = Array.from(valueCounts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <ScreenBackground style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FadeInView>
          <Text style={styles.title}>Reflection</Text>
          <Text style={styles.subtitle}>Am I spending my time on what matters most?</Text>
        </FadeInView>

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

        <FadeInView delay={40} style={styles.statsGrid}>
          <StatTile
            label={range === "week" ? "Done this week" : "Done all time"}
            value={`${total}`}
          />
          <StatTile
            label="Avg. days to done"
            value={avgDaysToDone !== null ? `${avgDaysToDone}` : "—"}
          />
          <StatTile label="Open now" value={`${openCount}`} />
          <StatTile label="Overdue" value={`${overdueCount}`} accent={overdueCount > 0} />
        </FadeInView>

        {total === 0 ? (
          <FadeInView style={styles.headlineCard}>
            <Text style={styles.headlineText}>
              Complete a few tasks and your reflection will appear here.
            </Text>
          </FadeInView>
        ) : (
          <>
            <FadeInView style={styles.headlineCard}>
              <Text style={styles.headlineText}>
                {coachingLine(topQuadrant, percent(quadrantCounts[topQuadrant], total))}
              </Text>
              <Text style={styles.headlineMeta}>
                {total} task{total === 1 ? "" : "s"} completed
              </Text>
            </FadeInView>

            <FadeInView delay={80}>
              <Text style={styles.sectionTitle}>Where your energy went</Text>
              <View style={styles.card}>
                {QUADRANT_ORDER.map((quadrant) => {
                  const p = percent(quadrantCounts[quadrant], total);
                  return (
                    <View key={quadrant} style={styles.barRow}>
                      <Text style={styles.barLabel}>{QUADRANTS[quadrant].title}</Text>
                      <View style={styles.barTrack}>
                        <AnimatedBar
                          percent={p}
                          color={QUADRANT_BAR_COLOR[quadrant]}
                          style={styles.barFill}
                        />
                      </View>
                      <Text style={styles.barPct}>{p}%</Text>
                    </View>
                  );
                })}
              </View>
            </FadeInView>

            <FadeInView delay={160}>
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
                          <AnimatedBar
                            percent={p}
                            color={valueColor(row.value).backgroundColor}
                            style={styles.barFill}
                          />
                        </View>
                        <Text style={styles.barPct}>{p}%</Text>
                      </View>
                    );
                  })
                )}
              </View>
            </FadeInView>
          </>
        )}

        <FadeInView delay={220}>
          <Text style={styles.sectionTitle}>Last 7 days</Text>
          <View style={styles.card}>
            <View style={styles.weekRow}>
              {last7.map((day, index) => {
                const height = (`${Math.round((day.count / maxDay) * 100)}%` as DimensionValue);
                return (
                  <View key={index} style={styles.dayCol}>
                    <View style={styles.dayBarTrack}>
                      <View
                        style={[
                          styles.dayBarFill,
                          { height },
                          day.isToday && styles.dayBarFillToday,
                        ]}
                      />
                    </View>
                    <Text style={styles.dayCount}>{day.count}</Text>
                    <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>
                      {day.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </FadeInView>
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
    paddingTop: 76,
    paddingHorizontal: 22,
    paddingBottom: 40,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 38,
    color: "#2B2B2B",
    letterSpacing: 0.2,
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
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 22,
  },
  statTile: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    ...softShadow,
  },
  statValue: {
    fontFamily: Fonts.serif,
    fontSize: 30,
    color: "#2B2B2B",
  },
  statValueAccent: {
    color: "#A6584E",
  },
  statLabel: {
    marginTop: 2,
    fontSize: 12,
    color: "#8B8B8B",
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  dayCol: {
    flex: 1,
    alignItems: "center",
  },
  dayBarTrack: {
    width: 10,
    height: 76,
    borderRadius: 999,
    backgroundColor: "#F0EEE8",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  dayBarFill: {
    width: 10,
    borderRadius: 999,
    backgroundColor: "#A9BE9C",
  },
  dayBarFillToday: {
    backgroundColor: "#556B4D",
  },
  dayCount: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "600",
    color: "#6F6A60",
  },
  dayLabel: {
    marginTop: 2,
    fontSize: 11,
    color: "#9A968C",
  },
  dayLabelToday: {
    color: "#556B4D",
    fontWeight: "700",
  },
  headlineCard: {
    marginTop: 22,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 22,
    ...softShadow,
  },
  headlineText: {
    fontFamily: Fonts.serifRegular,
    fontSize: 21,
    lineHeight: 30,
    color: "#2B2B2B",
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
    borderRadius: 22,
    padding: 18,
    gap: 14,
    ...softShadow,
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
