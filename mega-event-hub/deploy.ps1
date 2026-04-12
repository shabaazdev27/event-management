<#
.SYNOPSIS
Deploys ArenaLink to Google Cloud Run.

.DESCRIPTION
This script builds the Docker image and deploys it to Google Cloud Run.
It assumes you have the Google Cloud SDK installed and authenticated.

.EXAMPLE
.\deploy.ps1 -ProjectID "your-gcp-project-id" -Region "us-central1"
#>

param(
    [string]$ProjectID = "virtualevent-management",

    [string]$Region = "us-central1",
    [string]$ServiceName = "arena-link"
)

Write-Host "Starting deployment to Google Cloud Run for project: $ProjectID" -ForegroundColor Cyan

# 1. Ensure required APIs are enabled
Write-Host "Enabling required GCP APIs..." -ForegroundColor Yellow
gcloud services enable run.googleapis.com artifactregistry.googleapis.com --project $ProjectID

# 2. Build the Docker image using Google Cloud Build (or locally and push)
# Here we use gcloud builds submit for a seamless remote build
Write-Host "Building and submitting Docker image via Cloud Build..." -ForegroundColor Yellow
gcloud builds submit --tag gcr.io/$ProjectID/$ServiceName --project $ProjectID

# 3. Deploy to Cloud Run
Write-Host "Deploying to Cloud Run..." -ForegroundColor Yellow

$EnvVars = ""
if (Test-Path ".env.local") {
    $EnvContent = Get-Content ".env.local"
    foreach ($line in $EnvContent) {
        if ($line -match "^GEMINI_API_KEY=(.*)") {
            $EnvVars += "GEMINI_API_KEY=$($matches[1].Trim())"
        }
    }
}

if ($EnvVars) {
    gcloud run deploy $ServiceName `
        --image gcr.io/$ProjectID/$ServiceName `
        --region $Region `
        --project $ProjectID `
        --platform managed `
        --allow-unauthenticated `
        --port 3000 `
        --set-env-vars="$EnvVars"
} else {
    gcloud run deploy $ServiceName `
        --image gcr.io/$ProjectID/$ServiceName `
        --region $Region `
        --project $ProjectID `
        --platform managed `
        --allow-unauthenticated `
        --port 3000
}

Write-Host "Deployment Completed!" -ForegroundColor Green
Write-Host "Please check the generated URL in the Cloud Run output above."
