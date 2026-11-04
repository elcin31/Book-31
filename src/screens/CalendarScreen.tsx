import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../store";
import {
  Button,
  Card,
  Chip,
  Cover,
  Empty,
  Heading,
  Metric,
  Screen,
  Section,
  useTheme,
} from "../ui";
import type { ReadingSession } from "../types";

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const pagesRead = (session: ReadingSession) =>
  Math.max(0, session.endPage - session.startPage);
const durationLabel = (seconds: number) => {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`
    : seconds > 0 && minutes === 0
      ? "< 1 мин"
      : `${minutes} мин`;
};

export default function CalendarScreen({ navigation }: any) {
  const { books, sessions } = useStore();
  const { colors } = useTheme();
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12),
  );
  const [selected, setSelected] = useState(() => dateKey(new Date()));
  const [mode, setMode] = useState<"covers" | "heatmap">("covers");
  const bookById = useMemo(
    () => new Map(books.map((book) => [book.id, book])),
    [books],
  );
  const byDay = useMemo(() => {
    const result = new Map<string, ReadingSession[]>();
    sessions.forEach((session) => {
      const key = dateKey(new Date(session.startedAt));
      result.set(key, [...(result.get(key) || []), session]);
    });
    return result;
  }, [sessions]);
  const monthPrefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-`;
  const monthSessions = sessions.filter((session) =>
    dateKey(new Date(session.startedAt)).startsWith(monthPrefix),
  );
  const monthActiveDays = new Set(
    monthSessions.map((session) => dateKey(new Date(session.startedAt))),
  ).size;
  const selectedSessions = [...(byDay.get(selected) || [])].sort((a, b) =>
    a.startedAt.localeCompare(b.startedAt),
  );
  const selectedSeconds = selectedSessions.reduce(
    (total, session) => total + session.durationSeconds,
    0,
  );
  const selectedPages = selectedSessions.reduce(
    (total, session) => total + pagesRead(session),
    0,
  );
  const dayCount = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const startOffset = (month.getDay() + 6) % 7;
  const cells = Array.from(
    { length: Math.ceil((startOffset + dayCount) / 7) * 7 },
    (_, index) => {
      const day = index - startOffset + 1;
      return day >= 1 && day <= dayCount ? day : null;
    },
  );
  const today = dateKey(new Date());
  const changeMonth = (offset: number) => {
    const next = new Date(
      month.getFullYear(),
      month.getMonth() + offset,
      1,
      12,
    );
    setMonth(next);
    setSelected(dateKey(next));
  };
  const selectedDate = new Date(`${selected}T12:00:00`);
  const title = month
    .toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
    .replace(" г.", "");
  const arrowStyle = {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 12,
    backgroundColor: colors.soft,
  };

  return (
    <Screen>
      <Heading title="Календарь чтения" subtitle="Ваша история, день за днём" />
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
        <Chip
          label="Обложки"
          selected={mode === "covers"}
          onPress={() => setMode("covers")}
        />
        <Chip
          label="Тепловая карта"
          selected={mode === "heatmap"}
          onPress={() => setMode("heatmap")}
        />
      </View>
      <Button
        title="К сегодняшнему дню"
        variant="secondary"
        onPress={() => {
          const now = new Date();
          setMonth(new Date(now.getFullYear(), now.getMonth(), 1, 12));
          setSelected(dateKey(now));
        }}
      />
      <Card>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Предыдущий месяц"
            onPress={() => changeMonth(-1)}
            style={arrowStyle}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Text
            style={{
              color: colors.text,
              fontSize: 17,
              fontWeight: "600",
              textTransform: "capitalize",
              flex: 1,
              textAlign: "center",
            }}
          >
            {title}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Следующий месяц"
            onPress={() => changeMonth(1)}
            style={arrowStyle}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", marginBottom: 8 }}>
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
            <Text
              key={day}
              style={{
                width: "14.2857%",
                textAlign: "center",
                color: colors.muted,
                fontSize: 12,
              }}
            >
              {day}
            </Text>
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {cells.map((day, index) => {
            if (!day)
              return (
                <View
                  key={`empty-${index}`}
                  style={{
                    width: "14.2857%",
                    height: mode === "covers" ? 77 : 52,
                  }}
                />
              );
            const key = dateKey(
              new Date(month.getFullYear(), month.getMonth(), day, 12),
            );
            const activity = byDay.get(key) || [];
            const seconds = activity.reduce(
              (sum, session) => sum + session.durationSeconds,
              0,
            );
            const pages = activity.reduce(
              (sum, session) => sum + pagesRead(session),
              0,
            );
            const uniqueBookIds = [
              ...new Set(activity.map((session) => session.bookId)),
            ];
            const book = uniqueBookIds.length
              ? bookById.get(uniqueBookIds[0])
              : undefined;
            const intensity =
              seconds >= 3600 || pages >= 50
                ? 1
                : seconds >= 1800 || pages >= 20
                  ? 0.7
                  : 0.35;
            const isSelected = selected === key;
            return (
              <View key={key} style={{ width: "14.2857%", padding: 2 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${day} ${title}, ${pages} страниц, ${durationLabel(seconds)}`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelected(key)}
                  style={{
                    height: mode === "covers" ? 73 : 48,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected
                      ? colors.accent
                      : key === today
                        ? colors.gold
                        : colors.border,
                    borderRadius: 7,
                    overflow: "hidden",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    backgroundColor: isSelected ? colors.soft : colors.bg,
                  }}
                >
                  {mode === "heatmap" && activity.length > 0 && (
                    <View
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: colors.accent,
                        opacity: intensity,
                      }}
                    />
                  )}
                  <Text
                    style={{
                      color:
                        mode === "heatmap" &&
                        activity.length > 0 &&
                        intensity >= 0.7
                          ? colors.onAccent
                          : colors.text,
                      fontSize: 12,
                      fontWeight: isSelected || key === today ? "700" : "400",
                    }}
                  >
                    {day}
                  </Text>
                  {mode === "covers" && book ? (
                    <Cover book={book} width={23} height={34} />
                  ) : mode === "covers" && activity.length > 0 ? (
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 3,
                        backgroundColor: colors.accent,
                      }}
                    />
                  ) : null}
                  {mode === "covers" && uniqueBookIds.length > 1 && (
                    <Text style={{ fontSize: 9, color: colors.muted }}>
                      +{uniqueBookIds.length - 1}
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
        {mode === "heatmap" && (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 5,
              marginTop: 12,
            }}
          >
            <Text style={{ color: colors.muted, fontSize: 11 }}>Меньше</Text>
            {[0.15, 0.35, 0.7, 1].map((opacity) => (
              <View
                key={opacity}
                style={{
                  width: 11,
                  height: 11,
                  backgroundColor: colors.accent,
                  opacity,
                  borderRadius: 2,
                }}
              />
            ))}
            <Text style={{ color: colors.muted, fontSize: 11 }}>Больше</Text>
          </View>
        )}
      </Card>
      <View style={{ flexDirection: "row", gap: 12, marginVertical: 18 }}>
        <View style={{ flex: 1 }}>
          <Metric label="Активных дней" value={String(monthActiveDays)} />
        </View>
        <View style={{ flex: 1 }}>
          <Metric
            label="За месяц"
            value={durationLabel(
              monthSessions.reduce(
                (sum, session) => sum + session.durationSeconds,
                0,
              ),
            )}
          />
        </View>
      </View>
      <Section
        title={selectedDate.toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
        })}
      >
        {selectedSessions.length > 0 ? (
          <>
            <Text style={{ color: colors.muted, marginBottom: 12 }}>
              {selectedPages} стр. · {durationLabel(selectedSeconds)} ·{" "}
              {selectedSessions.length} записей
            </Text>
            {selectedSessions.map((session) => {
              const book = bookById.get(session.bookId);
              if (!book) return null;
              return (
                <Pressable
                  key={session.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Открыть ${book.title}`}
                  onPress={() => navigation.navigate("Book", { id: book.id })}
                  style={{ marginBottom: 10 }}
                >
                  <Card>
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 14,
                        alignItems: "center",
                      }}
                    >
                      <Cover book={book} width={43} height={64} />
                      <View style={{ flex: 1, gap: 5 }}>
                        <Text
                          numberOfLines={2}
                          style={{
                            color: colors.text,
                            fontSize: 15,
                            fontWeight: "600",
                          }}
                        >
                          {book.title}
                        </Text>
                        <Text style={{ color: colors.muted, fontSize: 12 }}>
                          {session.startPage}–{session.endPage} стр. ·{" "}
                          {durationLabel(session.durationSeconds)}
                        </Text>
                        <Text style={{ color: colors.muted, fontSize: 11 }}>
                          {new Date(session.startedAt).toLocaleTimeString(
                            "ru-RU",
                            { hour: "2-digit", minute: "2-digit" },
                          )}{" "}
                          ·{" "}
                          {session.source === "timer"
                            ? "Таймер"
                            : session.source === "progress"
                              ? "Обновление прогресса"
                              : "Ручная запись"}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={17}
                        color={colors.muted}
                      />
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </>
        ) : (
          <Empty
            title="Тихий день"
            description="Здесь появятся книги, страницы и время ваших сохранённых сессий."
            action={
              <Button
                title="Начать читать"
                variant="secondary"
                onPress={() => navigation.navigate("Timer")}
              />
            }
          />
        )}
      </Section>
    </Screen>
  );
}
