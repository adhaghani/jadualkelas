import { CustomColorSettings } from "@/types/timetable"

export type CoursePalette = {
  id: string
  bg: string
  border: string
  text: string
  hover?: string
}

export const COURSE_COLORS: CoursePalette[] = [
  {
    id: "blue",
    bg: "bg-blue-50 dark:bg-blue-100",
    border: "border-blue-200 dark:border-blue-300",
    text: "text-blue-700 dark:text-blue-800",
    hover: "hover:bg-blue-100 dark:hover:bg-blue-200",
  },
  {
    id: "emerald",
    bg: "bg-emerald-50 dark:bg-emerald-100",
    border: "border-emerald-200 dark:border-emerald-300",
    text: "text-emerald-700 dark:text-emerald-800",
    hover: "hover:bg-emerald-100 dark:hover:bg-emerald-200",
  },
  {
    id: "violet",
    bg: "bg-violet-50 dark:bg-violet-100",
    border: "border-violet-200 dark:border-violet-300",
    text: "text-violet-700 dark:text-violet-800",
    hover: "hover:bg-violet-100 dark:hover:bg-violet-200",
  },
  {
    id: "amber",
    bg: "bg-amber-50 dark:bg-amber-100",
    border: "border-amber-200 dark:border-amber-300",
    text: "text-amber-700 dark:text-amber-800",
    hover: "hover:bg-amber-100 dark:hover:bg-amber-200",
  },
  {
    id: "cyan",
    bg: "bg-cyan-50 dark:bg-cyan-100",
    border: "border-cyan-200 dark:border-cyan-300",
    text: "text-cyan-700 dark:text-cyan-800",
    hover: "hover:bg-cyan-100 dark:hover:bg-cyan-200",
  },
  {
    id: "indigo",
    bg: "bg-indigo-50 dark:bg-indigo-100",
    border: "border-indigo-200 dark:border-indigo-300",
    text: "text-indigo-700 dark:text-indigo-800",
    hover: "hover:bg-indigo-100 dark:hover:bg-indigo-200",
  },
  {
    id: "orange",
    bg: "bg-orange-50 dark:bg-orange-100",
    border: "border-orange-200 dark:border-orange-300",
    text: "text-orange-700 dark:text-orange-800",
    hover: "hover:bg-orange-100 dark:hover:bg-orange-200",
  },
  {
    id: "pink",
    bg: "bg-pink-50 dark:bg-pink-100",
    border: "border-pink-200 dark:border-pink-300",
    text: "text-pink-700 dark:text-pink-800",
    hover: "hover:bg-pink-100 dark:hover:bg-pink-200",
  },
  {
    id: "teal",
    bg: "bg-teal-50 dark:bg-teal-100",
    border: "border-teal-200 dark:border-teal-300",
    text: "text-teal-700 dark:text-teal-800",
    hover: "hover:bg-teal-100 dark:hover:bg-teal-200",
  },
]

export function findColorByBg(bg: string) {
  return COURSE_COLORS.find((c) => c.bg === bg)
}

export function findColorById(id: string) {
  return COURSE_COLORS.find((c) => c.id === id)
}

export function getCourseColor(
  courseId: string,
  customColors?: Record<string, CustomColorSettings>
): CustomColorSettings | CoursePalette {
  if (customColors && customColors[courseId]) return customColors[courseId]

  let hash = 0
  for (let i = 0; i < courseId.length; i++) {
    hash = courseId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COURSE_COLORS[Math.abs(hash) % COURSE_COLORS.length]
}

export default COURSE_COLORS
