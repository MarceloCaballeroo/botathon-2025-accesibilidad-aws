import { type NextRequest, NextResponse } from "next/server"
import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } from "@aws-sdk/client-transcribe"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

const transcribeClient = new TranscribeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
})

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get("audio") as Blob

    if (!audioFile) {
      return NextResponse.json({ error: "Audio file is required" }, { status: 400 })
    }

    // Convert blob to buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to S3 first (Transcribe requires S3 URI)
    const bucketName = process.env.AWS_S3_BUCKET_NAME
    const fileName = `transcribe-${Date.now()}.webm`

    if (!bucketName) {
      throw new Error("AWS_S3_BUCKET_NAME not configured")
    }

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: "audio/webm",
      }),
    )

    const s3Uri = `s3://${bucketName}/${fileName}`
    const jobName = `transcribe-job-${Date.now()}`

    // Start transcription job
    await transcribeClient.send(
      new StartTranscriptionJobCommand({
        TranscriptionJobName: jobName,
        LanguageCode: "es-ES", // Spanish
        MediaFormat: "webm",
        Media: {
          MediaFileUri: s3Uri,
        },
      }),
    )

    // Poll for completion (simplified - in production, use webhooks or async processing)
    let jobComplete = false
    let attempts = 0
    let transcriptText = ""

    while (!jobComplete && attempts < 30) {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const jobStatus = await transcribeClient.send(
        new GetTranscriptionJobCommand({
          TranscriptionJobName: jobName,
        }),
      )

      if (jobStatus.TranscriptionJob?.TranscriptionJobStatus === "COMPLETED") {
        jobComplete = true
        const transcriptUri = jobStatus.TranscriptionJob.Transcript?.TranscriptFileUri

        if (transcriptUri) {
          // Fetch the transcript
          const transcriptResponse = await fetch(transcriptUri)
          const transcriptData = await transcriptResponse.json()
          transcriptText = transcriptData.results?.transcripts?.[0]?.transcript || ""
        }
      } else if (jobStatus.TranscriptionJob?.TranscriptionJobStatus === "FAILED") {
        throw new Error("Transcription job failed")
      }

      attempts++
    }

    return NextResponse.json({ text: transcriptText })
  } catch (error) {
    console.error("Transcribe error:", error)
    return NextResponse.json({ error: "Failed to transcribe audio" }, { status: 500 })
  }
}
