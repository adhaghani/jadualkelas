/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useState, useEffect } from "react"
import { CourseSession, CustomColorSettings } from "@/types/timetable"
import { Course } from "@/types/course"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { COURSE_COLORS } from "@/lib/color"

interface EditCourseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  course: Course | CourseSession | null
  customColors: CustomColorSettings | null
  onSave: (course: CourseSession, colors: CustomColorSettings) => void
}

export function EditCourseModal({
  open,
  onOpenChange,
  course,
  customColors,
  onSave,
}: EditCourseModalProps) {
  const [courseDesc, setCourseDesc] = useState("")
  const [lecturer, setLecturer] = useState("")
  const [bilik, setBilik] = useState("")
  const [selectedColorId, setSelectedColorId] = useState("blue")

  // Initialize form when course changes
  useEffect(() => {
    if (course) {
      // Course may be a normalized Course (with Classes) or a legacy CourseSession.
      if ((course as Course).Classes) {
        const c = course as Course
        setCourseDesc(c.course_desc)
        const cls = c.Classes[0]
        setLecturer(cls?.lecturer || "")
        setBilik(cls?.bilik || "")
      } else {
        const cs = course as CourseSession
        setCourseDesc(cs.course_desc)
        setLecturer(cs.lecturer || "")
        setBilik(cs.bilik || "")
      }
    }
  }, [course])

  // Initialize color selection
  useEffect(() => {
    if (customColors) {
      const found = COURSE_COLORS.find((c) => c.bg === customColors.bg)
      if (found) {
        setSelectedColorId(found.id)
      }
    }
  }, [customColors])

  const handleSave = () => {
    if (!course) return

    const colorPalette = COURSE_COLORS.find((c) => c.id === selectedColorId)
    if (!colorPalette) return

    const colors: CustomColorSettings = {
      bg: colorPalette.bg,
      border: colorPalette.border,
      text: colorPalette.text,
    }

    // Normalize the edited fields into a CourseSession for compatibility.
    // Preserve original values when inputs are left blank to avoid
    // overwriting with empty strings or nulls.
    let updatedCourse: CourseSession
    if ((course as Course).Classes) {
      const c = course as Course
      const cls = c.Classes[0]
      updatedCourse = {
        course_desc: courseDesc || c.course_desc,
        courseid: c.courseid,
        groups: c.groups,
        masa: cls?.masa ?? "",
        bilik: bilik !== "" ? bilik : (cls?.bilik ?? null),
        lecturer: lecturer !== "" ? lecturer : (cls?.lecturer ?? null),
      }
    } else {
      const cs = course as CourseSession
      updatedCourse = {
        ...cs,
        course_desc: courseDesc || cs.course_desc,
        lecturer: lecturer !== "" ? lecturer : cs.lecturer,
        bilik: bilik !== "" ? bilik : cs.bilik,
      }
    }

    onSave(updatedCourse, colors)
    onOpenChange(false)
  }

  if (!course) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
          <DialogDescription>
            Modify course details and color for {course.courseid}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Course Description */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="courseDesc" className="text-right">
              Description
            </Label>
            <Input
              id="courseDesc"
              value={courseDesc}
              onChange={(e) => setCourseDesc(e.target.value)}
              className="col-span-3"
            />
          </div>

          {/* Lecturer */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lecturer" className="text-right">
              Lecturer
            </Label>
            <Input
              id="lecturer"
              value={lecturer}
              onChange={(e) => setLecturer(e.target.value)}
              className="col-span-3"
            />
          </div>

          {/* Room */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bilik" className="text-right">
              Room
            </Label>
            <Input
              id="bilik"
              value={bilik}
              onChange={(e) => setBilik(e.target.value)}
              className="col-span-3"
            />
          </div>

          {/* Color Selection */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Color</Label>
            <div className="col-span-3 flex flex-wrap gap-2">
              {COURSE_COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColorId(color.id)}
                  className={`h-8 w-8 rounded-full border-2 ${color.bg} ${color.border} ${
                    selectedColorId === color.id
                      ? "ring-2 ring-primary ring-offset-2"
                      : ""
                  }`}
                  aria-label={`Select ${color.id} color`}
                />
              ))}
            </div>
          </div>

          {/* Color Preview */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Preview</Label>
            <div className="col-span-3">
              {(() => {
                const color = COURSE_COLORS.find(
                  (c) => c.id === selectedColorId
                )
                if (!color) return null
                return (
                  <div
                    className={`rounded border p-2 text-sm ${color.bg} ${color.border}`}
                  >
                    <div className={`font-semibold ${color.text}`}>
                      {course.courseid}
                    </div>
                    <div className={`${color.text.replace("-800", "-700")}`}>
                      {courseDesc || course.course_desc}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="submit" onClick={handleSave}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
