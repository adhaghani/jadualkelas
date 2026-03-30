export interface CourseClass {
  /** Stable per-class id for identifying a single class instance */
  id?: string
  masa: string // Time slot like "08:00 AM - 10:00 AM"
  bilik: string | null // Room, null if online
  onlineLink?: string | null // Online meeting link, null if in-person
  lecturer: string | null
  date?: string // Optional date for this class instance (YYYY-MM-DD)
}

export interface Course {
  /** Stable per-instance id. If not provided will be generated as `${courseid}::${groups}` */
  id?: string
  course_desc: string
  courseid: string
  groups: string
  /** Optional legacy colour id or custom color key */
  colourid?: string
  /** Optional resolved colour hex for easier rendering */
  colourHex?: string
  /** Whether this course is primarily online */
  isOnline?: boolean
  /** Source of the record: 'cdn' | 'edit' | 'import' */
  source?: "cdn" | "edit" | "import"
  Classes: CourseClass[]
}
