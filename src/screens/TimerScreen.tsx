import React, { useEffect, useState } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useStore } from "../store";
import {
  Button,
  Card,
  Cover,
  Empty,
  Heading,
  Progress,
  Screen,
  confirm,
  showError,
  useTheme,
} from "../ui";

import { formatTimer, timerSeconds } from "../timer";
let wakeLockSequence = 0;
export default function TimerScreen({ navigation }: any) {
  const {
    timer,
    books,
    settings,
    startTimer,
    pauseTimer,
    resumeTimer,
    discardTimer,
  } = useStore();
  const { colors } = useTheme();
  const focused = useIsFocused();
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    const subscription = AppState.addEventListener("change", () =>
      setNow(Date.now()),
    );
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    if (
      !focused ||
      !timer ||
      timer.runningSince === null ||
      !settings.keepScreenAwake
    )
      return;
    // Each effect owns its tag, so a late activation cannot release a newer lock.
    const tag = `folio-reading-${++wakeLockSequence}`;
    let cancelled = false;
    let activated = false;
    const release = () => {
      void Promise.resolve(deactivateKeepAwake(tag)).catch(() => {});
    };
    void activateKeepAwakeAsync(tag)
      .then(() => {
        activated = true;
        if (cancelled) release();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (activated) release();
    };
  }, [focused, timer?.runningSince, settings.keepScreenAwake]);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      setNow(Date.now());
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  };
  const book = books.find((b) => b.id === timer?.bookId);
  const elapsed = timer ? timerSeconds(timer, now) : 0;
  const candidates = [...books].sort(
    (a, b) =>
      (a.status === "reading" ? -1 : 0) - (b.status === "reading" ? -1 : 0),
  );
  return (
    <Screen>
      <Heading
        title="Время для книги"
        subtitle={
          timer ? "Одна книга. Никакой спешки." : "Выберите, что будете читать"
        }
      />
      {timer && book ? (
        <>
          <View style={{ alignItems: "center", marginTop: 16 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Открыть книгу"
              onPress={() => navigation.navigate("Book", { id: book.id })}
            >
              <Cover book={book} width={124} height={184} />
            </Pressable>
            <Text
              style={{
                color: colors.text,
                fontFamily: "serif",
                fontSize: 25,
                textAlign: "center",
                marginTop: 24,
                lineHeight: 31,
              }}
            >
              {book.title}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 14, marginTop: 7 }}>
              {book.author || "Автор не указан"}
            </Text>
            <Text
              style={{
                color: colors.accent,
                fontSize: 10,
                letterSpacing: 3,
                fontWeight: "700",
                marginTop: 36,
              }}
            >
              {timer.runningSince === null ? "ПАУЗА" : "ЧИТАЕМ"}
            </Text>
            <Text
              accessibilityRole="timer"
              accessibilityLabel={`Прошло ${elapsed} секунд`}
              style={{
                color: colors.text,
                fontSize: 46,
                fontWeight: "300",
                fontVariant: ["tabular-nums"],
                letterSpacing: 1,
                marginTop: 12,
                marginBottom: 12,
              }}
            >
              {formatTimer(elapsed)}
            </Text>
            <Text
              style={{ color: colors.muted, fontSize: 13, marginBottom: 24 }}
            >
              Начали со страницы {timer.startPage}
            </Text>
          </View>
          {settings.timerTargetMinutes > 0 && (
            <View style={{ marginBottom: 30 }}>
              <Progress
                value={Math.min(
                  1,
                  elapsed / (settings.timerTargetMinutes * 60),
                )}
              />
              <Text
                style={{
                  color: colors.muted,
                  textAlign: "center",
                  marginTop: 10,
                  fontSize: 12,
                }}
              >
                {elapsed >= settings.timerTargetMinutes * 60
                  ? "Цель сессии достигнута. Продолжайте в своём ритме."
                  : `Ориентир на сессию · ${settings.timerTargetMinutes} мин`}
              </Text>
            </View>
          )}
          <Button
            title={timer.runningSince === null ? "Продолжить чтение" : "Пауза"}
            onPress={() =>
              run(timer.runningSince === null ? resumeTimer : pauseTimer)
            }
            disabled={busy}
          />
          <View style={{ marginTop: 12 }}>
            <Button
              title="Завершить и сохранить"
              variant="secondary"
              disabled={busy}
              onPress={() =>
                navigation.navigate("Session", { bookId: book.id, timer: true })
              }
            />
          </View>
          <View style={{ marginTop: 24 }}>
            <Button
              title="Отменить сессию"
              variant="danger"
              disabled={busy}
              onPress={() =>
                confirm(
                  "Отменить сессию?",
                  "Время и страницы этой сессии не будут сохранены.",
                  () => run(discardTimer),
                )
              }
            />
          </View>
          <Text
            style={{
              color: colors.muted,
              textAlign: "center",
              fontSize: 12,
              lineHeight: 18,
              marginTop: 20,
            }}
          >
            Можно свернуть приложение или открыть другую вкладку. Таймер
            продолжит считать время и восстановится после запуска.
          </Text>
        </>
      ) : !books.length ? (
        <Empty
          title="Ваша первая сессия впереди"
          description="Добавьте книгу и начните читать. FOLIO сохранит время и прогресс."
          action={
            <Button
              title="Добавить книгу"
              onPress={() => navigation.navigate("BookForm")}
            />
          }
        />
      ) : (
        candidates.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`Начать читать ${item.title}`}
            disabled={busy}
            onPress={() => run(() => startTimer(item.id))}
          >
            <Card
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 15,
                marginBottom: 12,
              }}
            >
              <Cover book={item} width={52} height={76} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 17,
                    fontFamily: "serif",
                    lineHeight: 23,
                  }}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                <Text
                  style={{ color: colors.muted, marginTop: 5, fontSize: 12 }}
                  numberOfLines={1}
                >
                  {item.author || "Автор не указан"}
                </Text>
                <Text
                  style={{ color: colors.accent, marginTop: 7, fontSize: 12 }}
                >
                  Страница {item.currentPage}
                  {item.totalPages ? ` из ${item.totalPages}` : ""}
                </Text>
              </View>
              <Ionicons
                name="play-circle-outline"
                size={30}
                color={colors.accent}
              />
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
