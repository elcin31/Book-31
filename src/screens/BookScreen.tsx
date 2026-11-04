import React, { useEffect, useState } from "react";
import {
  Text,
  View,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { useStore } from "../store";
import { BookInput, BookStatus, STATUS_LABELS } from "../types";
import {
  Screen,
  Heading,
  Section,
  Button,
  Field,
  Card,
  Cover,
  Progress,
  Chip,
  Empty,
  useTheme,
  showError,
  confirm,
} from "../ui";
export default function BookScreen({ navigation, route }: any) {
  const store = useStore();
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 360 || fontScale > 1.3;
  const book = store.books.find((b) => b.id === route.params.id);
  const [page, setPage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionLimit, setSessionLimit] = useState(10);
  const [noteLimit, setNoteLimit] = useState(5);
  useEffect(() => {
    setPage(String(book?.currentPage || 0));
  }, [book?.currentPage]);
  if (!book)
    return (
      <Screen>
        <Empty
          title="Книга не найдена"
          action={
            <Button
              title="В библиотеку"
              onPress={() => navigation.navigate("Tabs", { screen: "Library" })}
            />
          }
        />
      </Screen>
    );
  const b = book;
  const notes = store.notes.filter((n) => n.bookId === b.id);
  const sessions = store.sessions
    .filter((s) => s.bookId === b.id)
    .sort((a, c) => c.startedAt.localeCompare(a.startedAt));
  async function setStatus(status: BookStatus) {
    if (busy || status === b.status) return;
    setBusy(true);
    try {
      const { id, createdAt, ...input } = b;
      await store.saveBook({ ...input, status }, id);
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }
  async function progress() {
    if (busy) return;
    if (!/^\d+$/.test(page)) {
      showError(new Error("Укажите целую неотрицательную страницу."));
      return;
    }
    setBusy(true);
    try {
      await store.updateProgress(b.id, Number(page));
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }
  async function start() {
    try {
      if (!store.timer) await store.startTimer(b.id);
      navigation.navigate("Timer");
    } catch (e) {
      showError(e);
    }
  }
  const date = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("ru-RU") : "Не указана";
  return (
    <Screen>
      <View style={{ gap: 24 }}>
        <Heading
          title="На книжной полке"
          action={
            <Button
              title="Изменить"
              variant="secondary"
              onPress={() => navigation.navigate("BookForm", { id: b.id })}
            />
          }
        />
        <View
          style={{
            flexDirection: compact ? "column" : "row",
            gap: 20,
            alignItems: compact ? "center" : "flex-start",
            paddingBottom: 24,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Cover
            book={b}
            width={compact ? 138 : 118}
            height={compact ? 207 : 177}
          />
          <View
            style={{
              flex: compact ? undefined : 1,
              alignSelf: "stretch",
              gap: 10,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 25,
                fontFamily: "serif",
                lineHeight: 31,
              }}
            >
              {b.title}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
              {b.author || "Автор не указан"}
            </Text>
            {!!b.publicationYear && (
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {b.publicationYear} · {b.format}
              </Text>
            )}
            <Text
              accessibilityLabel={
                b.rating ? `Оценка ${b.rating} из 5` : "Оценка не указана"
              }
              style={{ color: colors.gold, fontSize: 21, letterSpacing: 2 }}
            >
              {b.rating
                ? "★".repeat(b.rating) + "☆".repeat(5 - b.rating)
                : "☆☆☆☆☆"}
            </Text>
          </View>
        </View>
        <Section title="Статус чтения">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {(Object.keys(STATUS_LABELS) as BookStatus[]).map((s) => (
              <Chip
                key={s}
                label={STATUS_LABELS[s]}
                selected={s === b.status}
                onPress={() => setStatus(s)}
              />
            ))}
          </ScrollView>
        </Section>
        <Card>
          <View style={{ gap: 15 }}>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ color: colors.text, fontWeight: "600" }}>
                Ваш прогресс
              </Text>
              <Text style={{ color: colors.accent }}>
                {b.totalPages
                  ? `${Math.round((b.currentPage / b.totalPages) * 100)}%`
                  : `${b.currentPage} стр.`}
              </Text>
            </View>
            <Progress value={b.totalPages ? b.currentPage / b.totalPages : 0} />
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              Страница {b.currentPage}
              {b.totalPages ? ` из ${b.totalPages}` : " · объём не указан"}
            </Text>
            <View
              style={{ flexDirection: "row", gap: 10, alignItems: "flex-end" }}
            >
              <View style={{ flex: 1 }}>
                <Field
                  label="Текущая страница"
                  keyboardType="number-pad"
                  value={page}
                  onChangeText={setPage}
                />
              </View>
              <Button title="Сохранить" disabled={busy} onPress={progress} />
            </View>
            <Button
              title={store.timer ? "К активному таймеру" : "Начать чтение"}
              onPress={start}
            />
            <Button
              title="Добавить сессию вручную"
              variant="secondary"
              onPress={() => navigation.navigate("Session", { bookId: b.id })}
            />
          </View>
        </Card>
        {!!b.description && (
          <Section title="О книге">
            <Text style={{ color: colors.text, fontSize: 15, lineHeight: 24 }}>
              {b.description.replace(/<[^>]*>/g, "")}
            </Text>
          </Section>
        )}
        <Section
          title="Личный дневник"
          action={
            <Button
              title="Запись"
              variant="secondary"
              onPress={() => navigation.navigate("NoteForm", { bookId: b.id })}
            />
          }
        >
          {notes.length ? (
            notes.slice(0, noteLimit).map((n) => (
              <Pressable
                key={n.id}
                accessibilityRole="button"
                onPress={() => navigation.navigate("NoteForm", { id: n.id })}
              >
                <Card>
                  <Text
                    style={{
                      color: colors.accent,
                      fontSize: 11,
                      letterSpacing: 1,
                      marginBottom: 9,
                    }}
                  >
                    {n.type === "quote"
                      ? "ЦИТАТА"
                      : n.type === "thought"
                        ? "МЫСЛЬ"
                        : "КОНСПЕКТ"}
                    {n.page !== null ? ` · СТР. ${n.page}` : ""}
                    {n.favorite ? " · ★" : ""}
                  </Text>
                  <Text
                    numberOfLines={5}
                    style={{
                      color: colors.text,
                      fontSize: 16,
                      lineHeight: 25,
                      fontFamily: n.type === "quote" ? "serif" : undefined,
                    }}
                  >
                    {n.text}
                  </Text>
                  <Text
                    style={{ color: colors.muted, fontSize: 11, marginTop: 12 }}
                  >
                    {date(n.createdAt)}
                  </Text>
                </Card>
              </Pressable>
            ))
          ) : (
            <Text style={{ color: colors.muted, lineHeight: 22 }}>
              Сохраните мысль или любимую цитату — они останутся рядом с книгой.
            </Text>
          )}
          {notes.length > noteLimit && (
            <Button
              title={`Ещё заметки (${notes.length - noteLimit})`}
              variant="secondary"
              onPress={() => setNoteLimit((n) => n + 10)}
            />
          )}
        </Section>
        <Section title="Оценка и рецензия">
          <Text style={{ color: colors.text, lineHeight: 24 }}>
            {b.review || "Ваше впечатление ещё не записано."}
          </Text>
          <Button
            title="Записать впечатление"
            variant="secondary"
            onPress={() => navigation.navigate("BookForm", { id: b.id })}
          />
        </Section>
        <Section title={`История чтения · ${sessions.length}`}>
          {sessions.length ? (
            sessions.slice(0, sessionLimit).map((s) => (
              <View
                key={s.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  borderBottomColor: colors.border,
                  borderBottomWidth: 1,
                  paddingVertical: 13,
                  gap: 12,
                }}
              >
                <View>
                  <Text style={{ color: colors.text, fontSize: 14 }}>
                    {date(s.startedAt)}
                  </Text>
                  <Text
                    style={{ color: colors.muted, fontSize: 11, marginTop: 5 }}
                  >
                    {s.source === "timer"
                      ? "Таймер"
                      : s.source === "manual"
                        ? "Ручная сессия"
                        : "Обновление прогресса"}{" "}
                    · стр. {s.startPage}–{s.endPage}
                  </Text>
                </View>
                <Text style={{ color: colors.accent, fontSize: 13 }}>
                  {s.durationSeconds
                    ? `${Math.floor(s.durationSeconds / 60)} мин · `
                    : ""}
                  {Math.max(0, s.endPage - s.startPage)} стр.
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ color: colors.muted }}>
              Первая сессия ещё впереди.
            </Text>
          )}
          {sessions.length > sessionLimit && (
            <Button
              title={`Ещё сессии (${sessions.length - sessionLimit})`}
              variant="secondary"
              onPress={() => setSessionLimit((n) => n + 20)}
            />
          )}
        </Section>
        <Section title="Детали">
          <View style={{ gap: 10 }}>
            {[
              ["Начало чтения", date(b.startedAt)],
              ["Завершение", date(b.finishedAt)],
              ["ISBN", b.isbn],
              ["Издательство", b.publisher],
              ["Язык", b.language],
              ["Жанр", b.genre],
              ["Формат", b.format],
            ]
              .filter(([, v]) => v)
              .map(([l, v]) => (
                <View key={l} style={{ flexDirection: "row", gap: 18 }}>
                  <Text
                    style={{ color: colors.muted, width: 118, fontSize: 13 }}
                  >
                    {l}
                  </Text>
                  <Text style={{ color: colors.text, fontSize: 13, flex: 1 }}>
                    {v}
                  </Text>
                </View>
              ))}
          </View>
        </Section>
        <Button
          title="Удалить книгу"
          variant="danger"
          onPress={() =>
            confirm(
              "Удалить книгу?",
              "Книга, её заметки и история чтения будут удалены с этого устройства.",
              () => {
                store
                  .deleteBook(b.id)
                  .then(() => navigation.goBack())
                  .catch(showError);
              },
            )
          }
        />
      </View>
    </Screen>
  );
}
