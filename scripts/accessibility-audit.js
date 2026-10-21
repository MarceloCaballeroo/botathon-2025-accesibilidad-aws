#!/usr/bin/env node
/**
 * Script de Auditoría de Accesibilidad
 * Ejecuta pruebas de accesibilidad en la aplicación
 * 
 * Uso: npm run accessibility:audit
 */

const puppeteer = require('puppeteer');
const axe = require('axe-core');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const REPORT_DIR = path.join(__dirname, '../accessibility-reports');

// Asegurar que el directorio de reportes existe
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

async function auditPage(page, pageUrl) {
  console.log(`\n🔍 Auditando: ${pageUrl}`);
  
  try {
    await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Inyectar axe-core
    await page.addScriptTag({ path: require.resolve('axe-core') });
    
    // Ejecutar auditoría
    const results = await page.evaluate(() => {
      return new Promise((resolve) => {
        axe.run((error, results) => {
          if (error) throw error;
          resolve(results);
        });
      });
    });

    return results;
  } catch (error) {
    console.error(`❌ Error auditando ${pageUrl}:`, error.message);
    return null;
  }
}

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Páginas a auditar
  const pagesToAudit = [
    '/',
    '/dashboard',
  ];

  const allResults = [];

  for (const pagePath of pagesToAudit) {
    const pageUrl = `${BASE_URL}${pagePath}`;
    const results = await auditPage(page, pageUrl);

    if (results) {
      allResults.push({
        url: pageUrl,
        violations: results.violations.length,
        passes: results.passes.length,
        details: results,
      });

      console.log(`✅ ${results.violations.length} violaciones encontradas`);
      console.log(`✅ ${results.passes.length} pruebas pasadas`);

      if (results.violations.length > 0) {
        console.log('\n📋 Violaciones:');
        results.violations.forEach((violation) => {
          console.log(`  - [${violation.impact}] ${violation.id}: ${violation.description}`);
          console.log(`    ${violation.nodes.length} elemento(s) afectado(s)`);
        });
      }
    }
  }

  // Generar reporte HTML
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const reportPath = path.join(REPORT_DIR, `accessibility-${timestamp}.json`);
  
  fs.writeFileSync(reportPath, JSON.stringify(allResults, null, 2));
  console.log(`\n📊 Reporte guardado en: ${reportPath}`);

  // Resumen
  const totalViolations = allResults.reduce((sum, r) => sum + r.violations, 0);
  const totalPasses = allResults.reduce((sum, r) => sum + r.passes, 0);

  console.log('\n📈 RESUMEN:');
  console.log(`  Total de violaciones: ${totalViolations}`);
  console.log(`  Total de pruebas pasadas: ${totalPasses}`);

  await browser.close();
  
  // Salir con código de error si hay violaciones críticas
  const hasCriticalViolations = allResults.some((r) =>
    r.details.violations.some((v) => v.impact === 'critical')
  );

  if (hasCriticalViolations) {
    console.log('\n⚠️ ¡Se encontraron violaciones críticas!');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Error fatal:', error);
  process.exit(1);
});
