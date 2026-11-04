"use client";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { db } from "./db";
import { DEFAULT_SETTINGS } from "./logic";
import type { ClassType, Instructor, Member, Room } from "./types";

export function useSettings() {
  return useLiveQuery(() => db.settings.get("studio"), []) ?? DEFAULT_SETTINGS;
}

export function useLookups() {
  const members = useLiveQuery(() => db.members.toArray(), []);
  const instructors = useLiveQuery(() => db.instructors.toArray(), []);
  const classTypes = useLiveQuery(() => db.classTypes.toArray(), []);
  const rooms = useLiveQuery(() => db.rooms.toArray(), []);
  return useMemo(() => ({
    ready: !!(members && instructors && classTypes && rooms),
    members: members ?? [],
    instructors: instructors ?? [],
    classTypes: classTypes ?? [],
    rooms: rooms ?? [],
    member: new Map<string, Member>((members ?? []).map((m) => [m.id, m])),
    instructor: new Map<string, Instructor>((instructors ?? []).map((m) => [m.id, m])),
    classType: new Map<string, ClassType>((classTypes ?? []).map((m) => [m.id, m])),
    room: new Map<string, Room>((rooms ?? []).map((m) => [m.id, m])),
  }), [members, instructors, classTypes, rooms]);
}

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => { window.removeEventListener("online", cb); window.removeEventListener("offline", cb); };
}
export function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

/** Re-render every `ms` so "now"-relative UI stays fresh. */
export function useNow(ms = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function useDebounced<T>(value: T, ms = 150) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
