import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../store";
import {
  Button,
  Card,
  Chip,
  Empty,
  Field,
  Heading,
  Screen,
  confirm,
  showError,
  useTheme,
} from "../ui";
import { Note } from "../types";

const noteLabels: Record<Note["type"], string> = {
  quote: "Цитата",
  thought: "Мысль",
  summary: "Конспект",
};
export default function DiaryScreen({ navigation }: any) {
  const { notes, books, saveNote, deleteNote } = useStore();
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "favorite" | Note["type"]>(
    "all",
  );
  const [bookFilter, setBookFilter] = useState<number | null>(null);
  const visible = useMemo(
    () =>
      notes
        .filter((note) => {
          const book = books.find((b) => b.id === note.bookId);
          return (
            (filter === "all" ||
              (filter === "favorite" ? note.favorite : note.type === filter)) &&
            (bookFilter === null || note.bookId === bookFilter) &&
            `${note.text} ${book?.title ?? ""} ${book?.author ?? ""}`
              .toLocaleLowerCase()
              .includes(query.toLocaleLowerCase().trim())
          );
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [notes, books, query, filter, bookFilter],
  );
  const toggleFavorite = async (note: Note) => {
    try {
      await saveNote(
        {
          bookId: note.bookId,
          page: note.page,
          type: note.type,
          text: note.text,
          favorite: !note.favorite,
        },
        note.id,
      );
    } catch (error) {
      showError(error);
    }
  };
  return (
    <Screen>
      <Heading
        title="Дневник"
        subtitle="То, что хочется сохранить"
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Добавить запись"
            onPress={() => navigation.navigate("NoteForm")}
            style={{ padding: 12 }}
          >
            <Ionicons name="add" size={26} color={colors.accent} />
          </Pressable>
        }
      />
      <Field
        label="Поиск в дневнике"
        placeholder="Фраза, название книги или автор"
        value={query}
        onChangeText={setQuery}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginVertical: 12 }}
        contentContainerStyle={{ gap: 8 }}
      >
        {(
          [
            ["all", "Все записи"],
            ["favorite", "Избранное"],
            ["quote", "Цитаты"],
            ["thought", "Мысли"],
            ["summary", "Конспекты"],
          ] as const
        ).map(([key, label]) => (
          <Chip
            key={key}
            label={label}
            selected={filter === key}
            onPress={() => setFilter(key)}
          />
        ))}
      </ScrollView>
      {notes.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
        >
          <Chip
            label="Все книги"
            selected={bookFilter === null}
            onPress={() => setBookFilter(null)}
          />
          {books
            .filter((b) => notes.some((n) => n.bookId === b.id))
            .map((book) => (
              <Chip
                key={book.id}
                label={book.title}
                selected={bookFilter === book.id}
                onPress={() => setBookFilter(book.id)}
              />
            ))}
        </ScrollView>
      )}
      {!visible.length ? (
        <Empty
          title={notes.length ? "Записи не найдены" : "Мысли обретают место"}
          description={
            notes.length
              ? "Измените поиск или фильтр."
              : "Сохраните первую цитату, наблюдение или конспект. У каждой записи будет своя книга."
          }
          action={
            !notes.length ? (
              <Button
                title={
                  books.length ? "Создать запись" : "Добавить первую книгу"
                }
                onPress={() =>
                  navigation.navigate(books.length ? "NoteForm" : "BookForm")
                }
              />
            ) : undefined
          }
        />
      ) : (
        visible.map((note) => {
          const book = books.find((b) => b.id === note.bookId);
          return (
            <Card key={note.id} style={{ marginBottom: 14, padding: 18 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    color: colors.accent,
                    fontSize: 11,
                    fontWeight: "700",
                    letterSpacing: 1.8,
                  }}
                >
                  {noteLabels[note.type].toLocaleUpperCase()}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    note.favorite ? "Убрать из избранного" : "В избранное"
                  }
                  onPress={() => toggleFavorite(note)}
                  hitSlop={10}
                  style={{ padding: 8 }}
                >
                  <Ionicons
                    name={note.favorite ? "bookmark" : "bookmark-outline"}
                    size={20}
                    color={note.favorite ? colors.gold : colors.muted}
                  />
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Редактировать запись"
                onPress={() => navigation.navigate("NoteForm", { id: note.id })}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontFamily: note.type === "quote" ? "serif" : undefined,
                    fontSize: note.type === "quote" ? 21 : 16,
                    lineHeight: note.type === "quote" ? 31 : 25,
                    marginVertical: 10,
                  }}
                >
                  {note.type === "quote" ? `«${note.text}»` : note.text}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => navigation.navigate("Book", { id: note.bookId })}
              >
                <Text
                  style={{
                    color: colors.accent,
                    fontWeight: "600",
                    fontSize: 13,
                  }}
                >
                  {book?.title ?? "Книга"}
                  {note.page !== null ? ` · с. ${note.page}` : ""}
                </Text>
              </Pressable>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 15,
                }}
              >
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {new Date(note.createdAt).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Удалить запись"
                  onPress={() =>
                    confirm(
                      "Удалить запись?",
                      "Эта запись будет удалена из дневника.",
                      async () => {
                        try {
                          await deleteNote(note.id);
                        } catch (error) {
                          showError(error);
                        }
                      },
                    )
                  }
                  hitSlop={10}
                  style={{ padding: 6 }}
                >
                  <Ionicons
                    name="trash-outline"
                    size={16}
                    color={colors.muted}
                  />
                </Pressable>
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
