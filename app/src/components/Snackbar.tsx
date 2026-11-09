import { useSyncExternalStore } from 'react';

// 저장·공유·복사 결과를 화면 아래에 잠깐 보여 준다. docs/DESIGN.md §2 Snackbar
let current: { id: number; text: string } | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function showSnackbar(text: string): void {
  if (!text) return;
  current = { id: (current?.id ?? 0) + 1, text };
  clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    emit();
  }, 3000);
  emit();
}

export function SnackbarRegion() {
  const msg = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null,
  );
  return (
    <div className="snackbar-region" role="status" aria-live="polite">
      {msg && (
        <div key={msg.id} className="snackbar">
          {msg.text}
        </div>
      )}
    </div>
  );
}
