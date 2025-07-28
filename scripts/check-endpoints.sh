#!/bin/bash

# Script to check available API endpoints

# Read the .env.local file
ENV_FILE=".env.local"

# Check if .env.local exists
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ $ENV_FILE not found in the current directory"
  exit 1
fi

# Read HUNYUAN3D_API_URL from .env.local
API_URL=$(grep -E '^HUNYUAN3D_API_URL=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '\"' | tr -d "'")

# Check if API_URL is set
if [ -z "$API_URL" ]; then
  echo "❌ HUNYUAN3D_API_URL not found in $ENV_FILE"
  exit 1
fi

echo "🔍 Checking Hunyuan3D API endpoints..."
echo "🌐 API URL: $API_URL"

# Test root endpoint
echo -e "\n1. Checking root endpoint..."
curl -i "${API_URL}"

# Test health check endpoint
echo -e "\n\n2. Checking health check endpoint..."
curl -i "${API_URL}/health"

# Test generate endpoint (without data)
echo -e "\n\n3. Checking generate endpoint (without data)..."
curl -i -X POST "${API_URL}/generate"

echo -e "\n\n✅ Endpoint check completed"
