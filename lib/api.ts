/**
 * API utility for fetching UITM student timetable data
 */

import { TimetableData, CourseSession, ParsedTimeSlot } from "@/types/timetable"

const API_BASE_URL = "https://cdn.uitm.link/jadual/baru"

/**
 * Validate student ID format (10-digit number)
 */
export function validateStudentId(id: string): boolean {
  return /^\d{10}$/.test(id)
}

/**
 * Fetch timetable data for a student ID
 */
export async function fetchTimetable(
  studentId: string
): Promise<TimetableData> {
  if (!validateStudentId(studentId)) {
    throw new Error("Invalid student ID. Must be a 10-digit number.")
  }

  const response = await fetch(`${API_BASE_URL}/${studentId}.json`)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Timetable not found for this student ID.")
    }
    throw new Error(`Failed to fetch timetable: ${response.status}`)
  }

  return response.json()
}

/**
 * Parse time string like "08:00 AM - 10:00 AM" to Date objects
 */
export function parseTimeSlot(timeStr: string, baseDate: Date): ParsedTimeSlot {
  // Match patterns like "08:00 AM - 10:00 AM" or "14:00 - 16:00" or "15:00 PM - 17:00 PM"
  const match = timeStr.match(
    /(\d{1,2}):(\d{2})\s*(AM|PM)?\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i
  )

  if (!match) {
    throw new Error(`Invalid time format: ${timeStr}`)
  }

  const [, startHour, startMin, startAmPm, endHour, endMin, endAmPm] = match

  // Helper to convert hour to 24-hour format
  // Handle cases where hour is already in 24-hour format (13-23)
  // or incorrectly formatted like "15:00 PM"
  const parseTime = (hour: string, amPm: string | undefined) => {
    const h = parseInt(hour, 10)
    const amPmStr = amPm?.toUpperCase() || ""

    if (amPmStr === "AM") {
      return h === 12 ? 0 : h
    } else if (amPmStr === "PM") {
      // If hour is already >= 13, it's already in 24-hour format
      // Don't add 12 again (e.g., "15:00 PM" should stay 15, not become 27)
      if (h >= 13) return h
      return h === 12 ? 12 : h + 12
    }
    // No AM/PM specified - assume it's already in 24-hour format
    return h
  }

  const start = new Date(baseDate)
  start.setHours(parseTime(startHour, startAmPm), parseInt(startMin, 10), 0, 0)

  const end = new Date(baseDate)
  end.setHours(parseTime(endHour, endAmPm), parseInt(endMin, 10), 0, 0)

  return {
    start,
    end,
    raw: timeStr,
  }
}

/**
 * Get available dates from timetable data
 */
export function getAvailableDates(data: TimetableData): string[] {
  return Object.keys(data).sort()
}

/**
 * Group events by day of week
 */
export function getEventsByDay(
  data: TimetableData,
  dateStr: string
): CourseSession[] {
  const dayData = data[dateStr]
  if (!dayData) return []
  return dayData.jadual || []
}

/**
 * Get the week dates that contain data
 */
export function getWeeksWithData(data: TimetableData): string[][] {
  const dates = getAvailableDates(data).filter((d) => data[d] !== null)

  // Group by week (Monday to Sunday)
  const weeks: Map<string, string[]> = new Map()

  dates.forEach((date) => {
    const d = new Date(date)
    // Get Monday of the week
    const day = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))

    const weekKey = monday.toISOString().split("T")[0]

    if (!weeks.has(weekKey)) {
      weeks.set(weekKey, [])
    }
    weeks.get(weekKey)!.push(date)
  })

  return Array.from(weeks.values())
}
