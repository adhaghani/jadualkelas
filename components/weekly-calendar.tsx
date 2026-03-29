/* eslint-disable react-hooks/rules-of-hooks */
"use client"

import React from "react"
import { useMemo, useState } from "react"
import { format, parseISO } from "date-fns"
import {
  TimetableData,
  CourseSession,
  CustomColorSettings,
} from "@/types/timetable"
import { getEventsByDay } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card"
import { EditCourseModal } from "./edit-course-modal"
import {
  Calendar,
  Pencil,
  RefreshCw,
  Clock,
  MapPin,
  User,
  Users,
} from "lucide-react"

interface WeeklyCalendarProps {
  data: TimetableData
  customColors?: Record<string, CustomColorSettings>
  studentId?: string
  onSaveCourse?: (
    courseId: string,
    course: CourseSession,
    colors: CustomColorSettings
  ) => void
  onRetry?: () => void
}

// Days of the week — corresponds to row positions in the grid
const DAYS = [
  { id: "Mon", label: "Mon" },
  { id: "Tue", label: "Tue" },
  { id: "Wed", label: "Wed" },
  { id: "Thu", label: "Thu" },
  { id: "Fri", label: "Fri" },
]

// Time slots 08:00–18:00 — each column represents one hour
const TIME_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
]

const GRID_START_HOUR = 8
const GRID_END_HOUR = 18

const COURSE_COLORS = [
  {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    hover: "hover:bg-blue-100",
  },
  {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    hover: "hover:bg-emerald-100",
  },
  {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
    hover: "hover:bg-violet-100",
  },
  {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    hover: "hover:bg-amber-100",
  },
  {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    hover: "hover:bg-rose-100",
  },
  {
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    text: "text-cyan-700",
    hover: "hover:bg-cyan-100",
  },
  {
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    text: "text-indigo-700",
    hover: "hover:bg-indigo-100",
  },
  {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-700",
    hover: "hover:bg-orange-100",
  },
  {
    bg: "bg-pink-50",
    border: "border-pink-200",
    text: "text-pink-700",
    hover: "hover:bg-pink-100",
  },
  {
    bg: "bg-teal-50",
    border: "border-teal-200",
    text: "text-teal-700",
    hover: "hover:bg-teal-100",
  },
]

// ─── Time Parsing Utilities ───────────────────────────────────────────────────

/**
 * Convert a time string like "08:00 AM", "14:00 PM", "17:30" to 24-hour integers.
 * Handles the common data quirk where hours >= 13 already carry PM redundantly.
 */
function parseTo24Hour(timeStr: string): { hours: number; minutes: number } {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (!match) return { hours: 0, minutes: 0 }

  let h = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  const ampm = match[3]?.toUpperCase()

  if (ampm === "AM" && h === 12) h = 0
  else if (ampm === "PM" && h < 12) h += 12
  // If h >= 13 with PM the hour is already in 24-hour form — leave it alone

  return { hours: h, minutes: m }
}

interface TimeRange {
  startH: number
  startM: number
  endH: number
  endM: number
}

/**
 * Split "HH:MM AM - HH:MM PM" into start/end hours and minutes.
 * Splits on the first "-" that is preceded by a space to avoid
 * accidentally splitting on a negative sign elsewhere.
 */
function parseTimeRange(masa: string): TimeRange | null {
  // Split on " - " or just "-" with surrounding whitespace
  const idx = masa.search(/\s*-\s*(?=\d)/)
  if (idx === -1) return null

  const startStr = masa.slice(0, idx).trim()
  const endStr = masa.slice(masa.indexOf("-", idx) + 1).trim()

  const start = parseTo24Hour(startStr)
  const end = parseTo24Hour(endStr)

  return {
    startH: start.hours,
    startM: start.minutes,
    endH: end.hours,
    endM: end.minutes,
  }
}

/**
 * Convert a time range string to a zero-based column index and column span.
 *
 * FIX 1 – Half-hour offsets (e.g. "17:30 PM - 19:30 PM"):
 *   Floor the start hour so it snaps to the nearest grid column.
 *
 * FIX 2 – Out-of-bounds end times (e.g. 19:30 > grid end 18:00):
 *   Clamp the end to GRID_END_HOUR so the card never overflows.
 */
