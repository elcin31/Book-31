import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStore } from "../store";
import { Book, BookStatus, STATUS_LABELS } from "../types";
import {
  Screen,
  Heading,
  Button,
  Field,
  Chip,
  Cover,
  Empty,
  Progress,
  useTheme,
  showError,
} from "../ui";
export default function LibraryScreen({ navigation }: any) {
  const { books, settings, setSettings } = useStore();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<BookStatus | "all">("all");
  const [sort, setSort] = useState("created");
  const filtered = useMemo(
    () =>
      books
        .filter(
          (b) =>
            (status === "all" || b.status === status) &&
            `${b.title} ${b.author} ${b.isbn}`
              .toLocaleLowerCase()
              .includes(query.toLocaleLowerCase()),
        )
        .sort((a, b) =>
          sort === "title"
            ? a.title.localeCompare(b.title, "ru")
            : sort === "author"
              ? a.author.localeCompare(b.author, "ru")
              : b.createdAt.localeCompare(a.createdAt),
        ),
    [books, status, sort, query],
  );
  const grid = settings.libraryView === "grid";
  const coverWidth = Math.max(72, (width - 68) / 3);
  const render = ({ item: b }: { item: Book }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Открыть ${b.title}`}
      onPress={() => navigation.navigate("Book", { id: b.id })}
      style={{
        width: grid ? coverWidth : undefined,
        flex: grid ? undefined : 1,
        flexDirection: grid ? "column" : "row",
        gap: 12,
        marginBottom: 24,
      }}
    >
      <Cover
        book={b}
        width={grid ? coverWidth : 60}
        height={grid ? coverWidth * 1.48 : 88}
      />
      <View style={{ flex: grid ? undefined : 1, gap: 5 }}>
        <Text
          numberOfLines={2}
          style={{
            color: colors.text,
            fontSize: grid ? 14 : 17,
            fontWeight: "600",
          }}
        >
          {b.title}
        </Text>
        <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12 }}>
          {b.author || "Автор не указан"}
        </Text>
        {!grid && (
          <Text style={{ color: colors.accent, fontSize: 12 }}>
            {STATUS_LABELS[b.status]}
          </Text>
        )}
        {b.status === "reading" && (
          <>
            <Progress value={b.totalPages ? b.currentPage / b.totalPages : 0} />
            <Text style={{ fontSize: 11, color: colors.muted }}>
              {b.currentPage}
              {b.totalPages ? ` / ${b.totalPages}` : ""} стр.
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
  return (
    <Screen scroll={false}>
      <FlatList
        key={grid ? "grid" : "list"}
        data={filtered}
        renderItem={render}
        keyExtractor={(b) => String(b.id)}
        numColumns={grid ? 3 : 1}
        keyboardShouldPersistTaps="handled"
        columnWrapperStyle={grid ? { gap: 12 } : undefined}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
        ListHeaderComponent={
          <View style={{ gap: 17, paddingBottom: 24 }}>
            <Heading
              title="Библиотека"
              subtitle={`${books.length} книг · ваши личные полки`}
              action={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    grid ? "Показать списком" : "Показать сеткой"
                  }
                  onPress={() =>
                    setSettings({ libraryView: grid ? "list" : "grid" }).catch(
                      showError,
                    )
                  }
                  style={{ padding: 12 }}
                >
                  <Ionicons
                    name={grid ? "list-outline" : "grid-outline"}
                    size={23}
                    color={colors.text}
                  />
                </Pressable>
              }
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Добавить книгу"
                  onPress={() => navigation.navigate("BookForm")}
                />
              </View>
              <Button
                title="Каталог"
                variant="secondary"
                onPress={() => navigation.navigate("Search")}
              />
            </View>
            <Field
              label="Найти на полках"
              placeholder="Название, автор или ISBN"
              value={query}
              onChangeText={setQuery}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              <Chip
                label="Все"
                selected={status === "all"}
                onPress={() => setStatus("all")}
              />
              {(Object.keys(STATUS_LABELS) as BookStatus[]).map((s) => (
                <Chip
                  key={s}
                  label={STATUS_LABELS[s]}
                  selected={status === s}
                  onPress={() => setStatus(s)}
                />
              ))}
            </ScrollView>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                По порядку:
              </Text>
              {[
                ["created", "Новые"],
                ["title", "Название"],
                ["author", "Автор"],
              ].map(([v, l]) => (
                <Chip
                  key={v}
                  label={l}
                  selected={sort === v}
                  onPress={() => setSort(v)}
                />
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <Empty
            title={
              books.length
                ? "На этой полке пока пусто"
                : "Здесь начнётся ваша история"
            }
            description={
              books.length
                ? "Измените фильтр или поисковый запрос."
                : "Добавьте первую книгу — вручную или из каталога. Всё остальное FOLIO бережно сохранит на устройстве."
            }
            action={
              !books.length ? (
                <Button
                  title="Добавить первую книгу"
                  onPress={() => navigation.navigate("BookForm")}
                />
              ) : undefined
            }
          />
        }
      />
    </Screen>
  );
}
