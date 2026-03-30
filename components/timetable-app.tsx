"use client"

import { useState, useCallback } from "react"
import {
  TimetableData,
  CourseSession,
  CustomColorSettings,
} from "@/types/timetable"
import { fetchTimetable } from "@/lib/api"
import {
  loadTimetableFromSession,
  saveTimetableToSession,
  updateCustomCourse,
  saveCustomColor,
  mergeTimetableWithCustom,
  migrateOldSessionData,
  saveProcessedTimetable,
} from "@/lib/session-storage"
import { Course } from "@/types/course"
import {
  mapRawTimetableToCourses,
  generateCourseKey,
} from "@/lib/course-transform"
import { StudentIdInput } from "./student-id-input"
import { WeeklyCalendar } from "./weekly-calendar"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

interface TimetableAppProps {
  initialStudentId?: string
}

export function TimetableApp({ initialStudentId }: TimetableAppProps) {
  const [studentId, setStudentId] = useState(initialStudentId || "")
  const [timetableData, setTimetableData] = useState<TimetableData | null>(null)
  const [processedCourses, setProcessedCourses] = useState<Course[] | null>(
    null
  )
  const [customColors, setCustomColors] = useState<
    Record<string, CustomColorSettings>
  >({})
  const [isLoading, setIsLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [error, setError] = useState("")

  // Handler for saving custom course data
  const handleSaveCourse = useCallback(
    (courseId: string, course: CourseSession, colors: CustomColorSettings) => {
      if (!studentId) return

      // Compute composite per-instance key and save custom data under it
      const compositeKey = generateCourseKey(course.courseid, course.groups)

      // Sanitize payload: only persist editable, non-instance fields.
      const sanitized: Partial<CourseSession> = {}
      if (course.course_desc && course.course_desc !== "") {
        sanitized.course_desc = course.course_desc
      }
      if (course.bilik != null && course.bilik !== "") {
        sanitized.bilik = course.bilik
      }
      if (course.lecturer != null && course.lecturer !== "") {
        sanitized.lecturer = course.lecturer
      }

      updateCustomCourse(studentId, compositeKey, sanitized)
      saveCustomColor(studentId, compositeKey, colors)

      // Re-merge saved custom data and update React state so UI reflects edits immediately
      const cached = loadTimetableFromSession(studentId)
      if (cached) {
        const merged = mergeTimetableWithCustom(studentId, cached.originalData)
        setTimetableData(merged.data)
        setCustomColors(merged.customColors)

        // Also regenerate processed Course[] and persist it so UI components
        // consuming the normalized shape receive updated data.
        try {
          const courses = mapRawTimetableToCourses(merged.data)
          saveProcessedTimetable(studentId, courses)
          setProcessedCourses(courses)
        } catch (e) {
          console.error("Failed to regenerate processed timetable", e)
        }
      } else {
        // Fallback: trigger a remount if session storage isn't available
        setRefreshKey((prev) => prev + 1)
      }
    },
    [studentId]
  )

  const handleDeleteCourseClass = useCallback(
    (courseKey: string, classIds: string[]) => {
      if (!studentId) return
      if (!processedCourses) return

      const updated = processedCourses.map((c) => {
        if (c.id !== courseKey) return c
        return {
          ...c,
          Classes: (c.Classes || []).filter(
            (cls) => !(cls.id && classIds.includes(cls.id))
          ),
        }
      })

      try {
        saveProcessedTimetable(studentId, updated)
        setProcessedCourses(updated)
      } catch (e) {
        console.error("Failed to persist timetable after deletion", e)
      }
    },
    [studentId, processedCourses]
  )

  const handleStudentIdSubmit = async (id: string) => {
    setIsLoading(true)
    setError("")
    setStudentId(id)

    try {
      // Try to load from session storage first
      const cachedData = loadTimetableFromSession(id)

      if (cachedData) {
        // Ensure processed Course[] exists (migrate if necessary)
        let courses: Course[] | null = null
        try {
          courses = migrateOldSessionData(id)
        } catch {
          // non-fatal
        }

        // Use cached data
        const merged = mergeTimetableWithCustom(id, cachedData.originalData)
        setTimetableData(merged.data)
        setCustomColors(merged.customColors)

        // If migration returned processed courses, use them; otherwise derive now
        if (courses) {
          setProcessedCourses(courses)
        } else {
          try {
            const derived = mapRawTimetableToCourses(merged.data)
            saveProcessedTimetable(id, derived)
            setProcessedCourses(derived)
          } catch {
            // non-fatal
          }
        }
      } else {
        // Fetch from API
        const data = await fetchTimetable(id)
        setTimetableData(data)
        setCustomColors({})

        // Save to session storage
        saveTimetableToSession(id, data)

        // Generate and persist processed Course[] right away
        try {
          const derived = mapRawTimetableToCourses(data)
          saveProcessedTimetable(id, derived)
          setProcessedCourses(derived)
        } catch (e) {
          // non-fatal
          console.error("Failed to create processed timetable", e)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load timetable")
      setTimetableData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setStudentId("")
    setTimetableData(null)
    setError("")
  }

  // Show input form if no student ID submitted yet
  if (!studentId) {
    return (
      <div className="flex min-h-100 flex-col items-center justify-center gap-6">
        <div className="text-center">
          <h1 className="mb-2 text-3xl font-bold">UITM Student Timetable</h1>
          <p className="text-muted-foreground">
            Enter your student ID to view your class schedule
          </p>
        </div>
        <StudentIdInput
          onSubmit={handleStudentIdSubmit}
          isLoading={isLoading}
        />
        {error && (
          <Card className="w-full max-w-md border-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-100 flex-col items-center justify-center gap-6">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold">Loading Timetable...</h1>
          <p className="text-muted-foreground">
            Fetching schedule for student {studentId}
          </p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="flex min-h-100 flex-col items-center justify-center gap-6">
        <Card className="w-full max-w-md border-red-500">
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
        <StudentIdInput
          onSubmit={handleStudentIdSubmit}
          isLoading={isLoading}
        />
      </div>
    )
  }

  // Show timetable
  if (timetableData) {
    return (
      <div className="flex flex-col gap-6">
        <WeeklyCalendar
          key={refreshKey}
          courses={processedCourses || []}
          customColors={customColors}
          studentId={studentId}
          onSaveCourse={handleSaveCourse}
          onDeleteCourseClass={handleDeleteCourseClass}
        />
      </div>
    )
  }

  return null
}
