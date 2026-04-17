pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  environment {
    COMPOSE_PROJECT_NAME = 'civic-fix-v1'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Prepare Backend Env File') {
      steps {
        withCredentials([string(credentialsId: 'backend-env-raw', variable: 'BACKEND_ENV_RAW')]) {
          writeFile file: 'backend/.env', text: env.BACKEND_ENV_RAW
        }
      }
    }

    stage('Backend Tests') {
      steps {
        script {
          if (isUnix()) {
            sh 'docker compose build api'
            sh 'docker compose run --rm api npm test'
          } else {
            bat 'docker compose build api'
            bat 'docker compose run --rm api npm test'
          }
        }
      }
    }

    stage('Frontend Build') {
      steps {
        script {
          if (isUnix()) {
            sh 'docker compose build frontend'
          } else {
            bat 'docker compose build frontend'
          }
        }
      }
    }

    stage('Deploy') {
      when {
        branch 'main'
      }
      steps {
        script {
          if (isUnix()) {
            sh 'docker compose up -d --build'
          } else {
            bat 'docker compose up -d --build'
          }
        }
      }
    }

    stage('Health Check') {
      when {
        branch 'main'
      }
      steps {
        script {
          if (isUnix()) {
            sh 'curl -fsS http://localhost:8000/api/health'
          } else {
            powershell 'Invoke-WebRequest -Uri http://localhost:8000/api/health -UseBasicParsing | Out-Null'
          }
        }
      }
    }
  }

  post {
    always {
      script {
        if (isUnix()) {
          sh 'docker compose ps || true'
        } else {
          bat 'docker compose ps'
        }
      }
    }
    success {
      echo 'Pipeline completed successfully.'
    }
    failure {
      echo 'Pipeline failed. Check stage logs and fix the failing step.'
    }
  }
}
