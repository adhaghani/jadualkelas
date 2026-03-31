/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useState, useEffect } from "react"
import { CourseSession, CustomColorSettings } from "@/types/timetable"
import { Course } from "@/types/course"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { COURSE_COLORS } from "@/lib/color"

// Validate time format: "HH:MM AM - HH:MM PM", "HH:MM - HH:MM", or "8:00 - 10:00"
function isValidTimeFormat(timeStr: string): boolean {
  if (!timeStr.trim()) return true // Empty is OK (use original)
  // Require colon in HH:MM for both start and end times; AM/PM optional.
  const timeRegex =
    /^(?:\d{1,2}:\d{2})\s*(?:AM|PM)?\s*-\s*(?:\d{1,2}:\d{2})\s*(?:AM|PM)?$/i
  return timeRegex.test(timeStr.trim())
}

// Normalize a time range like "8:0 - 10:0" -> "08:00 - 10:00" and
// normalize AM/PM casing. If the input doesn't match a parseable pattern,
// return it unchanged.
function normalizeTimeRange(timeStr: string): string {
  const m = timeStr
    .trim()
    .match(
      /^(\d{1,2}):(\d{1,2})\s*(AM|PM)?\s*-\s*(\d{1,2}):(\d{1,2})\s*(AM|PM)?$/i
    )
  if (!m) return timeStr

  const h1 = m[1].padStart(2, "0")
  const min1 = m[2].padStart(2, "0")
  const am1 = m[3] ? ` ${m[3].toUpperCase()}` : ""

  const h2 = m[4].padStart(2, "0")
  const min2 = m[5].padStart(2, "0")
  const am2 = m[6] ? ` ${m[6].toUpperCase()}` : ""

  return `${h1}:${min1}${am1} - ${h2}:${min2}${am2}`
}

interface EditCourseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  course: Course | CourseSession | null
  customColors: CustomColorSettings | null
  // `classIds` is optional. When provided, caller should persist per-class overrides.
  onSave: (
    course: CourseSession,
    colors: CustomColorSettings,
    classIds?: string[]
  ) => void
  // Optional: list of week dates (used to present Mon-Fri options)
  weekDates?: { dateStr: string; dayLabel: string }[]
}

