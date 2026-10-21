import { type NextRequest, NextResponse } from "next/server"
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime"
import { dynamoDbClient } from "@/lib/dynamodb"
import { PutCommand } from "@aws-sdk/lib-dynamodb"
import { analyzeMedicalText } from "@/lib/comprehend"
import { translateToEnglish } from "@/lib/translate"

const bedrockAgentClient = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

// Agent configuration
const AGENT_ID = process.env.BEDROCK_AGENT_ID || ""
const AGENT_ALIAS_ID = process.env.BEDROCK_AGENT_ALIAS_ID || ""

export async function POST(req: NextRequest) {
  try {
    const { messages, sessionId: requestedSessionId, userId, userName } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 })
    }

    // Get the latest user message
    const userMessage = messages[messages.length - 1]?.content || ""

    if (!userMessage) {
      return NextResponse.json({ error: "User message is required" }, { status: 400 })
    }

    const sessionId = requestedSessionId || `session-${Date.now()}`

    // Use Amazon Bedrock Agent
    const command = new InvokeAgentCommand({
      agentId: AGENT_ID,
      agentAliasId: AGENT_ALIAS_ID,
      sessionId: sessionId,
      inputText: userMessage,
    })

    console.log("Invoking agent with:", {
      agentId: AGENT_ID,
      agentAliasId: AGENT_ALIAS_ID,
      inputText: userMessage.substring(0, 50),
      userId: userId || "anonymous"
    })

    const response = await bedrockAgentClient.send(command)

    let fullResponse = ""

    // The response from InvokeAgentCommand is an async iterable of events
    try {
      if (response.completion) {
        for await (const event of response.completion) {
          if (event.chunk && event.chunk.bytes) {
            const chunk = new TextDecoder().decode(event.chunk.bytes)
            fullResponse += chunk
          }
        }
      } else {
        // Fallback for different SDK versions or response structures
        console.log("Response structure:", Object.keys(response))
        // Try to iterate directly if completion is not available but response is iterable
        const responseAny = response as any
        if (responseAny[Symbol.asyncIterator]) {
           for await (const event of responseAny) {
             console.log("Event:", Object.keys(event || {}))
             if (event.chunk && event.chunk.bytes) {
                const chunk = new TextDecoder().decode(event.chunk.bytes)
                fullResponse += chunk
             }
           }
        }
      }
    } catch (iterError) {
      console.error("Error iterating response:", iterError)
    }

    if (!fullResponse) {
      fullResponse = "Lo siento, el agente no pudo generar una respuesta. Por favor intenta de nuevo."
    }

    // --- NEW: Parse JSON from Agent Response ---
    let assistantMessage = fullResponse
    let agentMetadata: any = null

    // Try to find JSON block at the start
    const jsonMatch = fullResponse.match(/^\{[\s\S]*?\}/)
    if (jsonMatch) {
      try {
        agentMetadata = JSON.parse(jsonMatch[0])
        // Remove the JSON from the message shown to user
        assistantMessage = fullResponse.replace(jsonMatch[0], "").trim()
      } catch (e) {
        console.warn("Failed to parse Agent JSON:", e)
      }
    }

    // --- CONDITIONAL MEDICAL ANALYSIS ---
    let medicalEntities = null
    
    // Check if we should analyze:
    // 1. Agent explicitly categorized it as MEDICAL (using 'type' property from user instructions)
    // 2. OR Agent didn't return metadata (fallback) but user message contains medical keywords
    const isExplicitlyMedical = agentMetadata && (
      agentMetadata.type === 'CONSULTA_MEDICA' || 
      agentMetadata.category === 'MEDICAL_CONDITION' || // Legacy support
      agentMetadata.category === 'MEDICATION'
    )
    
    const medicalKeywords = ["dolor", "duele", "siento", "fiebre", "tos", "gripe", "pastilla", "medicamento", "inflamacion", "hinchado", "sangre", "vomito", "mareo"]
    const hasMedicalKeywords = !agentMetadata && medicalKeywords.some(keyword => userMessage.toLowerCase().includes(keyword))

    if (isExplicitlyMedical || hasMedicalKeywords) {
      console.log("Medical context detected (Explicit: " + !!isExplicitlyMedical + ", Keywords: " + hasMedicalKeywords + "). Translating and analyzing...")
      const translatedText = await translateToEnglish(userMessage)
      medicalEntities = await analyzeMedicalText(translatedText)
    }

    // Save user message to DynamoDB (now with entities if detected)
    saveToDynamoDB(sessionId, "user", userMessage, medicalEntities, null, userId, userName).catch(err => console.error("Error saving user msg:", err))

    // Save assistant message to DynamoDB with metadata
    saveToDynamoDB(sessionId, "assistant", assistantMessage, null, agentMetadata, userId, userName).catch(err => console.error("Error saving assistant msg:", err))

    return NextResponse.json({ message: assistantMessage, sessionId })
  } catch (error) {

    console.error("Bedrock Agent error:", error)
    console.error("Error details:", {
      name: (error as any)?.name,
      message: (error as any)?.message,
      code: (error as any)?.$metadata?.httpStatusCode,
      requestId: (error as any)?.$metadata?.requestId,
    })
    return NextResponse.json({ error: "Failed to get chat response from agent" }, { status: 500 })
  }
}

async function saveToDynamoDB(sessionId: string, role: "user" | "assistant", content: string, entities: any = null, metadata: any = null, userId?: string, userName?: string) {
  try {
    const item: any = {
      sessionId: sessionId,
      timestamp: Date.now(),
      role: role,
      content: content
    }

    if (entities) {
      item.medicalEntities = entities
    }

    if (metadata) {
      item.agentMetadata = metadata
    }

    if (userId) {
      item.userId = userId
    }

    if (userName) {
      item.userName = userName
    }

    await dynamoDbClient.send(new PutCommand({
      TableName: "ChatHistory",
      Item: item
    }))
  } catch (error) {
    console.error("DynamoDB Write Error:", error)
  }
}

