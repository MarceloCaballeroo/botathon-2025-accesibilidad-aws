/**
 * Accessibility Checker - Auditoría de accesibilidad con axe-core
 * Este módulo se ejecuta en desarrollo y reporta problemas de accesibilidad
 */

import type { AxeResults, Result } from 'axe-core'

interface AccessibilityViolation {
  id: string
  impact: string | null
  description: string
  nodes: number
  help: string
  helpUrl: string
}

interface AccessibilityResult {
  violations: AccessibilityViolation[]
  passes: number
  timestamp: string
}

/**
 * Ejecutar auditoría de accesibilidad
 * @param element - Elemento DOM a auditar (por defecto document)
 * @returns Resultado de la auditoría
 */
export async function checkAccessibility(element?: HTMLElement): Promise<AccessibilityResult> {
  // Solo ejecutar en desarrollo y en navegador
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') {
    return {
      violations: [],
      passes: 0,
      timestamp: new Date().toISOString(),
    }
  }

  try {
    // Importar axe-core dinámicamente
    const axe = (await import('axe-core')).default

    const results = await new Promise<AxeResults>((resolve, reject) => {
      axe.run(element || document, (error: Error | null, result: AxeResults) => {
        if (error) reject(error)
        else resolve(result)
      })
    })

    const violations: AccessibilityViolation[] = results.violations.map(
      (violation: Result) => ({
        id: violation.id,
        impact: violation.impact || 'unknown',
        description: violation.description,
        nodes: violation.nodes.length,
        help: violation.help,
        helpUrl: violation.helpUrl,
      }),
    )

    // Reportar violaciones por consola
    if (violations.length > 0) {
      console.group('🚨 Problemas de Accesibilidad Detectados')
      violations.forEach((violation) => {
        const color =
          violation.impact === 'critical'
            ? 'color: #ff0000'
            : violation.impact === 'serious'
              ? 'color: #ff6600'
              : 'color: #ffaa00'

        console.log(
          `%c[${String(violation.impact).toUpperCase()}] ${violation.id}`,
          color,
        )
        console.log(`  📝 ${violation.description}`)
        console.log(`  📌 ${violation.nodes} elemento(s) afectado(s)`)
        console.log(`  🔗 ${violation.helpUrl}`)
      })
      console.groupEnd()
    } else {
      console.log('✅ No se encontraron problemas de accesibilidad')
    }

    return {
      violations,
      passes: results.passes.length,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Error al ejecutar auditoría de accesibilidad:', error)
    return {
      violations: [],
      passes: 0,
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Hook para auditoría automática al cargar la página
 */
export function useAccessibilityChecker() {
  // Solo ejecutar en desarrollo y en el cliente
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    // Ejecutar después de que el DOM esté completamente cargado
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => checkAccessibility(), 500)
      })
    } else {
      setTimeout(() => checkAccessibility(), 500)
    }
  }
}

/**
 * Generar reporte de accesibilidad
 */
export async function generateAccessibilityReport(): Promise<string> {
  const result = await checkAccessibility()

  let report = `
# Reporte de Accesibilidad - Botathon 2025
Generado: ${result.timestamp}

## Resumen
- ✅ Pruebas pasadas: ${result.passes}
- 🚨 Violaciones encontradas: ${result.violations.length}

## Violaciones por Nivel de Impacto

`

  const byImpact = {
    critical: result.violations.filter((v) => v.impact === 'critical'),
    serious: result.violations.filter((v) => v.impact === 'serious'),
    moderate: result.violations.filter((v) => v.impact === 'moderate'),
    minor: result.violations.filter((v) => v.impact === 'minor'),
  }

  Object.entries(byImpact).forEach(([impact, violations]) => {
    if (violations.length > 0) {
      report += `\n### ${impact.toUpperCase()} (${violations.length})\n`
      violations.forEach((v) => {
        report += `\n- **${v.id}**\n`
        report += `  - Descripción: ${v.description}\n`
        report += `  - Elementos afectados: ${v.nodes}\n`
        report += `  - Más info: ${v.helpUrl}\n`
      })
    }
  })

  return report
}
