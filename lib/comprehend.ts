import { ComprehendMedicalClient, DetectEntitiesV2Command } from "@aws-sdk/client-comprehendmedical"

const client = new ComprehendMedicalClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

export async function analyzeMedicalText(text: string) {
  try {
    if (!text || text.length < 3) return null

    const command = new DetectEntitiesV2Command({
      Text: text,
    })

    const response = await client.send(command)
    return response.Entities
  } catch (error) {
    console.error("Comprehend Medical Error:", error)
    return null
  }
}
