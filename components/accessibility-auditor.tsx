"use client"

import { useEffect } from 'react'

/**
 * Componente de Auditoría de Accesibilidad
 * Se ejecuta automáticamente en desarrollo y reporta problemas de accesibilidad
 */
export function AccessibilityAuditor() {
  useEffect(() => {
    // Solo ejecutar en desarrollo
    if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') {
      return
    }

    // Ejecutar auditoría después de que el DOM esté listo
    const runAudit = async () => {
      try {
        // Importar dinámicamente para no incluir en producción
        const { checkAccessibility } = await import('@/lib/accessibility-checker')
        
        // Esperar a que el DOM esté completamente renderizado
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Ejecutar la auditoría
        await checkAccessibility()
      } catch (error) {
        console.warn('No se pudo ejecutar auditoría de accesibilidad:', error)
      }
    }

    runAudit()
  }, [])

  // Este componente no renderiza nada
  return null
}
