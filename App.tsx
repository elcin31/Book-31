import "react-native-reanimated";
import React from "react";
import {
  ActivityIndicator,
  Text,
  View,
  useColorScheme,
  Pressable,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { StoreProvider, useStore } from "./src/store";
import { ThemeContext, lightColors, darkColors } from "./src/ui";
import { RootStackParamList } from "./src/types";
import HomeScreen from "./src/screens/HomeScreen";
import LibraryScreen from "./src/screens/LibraryScreen";
import DiaryScreen from "./src/screens/DiaryScreen";
import AnalyticsScreen from "./src/screens/AnalyticsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import BookScreen from "./src/screens/BookScreen";
import BookFormScreen from "./src/screens/BookFormScreen";
import SearchScreen from "./src/screens/SearchScreen";
import NoteFormScreen from "./src/screens/NoteFormScreen";
import TimerScreen from "./src/screens/TimerScreen";
import SessionScreen from "./src/screens/SessionScreen";
import CalendarScreen from "./src/screens/CalendarScreen";
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();
function Tabs() {
  const insets = useSafeAreaInsets();
  const { colors } = React.useContext(ThemeContext);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerTitle: "FOLIO",
        headerTitleAlign: "left",
        headerStyle: { backgroundColor: colors.bg },
        headerTitleStyle: {
          fontFamily: "serif",
          fontSize: 20,
          letterSpacing: 4,
          color: colors.text,
        },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(9, insets.bottom),
        },
        tabBarLabelStyle: { fontSize: 10, marginTop: 2 },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            color={color}
            size={size - 2}
            name={
              (
                {
                  Home: focused ? "home" : "home-outline",
                  Library: focused ? "library" : "library-outline",
                  Diary: focused ? "journal" : "journal-outline",
                  Analytics: focused ? "stats-chart" : "stats-chart-outline",
                  Settings: focused ? "settings" : "settings-outline",
                } as any
              )[route.name]
            }
          />
        ),
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Главная" }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{ title: "Библиотека" }}
      />
      <Tab.Screen
        name="Diary"
        component={DiaryScreen}
        options={{ title: "Дневник" }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: "Аналитика" }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Настройки" }}
      />
    </Tab.Navigator>
  );
}
function Application() {
  const store = useStore();
  const system = useColorScheme();
  const dark =
    store.settings.theme === "dark" ||
    (store.settings.theme === "system" && system === "dark");
  const colors = dark ? darkColors : lightColors;
  return (
    <ThemeContext.Provider value={{ colors, dark }}>
      <StatusBar style={dark ? "light" : "dark"} />
      {!store.ready ? (
        <View
          style={{
            flex: 1,
            backgroundColor: colors.bg,
            justifyContent: "center",
            alignItems: "center",
            gap: 20,
          }}
        >
          <Text
            style={{
              fontFamily: "serif",
              fontSize: 36,
              letterSpacing: 8,
              color: colors.text,
            }}
          >
            FOLIO
          </Text>
          {store.error ? (
            <>
              <Text style={{ color: colors.danger, padding: 24 }}>
                {store.error}
              </Text>
              <Pressable onPress={() => store.refresh()}>
                <Text style={{ color: colors.accent }}>Повторить</Text>
              </Pressable>
            </>
          ) : (
            <ActivityIndicator color={colors.accent} />
          )}
        </View>
      ) : (
        <NavigationContainer
          theme={{
            ...(dark ? DarkTheme : DefaultTheme),
            colors: {
              ...(dark ? DarkTheme : DefaultTheme).colors,
              background: colors.bg,
              card: colors.bg,
              text: colors.text,
              border: colors.border,
              primary: colors.accent,
            },
          }}
        >
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              headerTitleStyle: { fontFamily: "serif" },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen
              name="Tabs"
              component={Tabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Book"
              component={BookScreen}
              options={{ title: "Книга" }}
            />
            <Stack.Screen
              name="BookForm"
              component={BookFormScreen}
              options={{ title: "О книге" }}
            />
            <Stack.Screen
              name="Search"
              component={SearchScreen}
              options={{ title: "Поиск книги" }}
            />
            <Stack.Screen
              name="NoteForm"
              component={NoteFormScreen}
              options={{ title: "Запись в дневнике" }}
            />
            <Stack.Screen
              name="Timer"
              component={TimerScreen}
              options={{ title: "Время для чтения" }}
            />
            <Stack.Screen
              name="Session"
              component={SessionScreen}
              options={{ title: "Сессия чтения" }}
            />
            <Stack.Screen
              name="Calendar"
              component={CalendarScreen}
              options={{ title: "Календарь чтения" }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      )}
    </ThemeContext.Provider>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Application />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
