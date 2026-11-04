import React, { useState } from "react";
import { ScrollView, Switch, Text, View } from "react-native";
import { useStore } from "../store";
import {
  Button,
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

export default function NoteFormScreen({ navigation, route }: any) {
  const { books, notes, saveNote, deleteNote } = useStore();
  const { colors } = useTheme();
  const existing = notes.find((n) => n.id === route.params?.id);
  const [bookId, setBookId] = useState<number | null>(
    existing?.bookId ?? route.params?.bookId ?? books[0]?.id ?? null,
  );
  const [type, setType] = useState<Note["type"]>(existing?.type ?? "quote");
  const [page, setPage] = useState(existing?.page?.toString() ?? "");
  const [text, setText] = useState(existing?.text ?? "");
  const [favorite, setFavorite] = useState(existing?.favorite ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selectedBook = books.find((b) => b.id === bookId);
  const save = async () => {
    if (saving) return;
    setError("");
    try {
      if (!selectedBook) throw new Error("Выберите книгу для записи.");
      if (!text.trim()) throw new Error("Добавьте текст записи.");
      if (
        page.trim() &&
        (!/^\d+$/.test(page.trim()) ||
          Number(page) < 0 ||
          (selectedBook.totalPages > 0 &&
            Number(page) > selectedBook.totalPages))
      )
        throw new Error("Укажите страницу в пределах книги.");
      setSaving(true);
      await saveNote(
        {
          bookId: selectedBook.id,
          page: page.trim() ? Number(page) : null,
          type,
          text: text.trim(),
          favorite,
        },
        existing?.id,
      );
      navigation.goBack();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Не удалось сохранить запись. Попробуйте ещё раз.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Screen>
      <Heading
        title={existing ? "Редактировать запись" : "Новая запись"}
        subtitle="Память о прочитанном"
      />
      {!books.length ? (
        <Empty
          title="Сначала выберите книгу"
          description="Добавьте книгу в библиотеку, чтобы сохранить связанную с ней запись."
          action={
            <Button
              title="Добавить книгу"
              onPress={() => navigation.navigate("BookForm")}
            />
          }
        />
      ) : (
        <>
          <Text
            style={{
              color: colors.muted,
              fontSize: 12,
              fontWeight: "600",
              marginBottom: 8,
            }}
          >
            КНИГА
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 20 }}
          >
            {books.map((book) => (
              <Chip
                key={book.id}
                label={book.title}
                selected={bookId === book.id}
                onPress={() => setBookId(book.id)}
              />
            ))}
          </ScrollView>
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 20,
            }}
          >
            {(
              [
                ["quote", "Цитата"],
                ["thought", "Мысль"],
                ["summary", "Конспект"],
              ] as const
            ).map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                selected={type === value}
                onPress={() => setType(value)}
              />
            ))}
          </View>
          <Field
            label={
              type === "quote"
                ? "Цитата"
                : type === "thought"
                  ? "Ваша мысль"
                  : "Конспект"
            }
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
            placeholder="Сохраните то, что откликнулось…"
            style={{ minHeight: 200, lineHeight: 26 }}
            maxLength={50000}
          />
          <Field
            label="Страница · необязательно"
            value={page}
            onChangeText={setPage}
            keyboardType="number-pad"
            placeholder={
              selectedBook?.totalPages
                ? `От 0 до ${selectedBook.totalPages}`
                : "Номер страницы"
            }
            maxLength={7}
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginVertical: 18,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 16 }}>
              В избранное
            </Text>
            <Switch
              accessibilityLabel="Добавить в избранное"
              value={favorite}
              onValueChange={setFavorite}
              trackColor={{ true: colors.accent }}
            />
          </View>
          {!!error && (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={{ color: colors.danger, lineHeight: 22, marginBottom: 12 }}
            >
              {error}
            </Text>
          )}
          <Button
            title={saving ? "Сохраняем…" : "Сохранить запись"}
            onPress={save}
            disabled={saving}
          />
          {existing && (
            <View style={{ marginTop: 12 }}>
              <Button
                title="Удалить запись"
                variant="danger"
                disabled={saving}
                onPress={() =>
                  confirm(
                    "Удалить запись?",
                    "Запись будет удалена из дневника.",
                    async () => {
                      try {
                        await deleteNote(existing.id);
                        navigation.goBack();
                      } catch (error) {
                        showError(error);
                      }
                    },
                  )
                }
              />
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
