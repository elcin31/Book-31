import React, { createContext, useContext } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  useWindowDimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Book } from "./types";
export const lightColors = {
  bg: "#F5F2EA",
  surface: "#FFFDF8",
  text: "#202F2B",
  muted: "#62685F",
  border: "#DDDCD2",
  accent: "#294E42",
  onAccent: "#FFFDF6",
  soft: "#E6EADF",
  danger: "#AA413E",
  gold: "#89672F",
};
export const darkColors = {
  bg: "#141D1A",
  surface: "#1E2B25",
  text: "#F0ECE0",
  muted: "#A9B2A7",
  border: "#35453B",
  accent: "#BBD3B2",
  onAccent: "#17271D",
  soft: "#2B3C31",
  danger: "#F2968B",
  gold: "#DAB779",
};
export const ThemeContext = createContext({ colors: lightColors, dark: false });
export const useTheme = () => useContext(ThemeContext);
export function Screen({
  children,
  scroll = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const horizontal = Math.max(22, (width - 720) / 2);
  const body = scroll ? (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingHorizontal: horizontal,
        paddingTop: 24,
        paddingBottom: 36 + insets.bottom,
        gap: 28,
      }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingHorizontal: horizontal,
        paddingTop: 24,
        paddingBottom: insets.bottom,
        gap: 18,
      }}
    >
      {children}
    </View>
  );
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {body}
    </KeyboardAvoidingView>
  );
}
export function Heading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={s.heading}>
      <View style={{ flex: 1, gap: 7 }}>
        {subtitle && (
          <Text
            style={{
              color: colors.muted,
              fontSize: 12,
              lineHeight: 18,
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            {subtitle}
          </Text>
        )}
        <Text
          accessibilityRole="header"
          style={{
            color: colors.text,
            fontFamily: "serif",
            fontSize: 32,
            lineHeight: 38,
          }}
        >
          {title}
        </Text>
      </View>
      {action}
    </View>
  );
}
export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 14 }}>
      <View style={s.heading}>
        <Text
          accessibilityRole="header"
          style={{
            fontSize: 21,
            fontFamily: "serif",
            color: colors.text,
            flex: 1,
          }}
        >
          {title}
        </Text>
        {action}
      </View>
      {children}
    </View>
  );
}
export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        minHeight: 48,
        paddingHorizontal: 18,
        paddingVertical: 13,
        borderRadius: 8,
        backgroundColor:
          variant === "danger"
            ? colors.danger
            : primary
              ? colors.accent
              : colors.soft,
        opacity: disabled ? 0.45 : pressed ? 0.72 : 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
      })}
    >
      {icon}
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          textAlign: "center",
          color:
            variant === "danger"
              ? colors.danger === darkColors.danger
                ? "#251310"
                : "#FFFFFF"
              : primary
                ? colors.onAccent
                : colors.text,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 13, fontWeight: "500", color: colors.muted }}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={props.accessibilityLabel ?? label}
        placeholderTextColor={colors.muted}
        {...props}
        style={[
          {
            minHeight: 50,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            borderRadius: 10,
            padding: 14,
            fontSize: 16,
            color: colors.text,
            textAlignVertical: props.multiline ? "top" : "center",
          },
          props.multiline && { minHeight: 112 },
          props.style,
        ]}
      />
    </View>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          padding: 18,
          gap: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingVertical: 30, alignItems: "center", gap: 16 }}>
      <View
        style={{
          width: 68,
          height: 68,
          borderRadius: 22,
          backgroundColor: colors.soft,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Ionicons name="book-outline" size={30} color={colors.accent} />
      </View>
      <Text
        style={{
          fontFamily: "serif",
          fontSize: 24,
          color: colors.text,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      {description && (
        <Text
          style={{
            fontSize: 15,
            lineHeight: 23,
            color: colors.muted,
            textAlign: "center",
            maxWidth: 310,
          }}
        >
          {description}
        </Text>
      )}
      {action}
    </View>
  );
}
export function Cover({
  book,
  width = 70,
  height,
}: {
  book: Partial<Book>;
  width?: number;
  height?: number;
}) {
  const { colors } = useTheme();
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [book.coverUri]);
  const h = height ?? width * 1.48;
  return book.coverUri && !failed ? (
    <Image
      accessibilityLabel={`Обложка: ${book.title ?? "книга"}`}
      source={{ uri: book.coverUri }}
      resizeMode="cover"
      resizeMethod="resize"
      onError={() => setFailed(true)}
      style={{
        width,
        height: h,
        borderRadius: 5,
        backgroundColor: colors.soft,
      }}
    />
  ) : (
    <View
      accessibilityLabel={`Книга: ${book.title || "FOLIO"}, обложка не добавлена`}
      style={{
        width,
        height: h,
        borderRadius: 5,
        backgroundColor: colors.accent,
        padding: Math.max(8, width * 0.12),
        justifyContent: "space-between",
        borderLeftWidth: 5,
        borderLeftColor: colors.gold,
      }}
    >
      <Ionicons
        name="book-outline"
        color={colors.onAccent}
        size={Math.min(24, width * 0.25)}
      />
      <Text
        numberOfLines={4}
        style={{
          color: colors.onAccent,
          fontFamily: "serif",
          fontSize: Math.max(10, width * 0.13),
        }}
      >
        {book.title || "FOLIO"}
      </Text>
      <View style={{ height: 1, backgroundColor: colors.gold, width: "65%" }} />
    </View>
  );
}
export function Progress({ value }: { value: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(Math.min(1, Math.max(0, value || 0)) * 100),
      }}
      style={{
        height: 5,
        backgroundColor: colors.soft,
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          height: 5,
          width: `${Math.min(100, Math.max(0, (value || 0) * 100))}%`,
          backgroundColor: colors.accent,
          borderRadius: 3,
        }}
      />
    </View>
  );
}
export function Chip({
  label,
  selected = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        minWidth: 48,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: selected ? colors.accent : colors.border,
        backgroundColor: selected ? colors.accent : colors.surface,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          fontSize: 13,
          color: selected ? colors.onAccent : colors.muted,
          fontWeight: selected ? "600" : "400",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 60, gap: 6 }}>
      <Text style={{ fontFamily: "serif", fontSize: 27, color: colors.text }}>
        {value}
      </Text>
      <Text style={{ fontSize: 12, lineHeight: 18, color: colors.muted }}>
        {label}
      </Text>
    </View>
  );
}
export function showError(error: unknown) {
  Alert.alert(
    "Не удалось сохранить",
    error instanceof Error ? error.message : String(error),
  );
}
export function confirm(title: string, message: string, onConfirm: () => void) {
  Alert.alert(title, message, [
    { text: "Отмена", style: "cancel" },
    { text: "Подтвердить", style: "destructive", onPress: onConfirm },
  ]);
}
const s = StyleSheet.create({
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
});
