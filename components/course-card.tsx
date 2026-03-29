import { CourseSession } from "@/types/timetable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CourseCardProps {
  course: CourseSession
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold">{course.courseid}</CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <p className="mb-1 text-xs font-medium">{course.course_desc}</p>
        <p className="mb-1 text-xs text-muted-foreground">{course.masa}</p>
        <div className="space-y-1 text-xs text-muted-foreground">
          {course.bilik && (
            <p className="flex items-center gap-1">
              <span className="font-medium">Room:</span> {course.bilik}
            </p>
          )}
          {course.lecturer && (
            <p className="flex items-center gap-1">
              <span className="font-medium">Lec:</span> {course.lecturer}
            </p>
          )}
          {course.groups && (
            <p className="flex items-center gap-1">
              <span className="font-medium">Group:</span> {course.groups}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
