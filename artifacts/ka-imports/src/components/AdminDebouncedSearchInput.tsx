import { Search } from "lucide-react";
import { startTransition, useEffect, useRef, useState } from "react";

type AdminDebouncedSearchInputProps = {
  placeholder: string;
  debounceMs?: number;
  /** Semente pontual (ex. Extrato → pedido). Não é o texto a cada letra. */
  seedSearch?: string;
  onSeedConsumed?: () => void;
  onAppliedChange: (value: string) => void;
  wrapperClassName?: string;
  inputClassName?: string;
  iconClassName?: string;
};

export function AdminDebouncedSearchInput({
  placeholder,
  debounceMs = 300,
  seedSearch = "",
  onSeedConsumed,
  onAppliedChange,
  wrapperClassName = "relative flex-1 min-w-0 overflow-hidden",
  inputClassName = "w-full min-w-0 h-11 pl-10 pr-4 rounded-xl border-2 border-border bg-white focus:border-primary outline-none text-sm",
  iconClassName = "h-4 w-4",
}: AdminDebouncedSearchInputProps) {
  const [local, setLocal] = useState(seedSearch);
  const focusedRef = useRef(false);
  const appliedRef = useRef(seedSearch);
  const onAppliedChangeRef = useRef(onAppliedChange);
  const onSeedConsumedRef = useRef(onSeedConsumed);
  onAppliedChangeRef.current = onAppliedChange;
  onSeedConsumedRef.current = onSeedConsumed;

  useEffect(() => {
    const next = String(seedSearch || "");
    if (!next) return;
    if (!(focusedRef.current && next === appliedRef.current)) {
      setLocal(next);
      appliedRef.current = next;
      onAppliedChangeRef.current(next);
    }
    const t = window.setTimeout(() => onSeedConsumedRef.current?.(), 0);
    return () => window.clearTimeout(t);
  }, [seedSearch]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (local === appliedRef.current) return;
      appliedRef.current = local;
      startTransition(() => onAppliedChangeRef.current(local));
    }, debounceMs);
    return () => window.clearTimeout(handle);
  }, [local, debounceMs]);

  return (
    <div className={wrapperClassName}>
      <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-10 items-center justify-center text-muted-foreground">
        <Search className={iconClassName} aria-hidden />
      </span>
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onFocus={() => { focusedRef.current = true; }}
        onBlur={() => { focusedRef.current = false; }}
        placeholder={placeholder}
        className={inputClassName}
      />
    </div>
  );
}
