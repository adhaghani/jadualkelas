/**
 * Types for UITM Student Timetable API
 * API URL: https://cdn.uitm.link/jadual/baru/{studentId}.json
 */

export interface CourseSession {
  course_desc: string
  courseid: string
  groups: string
  masa: string // Time slot like "08:00 AM - 10:00 AM"
  bilik: string | null // Room, can be null
  lecturer: string | null
}

export interface DaySchedule {
  hari: string // Day name in Malay: "Monday", "Tuesday", etc.
  jadual: CourseSession[]
}

export interface TimetableData {
  [date: string]: DaySchedule | null // Date key like "2026-03-30"
}

export interface ParsedTimeSlot {
  start: Date
  end: Date
  raw: string
}

export interface CalendarEvent {
  id: string
  courseId: string
  courseDesc: string
  groups: string
  timeSlot: ParsedTimeSlot
  room: string | null
  lecturer: string | null
  date: string // YYYY-MM-DD format
}

// Custom color settings per course
export interface CustomColorSettings {
  bg: string // Tailwind class: bg-blue-100
  border: string // Tailwind class: border-blue-300
  text: string // Tailwind class: text-blue-800
}

// Timetable with custom data stored in sessionStorage
export interface TimetableWithCustom {
  originalData: TimetableData
  customColors: Record<string, CustomColorSettings> // courseId -> colors
  customCourses: Record<string, Partial<CourseSession>> // courseId -> updated data (partial)
}
