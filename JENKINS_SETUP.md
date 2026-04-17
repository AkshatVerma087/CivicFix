# Jenkins CI/CD Setup (Step-by-Step)

## Goal
Automate build, test, and deployment for this project using Docker Compose and Jenkins.

## 1) Prerequisites on Jenkins Machine
1. Install Jenkins LTS.
2. Install Docker Desktop (Windows) or Docker Engine (Linux).
3. Ensure Docker Compose V2 is available (`docker compose version`).
4. Make sure Jenkins user can run Docker commands.

## 2) Required Jenkins Plugins
Install from Manage Jenkins -> Plugins:
1. Pipeline
2. Git
3. Credentials Binding
4. SSH Agent (optional)

## 3) Add Credentials in Jenkins
Go to Manage Jenkins -> Credentials -> Global -> Add Credentials.

Create this credential:
1. Kind: Secret text
2. ID: backend-env-raw
3. Secret: full content of backend/.env (all lines)

Why: backend/.env is gitignored, so Jenkins creates it during pipeline.

## 4) Create the Pipeline Job
1. New Item -> name: civic-sense-cicd -> Pipeline.
2. Pipeline Definition: Pipeline script from SCM.
3. SCM: Git.
4. Repository URL: your repo URL.
5. Branch Specifier: */main
6. Script Path: Jenkinsfile
7. Save.

## 5) Add GitHub Webhook (Optional but recommended)
In GitHub repository settings:
1. Webhooks -> Add webhook
2. Payload URL: http://YOUR_JENKINS_URL/github-webhook/
3. Content type: application/json
4. Trigger: Just the push event

In Jenkins job:
1. Build Triggers -> GitHub hook trigger for GITScm polling

## 6) Run First Build
1. Click Build Now.
2. Watch Console Output.
3. Expected stages:
   - Checkout
   - Prepare Backend Env File
   - Backend Tests
   - Frontend Build
   - Deploy (main branch only)
   - Health Check (main branch only)

## 7) Verify Deployment
After successful build:
1. Frontend: http://localhost:3000
2. Backend health: http://localhost:8000/api/health

## 8) If Build Fails
1. Confirm backend-env-raw credential exists and ID matches exactly.
2. Confirm Docker is running on Jenkins host.
3. Confirm repository branch is main.
4. Confirm backend .env values are valid (Atlas URI, JWT, Cloudinary keys).

## 9) Next Hardening Steps
1. Disable open admin registration endpoint in production.
2. Add manual approval before Deploy stage.
3. Add rollback stage if health check fails.
4. Add notifications (email/Slack).
