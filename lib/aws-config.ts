// AWS Configuration helper
// Validates that all required environment variables are present

export function validateAWSConfig() {
  const required = ["AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_S3_BUCKET_NAME"]

  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    console.warn(
      `Missing AWS environment variables: ${missing.join(", ")}\n` +
        "Some features may not work. See .env.example for setup instructions.",
    )
    return false
  }

  return true
}

export const awsConfig = {
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
}

export const s3BucketName = process.env.AWS_S3_BUCKET_NAME || ""
