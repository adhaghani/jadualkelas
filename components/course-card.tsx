import { CourseSession } from "@/types/timetable"
import { Course, CourseClass } from "@/types/course"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CourseCardProps {
  course: Course | CourseSession
}

function pickClassInfo(course: Course | CourseSession): {
  masa?: string
  bilik?: string | null
  lecturer?: string | null
} {
  if ((course as Course).Classes) {
    const c = course as Course
    const cls: CourseClass | undefined = c.Classes[0]
    return {
      masa: cls?.masa,
      bilik: cls?.bilik ?? null,
      lecturer: cls?.lecturer ?? null,
    }
  }
  const cs = course as CourseSession
  return {
    masa: cs.masa,
    bilik: cs.bilik ?? null,
    lecturer: cs.lecturer ?? null,
  }
}

export function CourseCard({ course }: CourseCardProps) {
  const { masa, bilik, lecturer } = pickClassInfo(course)
  const courseid =
    (course as Course).courseid || (course as CourseSession).courseid
  const course_desc =
    (course as Course).course_desc || (course as CourseSession).course_desc
  const groups = (course as Course).groups || (course as CourseSession).groups

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold">{courseid}</CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="mb-1 text-xs font-medium">{course_desc}</p>
        {masa && <p className="mb-1 text-xs text-muted-foreground">{masa}</p>}
        <div className="space-y-1 text-xs text-muted-foreground">
          {bilik && (
            <p className="flex items-center gap-1">
              <span className="font-medium">Room:</span> {bilik}
            </p>
          )}
          {lecturer && (
            <p className="flex items-center gap-1">
              <span className="font-medium">Lec:</span> {lecturer}
            </p>
          )}
          {groups && (
            <p className="flex items-center gap-1">
              <span className="font-medium">Group:</span> {groups}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
