"use client"

import { useState } from "react"
import { Ear, Volume2, VolumeX, Heart, ChevronLeft, ChevronRight } from "lucide-react"
import { useAccessibility } from "@/lib/accessibility-context"

export default function AccessibilityToolbar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [heartCount, setHeartCount] = useState(0)
  const [showComboEffect, setShowComboEffect] = useState(false)
  const { isAccessibilityMode, toggleAccessibilityMode, isSpeaking, setIsSpeaking } = useAccessibility()
  const [isLoading, setIsLoading] = useState(false)

  const handleHeartClick = () => {
    const newCount = heartCount + 1
    setHeartCount(newCount)
    setShowComboEffect(true)

    const button = document.querySelector(".heart-button")
    if (button) {
      const rect = button.getBoundingClientRect()
      const heartsContainer = document.getElementById("hearts-container")

      if (heartsContainer) {
        for (let i = 0; i < 8; i++) {
          const heart = document.createElement("div")
          heart.className = "heart-particle"
          heart.innerHTML = "❤️"

          heart.style.left = `${rect.left + rect.width / 2}px`
          heart.style.top = `${rect.top + rect.height / 2}px`

          const angle = (i / 8) * Math.PI * 2
          const distance = 100 + Math.random() * 50
          const tx = Math.cos(angle) * distance
          const ty = Math.sin(angle) * distance - 100

          heart.style.setProperty("--tx", `${tx}px`)
          heart.style.setProperty("--ty", `${ty}px`)
          heart.style.setProperty("--delay", `${i * 0.03}s`)

          heartsContainer.appendChild(heart)
          setTimeout(() => heart.remove(), 1200)
        }
      }
    }

    setTimeout(() => setShowComboEffect(false), 600)
  }

  const handleReadPage = async () => {
    if (isSpeaking) {
      setIsSpeaking(false)
      const audioElements = document.querySelectorAll("audio[data-page-reader]")
      audioElements.forEach((audio: any) => {
        audio.pause()
        audio.currentTime = 0
      })
      return
    }

    setIsLoading(true)
    setIsSpeaking(true)

    try {
      const mainElement = document.querySelector("main")
      if (!mainElement) return

      const textContent = Array.from(mainElement.querySelectorAll("h1, h2, h3, p, span, li"))
        .map((el) => el.textContent)
        .filter((text) => text && text.trim().length > 0)
        .join(". ")
        .slice(0, 3000)

      // Call Polly API to synthesize speech
      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textContent }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate speech")
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      audio.setAttribute("data-page-reader", "true")

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
      console.error("Error reading page:", error)
      setIsSpeaking(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 transition-all duration-300 ${
          isExpanded ? "translate-x-0" : "translate-x-[calc(100%-3.5rem)]"
        }`}
        role="region"
        aria-label="Herramientas de accesibilidad"
      >
        <div className="bg-white shadow-2xl rounded-l-2xl border-2 border-r-0 border-gray-200 flex">
          {/* Toggle Button - 48x48px */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-14 h-14 flex items-center justify-center bg-gradient-to-b from-red-600 to-red-700 text-white rounded-l-2xl hover:from-red-700 hover:to-red-800 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-600"
            aria-label={isExpanded ? "Ocultar herramientas de accesibilidad" : "Mostrar herramientas de accesibilidad"}
            aria-expanded={isExpanded}
          >
            {isExpanded ? <ChevronRight className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
          </button>

          {/* Toolbar Content */}
          <div className="flex flex-col gap-3 p-3">
            {/* Heart Button - 48x48px */}
            <div className="relative">
              <button
                onClick={handleHeartClick}
                className="heart-button relative bg-red-600 hover:bg-red-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-90 border-2 border-white overflow-visible focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-600"
                aria-label={`Me gusta - ${heartCount} reacciones`}
              >
                {showComboEffect && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75" />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-500 via-white to-red-500 animate-pulse opacity-50" />
                  </>
                )}

                <Heart
                  className={`w-7 h-7 relative z-10 fill-current transition-transform ${
                    showComboEffect ? "scale-125" : "scale-100"
                  }`}
                  aria-hidden="true"
                />

                <div className="absolute -top-1 -right-1 bg-white text-red-600 font-bold text-xs px-2 py-0.5 rounded-full border-2 border-red-600 shadow-md min-w-[24px] text-center z-20">
                  {heartCount}
                </div>

                {showComboEffect && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-red-600 font-black text-xl animate-bounce drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)] whitespace-nowrap z-30">
                    +1 ❤️
                  </div>
                )}
              </button>
              {isExpanded && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg whitespace-nowrap pointer-events-none">
                  Enviar corazón
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-gray-900" />
                </div>
              )}
            </div>

            {/* Accessibility Mode Toggle - 48x48px */}
            <div className="relative">
              <button
                onClick={toggleAccessibilityMode}
                className={`${
                  isAccessibilityMode ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 hover:bg-gray-700"
                } text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-90 border-2 border-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600`}
                aria-label={isAccessibilityMode ? "Desactivar modo de accesibilidad" : "Activar modo de accesibilidad"}
                title={isAccessibilityMode ? "Modo de accesibilidad activado" : "Activar modo de accesibilidad"}
              >
                <Ear className="w-6 h-6" />
              </button>
              {isExpanded && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg whitespace-nowrap pointer-events-none">
                  {isAccessibilityMode ? "Modo accesible activo" : "Activar modo accesible"}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-gray-900" />
                </div>
              )}
            </div>

            {/* Read Page Button - 48x48px */}
            <div className="relative">
              <button
                onClick={handleReadPage}
                disabled={isLoading}
                className={`${
                  isSpeaking ? "bg-orange-600 hover:bg-orange-700" : "bg-green-600 hover:bg-green-700"
                } text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-90 border-2 border-white disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 ${
                  isSpeaking ? "focus-visible:ring-orange-600" : "focus-visible:ring-green-600"
                }`}
                aria-label={isSpeaking ? "Detener lectura de página" : "Escuchar esta página"}
                title={isSpeaking ? "Detener lectura" : "Escuchar esta página"}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isSpeaking ? (
                  <VolumeX className="w-6 h-6" />
                ) : (
                  <Volume2 className="w-6 h-6" />
                )}
              </button>
              {isExpanded && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg whitespace-nowrap pointer-events-none">
                  {isSpeaking ? "Detener lectura" : "Escuchar página"}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-gray-900" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div id="hearts-container" className="fixed inset-0 pointer-events-none z-[45]" aria-hidden="true" />

      <style jsx>{`
        @keyframes heartFloat {
          0% {
            transform: translate(0, 0) scale(1) rotate(0deg);
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            transform: translate(var(--tx), var(--ty)) scale(0.3) rotate(180deg);
            opacity: 0;
          }
        }

        .heart-particle {
          position: fixed;
          font-size: 2rem;
          animation: heartFloat 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          animation-delay: var(--delay);
          pointer-events: none;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
          z-index: 45;
        }
      `}</style>
    </>
  )
}
