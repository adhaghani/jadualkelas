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

    // Sanitize what we persist: allow `masa`/`date` only for class-specific keys.
    // Course-specific keys remain restricted to non-instance fields.
    const allowedKeys = courseId.includes("::class::")
      ? new Set(["course_desc", "bilik", "lecturer", "masa", "date"])
      : new Set(["course_desc", "bilik", "lecturer"])
    const safePayload = Object.fromEntries(
      Object.entries(courseData).filter(
        ([k, v]) => allowedKeys.has(k) && v !== "" && v != null
      )
    ) as Partial<CourseSession>

    // If this is a class-specific key and the masa was edited, rename the
    // stored entry to keep the persisted key in sync with the edited time.
    // This avoids orphaning overrides when the UI changes the session time.
    if (courseId.includes("::class::") && safePayload.masa) {
      const [baseKey, classId] = courseId.split("::class::")
      if (classId) {
        const parts = classId.split("::")
        if (parts.length >= 2) {
          const oldEncodedMasa = parts[parts.length - 1]
          const oldMasa = decodeURIComponent(oldEncodedMasa)
          const dateKey = parts[parts.length - 2]
          const keyInside = parts.slice(0, parts.length - 2).join("::")

          if (safePayload.masa !== oldMasa) {
            const newClassId = `${keyInside}::${dateKey}::${encodeURIComponent(
              safePayload.masa
            )}`
            const newCourseId = `${baseKey}::class::${newClassId}`

            // Merge with existing target entry if present to avoid accidental
            // overwrites; incoming safePayload should override fields.
            const existingTarget = storageData.customCourses[newCourseId] || {}
            storageData.customCourses[newCourseId] = {
              ...existingTarget,
              ...safePayload,
            }

            // Remove the old key to complete the rename.
            delete storageData.customCourses[courseId]

            window.sessionStorage.setItem(key, JSON.stringify(storageData))
            return
          }
        }
      }
    }

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

  // Apply custom course data to all dates. This pass also supports moving
  // a session to a different date when a class-specific override includes
  // a `date` field different from the original date.
  Object.keys(mergedData).forEach((dateKey) => {
    const daySchedule = mergedData[dateKey]
    if (daySchedule && daySchedule.jadual) {
      const newJadual: typeof daySchedule.jadual = []

      daySchedule.jadual.forEach((course) => {
        const key = generateCourseKey(course.courseid, course.groups)
        // Build the instance class id used by mapRawTimetableToCourses
        const classId = `${key}::${dateKey}::${encodeURIComponent(course.masa)}`
        const classKey = `${key}::class::${classId}`

        // Prefer class-specific overrides when present. If exact key is not
        // found, try a tolerant lookup that matches the same base key and
        // date (but may have different masa), preferring an exact masa match.
        let customClass = customCourses[classKey]
        if (!customClass) {
          const prefix = `${key}::class::`
          let fallbackKey: string | null = null
          let fallbackVal: Partial<CourseSession> | null = null

          for (const k of Object.keys(customCourses)) {
            if (!k.startsWith(prefix)) continue
            const candidateClassId = k.split("::class::")[1]
            if (!candidateClassId) continue
            const parts = candidateClassId.split("::")
            if (parts.length < 2) continue
            const candidateDate = parts[parts.length - 2]
            if (candidateDate !== dateKey) continue
            const candidateEncodedMasa = parts[parts.length - 1]
            const candidateMasa = decodeURIComponent(candidateEncodedMasa)

            // Prefer exact masa match
            if (candidateMasa === course.masa) {
              fallbackKey = k
              fallbackVal = customCourses[k]
              break
            }

            // Otherwise keep the first reasonable candidate
            if (!fallbackKey) {
              fallbackKey = k
              fallbackVal = customCourses[k]
            }
          }

          if (fallbackVal) customClass = fallbackVal
        }

        if (customClass) {
          const allowedKeys = new Set([
            "course_desc",
            "bilik",
            "lecturer",
            "masa",
            "date",
          ])
          const safeCustom = Object.fromEntries(
            Object.entries(customClass).filter(
              ([k, v]) => allowedKeys.has(k) && v !== "" && v != null
            )
          ) as Partial<CourseSession>

          // If the override requests a different date, move the session
          // to the target date's jadual array. Otherwise apply in-place.
          if (safeCustom.date && safeCustom.date !== dateKey) {
            const targetDate = safeCustom.date as string
            // Ensure target date exists
            if (!mergedData[targetDate]) {
              const d = new Date(targetDate)
              mergedData[targetDate] = {
                hari: d.toLocaleDateString(undefined, { weekday: "short" }),
                jadual: [],
              }
            }
            // Check for duplicates before moving to avoid duplicate sessions
            const existingKeys = mergedData[targetDate].jadual.map(
              (c) => `${c.courseid}-${c.masa}`
            )
            const newKey = `${course.courseid}-${safeCustom.masa || course.masa}`
            if (!existingKeys.includes(newKey)) {
              mergedData[targetDate].jadual.push({ ...course, ...safeCustom })
              // Don't add to newJadual - course is moved to target date
              return
            }
            // If duplicate exists at target, skip entirely (don't add anywhere)
            return
          } else {
            newJadual.push({ ...course, ...safeCustom })
          }
          return
        }

        // Fallback to course-level override
        const customCourse = customCourses[key]
        if (customCourse) {
          // Defensive merge: only allow non-instance editable fields to apply.
          const allowedKeys = new Set(["course_desc", "bilik", "lecturer"])
          const safeCustom = Object.fromEntries(
            Object.entries(customCourse).filter(
              ([k, v]) => allowedKeys.has(k) && v !== "" && v != null
            )
          ) as Partial<CourseSession>
          newJadual.push({ ...course, ...safeCustom })
          return
        }

        newJadual.push(course)
      })

      daySchedule.jadual = newJadual
    }
  })

  return {
    data: mergedData,
    customColors: customData.customColors,
  }
}
