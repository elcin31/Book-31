import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useStore } from "../store";
import {
  Button,
  Card,
  Empty,
  Field,
  Heading,
  Screen,
  showError,
  useTheme,
} from "../ui";
import { formatTimer, timerSeconds } from "../timer";

const pad = (n: number) => n.toString().padStart(2, "0");
function localDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function localTime(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export default function SessionScreen({ navigation, route }: any) {
  const { books, timer, pauseTimer, saveSession } = useStore();
  const { colors } = useTheme();
  const book = books.find((b) => b.id === route.params?.bookId);
  const fromTimer = !!route.params?.timer;
  const activeTimer = fromTimer && timer?.bookId === book?.id ? timer : null;
  const [startPage, setStartPage] = useState(
    String(activeTimer?.startPage ?? book?.currentPage ?? 0),
  );
  const [endPage, setEndPage] = useState(String(book?.currentPage ?? 0));
  const [minutes, setMinutes] = useState("");
  const [date, setDate] = useState(localDate(new Date()));
  const [time, setTime] = useState(localTime(new Date()));
  const [saving, setSaving] = useState(false);
  const [pausing, setPausing] = useState(
    fromTimer && activeTimer?.runningSince != null,
  );
  useEffect(() => {
    if (!fromTimer || !activeTimer || activeTimer.runningSince === null) {
      setPausing(false);
      return;
    }
    let mounted = true;
    pauseTimer()
      .catch(showError)
      .finally(() => {
        if (mounted) setPausing(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  const elapsed = activeTimer ? timerSeconds(activeTimer) : 0;
  const parsedPages =
    /^\d+$/.test(startPage.trim()) && /^\d+$/.test(endPage.trim())
      ? Number(endPage) - Number(startPage)
      : null;
  const save = async () => {
    if (saving || pausing) return;
    try {
      if (!book) throw new Error("Книга не найдена.");
      if (!/^\d+$/.test(startPage.trim()) || !/^\d+$/.test(endPage.trim()))
        throw new Error("Укажите целые неотрицательные номера страниц.");
      const first = Number(startPage);
      const last = Number(endPage);
      if (
        !Number.isSafeInteger(first) ||
        !Number.isSafeInteger(last) ||
        first > last ||
        (book.totalPages > 0 && last > book.totalPages)
      )
        throw new Error(
          "Последняя страница должна быть не меньше первой и в пределах книги.",
        );
      let startedAt: string;
      let durationSeconds: number;
      if (fromTimer) {
        if (!activeTimer) throw new Error("Сессия таймера уже завершена.");
        if (activeTimer.runningSince !== null)
          throw new Error("Сначала поставьте таймер на паузу.");
        startedAt = activeTimer.startedAt;
        durationSeconds = elapsed;
      } else {
        if (!/^\d+(?:[.,]\d{1,2})?$/.test(minutes.trim()))
          throw new Error("Укажите длительность в минутах.");
        durationSeconds = Math.round(Number(minutes.replace(",", ".")) * 60);
        if (durationSeconds < 1 || durationSeconds > 86400)
          throw new Error("Длительность должна быть от 1 секунды до 24 часов.");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
          throw new Error("Используйте дату ГГГГ-ММ-ДД и время ЧЧ:ММ.");
        const endDate = new Date(`${date}T${time}:00`);
        if (
          Number.isNaN(endDate.getTime()) ||
          localDate(endDate) !== date ||
          localTime(endDate) !== time
        )
          throw new Error("Проверьте дату и время завершения.");
        if (endDate.getTime() > Date.now())
          throw new Error("Завершение сессии не может быть в будущем.");
        startedAt = new Date(
          endDate.getTime() - durationSeconds * 1000,
        ).toISOString();
      }
      if (durationSeconds < 1 && first === last)
        throw new Error(
          "Сессия пока пустая. Вернитесь к чтению или укажите прочитанные страницы.",
        );
      setSaving(true);
      await saveSession(
        {
          bookId: book.id,
          startPage: first,
          endPage: last,
          durationSeconds,
          startedAt,
          source: fromTimer ? "timer" : "manual",
        },
        fromTimer,
      );
      if (fromTimer) navigation.popTo("Book", { id: book.id });
      else navigation.goBack();
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Screen>
      <Heading
        title={fromTimer ? "Сохранить прочитанное" : "Добавить сессию"}
        subtitle={book?.title ?? "История чтения"}
      />
      {!book ? (
        <Empty
          title="Книга не найдена"
          description="Возможно, она уже удалена из библиотеки."
        />
      ) : fromTimer && !activeTimer ? (
        <Empty
          title="Сессия уже сохранена"
          action={
            <Button
              title="К книге"
              onPress={() => navigation.popTo("Book", { id: book.id })}
            />
          }
        />
      ) : (
        <>
          {fromTimer ? (
            <Card
              style={{
                alignItems: "center",
                paddingVertical: 24,
                marginBottom: 24,
              }}
            >
              <Text
                style={{ color: colors.muted, fontSize: 11, letterSpacing: 2 }}
              >
                ВРЕМЯ ЧТЕНИЯ
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 38,
                  fontVariant: ["tabular-nums"],
                  marginTop: 10,
                }}
              >
                {formatTimer(elapsed)}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>
                Таймер на паузе, пока вы сохраняете результат
              </Text>
            </Card>
          ) : (
            <>
              <Field
                label="Длительность · минуты"
                placeholder="Например, 25"
                value={minutes}
                onChangeText={setMinutes}
                keyboardType="decimal-pad"
                maxLength={8}
              />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Дата · ГГГГ-ММ-ДД"
                    value={date}
                    onChangeText={setDate}
                    placeholder="2026-11-03"
                    maxLength={10}
                    autoCapitalize="none"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Завершение · ЧЧ:ММ"
                    value={time}
                    onChangeText={setTime}
                    placeholder="19:30"
                    maxLength={5}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </>
          )}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field
                label="Первая страница"
                value={startPage}
                onChangeText={setStartPage}
                keyboardType="number-pad"
                editable={!fromTimer}
                maxLength={7}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Текущая страница"
                value={endPage}
                onChangeText={setEndPage}
                keyboardType="number-pad"
                maxLength={7}
                autoFocus={fromTimer}
              />
            </View>
          </View>
          <Text
            style={{
              color: colors.muted,
              lineHeight: 21,
              fontSize: 13,
              marginTop: 8,
              marginBottom: 24,
            }}
          >
            {parsedPages !== null && parsedPages >= 0
              ? `Прочитано за сессию: ${parsedPages} стр.`
              : "Укажите прогресс за сессию."}
            {book.totalPages > 0
              ? ` Всего в книге ${book.totalPages} стр.`
              : ""}
          </Text>
          <Button
            title={
              saving
                ? "Сохраняем…"
                : pausing
                  ? "Останавливаем таймер…"
                  : "Сохранить сессию"
            }
            onPress={save}
            disabled={saving || pausing}
          />
          {fromTimer && (
            <View style={{ marginTop: 12 }}>
              <Button
                title="Вернуться к таймеру"
                variant="secondary"
                disabled={saving}
                onPress={() => navigation.goBack()}
              />
            </View>
          )}
          <Text
            style={{
              color: colors.muted,
              fontSize: 12,
              lineHeight: 19,
              marginTop: 22,
            }}
          >
            Сессия появится в календаре и аналитике. Текущий прогресс книги
            обновится автоматически.
          </Text>
        </>
      )}
    </Screen>
  );
}