export function EditCourseModal({
  open,
  onOpenChange,
  course,
  customColors,
  onSave,
  weekDates,
}: EditCourseModalProps) {
  const [courseDesc, setCourseDesc] = useState("")
  const [lecturer, setLecturer] = useState("")
  const [bilik, setBilik] = useState("")
  const [masa, setMasa] = useState("")
  const [date, setDate] = useState<string | undefined>(undefined)
  const [selectedColorId, setSelectedColorId] = useState("blue")
  const [timeError, setTimeError] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()

  // Initialize form when course changes
  useEffect(() => {
    if (course) {
      // Course may be a normalized Course (with Classes) or a legacy CourseSession.
      if ((course as Course).Classes) {
        const c = course as Course
        setCourseDesc(c.course_desc)
        const cls = c.Classes[0]
        setLecturer(cls?.lecturer || "")
        setBilik(cls?.bilik || "")
        setMasa(cls?.masa || "")
        setDate(cls?.date || undefined)
      } else {
        const cs = course as CourseSession
        setCourseDesc(cs.course_desc)
        setLecturer(cs.lecturer || "")
        setBilik(cs.bilik || "")
        setMasa(cs.masa || "")
        setDate(cs.date || undefined)
      }
    }
  }, [course])

  // Initialize color selection
  useEffect(() => {
    if (customColors) {
      const found = COURSE_COLORS.find((c) => c.bg === customColors.bg)
      if (found) {
        setSelectedColorId(found.id)
      }
    }
  }, [customColors])

  const handleSave = () => {
    if (!course) return

    const colorPalette = COURSE_COLORS.find((c) => c.id === selectedColorId)
    if (!colorPalette) return

    const colors: CustomColorSettings = {
      bg: colorPalette.bg,
      border: colorPalette.border,
      text: colorPalette.text,
    }

    // Normalize time input for consistent storage/keys
    const cleanedMasa = masa !== "" ? normalizeTimeRange(masa) : masa
    if (cleanedMasa !== masa) setMasa(cleanedMasa)

    // Normalize the edited fields into a CourseSession for compatibility.
    // Preserve original values when inputs are left blank to avoid
    // overwriting with empty strings or nulls.
    let updatedCourse: CourseSession
    let classIdsToPass: string[] | undefined = undefined
    if ((course as Course).Classes) {
      const c = course as Course
      const cls = c.Classes[0]
      updatedCourse = {
        course_desc: courseDesc || c.course_desc,
        courseid: c.courseid,
        groups: c.groups,
        masa: cleanedMasa !== "" ? cleanedMasa : (cls?.masa ?? ""),
        bilik: bilik !== "" ? bilik : (cls?.bilik ?? null),
        lecturer: lecturer !== "" ? lecturer : (cls?.lecturer ?? null),
        date: date !== undefined ? date : cls?.date,
      }
      if (cls?.id) classIdsToPass = [cls.id]
    } else {
      const cs = course as CourseSession
      updatedCourse = {
        ...cs,
        course_desc: courseDesc || cs.course_desc,
        masa: cleanedMasa !== "" ? cleanedMasa : cs.masa,
        date: date !== undefined ? date : cs.date,
        lecturer: lecturer !== "" ? lecturer : cs.lecturer,
        bilik: bilik !== "" ? bilik : cs.bilik,
      }
      if (cs.classIds && cs.classIds.length > 0) classIdsToPass = cs.classIds
    }

    onSave(updatedCourse, colors, classIdsToPass)
    onOpenChange(false)
  }

  if (!course) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
          <DialogDescription>
            Modify course details and color for {course.courseid}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Course Description */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="courseDesc" className="text-right">
              Description
            </Label>
            <Input
              id="courseDesc"
              value={courseDesc}
              onChange={(e) => setCourseDesc(e.target.value)}
              className="col-span-3"
            />
          </div>

          {/* Lecturer */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lecturer" className="text-right">
              Lecturer
            </Label>
            <Input
              id="lecturer"
              value={lecturer}
              onChange={(e) => setLecturer(e.target.value)}
              className="col-span-3"
            />
          </div>

          {/* Room */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bilik" className="text-right">
              Room
            </Label>
            <Input
              id="bilik"
              value={bilik}
              onChange={(e) => setBilik(e.target.value)}
              className="col-span-3"
            />
          </div>

          {/* Time */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="masa" className="text-right">
              Time
            </Label>
            <div className="col-span-3">
              <Input
                id="masa"
                value={masa}
                placeholder="08:00 AM - 10:00 AM"
                onChange={(e) => {
                  const value = e.target.value
                  setMasa(value)
                  setTimeError(
                    value && !isValidTimeFormat(value)
                      ? "Invalid format (e.g., 08:00 AM - 10:00 AM)"
                      : null
                  )
                }}
                className={timeError ? "border-red-500" : ""}
              />
              {timeError && (
                <p className="mt-1 text-xs text-red-500">{timeError}</p>
              )}
            </div>
          </div>

          {/* Day selector (Mon-Fri) */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Day
            </Label>
            <div className="col-span-3">
              {weekDates && weekDates.length > 0 ? (
                <select
                  id="date"
                  value={date ?? ""}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded border px-2 py-1"
                >
                  {weekDates.map((w) => (
                    <option key={w.dateStr} value={w.dateStr}>
                      {new Date(w.dateStr).toLocaleDateString(undefined, {
                        weekday: "long",
                      })}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="date"
                  type="date"
                  value={date ?? ""}
                  min={`${currentYear - 2}-01-01`}
                  max={`${currentYear + 2}-12-31`}
                  onChange={(e) => setDate(e.target.value)}
                  className="col-span-3"
                />
              )}
            </div>
          </div>

          {/* Color Selection */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Color</Label>
            <div className="col-span-3 flex flex-wrap gap-2">
              {COURSE_COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColorId(color.id)}
                  className={`h-8 w-8 rounded-full border-2 ${color.bg} ${color.border} ${
                    selectedColorId === color.id
                      ? "ring-2 ring-primary ring-offset-2"
                      : ""
                  }`}
                  aria-label={`Select ${color.id} color`}
                />
              ))}
            </div>
          </div>

          {/* Color Preview */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Preview</Label>
            <div className="col-span-3">
              {(() => {
                const color = COURSE_COLORS.find(
                  (c) => c.id === selectedColorId
                )
                if (!color) return null
                return (
                  <div
                    className={`rounded border p-2 text-sm ${color.bg} ${color.border}`}
                  >
                    <div className={`font-semibold ${color.text}`}>
                      {course.courseid}
                    </div>
                    <div className={`${color.text.replace("-800", "-700")}`}>
                      {courseDesc || course.course_desc}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="submit" onClick={handleSave} disabled={!!timeError}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
