import React, { useState } from "react";
import {
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useStore } from "../store";
import { BookInput, BookStatus, EMPTY_BOOK, STATUS_LABELS } from "../types";
import {
  Screen,
  Heading,
  Section,
  Button,
  Field,
  Card,
  Cover,
  Chip,
  useTheme,
  showError,
} from "../ui";
import { cacheCover } from "../catalog";
function day(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseDay(value: string): string | null {
  if (!value.trim()) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("Укажите дату в формате ГГГГ-ММ-ДД.");
  const date = new Date(value + "T12:00:00");
  if (!Number.isFinite(date.getTime()) || day(date.toISOString()) !== value)
    throw new Error("Проверьте дату: такого дня нет в календаре.");
  return date.toISOString();
}
export default function BookFormScreen({ navigation, route }: any) {
  const { books, saveBook } = useStore();
  const { colors } = useTheme();
  const id = route.params?.id;
  const original = books.find((b) => b.id === id);
  const [form, setForm] = useState<BookInput>(() => ({
    ...EMPTY_BOOK,
    ...(original || route.params?.prefill || {}),
  }));
  const [total, setTotal] = useState(String(form.totalPages || ""));
  const [current, setCurrent] = useState(String(form.currentPage || ""));
  const [started, setStarted] = useState(day(form.startedAt));
  const [finished, setFinished] = useState(day(form.finishedAt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function patch<K extends keyof BookInput>(key: K, value: BookInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  async function pick() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showError(
          new Error(
            "Разрешите доступ к изображениям в настройках Android, чтобы выбрать обложку.",
          ),
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [2, 3],
        quality: 0.8,
      });
      if (!result.canceled) patch("coverUri", result.assets[0].uri);
    } catch (e) {
      showError(e);
    }
  }
  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (!form.title.trim()) throw new Error("Укажите название книги.");
      if (
        (total && !/^\d+$/.test(total)) ||
        (current && !/^\d+$/.test(current))
      )
        throw new Error(
          "Количество страниц должно быть целым неотрицательным числом.",
        );
      const totalPages = Number(total) || 0,
        currentPage = Number(current) || 0;
      if (totalPages > 1000000 || currentPage > 1000000)
        throw new Error("Укажите количество страниц до 1 000 000.");
      if (totalPages && currentPage > totalPages)
        throw new Error("Текущая страница не может быть больше объёма книги.");
      if (form.publicationYear && !/^\d{1,4}$/.test(form.publicationYear))
        throw new Error("Укажите год публикации цифрами.");
      const startedAt = parseDay(started),
        finishedAt = parseDay(finished);
      if (startedAt && finishedAt && finishedAt < startedAt)
        throw new Error("Дата завершения не может быть раньше начала.");
      const coverUri = await cacheCover(form.coverUri.trim());
      const savedId = await saveBook(
        {
          ...form,
          title: form.title.trim(),
          author: form.author.trim(),
          totalPages,
          currentPage,
          startedAt,
          finishedAt,
          coverUri,
        },
        id,
      );
      if (id) navigation.goBack();
      else navigation.replace("Book", { id: savedId });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Не удалось сохранить книгу. Попробуйте ещё раз.",
      );
    } finally {
      setBusy(false);
    }
  }
  const textField = (
    key: keyof BookInput,
    label: string,
    placeholder?: string,
    multiline = false,
  ) => (
    <Field
      label={label}
      placeholder={placeholder}
      value={String(form[key] ?? "")}
      onChangeText={(v) => patch(key, v as never)}
      multiline={multiline}
      textAlignVertical={multiline ? "top" : undefined}
      style={multiline ? { minHeight: 110 } : undefined}
    />
  );
  return (
    <Screen>
      <View style={{ gap: 23 }}>
        <Heading
          title={id ? "Редактирование" : "Новая книга"}
          subtitle="Место для вашей следующей истории"
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 22 }}>
          <Cover book={form} width={92} height={138} />
          <View style={{ flex: 1, gap: 10 }}>
            <Button
              title="Выбрать обложку"
              variant="secondary"
              onPress={pick}
            />
            {!!form.coverUri && (
              <Button
                title="Убрать обложку"
                variant="secondary"
                onPress={() => patch("coverUri", "")}
              />
            )}
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
              Изображение сохранится на устройстве и будет доступно офлайн.
            </Text>
          </View>
        </View>
        <Section title="Главное">
          <View style={{ gap: 15 }}>
            {textField("title", "Название *", "Название книги")}
            {textField("author", "Автор", "Имя автора")}
            <Field
              label="Всего страниц"
              value={total}
              onChangeText={setTotal}
              keyboardType="number-pad"
              placeholder="Необязательно"
            />
            <Text style={{ color: colors.muted, fontSize: 12 }}>Статус</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {(Object.keys(STATUS_LABELS) as BookStatus[]).map((s) => (
                <Chip
                  key={s}
                  label={STATUS_LABELS[s]}
                  selected={form.status === s}
                  onPress={() => patch("status", s)}
                />
              ))}
            </ScrollView>
            <Field
              label="Текущая страница"
              value={current}
              onChangeText={setCurrent}
              keyboardType="number-pad"
              placeholder="0"
            />
          </View>
        </Section>
        <Section title="Издание">
          <View style={{ gap: 15 }}>
            {textField("isbn", "ISBN", "978…")}
            {textField("publicationYear", "Год публикации", "Например, 2024")}
            {textField("publisher", "Издательство")}
            {textField("language", "Язык", "Например, русский")}
            {textField("genre", "Жанр")}
            <Text style={{ fontSize: 12, color: colors.muted }}>Формат</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {["Бумажная", "Электронная", "Аудиокнига"].map((f) => (
                <Chip
                  key={f}
                  label={f}
                  selected={form.format === f}
                  onPress={() => patch("format", f)}
                />
              ))}
            </View>
            {textField("description", "Описание", "О чём эта книга?", true)}
          </View>
        </Section>
        <Section title="Ваша история">
          <View style={{ gap: 15 }}>
            <Field
              label="Дата начала · ГГГГ-ММ-ДД"
              value={started}
              onChangeText={setStarted}
              placeholder="Необязательно"
              keyboardType="numbers-and-punctuation"
            />
            <Field
              label="Дата завершения · ГГГГ-ММ-ДД"
              value={finished}
              onChangeText={setFinished}
              placeholder="Необязательно"
              keyboardType="numbers-and-punctuation"
            />
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              Личная оценка
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 8,
              }}
            >
              {[1, 2, 3, 4, 5].map((r) => (
                <Pressable
                  key={r}
                  accessibilityRole="button"
                  accessibilityLabel={`Оценка ${r} из 5`}
                  onPress={() => patch("rating", r === form.rating ? 0 : r)}
                  accessibilityState={{ selected: r === form.rating }}
                  style={{
                    minWidth: 48,
                    minHeight: 48,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 31,
                      color: r <= form.rating ? colors.gold : colors.muted,
                    }}
                  >
                    {r <= form.rating ? "★" : "☆"}
                  </Text>
                </Pressable>
              ))}
            </View>
            {textField(
              "review",
              "Рецензия",
              "Какие впечатления остались?",
              true,
            )}
          </View>
        </Section>
        {!!error && (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={{ color: colors.danger, lineHeight: 22 }}
          >
            {error}
          </Text>
        )}
        {busy && <ActivityIndicator color={colors.accent} />}
        <Button
          title={busy ? "Сохраняем…" : "Сохранить книгу"}
          disabled={busy}
          onPress={save}
        />
        <Text
          style={{
            color: colors.muted,
            fontSize: 12,
            lineHeight: 19,
            textAlign: "center",
          }}
        >
          Книга, заметки и история чтения хранятся только на этом устройстве.
        </Text>
      </View>
    </Screen>
  );
}
