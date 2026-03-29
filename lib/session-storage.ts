/**
 * Session storage utilities for persisting timetable data and customizations
 */

import {
  TimetableData,
  TimetableWithCustom,
  CustomColorSettings,
  CourseSession,
} from "@/types/timetable"
import { Course } from "@/types/course"
import {
  mapRawTimetableToCourses,
  generateCourseKey,
} from "@/lib/course-transform"

const STORAGE_PREFIX = "timetable_"
const PROCESSED_PREFIX = "processed_timetable_"

/**
 * Get storage key for a student ID
 */
function getStorageKey(studentId: string): string {
  return `${STORAGE_PREFIX}${studentId}`
}

function getProcessedKey(studentId: string): string {
  return `${PROCESSED_PREFIX}${studentId}`
}

/**
 * Check if session storage is available
 */
function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false
  try {
    const test = "__storage_test__"
    window.sessionStorage.setItem(test, test)
    window.sessionStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

/**
 * Load timetable from session storage
 */
export function loadTimetableFromSession(
  studentId: string
): TimetableWithCustom | null {
  if (!isStorageAvailable()) return null

  try {
    const key = getStorageKey(studentId)
    const data = window.sessionStorage.getItem(key)
    if (!data) return null

    return JSON.parse(data) as TimetableWithCustom
  } catch {
    return null
  }
}

/**
 * Save timetable to session storage
 */
export function saveTimetableToSession(
  studentId: string,
  data: TimetableData
): void {
  if (!isStorageAvailable()) return

  const storageData: TimetableWithCustom = {
    originalData: data,
    customColors: {},
    customCourses: {},
  }

  try {
    const key = getStorageKey(studentId)
    window.sessionStorage.setItem(key, JSON.stringify(storageData))
  } catch {
    console.error("Failed to save timetable to session storage")
  }
}

/**
 * Get custom color settings for a course
 */
export function getCustomColor(
  studentId: string,
  courseId: string
): CustomColorSettings | null {
  const data = loadTimetableFromSession(studentId)
  if (!data) return null

  return data.customColors[courseId] || null
}

/**
 * Save custom color settings for a course
 */
export function saveCustomColor(
  studentId: string,
  courseId: string,
  colors: CustomColorSettings
): void {
  if (!isStorageAvailable()) return

  try {
    const key = getStorageKey(studentId)
    const rawData = sessionStorage.getItem(key)
    const parsed = rawData ? JSON.parse(rawData) : null

    // Preserve all existing data, only update customColors
    const storageData: TimetableWithCustom = parsed || {
      originalData: {},
      customColors: {},
      customCourses: {},
    }

    storageData.customColors[courseId] = colors
    window.sessionStorage.setItem(key, JSON.stringify(storageData))
  } catch {
    console.error("Failed to save custom color to session storage")
  }
}

/**
 * Get custom course data (edited course info)
 */
export function getCustomCourse(
  studentId: string,
  courseId: string
): Partial<CourseSession> | null {
  const data = loadTimetableFromSession(studentId)
  if (!data) return null

  return data.customCourses[courseId] || null
}

/**
 * Update custom course data
 */
export function updateCustomCourse(
  studentId: string,
  courseId: string,
  courseData: Partial<CourseSession>
): void {
  if (!isStorageAvailable()) return

  try {
    const key = getStorageKey(studentId)
    const rawData = sessionStorage.getItem(key)
    const parsed = rawData ? JSON.parse(rawData) : null

    // Preserve all existing data, only update customCourses
    const storageData: TimetableWithCustom = parsed || {
      originalData: {},
      customColors: {},
      customCourses: {},
    }

    // Sanitize what we persist: only allow editable, non-instance fields.
    // Prevent persisting `masa` (time) or other instance-specific fields.
    const allowedKeys = new Set(["course_desc", "bilik", "lecturer"])
    const safePayload = Object.fromEntries(
      Object.entries(courseData).filter(
        ([k, v]) => allowedKeys.has(k) && v !== "" && v != null
      )
    ) as Partial<CourseSession>

    storageData.customCourses[courseId] = safePayload
    window.sessionStorage.setItem(key, JSON.stringify(storageData))
  } catch {
    console.error("Failed to update custom course in session storage")
  }
}

/**
 * Get all custom colors for a student
 */
export function getAllCustomColors(
  studentId: string
): Record<string, CustomColorSettings> {
  const data = loadTimetableFromSession(studentId)
  return data?.customColors || {}
}

/**
 * Get all custom courses for a student
 */
export function getAllCustomCourses(
  studentId: string
): Record<string, Partial<CourseSession>> {
  const data = loadTimetableFromSession(studentId)
  return data?.customCourses || {}
}

/**
 * Check if student has custom data in session
 */
export function hasCustomData(studentId: string): boolean {
  const data = loadTimetableFromSession(studentId)
  if (!data) return false

  const hasColors = Object.keys(data.customColors).length > 0
  const hasCourses = Object.keys(data.customCourses).length > 0

  return hasColors || hasCourses
}

/**
 * Clear all custom data for a student
 */
export function clearCustomData(studentId: string): void {
  if (!isStorageAvailable()) return

  try {
    const key = getStorageKey(studentId)
    window.sessionStorage.removeItem(key)
  } catch {
    console.error("Failed to clear custom data from session storage")
  }
}

/**
 * Save processed Course[] to session storage
 */
export function saveProcessedTimetable(
  studentId: string,
  courses: Course[]
): void {
  if (!isStorageAvailable()) return

  try {
    const key = getProcessedKey(studentId)
    window.sessionStorage.setItem(key, JSON.stringify(courses))
  } catch {
    console.error("Failed to save processed timetable to session storage")
  }
}

/**
 * Load processed Course[] from session storage
 */
export function loadProcessedTimetable(studentId: string): Course[] | null {
  if (!isStorageAvailable()) return null

  try {
    const key = getProcessedKey(studentId)
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as Course[]
  } catch {
    return null
  }
}

/**
 * Migrate old timetable (TimetableWithCustom) into processed Course[] representation.
 * If processed data already exists, returns it. Otherwise maps originalData -> Course[] and saves it.
 */
export function migrateOldSessionData(studentId: string): Course[] | null {
  if (!isStorageAvailable()) return null

  try {
    const existing = loadProcessedTimetable(studentId)
    if (existing) return existing

    const old = loadTimetableFromSession(studentId)
    if (!old || !old.originalData) return null

    // Apply any custom overrides when migrating so processed data reflects edits
    const merged = mergeTimetableWithCustom(studentId, old.originalData)
    const courses = mapRawTimetableToCourses(merged.data)
    saveProcessedTimetable(studentId, courses)
    return courses
  } catch (e) {
    console.error("Failed to migrate old session data", e)
    return null
  }
}

/**
 * Merge timetable data with custom overrides
 * Returns the original data with custom colors and courses applied
 */
export function mergeTimetableWithCustom(
  studentId: string,
  originalData: TimetableData
): { data: TimetableData; customColors: Record<string, CustomColorSettings> } {
  const customData = loadTimetableFromSession(studentId)

  if (!customData) {
    return { data: originalData, customColors: {} }
  }

  // Clone original data to avoid mutation
  const mergedData: TimetableData = JSON.parse(JSON.stringify(originalData))
  const customCourses = customData.customCourses

  // Apply custom course data to all dates
  Object.keys(mergedData).forEach((dateKey) => {
    const daySchedule = mergedData[dateKey]
    if (daySchedule && daySchedule.jadual) {
      daySchedule.jadual = daySchedule.jadual.map((course) => {
        const key = generateCourseKey(course.courseid, course.groups)
        const customCourse = customCourses[key]
        if (customCourse) {
          // Defensive merge: only allow non-instance editable fields to apply.
          const allowedKeys = new Set(["course_desc", "bilik", "lecturer"])
          const safeCustom = Object.fromEntries(
            Object.entries(customCourse).filter(
              ([k, v]) => allowedKeys.has(k) && v !== "" && v != null
            )
          ) as Partial<CourseSession>
          return { ...course, ...safeCustom }
        }
        return course
      })
    }
  })

  return {
    data: mergedData,
    customColors: customData.customColors,
  }
}
