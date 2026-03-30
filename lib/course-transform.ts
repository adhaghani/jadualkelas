/* eslint-disable import/no-anonymous-default-export */
/**
 * Utilities to transform raw TimetableData into normalized Course[] objects.
 */
import { TimetableData, CourseSession } from "@/types/timetable"
import { Course, CourseClass } from "@/types/course"

export function generateCourseKey(courseid: string, groups: string): string {
  return `${courseid}::${groups}`
}

/**
 * Map the raw TimetableData (date -> DaySchedule) into an array of Course objects.
 * Groups sessions by `courseid::groups` and accumulates class instances in `Classes`.
 */
export function mapRawTimetableToCourses(data: TimetableData): Course[] {
  const map = new Map<string, Course>()

  Object.keys(data).forEach((dateKey) => {
    const day = data[dateKey]
    if (!day || !day.jadual) return

    day.jadual.forEach((session: CourseSession) => {
      const key = generateCourseKey(session.courseid, session.groups)
      let course = map.get(key)
      if (!course) {
        course = {
          id: key,
          course_desc: session.course_desc,
          courseid: session.courseid,
          groups: session.groups,
          Classes: [],
        } as Course
        map.set(key, course)
      }

      const classId = `${key}::${dateKey}::${encodeURIComponent(session.masa)}`

      const classInstance: CourseClass = {
        id: classId,
        masa: session.masa,
        bilik: session.bilik ?? null,
        onlineLink: null,
        lecturer: session.lecturer ?? null,
        date: dateKey,
      }

      course.Classes.push(classInstance)
    })
  })

  return Array.from(map.values())
}

/**
 * Map a single raw CourseSession into a Course (with a single class entry).
 */
export function mapRawCourseSessionToCourse(
  session: CourseSession,
  date?: string
): Course {
  const key = generateCourseKey(session.courseid, session.groups)
  const course: Course = {
    id: key,
    course_desc: session.course_desc,
    courseid: session.courseid,
    groups: session.groups,
    Classes: [
      {
        id: `${key}::${date ?? "nodate"}::${encodeURIComponent(session.masa)}`,
        masa: session.masa,
        bilik: session.bilik ?? null,
        onlineLink: null,
        lecturer: session.lecturer ?? null,
        date,
      },
    ],
  }

  return course
}

export default {
  generateCourseKey,
  mapRawTimetableToCourses,
  mapRawCourseSessionToCourse,
}
