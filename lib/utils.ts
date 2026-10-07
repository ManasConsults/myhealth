import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// YYYY-MM-DD in the user's local timezone — toISOString() would give the UTC day,
// which is the previous/next day for much of the world.
export function toLocalISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// "1h 05m" / "12m" / "<1m" — for finished durations
export function formatDuration(ms: number): string {
  const totalMin = Math.floor(Math.max(0, ms) / 60000)
  if (totalMin < 1) return "<1m"
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`
}

// "1:02:09" / "12:03" — for a running timer
export function formatElapsed(ms: number): string {
  const totalSec = Math.floor(Math.max(0, ms) / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const mmss = `${String(m).padStart(h ? 2 : 1, "0")}:${String(s).padStart(2, "0")}`
  return h ? `${h}:${mmss}` : mmss
}
