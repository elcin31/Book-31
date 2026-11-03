import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { CatalogBook, SearchMode, searchCatalog } from "../catalog";
import {
  Screen,
  Heading,
  Button,
  Field,
  Chip,
  Cover,
  Empty,
  useTheme,
} from "../ui";
export default function SearchScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("title");
  const [results, setResults] = useState<CatalogBook[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  async function search() {
    if (!query.trim() || busy) return;
    setBusy(true);
    setError("");
    setSearched(true);
    try {
      setResults(await searchCatalog(query, mode));
    } catch (e) {
      setResults([]);
      setError(e instanceof Error ? e.message : "Каталог недоступен.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen scroll={false}>
      <FlatList
        keyboardShouldPersistTaps="handled"
        data={results}
        keyExtractor={(b, i) => b.catalogId + "-" + i}
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ gap: 17, paddingBottom: 24 }}>
            <Heading
              title="Найти книгу"
              subtitle="Google Books · Open Library"
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(
                [
                  ["title", "Название"],
                  ["author", "Автор"],
                  ["isbn", "ISBN"],
                ] as [SearchMode, string][]
              ).map(([m, l]) => (
                <Chip
                  key={m}
                  label={l}
                  selected={mode === m}
                  onPress={() => setMode(m)}
                />
              ))}
            </View>
            <Field
              label={
                mode === "isbn"
                  ? "ISBN книги"
                  : mode === "author"
                    ? "Имя автора"
                    : "Название книги"
              }
              value={query}
              onChangeText={setQuery}
              placeholder={mode === "isbn" ? "978…" : "Начните вводить…"}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={search}
            />
            <Button
              title={busy ? "Ищем…" : "Найти в каталогах"}
              disabled={busy || !query.trim()}
              onPress={search}
            />
            <Button
              title="Добавить вручную"
              variant="secondary"
              onPress={() => navigation.navigate("BookForm")}
            />
            {busy && <ActivityIndicator color={colors.accent} />}
          </View>
        }
        renderItem={({ item: b }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Добавить ${b.title}`}
            onPress={() => {
              const { catalogId, source, ...prefill } = b;
              navigation.navigate("BookForm", { prefill });
            }}
            style={{
              flexDirection: "row",
              gap: 16,
              paddingVertical: 17,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Cover book={b} width={65} height={97} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text
                numberOfLines={3}
                style={{
                  color: colors.text,
                  fontSize: 17,
                  fontFamily: "serif",
                  lineHeight: 23,
                }}
              >
                {b.title}
              </Text>
              <Text
                numberOfLines={2}
                style={{ color: colors.muted, fontSize: 13 }}
              >
                {b.author || "Автор не указан"}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11 }}>
                {[
                  b.publicationYear,
                  b.totalPages ? `${b.totalPages} стр.` : "",
                  b.source,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              <Text
                style={{
                  color: colors.accent,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                Выбрать книгу →
              </Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          !busy ? (
            <Empty
              title={
                error
                  ? "Каталог недоступен"
                  : searched
                    ? "Книги не найдены"
                    : "Целый мир между обложками"
              }
              description={
                error ||
                (searched
                  ? "Попробуйте другой запрос или добавьте книгу вручную."
                  : "Ищите по названию, автору или ISBN. После выбора можно уточнить любые данные перед сохранением.")
              }
            />
          ) : null
        }
      />
    </Screen>
  );
}
