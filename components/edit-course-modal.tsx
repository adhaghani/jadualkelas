/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useState, useEffect } from "react"
import { CourseSession, CustomColorSettings } from "@/types/timetable"
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

// Predefined color palettes
const COURSE_COLORS = [
  {
    id: "blue",
    bg: "bg-blue-100",
    border: "border-blue-300",
    text: "text-blue-800",
  },
  {
    id: "green",
    bg: "bg-green-100",
    border: "border-green-300",
    text: "text-green-800",
  },
  {
    id: "purple",
    bg: "bg-purple-100",
    border: "border-purple-300",
    text: "text-purple-800",
  },
  {
    id: "orange",
    bg: "bg-orange-100",
    border: "border-orange-300",
    text: "text-orange-800",
  },
  {
    id: "pink",
    bg: "bg-pink-100",
    border: "border-pink-300",
    text: "text-pink-800",
  },
  {
    id: "teal",
    bg: "bg-teal-100",
    border: "border-teal-300",
    text: "text-teal-800",
  },
  {
    id: "indigo",
    bg: "bg-indigo-100",
    border: "border-indigo-300",
    text: "text-indigo-800",
  },
  {
    id: "amber",
    bg: "bg-amber-100",
    border: "border-amber-300",
    text: "text-amber-800",
  },
  {
    id: "cyan",
    bg: "bg-cyan-100",
    border: "border-cyan-300",
    text: "text-cyan-800",
  },
  {
    id: "rose",
    bg: "bg-rose-100",
    border: "border-rose-300",
    text: "text-rose-800",
  },
]

interface EditCourseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  course: CourseSession | null
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
      setCourseDesc(course.course_desc)
      setLecturer(course.lecturer || "")
      setBilik(course.bilik || "")
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

    const updatedCourse: CourseSession = {
      ...course,
      course_desc: courseDesc,
      lecturer: lecturer || null,
      bilik: bilik || null,
    }

    onSave(updatedCourse, colors)
    onOpenChange(false)
  }

  if (!course) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
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
