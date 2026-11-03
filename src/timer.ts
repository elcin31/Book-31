export function timerSeconds(
  timer: { elapsedMs: number; runningSince: number | null },
  now = Date.now(),
) {
  return Math.max(
    0,
    Math.floor(
      (timer.elapsedMs +
        (timer.runningSince === null
          ? 0
          : Math.max(0, now - timer.runningSince))) /
        1000,
    ),
  );
}
export function formatTimer(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(value / 3600);
  return `${hours.toString().padStart(2, "0")}:${Math.floor((value % 3600) / 60)
    .toString()
    .padStart(2, "0")}:${(value % 60).toString().padStart(2, "0")}`;
}
