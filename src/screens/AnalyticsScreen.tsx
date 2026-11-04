import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useStore } from "../store";
import {
  Screen,
  Heading,
  Section,
  Card,
  Metric,
  Empty,
  Progress,
  Chip,
  useTheme,
} from "../ui";
import { getStats, localDay, minutes } from "./stats";

type Bar = { label: string; value: number };
function Bars({ data, unit }: { data: Bar[]; unit: string }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <View>
      <View style={styles.chart}>
        {data.map((bar, i) => (
          <View
            key={`${bar.label}-${i}`}
            style={styles.barColumn}
            accessibilityLabel={`${bar.label}: ${bar.value} ${unit}`}
          >
            <Text
              numberOfLines={1}
              style={{ fontSize: 10, color: colors.muted, marginBottom: 6 }}
            >
              {bar.value > 0 ? bar.value : ""}
            </Text>
            <View
              style={{
                height: 100,
                justifyContent: "flex-end",
                width: "100%",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  height: bar.value ? Math.max(4, (bar.value / max) * 100) : 2,
                  width: "66%",
                  maxWidth: 32,
                  backgroundColor: bar.value ? colors.accent : colors.border,
                  borderTopLeftRadius: 3,
                  borderTopRightRadius: 3,
                }}
              />
            </View>
            <Text style={{ color: colors.muted, fontSize: 9, marginTop: 9 }}>
              {bar.label}
            </Text>
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 11, color: colors.muted, marginTop: 12 }}>
        {unit}
      </Text>
    </View>
  );
}
export default function AnalyticsScreen({ navigation }: any) {
  const { books, sessions, yearGoal, attempts } = useStore();
  const { colors } = useTheme();
  const [chart, setChart] = useState<"day" | "month" | "books">("day");
  const now = new Date(),
    stats = getStats(sessions, books, now, attempts);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 6 + i,
    );
    return {
      label: `${d.getDate()}`,
      value: stats.byDay[localDay(d)]?.pages || 0,
    };
  });
  const months = Array.from({ length: 12 }, (_, i) => {
    return {
      label: new Date(now.getFullYear(), i, 1)
        .toLocaleDateString("ru-RU", { month: "short" })
        .slice(0, 3),
      value: stats.monthly[i].pages,
    };
  });
  const completed = months.map((m, i) => ({
    ...m,
    value: stats.monthly[i].books,
  }));
  const bookTimes = stats.bookTimes.slice(0, 6);
  const hasActivity = stats.all.pages > 0 || stats.all.seconds > 0;
  return (
    <Screen>
      <Heading
        title="Ваша история в цифрах"
        subtitle="Каждая страница имеет значение"
      />
      <View style={styles.metrics}>
        <Metric label="книг в библиотеке" value={String(books.length)} />
        <Metric label="прочитано" value={String(stats.finished)} />
        <Metric label="сейчас читаете" value={String(stats.reading)} />
      </View>
      <Section title="Страницы">
        <View style={styles.metrics}>
          <Metric label="сегодня" value={String(stats.today.pages)} />
          <Metric label="за месяц" value={String(stats.month.pages)} />
          <Metric label="за год" value={String(stats.year.pages)} />
        </View>
      </Section>
      <Section
        title="Ритм чтения"
        action={
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("Calendar")}
          >
            <Text style={{ color: colors.accent, fontWeight: "600" }}>
              Календарь →
            </Text>
          </Pressable>
        }
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
        >
          <Chip
            label="По дням"
            selected={chart === "day"}
            onPress={() => setChart("day")}
          />
          <Chip
            label="По месяцам"
            selected={chart === "month"}
            onPress={() => setChart("month")}
          />
          <Chip
            label="Завершённые книги"
            selected={chart === "books"}
            onPress={() => setChart("books")}
          />
        </ScrollView>
        <Card>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 20,
            }}
          >
            {chart === "day"
              ? "Последние 7 дней"
              : chart === "month"
                ? `Страницы · ${now.getFullYear()}`
                : `Книги · ${now.getFullYear()}`}
          </Text>
          {(
            chart === "books"
              ? completed.some((x) => x.value)
              : chart === "day"
                ? days.some((x) => x.value)
                : months.some((x) => x.value)
          ) ? (
            <Bars
              data={
                chart === "day" ? days : chart === "month" ? months : completed
              }
              unit={
                chart === "books" ? "завершённых книг" : "прочитанных страниц"
              }
            />
          ) : (
            <Empty
              title={
                chart === "books"
                  ? "Истории ещё впереди"
                  : "Пока нет страниц за этот период"
              }
              description={
                chart === "books"
                  ? "Отмечайте завершённые книги и указывайте дату окончания чтения."
                  : "Сохраняйте сессии или обновляйте прогресс книги, и здесь появится ваш ритм."
              }
            />
          )}
        </Card>
      </Section>
      <Section title="Время между строк">
        <Card>
          <View
            style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}
          >
            <Text style={[styles.big, { color: colors.text }]}>
              {minutes(stats.all.seconds)}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              всего за чтением
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.metrics}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.smallNumber, { color: colors.text }]}>
                {minutes(stats.averageSeconds)}
              </Text>
              <Text style={[styles.label, { color: colors.muted }]}>
                средняя сессия
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.smallNumber, { color: colors.text }]}>
                {Number.isFinite(stats.speed) ? Math.round(stats.speed) : 0}
              </Text>
              <Text style={[styles.label, { color: colors.muted }]}>
                страниц в час
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.smallNumber, { color: colors.text }]}>
                {stats.activeDays}
              </Text>
              <Text style={[styles.label, { color: colors.muted }]}>
                активных дней
              </Text>
            </View>
          </View>
          {!hasActivity && (
            <Text
              style={{
                fontSize: 12,
                lineHeight: 18,
                color: colors.muted,
                marginTop: 16,
              }}
            >
              Показатели появятся после первой сессии. Время на паузе не
              учитывается.
            </Text>
          )}
        </Card>
      </Section>
      <Section title="Каким книгам достаётся время">
        {bookTimes.length ? (
          <Card>
            {bookTimes.map(({ book, seconds }) => (
              <Pressable
                accessibilityRole="button"
                key={book.id}
                onPress={() => navigation.navigate("Book", { id: book.id })}
                style={{ marginBottom: 18 }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 14,
                    marginBottom: 8,
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{ flex: 1, fontSize: 14, color: colors.text }}
                  >
                    {book.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted }}>
                    {minutes(seconds)}
                  </Text>
                </View>
                <Progress value={seconds / Math.max(1, stats.all.seconds)} />
              </Pressable>
            ))}
          </Card>
        ) : (
          <Empty
            title="Время для любимых книг"
            description="Запустите таймер или добавьте сессию вручную, чтобы увидеть распределение времени."
          />
        )}
      </Section>
      <Section title={`Годовая цель · ${now.getFullYear()}`}>
        <Card>
          <View style={styles.goalRow}>
            <Text style={[styles.big, { color: colors.text }]}>
              {stats.finishedYear}
              <Text style={{ fontSize: 17, color: colors.muted }}>
                {" "}
                / {yearGoal} книг
              </Text>
            </Text>
            <Text style={{ color: colors.accent, fontWeight: "600" }}>
              {Math.round((stats.finishedYear / Math.max(1, yearGoal)) * 100)}%
            </Text>
          </View>
          <Progress value={stats.finishedYear / Math.max(1, yearGoal)} />
          <Text
            style={{
              fontSize: 13,
              lineHeight: 19,
              color: colors.muted,
              marginTop: 14,
            }}
          >
            {stats.finishedYear >= yearGoal
              ? "Ваша цель достигнута. Продолжайте в своём ритме."
              : `Ещё ${Math.max(0, yearGoal - stats.finishedYear)} книг до вашей цели.`}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("Settings")}
            style={{ paddingVertical: 14 }}
          >
            <Text style={{ color: colors.accent, fontWeight: "600" }}>
              Настроить цель →
            </Text>
          </Pressable>
        </Card>
      </Section>
    </Screen>
  );
}
const styles = StyleSheet.create({
  metrics: { flexDirection: "row", gap: 12, justifyContent: "space-between" },
  big: { fontSize: 30, fontFamily: "serif" },
  smallNumber: { fontSize: 22, fontWeight: "500" },
  label: { fontSize: 11, marginTop: 6, lineHeight: 16 },
  divider: { height: 1, marginVertical: 20 },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
  },
  barColumn: { flex: 1, alignItems: "center" },
  goalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
});