function getCourseGridInfo(
  masa: string
): { colIndex: number; span: number } | null {
  const range = parseTimeRange(masa)
  if (!range) return null

  const { startH, endH, endM } = range

  // Snap start to floor hour, clamp into grid
  const clampedStart = Math.max(GRID_START_HOUR, startH)
  if (clampedStart >= GRID_END_HOUR) return null

  // If the course ends mid-hour, round up so it fills the partial column
  const endHourCeil = endM > 0 ? endH + 1 : endH
  const clampedEnd = Math.min(GRID_END_HOUR, endHourCeil)

  const colIndex = clampedStart - GRID_START_HOUR // 0-based index into TIME_SLOTS
  const span = Math.max(1, clampedEnd - clampedStart)

  return { colIndex, span }
}

// ─── Session Merging ──────────────────────────────────────────────────────────

/**
 * FIX 3 – Consecutive same-course sessions (e.g. ENT600 10-12 + 12-13):
 * Merge them into a single entry so the card spans correctly.
 */
function mergeConsecutiveSessions(events: CourseSession[]): CourseSession[] {
  if (events.length <= 1) return events

  const sorted = [...events].sort((a, b) => {
    const ar = parseTimeRange(a.masa)
    const br = parseTimeRange(b.masa)
    if (!ar || !br) return 0
    return ar.startH * 60 + ar.startM - (br.startH * 60 + br.startM)
  })

  const merged: CourseSession[] = []
  let current = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]
    const cr = parseTimeRange(current.masa)
    const nr = parseTimeRange(next.masa)

    const sameId = current.courseid === next.courseid
    const endMatchesStart =
      cr && nr && cr.endH * 60 + cr.endM === nr.startH * 60 + nr.startM

    if (sameId && endMatchesStart) {
      // Keep the start from current, take the end from next
      const startPart = current.masa
        .slice(0, current.masa.search(/\s*-\s*(?=\d)/))
        .trim()
      const dashIdx = next.masa.search(/\s*-\s*(?=\d)/)
      const endPart = next.masa
        .slice(next.masa.indexOf("-", dashIdx) + 1)
        .trim()
      current = { ...current, masa: `${startPart} - ${endPart}` }
    } else {
      merged.push(current)
      current = next
    }
  }
  merged.push(current)
  return merged
}

// ─── Misc Helpers ─────────────────────────────────────────────────────────────

function getDayName(date: Date): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()]
}

function findFirstWeek(data: TimetableData): Date | null {
  const weekMap = new Map<string, boolean>()

  Object.keys(data)
    .sort()
    .forEach((dateStr) => {
      if (data[dateStr] === null) return
      const d = parseISO(dateStr)
      const day = d.getDay()
      const monday = new Date(d)
      monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
      weekMap.set(format(monday, "yyyy-MM-dd"), true)
    })

  if (weekMap.size > 0) return parseISO(Array.from(weekMap.keys())[0])
  return null
}

function hasScheduleData(data: TimetableData): boolean {
  return Object.values(data).some((v) => v !== null)
}

// ─── CourseCard ───────────────────────────────────────────────────────────────

interface CourseCardProps {
  course: CourseSession
  colorIndex: number
  customColor?: CustomColorSettings
}

function CourseCard({ course, colorIndex, customColor }: CourseCardProps) {
  const isCustom = !!(
    customColor?.bg &&
    customColor?.border &&
    customColor?.text
  )
  const colors = isCustom
    ? customColor!
    : COURSE_COLORS[colorIndex % COURSE_COLORS.length]
  const hoverClass = isCustom ? "" : (colors as (typeof COURSE_COLORS)[0]).hover

  return (
    <div
      className={`h-full w-full cursor-pointer rounded-lg border p-2 text-xs transition-all duration-200 ease-out ${colors.bg} ${colors.border} ${colors.text} ${hoverClass} hover:scale-[1.02] hover:shadow-md focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 focus:outline-none active:scale-[0.98]`}
      role="button"
      tabIndex={0}
      aria-label={`${course.courseid}: ${course.course_desc}`}
    >
      <div className="truncate text-sm leading-tight font-semibold">
        {course.courseid}
      </div>
      <div className="mt-0.5 truncate text-[11px] leading-snug opacity-80">
        {course.course_desc}
      </div>
      {course.bilik && (
        <div className="mt-1 flex items-center gap-1 truncate text-[10px] opacity-60">
          <MapPin className="h-3 w-3 shrink-0" />
          {course.bilik}
        </div>
      )}
    </div>
  )
}

// ─── WeeklyCalendar ───────────────────────────────────────────────────────────

