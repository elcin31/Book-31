import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Switch, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../store";
import {
  Screen,
  Heading,
  Section,
  Card,
  Field,
  Button,
  Chip,
  useTheme,
  showError,
  confirm,
} from "../ui";
import { Settings } from "../types";
import { version } from "../../package.json";

export default function SettingsScreen() {
  const { settings, yearGoal, setYearGoal, setSettings, clearAll } = useStore();
  const { colors } = useTheme();
  const [goal, setGoal] = useState(String(yearGoal));
  const [target, setTarget] = useState(String(settings.timerTargetMinutes));
  const [busy, setBusy] = useState(false);
  useEffect(() => setGoal(String(yearGoal)), [yearGoal]);
  useEffect(
    () => setTarget(String(settings.timerTargetMinutes)),
    [settings.timerTargetMinutes],
  );
  const change = async (patch: Partial<Settings>) => {
    try {
      await setSettings(patch);
    } catch (e) {
      showError(e);
    }
  };
  const saveGoal = async () => {
    const n = Number(goal);
    if (!Number.isInteger(n) || n < 1 || n > 1000) {
      showError(new Error("Укажите цель от 1 до 1000 книг."));
      return;
    }
    setBusy(true);
    try {
      await setYearGoal(n);
      Alert.alert("Цель сохранена", "Читайте в своём ритме.");
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };
  const saveTarget = async () => {
    const n = Number(target);
    if (!Number.isInteger(n) || n < 1 || n > 1440) {
      showError(new Error("Укажите от 1 до 1440 минут."));
      return;
    }
    setBusy(true);
    try {
      await setSettings({ timerTargetMinutes: n });
      Alert.alert("Настройка сохранена", "Ориентир времени обновлён.");
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };
  const remove = () =>
    confirm(
      "Очистить данные FOLIO?",
      "Все книги, сессии, заметки и настройки будут удалены с этого устройства.",
      () =>
        confirm(
          "Удалить всё без возможности восстановления?",
          "Это действие нельзя отменить.",
          async () => {
            setBusy(true);
            try {
              await clearAll();
              Alert.alert(
                "Данные удалены",
                "Можно начать новую книжную историю.",
              );
            } catch (e) {
              showError(e);
            } finally {
              setBusy(false);
            }
          },
        ),
    );
  return (
    <Screen>
      <Heading
        title="Ваш FOLIO"
        subtitle="Небольшие настройки для вашего ритма"
      />
      <Section title="Оформление">
        <Card>
          <Text style={[styles.description, { color: colors.muted }]}>
            Тема приложения
          </Text>
          <View style={styles.chips}>
            <Chip
              label="Светлая"
              selected={settings.theme === "light"}
              onPress={() => change({ theme: "light" })}
            />
            <Chip
              label="Тёмная"
              selected={settings.theme === "dark"}
              onPress={() => change({ theme: "dark" })}
            />
            <Chip
              label="Системная"
              selected={settings.theme === "system"}
              onPress={() => change({ theme: "system" })}
            />
          </View>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
          <Text style={[styles.description, { color: colors.muted }]}>
            Вид библиотеки по умолчанию
          </Text>
          <View style={styles.chips}>
            <Chip
              label="Обложки"
              selected={settings.libraryView === "grid"}
              onPress={() => change({ libraryView: "grid" })}
            />
            <Chip
              label="Список"
              selected={settings.libraryView === "list"}
              onPress={() => change({ libraryView: "list" })}
            />
          </View>
        </Card>
      </Section>
      <Section title={`Годовая цель · ${new Date().getFullYear()}`}>
        <Card>
          <Text style={[styles.description, { color: colors.muted }]}>
            Сколько историй вы хотите прочитать в этом году? Цель можно изменить
            в любой момент.
          </Text>
          <Field
            label="Количество книг"
            value={goal}
            onChangeText={setGoal}
            keyboardType="number-pad"
            maxLength={4}
          />
          <Button title="Сохранить цель" onPress={saveGoal} disabled={busy} />
        </Card>
      </Section>
      <Section title="Таймер чтения">
        <Card>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 15, fontWeight: "500", color: colors.text }}
              >
                Не выключать экран
              </Text>
              <Text
                style={[
                  styles.description,
                  { color: colors.muted, marginBottom: 0, marginTop: 5 },
                ]}
              >
                Пока открыт работающий таймер
              </Text>
            </View>
            <Switch
              accessibilityLabel="Не выключать экран во время таймера"
              value={settings.keepScreenAwake}
              onValueChange={(value) => change({ keepScreenAwake: value })}
              trackColor={{ true: colors.accent, false: colors.border }}
              thumbColor={colors.surface}
            />
          </View>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
          <Text style={[styles.description, { color: colors.muted }]}>
            Личный ориентир длительности сессии. Таймер продолжает считать время
            после его достижения.
          </Text>
          <Field
            label="Минут на сессию"
            value={target}
            onChangeText={setTarget}
            keyboardType="number-pad"
            maxLength={4}
          />
          <Button
            title="Сохранить время"
            variant="secondary"
            onPress={saveTarget}
            disabled={busy}
          />
        </Card>
      </Section>
      <Section title="Данные на устройстве">
        <Card>
          <View style={[styles.row, { alignItems: "flex-start" }]}>
            <Ionicons
              name="lock-closed-outline"
              size={23}
              color={colors.accent}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.text,
                  fontWeight: "600",
                  fontSize: 15,
                  marginBottom: 6,
                }}
              >
                Личная библиотека
              </Text>
              <Text
                style={[
                  styles.description,
                  { color: colors.muted, marginBottom: 0 },
                ]}
              >
                Книги, заметки и история чтения хранятся локально. Регистрация
                не требуется. Интернет нужен только для поиска и получения
                обложек.
              </Text>
            </View>
          </View>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
          <Text style={[styles.description, { color: colors.muted }]}>
            Перед удалением приложения сохраните нужные записи: удаление
            приложения очищает локальные данные.
          </Text>
          <Button
            title="Очистить все данные"
            variant="danger"
            onPress={remove}
            disabled={busy}
          />
        </Card>
      </Section>
      <View style={styles.about}>
        <Ionicons name="book-outline" size={32} color={colors.accent} />
        <Text
          style={{
            fontSize: 22,
            letterSpacing: 4,
            fontWeight: "600",
            color: colors.accent,
            marginTop: 12,
          }}
        >
          FOLIO
        </Text>
        <Text style={{ fontSize: 12, color: colors.muted, marginTop: 7 }}>
          Версия {version}
        </Text>
        <Text
          style={{
            fontFamily: "serif",
            fontSize: 16,
            color: colors.muted,
            marginTop: 12,
          }}
        >
          Место для прочитанных историй.
        </Text>
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  description: { fontSize: 13, lineHeight: 20, marginBottom: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  line: { height: 1, marginVertical: 20 },
  row: { flexDirection: "row", gap: 14, alignItems: "center" },
  about: { alignItems: "center", paddingVertical: 22 },
});
