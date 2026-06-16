"use client";

import { useCallback, useMemo, useRef, useState } from "react";

/**
 * Wiederverwendbare Mehrfachauswahl (B1). Arbeitet über stabile IDs, nicht über
 * Zeilenindizes. Auswahl wird gegen die aktuell sichtbaren (gefilterten) IDs
 * geprüft, sodass das Entfernen/Filtern von Zeilen keine "Geister"-Auswahl
 * hinterlässt. Optional Shift-Klick für Bereichsauswahl.
 */
export function useBulkSelection(ids: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const lastIndexRef = useRef<number | null>(null);

  // Nur IDs behalten, die aktuell sichtbar sind.
  const valid = useMemo(() => {
    const idSet = new Set(ids);
    const next = new Set<string>();
    selected.forEach((id) => {
      if (idSet.has(id)) next.add(id);
    });
    return next;
  }, [ids, selected]);

  const isSelected = useCallback((id: string) => valid.has(id), [valid]);

  const toggle = useCallback(
    (id: string, index?: number, shift?: boolean) => {
      setSelected((prev) => {
        const next = new Set(prev);
        // gegen sichtbare IDs säubern
        prev.forEach((x) => {
          if (!ids.includes(x)) next.delete(x);
        });
        if (shift && lastIndexRef.current != null && index != null) {
          const [a, b] = [lastIndexRef.current, index].sort((x, y) => x - y);
          for (let i = a; i <= b; i++) next.add(ids[i]);
        } else if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      if (index != null) lastIndexRef.current = index;
    },
    [ids],
  );

  const allSelected = ids.length > 0 && valid.size === ids.length;
  const someSelected = valid.size > 0 && !allSelected;

  const toggleAll = useCallback(() => {
    setSelected(() => (valid.size === ids.length ? new Set() : new Set(ids)));
  }, [ids, valid.size]);

  const clear = useCallback(() => setSelected(new Set()), []);

  return {
    selectedIds: useMemo(() => [...valid], [valid]),
    count: valid.size,
    isSelected,
    toggle,
    toggleAll,
    clear,
    allSelected,
    someSelected,
  };
}
