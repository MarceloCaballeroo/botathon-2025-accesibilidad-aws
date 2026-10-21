import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";

const client = new TranslateClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function translateToEnglish(text: string): Promise<string> {
  try {
    const command = new TranslateTextCommand({
      Text: text,
      SourceLanguageCode: "auto",
      TargetLanguageCode: "en",
    });
    const response = await client.send(command);
    return response.TranslatedText || text;
  } catch (error) {
    console.error("Translation Error:", error);
    return text; // Fallback to original text
  }
}
