# Accesibilidad con IA en AWS

Módulos reutilizables para hacer un sitio web más accesible con servicios de AWS: **voz a texto, texto a voz y un asistente conversacional**, más herramientas para auditar la accesibilidad con axe-core.

Nacieron en el **Botathon 2025** (Duoc UC), donde construimos un prototipo web de donaciones con enfoque inclusivo. Este repositorio conserva solo la parte técnica reutilizable: no incluye el sitio del prototipo.

## Qué contiene

| Módulo | Archivo | Servicio de AWS |
|---|---|---|
| Texto a voz ("Escuchar esta página" y respuestas en audio) | `app/api/text-to-speech/route.ts` | Amazon Polly (voz neural en español) |
| Voz a texto (preguntas habladas al asistente) | `app/api/speech-to-text/route.ts` | Amazon Transcribe y S3 |
| Asistente conversacional | `app/api/chat/route.ts` | Agentes de Amazon Bedrock |
| Análisis de entidades médicas, opcional | `lib/comprehend.ts`, `lib/translate.ts` | Amazon Comprehend Medical y Translate |
| Historial de conversación, opcional | `lib/dynamodb.ts` | Amazon DynamoDB |
| Modo de accesibilidad global (contexto y botón) | `lib/accessibility-context.tsx`, `components/accessibility-toolbar.tsx` | n/a |
| Interfaz del asistente con micrófono y audio | `components/ai-chatbot.tsx` | n/a |
| Auditoría de accesibilidad en desarrollo | `lib/accessibility-checker.ts`, `components/accessibility-auditor.tsx`, `scripts/accessibility-audit.js` | axe-core y Puppeteer |
| Verificación de permisos de Bedrock | `scripts/test-bedrock-access.js` | Bedrock |

## Cómo funciona

```
Navegador ──► Route Handlers de Next.js ──► Polly            (texto → audio)
   │                                    ├─► S3 + Transcribe  (audio → texto)
   │                                    └─► Agente de Bedrock ──► (opcional) Translate + Comprehend Medical ──► DynamoDB
   └─ Contexto de accesibilidad: activa audio automático, lectura de página y navegación por teclado
```

Las llamadas a AWS ocurren solo en el servidor, de modo que las credenciales nunca llegan al navegador.

## Cómo integrarlo

Los archivos usan la estructura de una app **Next.js (App Router) con TypeScript**; cópialos a las mismas rutas de tu proyecto.

1. Instala las dependencias de AWS y de accesibilidad:

   ```bash
   pnpm add @aws-sdk/client-polly @aws-sdk/client-transcribe @aws-sdk/client-s3 \
     @aws-sdk/client-bedrock-agent-runtime @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb \
     @aws-sdk/client-translate @aws-sdk/client-comprehendmedical lucide-react
   pnpm add -D axe-core puppeteer
   ```

2. Copia `.env.example` a `.env.local` y complétalo.
3. Envuelve tu aplicación con el contexto de accesibilidad y agrega la barra y el asistente:

   ```tsx
   import { AccessibilityProvider } from "@/lib/accessibility-context"
   import AccessibilityToolbar from "@/components/accessibility-toolbar"
   import AIChatbot from "@/components/ai-chatbot"
   ```

4. Verifica el acceso a Bedrock con `node scripts/test-bedrock-access.js`.

El asistente y la capa de entidades médicas son opcionales: Polly y Transcribe funcionan de forma independiente.

## Permisos IAM mínimos

```
polly:SynthesizeSpeech
transcribe:StartTranscriptionJob, transcribe:GetTranscriptionJob
s3:PutObject, s3:GetObject          (solo sobre el bucket de audios)
bedrock:InvokeAgent
dynamodb:PutItem                    (si usas el historial)
translate:TranslateText, comprehendmedical:DetectEntitiesV2   (si usas el análisis médico)
```

## Seguridad

- **Sin secretos en el repositorio.** Todo se lee de variables de entorno y `.env.local` está ignorado por Git.
- En producción conviene usar un **rol de IAM** (por ejemplo, en Vercel, Amplify o Lambda) en lugar de claves de acceso de larga duración. Las rutas toman las credenciales del entorno, por lo que migrar a un rol es un cambio de configuración.
- Si usas el historial o el análisis médico, trata los mensajes como datos personales y de salud: agrega autenticación en las rutas, cifrado y una política de retención.
- Las rutas no incluyen limitación de tasa. Antes de exponerlas públicamente conviene agregar límites para controlar el costo de Polly, Transcribe y Bedrock.

## Alcance

Son módulos de un prototipo de hackatón: priorizan que la experiencia accesible funcione de punta a punta. No traen pruebas automatizadas ni un proyecto de demostración listo para ejecutar.

## Autor

Marcelo Caballero Olave · [LinkedIn](https://www.linkedin.com/in/marcelo-caballero-olave) · [Portafolio](https://marcelocaballero.me/)

Licencia MIT.
