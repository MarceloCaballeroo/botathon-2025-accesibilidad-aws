"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface AccessibilityContextType {
  isAccessibilityMode: boolean
  toggleAccessibilityMode: () => void
  isSpeaking: boolean
  setIsSpeaking: (speaking: boolean) => void
  speakText: (text: string) => Promise<void>
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [isAccessibilityMode, setIsAccessibilityMode] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem("accessibility-mode")
    if (saved === "true") {
      setIsAccessibilityMode(true)
    }
  }, [])

  const toggleAccessibilityMode = () => {
    const newValue = !isAccessibilityMode
    setIsAccessibilityMode(newValue)
    localStorage.setItem("accessibility-mode", String(newValue))
  }

  const speakText = async (text: string) => {
    if (!text || isSpeaking) return

    setIsSpeaking(true)

    try {
      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate speech")
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)

      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }

      audio.onerror = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
      }

      await audio.play()
    } catch (error) {
      console.error("Error speaking text:", error)
      setIsSpeaking(false)
    }
  }

  return (
    <AccessibilityContext.Provider
      value={{
        isAccessibilityMode,
        toggleAccessibilityMode,
        isSpeaking,
        setIsSpeaking,
        speakText,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext)
  if (context === undefined) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider")
  }
  return context
}
