import { type NextRequest, NextResponse } from "next/server"
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly"

// Initialize Polly client
const pollyClient = new PollyClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    // Use Amazon Polly to synthesize speech
    const command = new SynthesizeSpeechCommand({
      Text: text.slice(0, 3000), // Polly has a 3000 character limit
      OutputFormat: "mp3",
      VoiceId: "Lucia", // Spanish (Spain) female voice
      Engine: "neural", // Use neural engine for better quality
      LanguageCode: "es-ES",
    })

    const response = await pollyClient.send(command)

    if (!response.AudioStream) {
      throw new Error("No audio stream received from Polly")
    }

    // Convert the audio stream to a buffer
    const audioBuffer = await streamToBuffer(response.AudioStream)

    // Return the audio as an MP3 file
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("Polly error:", error)
    return NextResponse.json({ error: "Failed to generate speech" }, { status: 500 })
  }
}

// Helper function to convert stream to buffer
async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Uint8Array[] = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}
