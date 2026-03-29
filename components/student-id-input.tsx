"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { validateStudentId } from "@/lib/api"

interface StudentIdInputProps {
  onSubmit: (studentId: string) => void
  isLoading?: boolean
}

export function StudentIdInput({ onSubmit, isLoading }: StudentIdInputProps) {
  const [studentId, setStudentId] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!studentId.trim()) {
      setError("Please enter your Student ID")
      return
    }

    if (!validateStudentId(studentId.trim())) {
      setError("Student ID must be a 10-digit number")
      return
    }

    onSubmit(studentId.trim())
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-md flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="student-id" className="text-sm font-medium">
          UITM Student ID
        </label>
        <Input
          id="student-id"
          type="text"
          inputMode="numeric"
          placeholder="2025160493"
          value={studentId}
          onChange={(e) => {
            setStudentId(e.target.value.replace(/\D/g, "").slice(0, 10))
            setError("")
          }}
          disabled={isLoading}
          className={error ? "border-red-500" : ""}
        />
        <p className="text-xs text-muted-foreground">
          Enter your 10-digit UITM Student ID
        </p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={isLoading || !studentId.trim()}>
        {isLoading ? "Loading..." : "View Timetable"}
      </Button>
    </form>
  )
}
