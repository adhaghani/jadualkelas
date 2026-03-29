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
} from "@/lib/session-storage"
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

      // Save custom course data and colors to session storage
      updateCustomCourse(studentId, courseId, course)
      saveCustomColor(studentId, courseId, colors)

      // Trigger refresh to re-merge data
      setRefreshKey((prev) => prev + 1)
    },
    [studentId]
  )

  const handleStudentIdSubmit = async (id: string) => {
    setIsLoading(true)
    setError("")
    setStudentId(id)

    try {
      // Try to load from session storage first
      const cachedData = loadTimetableFromSession(id)

      if (cachedData) {
        // Use cached data
        const merged = mergeTimetableWithCustom(id, cachedData.originalData)
        setTimetableData(merged.data)
        setCustomColors(merged.customColors)
      } else {
        // Fetch from API
        const data = await fetchTimetable(id)
        setTimetableData(data)
        setCustomColors({})

        // Save to session storage
        saveTimetableToSession(id, data)
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
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-6">
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
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-6">
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
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-6">
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
        <div className="flex items-center justify-between">
          <button
            onClick={handleReset}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View Different Student
          </button>
        </div>
        <WeeklyCalendar
          key={refreshKey}
          data={timetableData}
          customColors={customColors}
          studentId={studentId}
          onSaveCourse={handleSaveCourse}
        />
      </div>
    )
  }

  return null
}
