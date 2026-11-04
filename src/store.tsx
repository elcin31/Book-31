import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState } from "react-native";
import { repository, SessionInput } from "./database";
import type { BookInput, NoteInput, Settings, Snapshot } from "./types";
import { DEFAULT_SETTINGS } from "./validation";

const INITIAL: Snapshot = {
  attempts: [],
  books: [],
  sessions: [],
  notes: [],
  settings: DEFAULT_SETTINGS,
  yearGoal: 12,
  timer: null,
};
interface Store extends Snapshot {
  ready: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveBook: (input: BookInput, id?: number) => Promise<number>;
  deleteBook: (id: number) => Promise<void>;
  updateProgress: (bookId: number, page: number) => Promise<void>;
  saveSession: (input: SessionInput, finishTimer?: boolean) => Promise<void>;
  saveNote: (input: NoteInput, id?: number) => Promise<void>;
  deleteNote: (id: number) => Promise<void>;
  setSettings: (patch: Partial<Settings>) => Promise<void>;
  setYearGoal: (goal: number) => Promise<void>;
  startTimer: (bookId: number) => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  discardTimer: () => Promise<void>;
  clearAll: () => Promise<void>;
}
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(INITIAL),
    [ready, setReady] = useState(false),
    [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      const next = repository.read();
      setSnapshot(next);
      setError(null);
      setReady(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось открыть локальную базу.",
      );
      setReady(false);
      throw e;
    }
  }, []);
  useEffect(() => {
    void refresh().catch(() => {});
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh().catch(() => {});
    });
    return () => subscription.remove();
  }, [refresh]);
  const methods = useMemo(() => {
    // SQLite operations are synchronous and transactional. There is no await gap
    // between validation, persistence, and reading the committed next snapshot.
    const mutate = async <T,>(operation: () => T): Promise<T> => {
      const result = operation();
      await refresh();
      return result;
    };
    return {
      saveBook: (input: BookInput, id?: number) =>
        mutate(() => repository.saveBook(input, id)),
      deleteBook: (id: number) => mutate(() => repository.deleteBook(id)),
      updateProgress: (bookId: number, page: number) =>
        mutate(() => repository.updateProgress(bookId, page)),
      saveSession: (input: SessionInput, finishTimer?: boolean) =>
        mutate(() => repository.saveSession(input, finishTimer)),
      saveNote: (input: NoteInput, id?: number) =>
        mutate(() => repository.saveNote(input, id)),
      deleteNote: (id: number) => mutate(() => repository.deleteNote(id)),
      setSettings: (patch: Partial<Settings>) =>
        mutate(() => repository.setSettings(patch)),
      setYearGoal: (goal: number) => mutate(() => repository.setYearGoal(goal)),
      startTimer: (bookId: number) =>
        mutate(() => repository.startTimer(bookId)),
      pauseTimer: () => mutate(() => repository.pauseTimer()),
      resumeTimer: () => mutate(() => repository.resumeTimer()),
      discardTimer: () => mutate(() => repository.discardTimer()),
      clearAll: () => mutate(() => repository.clearAll()),
    };
  }, [refresh]);
  const value = useMemo<Store>(
    () => ({ ...snapshot, ready, error, refresh, ...methods }),
    [snapshot, ready, error, refresh, methods],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useStore(): Store {
  const value = useContext(Context);
  if (!value) throw new Error("StoreProvider missing");
  return value;
}