export function WeeklyCalendar({
  data,
  customColors = {},
  studentId = "",
  onSaveCourse,
  onRetry,
}: WeeklyCalendarProps) {
  const [editingCourse, setEditingCourse] = useState<CourseSession | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  const hasData = useMemo(() => hasScheduleData(data), [data])
  const initialWeek = useMemo(() => findFirstWeek(data), [data])

  const handleEditClick = (course: CourseSession) => {
    setEditingCourse(course)
    setEditModalOpen(true)
  }

  const handleSaveEdit = (
    course: CourseSession,
    colors: CustomColorSettings
  ) => {
    if (onSaveCourse) onSaveCourse(course.courseid, course, colors)
    setEditModalOpen(false)
    setEditingCourse(null)
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!hasData || !initialWeek) {
    return (
      <div className="container mx-auto w-full px-4">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-6 rounded-2xl bg-linear-to-br from-muted to-muted/50 p-6 shadow-inner">
            <Calendar className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="mb-3 text-xl font-semibold text-foreground">
            No Timetable Found
          </h3>
          <p className="mb-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
            There are no classes registered for this student ID. Please verify
            the student ID and try again.
          </p>
          {onRetry && (
            <Button
              variant="outline"
              onClick={onRetry}
              className="flex items-center gap-2 rounded-lg px-6"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    )
  }

  // ── Derived data ───────────────────────────────────────────────────────────
  const weekStart = initialWeek

  const weekDates = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      return {
        date: d,
        dayName: getDayName(d),
        dateStr: format(d, "yyyy-MM-dd"),
        dayLabel: DAYS[i]?.label ?? getDayName(d),
      }
    })
  }, [weekStart])

  /**
   * Build the flat list of positioned courses.
   *
   * rowIndex  – 1-based day index (1 = Mon)
   * colIndex  – 0-based TIME_SLOTS index (0 = 08:00)
   * span      – how many columns the card should occupy
   */
  const coursesWithPosition = useMemo(() => {
    type PositionedCourse = {
      course: CourseSession
      rowIndex: number
      colIndex: number
      span: number
      colorIndex: number
    }
    const all: PositionedCourse[] = []

    DAYS.forEach((day, dayIdx) => {
      const dayDate = weekDates.find((d) => d.dayName === day.id)
      if (!dayDate) return

      const rawEvents = getEventsByDay(data, dayDate.dateStr)
      const events = mergeConsecutiveSessions(rawEvents)

      events.forEach((event, eventIdx) => {
        const gridInfo = getCourseGridInfo(event.masa)
        if (!gridInfo) return
        all.push({
          course: event,
          rowIndex: dayIdx + 1,
          colIndex: gridInfo.colIndex,
          span: gridInfo.span,
          colorIndex: eventIdx,
        })
      })
    })

    return all
  }, [data, weekDates])

  /**
   * FIX 4 – Cell-overlap fix:
   * Track every (row, col) pair that is "covered" by a multi-column span
   * but is NOT the course's starting column. Those cells must be skipped
   * during rendering so they don't create overlapping divs.
   */
  const occupiedCells = useMemo(() => {
    const set = new Set<string>()
    coursesWithPosition.forEach(({ rowIndex, colIndex, span }) => {
      for (let offset = 1; offset < span; offset++) {
        set.add(`${rowIndex}-${colIndex + offset}`)
      }
    })
    return set
  }, [coursesWithPosition])

  /**
   * Quick lookup: given (rowIndex, colIndex) → positioned course entry.
   */
  const courseMap = useMemo(() => {
    const map = new Map<string, (typeof coursesWithPosition)[0]>()
    coursesWithPosition.forEach((entry) => {
      map.set(`${entry.rowIndex}-${entry.colIndex}`, entry)
    })
    return map
  }, [coursesWithPosition])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      <EditCourseModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        course={editingCourse}
        customColors={
          editingCourse ? (customColors[editingCourse.courseid] ?? null) : null
        }
        onSave={handleSaveEdit}
      />

      {/* Week header */}
      <div className="mb-4 flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Weekly Timetable
          </h2>
          <p className="text-sm text-muted-foreground">
            {format(weekStart, "MMMM d")} –{" "}
            {format(
              new Date(weekStart.getTime() + 4 * 24 * 60 * 60 * 1000),
              "MMMM d, yyyy"
            )}
          </p>
        </div>
        {studentId && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">{studentId}</span>
          </div>
        )}
      </div>

      {/* Responsive grid container */}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <div
          className="grid min-w-200"
          style={{
            gridTemplateColumns: `72px repeat(${TIME_SLOTS.length}, minmax(90px, 1fr))`,
            gridTemplateRows: `auto repeat(${DAYS.length}, minmax(80px, auto))`,
          }}
        >
          {/* ── Header row ── */}
          {/* Clock corner */}
          <div
            className="sticky top-0 z-20 flex items-center justify-center border-b bg-muted/80 px-2 py-3 backdrop-blur-sm"
            style={{ gridColumn: 1, gridRow: 1 }}
          >
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Time-slot headers */}
          {TIME_SLOTS.map((time, timeIdx) => (
            <div
              key={time}
              className="sticky top-0 z-20 flex items-center justify-center border-b border-l bg-muted/80 px-2 py-3 text-center backdrop-blur-sm"
              style={{ gridColumn: timeIdx + 2, gridRow: 1 }}
            >
              <span className="text-xs font-medium whitespace-nowrap text-muted-foreground">
                {time}
              </span>
            </div>
          ))}

          {/* ── Day rows ── */}
          {DAYS.map((day, dayIdx) => {
            const rowIndex = dayIdx + 1 // 1-based

            return (
              <React.Fragment key={day.id}>
                {/* Day label */}
                <div
                  className="sticky left-0 z-10 flex flex-col items-center justify-center border-r border-b bg-muted/30 px-2 py-3"
                  style={{ gridColumn: 1, gridRow: dayIdx + 2 }}
                >
                  <span className="text-sm font-semibold text-foreground">
                    {day.label}
                  </span>
                </div>

                {/* Time cells */}
                {TIME_SLOTS.map((timeSlot, timeIdx) => {
                  const cellKey = `${rowIndex}-${timeIdx}`

                  // ── FIX 4: Skip cells that are covered by a preceding span ──
                  if (occupiedCells.has(cellKey)) return null

                  const entry = courseMap.get(cellKey)
                  const span = entry?.span ?? 1

                  // Grid column: TIME_SLOTS are in columns 2…N+1
                  // Use the CSS grid "start / span N" form so the browser
                  // correctly expands the cell — no col-span-* className needed.
                  const gridColValue =
                    span > 1 ? `${timeIdx + 2} / span ${span}` : timeIdx + 2

                  return (
                    <div
                      key={`${day.id}-${timeSlot}`}
                      className="relative flex items-center justify-center border-b border-l bg-background/50 transition-colors hover:bg-muted/20"
                      style={{
                        gridColumn: gridColValue,
                        gridRow: dayIdx + 2,
                      }}
                    >
                      {entry ? (
                        <div className="flex h-full w-full p-1">
                          <HoverCard openDelay={100} closeDelay={50}>
                            <HoverCardTrigger asChild>
                              <div className="h-full w-full">
                                <CourseCard
                                  course={entry.course}
                                  colorIndex={entry.colorIndex}
                                  customColor={
                                    customColors[entry.course.courseid]
                                  }
                                />
                              </div>
                            </HoverCardTrigger>
                            <HoverCardContent
                              side="right"
                              className="w-80 p-4"
                              align="start"
                            >
                              <div className="space-y-3">
                                <div>
                                  <div className="text-lg font-semibold text-foreground">
                                    {entry.course.courseid}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {entry.course.course_desc}
                                  </div>
                                </div>
                                <div className="space-y-2 text-sm">
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    <span>{entry.course.masa}</span>
                                  </div>
                                  {entry.course.bilik && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <MapPin className="h-4 w-4" />
                                      <span>{entry.course.bilik}</span>
                                    </div>
                                  )}
                                  {entry.course.lecturer && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <User className="h-4 w-4" />
                                      <span>{entry.course.lecturer}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <Users className="h-4 w-4" />
                                    <span>Group {entry.course.groups}</span>
                                  </div>
                                </div>
                                {onSaveCourse && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full rounded-lg"
                                    onClick={() =>
                                      handleEditClick(entry.course)
                                    }
                                  >
                                    <Pencil className="mr-2 h-3 w-3" />
                                    Edit Course
                                  </Button>
                                )}
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                      ) : (
                        <div className="h-20 w-full" />
                      )}
                    </div>
                  )
                })}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 px-1 text-xs text-muted-foreground">
        <span>Tap a course to view details</span>
        <span className="hidden sm:inline">•</span>
        <span className="hidden sm:inline">
          Multi-hour courses span across time slots
        </span>
      </div>
    </div>
  )
}
