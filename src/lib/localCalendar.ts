"use client";

/**
 * Local (browser) calendar store — QUICK DEMO MODE.
 * Saves pillar sessions in localStorage so the calendar works with no login and
 * no Supabase. Data lives on this device/browser only.
 *
 * When the real Supabase backend is wired up, swap these calls for the
 * /api/calendar routes (same shape).
 */

export type LocalEntry = {
  id: string;
  scheduled_date: string; // YYYY-MM-DD
  pillar_number: number; // 1..5
  title: string;
  notes?: string;
  status: "planned" | "completed" | "cancelled";
};

const KEY = "matchfit.calendar.local";

export function loadEntries(): LocalEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LocalEntry[]) : [];
  } catch {
    return [];
  }
}

function save(list: LocalEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage full or unavailable */
  }
}

export function addEntry(input: {
  scheduled_date: string;
  pillar_number: number;
  title: string;
  notes?: string;
}): LocalEntry[] {
  const list = loadEntries();
  list.push({
    id: crypto.randomUUID(),
    scheduled_date: input.scheduled_date,
    pillar_number: input.pillar_number,
    title: input.title,
    notes: input.notes,
    status: "planned",
  });
  save(list);
  return list;
}

export function removeEntry(id: string): LocalEntry[] {
  const list = loadEntries().filter((e) => e.id !== id);
  save(list);
  return list;
}

export function setStatus(id: string, status: LocalEntry["status"]): LocalEntry[] {
  const list = loadEntries().map((e) => (e.id === id ? { ...e, status } : e));
  save(list);
  return list;
}
