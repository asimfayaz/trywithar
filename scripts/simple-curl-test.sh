#!/bin/bash

# Simple script to test the Hunyuan3D API using curl

# Read the .env.local file
ENV_FILE=".env.local"

# Check if .env.local exists
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ $ENV_FILE not found in the current directory"
  exit 1
fi

# Read HUNYUAN3D_API_URL from .env.local
API_URL=$(grep -E '^HUNYUAN3D_API_URL=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")

# Check if API_URL is set
if [ -z "$API_URL" ]; then
  echo "❌ HUNYUAN3D_API_URL not found in $ENV_FILE"
  exit 1
fi

echo "🔍 Testing Hunyuan3D API connection..."
echo "🌐 API URL: $API_URL"

# Test health check endpoint
echo -e "\n1. Testing health check endpoint..."
curl -i "${API_URL}/health"

echo -e "\n\n✅ Test completed"
