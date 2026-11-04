import React, { useMemo } from "react";
import { Text, View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../store";
import {
  Screen,
  Heading,
  Section,
  Card,
  Cover,
  Progress,
  Button,
  Empty,
  useTheme,
  showError,
} from "../ui";
import { getStats, localDay, minutes, shortDate } from "./stats";

export default function HomeScreen({ navigation }: any) {
  const { books, sessions, notes, yearGoal, timer, startTimer } = useStore();
  const { colors } = useTheme();
  const now = new Date();
  const stats = getStats(sessions, books, now);
  const reading = useMemo(
    () =>
      books
        .filter((b) => b.status === "reading")
        .sort((a, b) => {
          if (timer?.bookId === a.id) return -1;
          if (timer?.bookId === b.id) return 1;
          return b.createdAt.localeCompare(a.createdAt);
        }),
    [books, timer?.bookId],
  );
  const activeDays = useMemo(
    () => new Set(sessions.map((s) => localDay(s.startedAt))),
    [sessions],
  );
  const hour = now.getHours(),
    greeting =
      hour < 6
        ? "Тихой ночи"
        : hour < 12
          ? "Доброе утро"
          : hour < 18
            ? "Добрый день"
            : "Добрый вечер";
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 6 + i,
    );
    return d;
  });
  const recent = [...notes]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 2);
  const launch = async (id: number) => {
    try {
      if (!timer) await startTimer(id);
      navigation.navigate("Timer");
    } catch (e) {
      showError(e);
    }
  };
  return (
    <Screen>
      <Heading
        title={`${greeting}.`}
        subtitle={now.toLocaleDateString("ru-RU", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Быстро запустить таймер чтения"
            onPress={() => navigation.navigate("Timer")}
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: colors.soft,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="timer-outline" size={24} color={colors.accent} />
          </Pressable>
        }
      />
      {timer && (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("Timer")}
          style={[styles.timer, { backgroundColor: colors.accent }]}
        >
          <Ionicons name="time-outline" size={22} color={colors.onAccent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.timerTitle, { color: colors.onAccent }]}>
              Сессия чтения {timer.runningSince ? "идёт" : "на паузе"}
            </Text>
            <Text
              numberOfLines={1}
              style={{ color: colors.onAccent, opacity: 0.8 }}
            >
              {books.find((b) => b.id === timer.bookId)?.title}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={colors.onAccent} />
        </Pressable>
      )}
      <Section
        title="На вашей закладке"
        action={
          <Pressable
            accessibilityRole="button"
            style={{ minHeight: 48, justifyContent: "center" }}
            onPress={() => navigation.navigate("Library")}
          >
            <Text style={{ color: colors.accent, fontWeight: "600" }}>
              Библиотека →
            </Text>
          </Pressable>
        }
      >
        {reading.length === 0 ? (
          <Card>
            <View style={styles.emptyIntro}>
              <View
                style={[styles.bookSymbol, { backgroundColor: colors.soft }]}
              >
                <Ionicons name="book-outline" size={34} color={colors.accent} />
              </View>
              <Text style={[styles.hero, { color: colors.text }]}>
                {books.length
                  ? "Выберите следующую\nисторию."
                  : "Всё начинается\nс одной книги."}
              </Text>
              <Text style={[styles.body, { color: colors.muted }]}>
                {books.length
                  ? "Отметьте книгу статусом «Сейчас читаю», чтобы продолжить здесь."
                  : "Добавьте первую книгу. Сохраняйте мысли и находите время для чтения."}
              </Text>
              <Button
                title={
                  books.length ? "Открыть библиотеку" : "Добавить первую книгу"
                }
                onPress={() =>
                  navigation.navigate(books.length ? "Library" : "BookForm")
                }
              />
            </View>
          </Card>
        ) : (
          reading.slice(0, 4).map((book, index) => (
            <Card
              key={book.id}
              style={
                index === 0
                  ? { backgroundColor: colors.soft, padding: 20 }
                  : {
                      backgroundColor: "transparent",
                      borderWidth: 0,
                      paddingHorizontal: 0,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      borderRadius: 0,
                    }
              }
            >
              {index === 0 && (
                <Text
                  style={{
                    color: colors.accent,
                    fontSize: 11,
                    fontWeight: "700",
                    letterSpacing: 2,
                    marginBottom: 16,
                  }}
                >
                  ПРОДОЛЖИТЬ ИСТОРИЮ
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate("Book", { id: book.id })}
                style={styles.reading}
              >
                <Cover
                  book={book}
                  width={index === 0 ? 100 : 62}
                  height={index === 0 ? 148 : 92}
                />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text
                    numberOfLines={2}
                    style={[styles.bookTitle, { color: colors.text }]}
                  >
                    {book.title}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{ color: colors.muted, fontSize: 13 }}
                  >
                    {book.author || "Автор не указан"}
                  </Text>
                  <View style={{ marginTop: 9 }}>
                    <Progress
                      value={
                        book.totalPages ? book.currentPage / book.totalPages : 0
                      }
                    />
                  </View>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {book.currentPage}
                    {book.totalPages ? ` из ${book.totalPages}` : ""} стр.{" "}
                    {book.totalPages
                      ? `· ${Math.round((book.currentPage / book.totalPages) * 100)}%`
                      : ""}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  color={colors.muted}
                  size={18}
                />
              </Pressable>
              <View style={{ marginTop: 16 }}>
                <Button
                  title={
                    timer
                      ? timer.bookId === book.id
                        ? "К текущей сессии"
                        : "Вернуться к активному таймеру"
                      : "Начать сессию"
                  }
                  variant={index === 0 ? "primary" : "secondary"}
                  onPress={() => launch(book.id)}
                />
              </View>
            </Card>
          ))
        )}
      </Section>
      <Section
        title="Сегодня"
        action={
          <Pressable
            accessibilityRole="button"
            style={{ minHeight: 48, justifyContent: "center" }}
            onPress={() => navigation.navigate("Analytics")}
          >
            <Text style={{ color: colors.accent, fontWeight: "600" }}>
              Аналитика →
            </Text>
          </Pressable>
        }
      >
        <View style={styles.daily}>
          <View style={[styles.dailyCell, { borderColor: colors.border }]}>
            <Text style={[styles.stat, { color: colors.text }]}>
              {stats.today.pages}
            </Text>
            <Text style={[styles.caption, { color: colors.muted }]}>
              страниц
            </Text>
          </View>
          <View style={[styles.dailyCell, { borderColor: colors.border }]}>
            <Text style={[styles.stat, { color: colors.text }]}>
              {minutes(stats.today.seconds)}
            </Text>
            <Text style={[styles.caption, { color: colors.muted }]}>
              за чтением
            </Text>
          </View>
          <View style={styles.dailyCell}>
            <Text style={[styles.stat, { color: colors.text }]}>
              {stats.today.count}
            </Text>
            <Text style={[styles.caption, { color: colors.muted }]}>
              сессий
            </Text>
          </View>
        </View>
      </Section>
      <Section
        title="Ваш ритм"
        action={
          <Pressable
            accessibilityRole="button"
            style={{ minHeight: 48, justifyContent: "center" }}
            onPress={() => navigation.navigate("Calendar")}
          >
            <Text style={{ color: colors.accent, fontWeight: "600" }}>
              Календарь →
            </Text>
          </Pressable>
        }
      >
        <View style={styles.week}>
          {week.map((d) => {
            const active = activeDays.has(localDay(d));
            const today = localDay(d) === localDay(now);
            return (
              <Pressable
                key={localDay(d)}
                accessibilityRole="button"
                accessibilityLabel={`${d.toLocaleDateString("ru-RU")}${active ? ", было чтение" : ""}`}
                onPress={() => navigation.navigate("Calendar")}
                style={[
                  styles.weekDay,
                  {
                    backgroundColor: today
                      ? colors.accent
                      : active
                        ? colors.soft
                        : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: today ? colors.onAccent : colors.muted,
                  }}
                >
                  {d.toLocaleDateString("ru-RU", { weekday: "short" })}
                </Text>
                <Text
                  style={{
                    fontSize: 19,
                    fontWeight: "600",
                    color: today ? colors.onAccent : colors.text,
                  }}
                >
                  {d.getDate()}
                </Text>
                <View
                  style={{
                    height: 4,
                    width: 4,
                    borderRadius: 2,
                    backgroundColor: active
                      ? today
                        ? colors.onAccent
                        : colors.accent
                      : "transparent",
                  }}
                />
              </Pressable>
            );
          })}
        </View>
      </Section>
      <Section title={`Книжный год · ${now.getFullYear()}`}>
        <Card>
          <View style={styles.goalLine}>
            <Text style={[styles.goalNumber, { color: colors.text }]}>
              {stats.finishedYear}
              <Text style={{ fontSize: 18, color: colors.muted }}>
                {" "}
                / {yearGoal}
              </Text>
            </Text>
            <Text style={{ color: colors.accent, fontWeight: "600" }}>
              {Math.round((stats.finishedYear / Math.max(1, yearGoal)) * 100)}%
            </Text>
          </View>
          <Progress value={stats.finishedYear / Math.max(1, yearGoal)} />
          <Text style={[styles.body, { color: colors.muted, marginTop: 10 }]}>
            {stats.finishedYear >= yearGoal
              ? "Цель достигнута. Новые истории впереди."
              : "У каждой прочитанной книги есть своё место в вашем году."}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("Settings")}
            style={{ paddingVertical: 12 }}
          >
            <Text style={{ color: colors.accent, fontWeight: "600" }}>
              Изменить цель →
            </Text>
          </Pressable>
        </Card>
      </Section>
      <Section
        title="Мысли на полях"
        action={
          <Pressable
            accessibilityRole="button"
            style={{ minHeight: 48, justifyContent: "center" }}
            onPress={() => navigation.navigate("Diary")}
          >
            <Text style={{ color: colors.accent, fontWeight: "600" }}>
              Дневник →
            </Text>
          </Pressable>
        }
      >
        {recent.length ? (
          recent.map((note) => (
            <Pressable
              key={note.id}
              accessibilityRole="button"
              onPress={() => navigation.navigate("NoteForm", { id: note.id })}
            >
              <Card>
                <Text
                  style={{
                    color: colors.gold,
                    fontSize: 12,
                    letterSpacing: 1,
                    marginBottom: 10,
                  }}
                >
                  {note.type === "quote"
                    ? "ЦИТАТА"
                    : note.type === "thought"
                      ? "МЫСЛЬ"
                      : "КОНСПЕКТ"}{" "}
                  · {shortDate(note.createdAt)}
                </Text>
                <Text
                  numberOfLines={3}
                  style={[styles.note, { color: colors.text }]}
                >
                  {note.text}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ color: colors.muted, fontSize: 12, marginTop: 12 }}
                >
                  {books.find((b) => b.id === note.bookId)?.title}
                </Text>
              </Card>
            </Pressable>
          ))
        ) : (
          <Empty
            title="Здесь сохранятся важные слова"
            description="Добавляйте цитаты, мысли и конспекты к своим книгам."
            action={
              books.length ? (
                <Button
                  title="Записать мысль"
                  variant="secondary"
                  onPress={() => navigation.navigate("NoteForm")}
                />
              ) : undefined
            }
          />
        )}
      </Section>
    </Screen>
  );
}
const styles = StyleSheet.create({
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  brand: { fontSize: 24, fontWeight: "700", letterSpacing: 4 },
  eyebrow: { fontSize: 8, letterSpacing: 1.3 },
  hero: {
    fontSize: 29,
    lineHeight: 36,
    fontFamily: "serif",
    marginTop: 17,
    marginBottom: 12,
  },
  body: { fontSize: 14, lineHeight: 21 },
  emptyIntro: { gap: 5 },
  bookSymbol: {
    height: 64,
    width: 64,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  reading: { flexDirection: "row", alignItems: "center", gap: 16 },
  bookTitle: { fontSize: 20, lineHeight: 25, fontFamily: "serif" },
  daily: { flexDirection: "row", paddingVertical: 8 },
  dailyCell: { flex: 1, borderRightWidth: 1, paddingHorizontal: 10 },
  stat: { fontSize: 24, fontWeight: "500" },
  caption: { fontSize: 12, marginTop: 5 },
  week: { flexDirection: "row", gap: 5 },
  weekDay: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    gap: 8,
  },
  goalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  goalNumber: { fontSize: 32, fontFamily: "serif" },
  note: { fontFamily: "serif", fontSize: 19, lineHeight: 27 },
  timer: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 12,
    padding: 17,
    alignItems: "center",
    marginBottom: 22,
  },
  timerTitle: { fontSize: 14, fontWeight: "600", marginBottom: 4 },
});
