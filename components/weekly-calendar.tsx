/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React from "react"
import { useMemo, useState } from "react"
import { format, parseISO } from "date-fns"
import { CourseSession, CustomColorSettings } from "@/types/timetable"
import { Course } from "@/types/course"
import { getCourseColor, CoursePalette } from "@/lib/color"
import { generateCourseKey } from "@/lib/course-transform"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
  AlertTriangle,
  User,
  Users,
} from "lucide-react"

// ─── Props ────────────────────────────────────────────────────────────────────

interface WeeklyCalendarProps {
  courses: Course[]
  customColors?: Record<string, CustomColorSettings>
  studentId?: string
  onSaveCourse?: (
    courseId: string,
    course: CourseSession,
    colors: CustomColorSettings
  ) => void
  onRetry?: () => void
  onDeleteCourseClass?: (courseKey: string, classIds: string[]) => void
}

// ─── Types ────────────────────────────────────────────────────────────────────

type PositionedCourse = {
  course: CourseSession
  rowIndex: number
  colIndex: number
  span: number
}

/**
 * A RenderGroup is one visual cell in the timetable grid.
 * It holds one or more PositionedCourses whose time ranges overlap.
 * colIndex / span describe the merged bounding box covering all entries.
 */
type RenderGroup = {
  entries: PositionedCourse[]
  rowIndex: number
  colIndex: number
  span: number
  isConflict: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = [
  { id: "Mon", label: "Mon" },
  { id: "Tue", label: "Tue" },
  { id: "Wed", label: "Wed" },
  { id: "Thu", label: "Thu" },
  { id: "Fri", label: "Fri" },
]

const GRID_START_HOUR = 8
const GRID_END_HOUR = 20

const TIME_SLOTS = Array.from(
  { length: GRID_END_HOUR - GRID_START_HOUR + 1 },
  (_, i) => `${String(GRID_START_HOUR + i).padStart(2, "0")}:00`
)

// ─── Time Parsing ─────────────────────────────────────────────────────────────

function parseTo24Hour(timeStr: string): { hours: number; minutes: number } {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (!match) return { hours: 0, minutes: 0 }
  let h = parseInt(match[1], 10)
  const m = parseInt(match[2], 10)
  const ampm = match[3]?.toUpperCase()
  if (ampm === "AM" && h === 12) h = 0
  else if (ampm === "PM" && h < 12) h += 12
  return { hours: h, minutes: m }
}

interface TimeRange {
  startH: number
  startM: number
  endH: number
  endM: number
}

function parseTimeRange(masa: string): TimeRange | null {
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

function getCourseGridInfo(
  masa: string
): { colIndex: number; span: number } | null {
  const range = parseTimeRange(masa)
  if (!range) return null
  const { startH, endH, endM } = range
  const clampedStart = Math.max(GRID_START_HOUR, startH)
  if (clampedStart >= GRID_END_HOUR) return null
  const endHourCeil = endM > 0 ? endH + 1 : endH
  const clampedEnd = Math.min(GRID_END_HOUR, endHourCeil)
  const colIndex = clampedStart - GRID_START_HOUR
  const span = Math.max(1, clampedEnd - clampedStart)
  return { colIndex, span }
}

// ─── Session Merging ──────────────────────────────────────────────────────────

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
      const startPart = current.masa
        .slice(0, current.masa.search(/\s*-\s*(?=\d)/))
        .trim()
      const dashIdx = next.masa.search(/\s*-\s*(?=\d)/)
      const endPart = next.masa
        .slice(next.masa.indexOf("-", dashIdx) + 1)
        .trim()
      const mergedClassIds = [
        ...(current.classIds ?? []),
        ...(next.classIds ?? []),
      ]
      current = {
        ...current,
        masa: `${startPart} - ${endPart}`,
        classIds: mergedClassIds,
      }
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

function hasScheduleDataFromCourses(courses: Course[]): boolean {
  return courses.some((c) => c.Classes && c.Classes.length > 0)
}

function findFirstWeekFromCourses(courses: Course[]): Date | null {
  const dates = new Set<string>()
  courses.forEach((c) =>
    c.Classes.forEach((cls) => {
      if (cls.date) dates.add(cls.date)
    })
  )
  const arr = Array.from(dates).sort()
  if (arr.length === 0) return null
  const d = parseISO(arr[0])
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return monday
}

// ─── CourseCard ───────────────────────────────────────────────────────────────

interface CourseCardProps {
  course: CourseSession
  colors?: CustomColorSettings | CoursePalette
}

function CourseCard({ course, colors }: CourseCardProps) {
  const colorsUsed: any =
    colors ?? ({ bg: "", border: "", text: "" } as CustomColorSettings)
  const hoverClass = (colorsUsed as CoursePalette).hover ?? ""
  return (
    <div
      className={`h-full w-full cursor-pointer rounded-lg border p-2 text-xs transition-all duration-200 ease-out ${colorsUsed.bg} ${colorsUsed.border} ${colorsUsed.text} ${hoverClass} hover:scale-[1.02] hover:shadow-md focus:ring-2 focus:ring-primary/50 focus:ring-offset-1 focus:outline-none active:scale-[0.98]`}
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

// ─── HoverDetails ─────────────────────────────────────────────────────────────

interface HoverDetailsProps {
  course: CourseSession
  conflictCount?: number
  onEditClick?: (course: CourseSession) => void
  onSaveCourse?: WeeklyCalendarProps["onSaveCourse"]
  onDeleteClick?: (course: CourseSession) => void
}

function HoverDetails({
  course,
  conflictCount = 0,
  onEditClick,
  onSaveCourse,
  onDeleteClick,
}: HoverDetailsProps) {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-lg font-semibold text-foreground">
          {course.courseid}
        </div>
        <div className="text-sm text-muted-foreground">
          {course.course_desc}
        </div>
      </div>
      {conflictCount > 0 && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-800">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Overlaps with {conflictCount} other course
          {conflictCount > 1 ? "s" : ""} in this slot
        </div>
      )}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{course.masa}</span>
        </div>
        {course.bilik && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{course.bilik}</span>
          </div>
        )}
        {course.lecturer && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{course.lecturer}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>Group {course.groups}</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {onSaveCourse && onEditClick && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditClick(course)}
          >
            <Pencil className="mr-2 h-3 w-3" />
            Edit Course
          </Button>
        )}

        {onDeleteClick && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Delete Class
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete class</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogDescription>
                This will permanently remove the class from your timetable. This
                action cannot be undone.
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => onDeleteClick(course)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}

// ─── ConflictStack ────────────────────────────────────────────────────────────

interface ConflictStackProps {
  entries: PositionedCourse[]
  customColors: Record<string, CustomColorSettings>
  onEditClick: (course: CourseSession) => void
  onSaveCourse?: WeeklyCalendarProps["onSaveCourse"]
  onDeleteClick?: (course: CourseSession) => void
}

function ConflictStack({
  entries,
  customColors,
  onEditClick,
  onSaveCourse,
  onDeleteClick,
}: ConflictStackProps) {
  return (
    <div className="flex h-full w-full flex-col gap-0.5 p-1">
      {/* Conflict banner */}
      <div className="flex shrink-0 items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-800">
        <AlertTriangle className="h-3 w-3 shrink-0" />
        Schedule conflict ({entries.length} courses)
      </div>
      {/* One card per conflicting course, each with its own hover card */}
      <div className="flex min-h-0 flex-1 gap-0.5">
        {entries.map((entry, i) => {
          const compositeKey = generateCourseKey(
            entry.course.courseid,
            entry.course.groups
          )
          const computedColors = getCourseColor(compositeKey, customColors)
          return (
            <HoverCard key={i} openDelay={100} closeDelay={50}>
              <HoverCardTrigger asChild>
                <div className="min-h-0 flex-1">
                  <CourseCard
                    course={entry.course}
                    colors={computedColors as any}
                  />
                </div>
              </HoverCardTrigger>
              <HoverCardContent side="right" className="w-80 p-4" align="start">
                <HoverDetails
                  course={entry.course}
                  conflictCount={entries.length - 1}
                  onEditClick={onEditClick}
                  onSaveCourse={onSaveCourse}
                  onDeleteClick={onDeleteClick}
                />
              </HoverCardContent>
            </HoverCard>
          )
        })}
      </div>
    </div>
  )
}

// ─── WeeklyCalendar ───────────────────────────────────────────────────────────

export function WeeklyCalendar({
  courses,
  customColors = {},
  studentId = "",
  onSaveCourse,
  onRetry,
  onDeleteCourseClass,
}: WeeklyCalendarProps) {
  const [editingCourse, setEditingCourse] = useState<CourseSession | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)

  const hasData = useMemo(() => hasScheduleDataFromCourses(courses), [courses])
  const initialWeek = useMemo(
    () => findFirstWeekFromCourses(courses),
    [courses]
  )

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

  // ── Week dates ─────────────────────────────────────────────────────────────
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

  const { groupMap, skipCells } = useMemo(() => {
    const groupMap = new Map<string, RenderGroup>()
    const skipCells = new Set<string>()

    DAYS.forEach((day, dayIdx) => {
      const rowIndex = dayIdx + 1
      const dayDate = weekDates.find((d) => d.dayName === day.id)
      if (!dayDate) return

      // 1. Collect raw sessions for this day (preserve underlying class ids)
      const rawEvents: CourseSession[] = []
      courses.forEach((course) => {
        if (!course.Classes) return
        course.Classes.forEach((cls) => {
          if (cls.date !== dayDate.dateStr) return
          rawEvents.push({
            course_desc: course.course_desc,
            courseid: course.courseid,
            groups: course.groups,
            masa: cls.masa,
            bilik: cls.bilik ?? null,
            lecturer: cls.lecturer ?? null,
            classIds: cls.id ? [cls.id] : [],
            date: cls.date,
          })
        })
      })

      // Merge consecutive same-course sessions (e.g. ENT600 10-12 + 12-13)
      const events = mergeConsecutiveSessions(rawEvents)

      // 2. Map to grid positions; drop anything outside the grid
      const positioned: PositionedCourse[] = events
        .map((event) => {
          const gridInfo = getCourseGridInfo(event.masa)
          if (!gridInfo) return null
          return {
            course: event,
            rowIndex,
            colIndex: gridInfo.colIndex,
            span: gridInfo.span,
          }
        })
        .filter((p): p is PositionedCourse => p !== null)

      // 3. Sort ascending by start column
      positioned.sort((a, b) => a.colIndex - b.colIndex)

      // 4. Interval grouping
      const processed = new Array(positioned.length).fill(false)

      for (let i = 0; i < positioned.length; i++) {
        if (processed[i]) continue

        const group: PositionedCourse[] = [positioned[i]]
        processed[i] = true

        // Track the furthest right edge covered by anything in this group
        let groupEnd = positioned[i].colIndex + positioned[i].span

        // Expand until stable — needed for chained overlaps
        let changed = true
        while (changed) {
          changed = false
          for (let j = i + 1; j < positioned.length; j++) {
            if (processed[j]) continue
            // Overlap: next course starts before current group ends
            if (positioned[j].colIndex < groupEnd) {
              group.push(positioned[j])
              processed[j] = true
              groupEnd = Math.max(
                groupEnd,
                positioned[j].colIndex + positioned[j].span
              )
              changed = true
            }
          }
        }

        // 5. Commit group
        const groupStart = positioned[i].colIndex
        const span = groupEnd - groupStart
        const key = `${rowIndex}-${groupStart}`

        groupMap.set(key, {
          entries: group,
          rowIndex,
          colIndex: groupStart,
          span,
          isConflict: group.length > 1,
        })

        // Mark interior cells as skip so they don't render as empty
        for (let col = groupStart + 1; col < groupEnd; col++) {
          skipCells.add(`${rowIndex}-${col}`)
        }
      }
    })

    return { groupMap, skipCells }
  }, [weekDates, courses])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      <EditCourseModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        course={editingCourse}
        customColors={
          editingCourse
            ? (customColors[
                generateCourseKey(editingCourse.courseid, editingCourse.groups)
              ] ?? null)
            : null
        }
        onSave={handleSaveEdit}
      />

      {/* Week header */}
      <div className="mb-4 flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Weekly Timetable
          </h2>
        </div>
        {studentId && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-foreground">{studentId}</span>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <div
          className="grid min-w-200"
          style={{
            gridTemplateColumns: `72px repeat(${TIME_SLOTS.length}, minmax(90px, 1fr))`,
            gridTemplateRows: `auto repeat(${DAYS.length}, minmax(80px, auto))`,
          }}
        >
          {/* ── Header row ── */}
          <div
            className="sticky top-0 z-20 flex items-center justify-center border-b bg-muted/80 px-2 py-3 backdrop-blur-sm"
            style={{ gridColumn: 1, gridRow: 1 }}
          >
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
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
            const rowIndex = dayIdx + 1
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
                  const group = groupMap.get(cellKey)

                  // Interior cells of a group's span — skip entirely
                  if (!group && skipCells.has(cellKey)) return null

                  const span = group?.span ?? 1
                  const gridColValue =
                    span > 1 ? `${timeIdx + 2} / span ${span}` : timeIdx + 2

                  return (
                    <div
                      key={`${day.id}-${timeSlot}`}
                      className="relative flex items-center justify-center border-b border-l bg-background/50 transition-colors hover:bg-muted/20"
                      style={{ gridColumn: gridColValue, gridRow: dayIdx + 2 }}
                    >
                      {group ? (
                        group.isConflict ? (
                          // ── Conflict: 2+ overlapping courses ──────────
                          <ConflictStack
                            entries={group.entries}
                            customColors={customColors}
                            onEditClick={handleEditClick}
                            onSaveCourse={onSaveCourse}
                            onDeleteClick={
                              onDeleteCourseClass
                                ? (c) =>
                                    onDeleteCourseClass(
                                      generateCourseKey(c.courseid, c.groups),
                                      c.classIds ?? []
                                    )
                                : undefined
                            }
                          />
                        ) : (
                          // ── Normal single course ───────────────────────
                          <div className="flex h-full w-full p-1">
                            <HoverCard openDelay={100} closeDelay={50}>
                              <HoverCardTrigger asChild>
                                <div className="h-full w-full">
                                  {(() => {
                                    const entry = group.entries[0]
                                    const compositeKey = generateCourseKey(
                                      entry.course.courseid,
                                      entry.course.groups
                                    )
                                    const computedColors = getCourseColor(
                                      compositeKey,
                                      customColors
                                    )
                                    return (
                                      <CourseCard
                                        course={entry.course}
                                        colors={computedColors as any}
                                      />
                                    )
                                  })()}
                                </div>
                              </HoverCardTrigger>
                              <HoverCardContent
                                side="right"
                                className="w-80 p-4"
                                align="start"
                              >
                                <HoverDetails
                                  course={group.entries[0].course}
                                  onEditClick={handleEditClick}
                                  onSaveCourse={onSaveCourse}
                                  onDeleteClick={
                                    onDeleteCourseClass
                                      ? (c) =>
                                          onDeleteCourseClass(
                                            generateCourseKey(
                                              c.courseid,
                                              c.groups
                                            ),
                                            c.classIds ?? []
                                          )
                                      : undefined
                                  }
                                />
                              </HoverCardContent>
                            </HoverCard>
                          </div>
                        )
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
