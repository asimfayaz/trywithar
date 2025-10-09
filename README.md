# Simple 3D Model Generator

*Automatically synced with your [v0.dev](https://v0.dev) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/asimfayazs-projects/v0-simple-3-d-model-generator)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/mC5V16zo9bA)

## Overview

This repository will stay in sync with your deployed chats on [v0.dev](https://v0.dev).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.dev](https://v0.dev).

## Deployment

Your project is live at:

**[https://vercel.com/asimfayazs-projects/v0-simple-3-d-model-generator](https://vercel.com/asimfayazs-projects/v0-simple-3-d-model-generator)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/mC5V16zo9bA](https://v0.dev/chat/projects/mC5V16zo9bA)**

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## Authentication
We use Supabase Auth for authentication

## Deep Linking

The application supports deep linking to specific views using URL parameters:

### URL Schema
- `view`: Specifies the current view (gallery, upload, generator, preview)
- `modelId`: ID of the selected model (required for generator/preview views)

Example URLs:
- Gallery view: `https://yourapp.com/?view=gallery`
- Generator view: `https://yourapp.com/?view=generator&modelId=12345`
- Preview view: `https://yourapp.com/?view=preview&modelId=12345`

### Implementation Details
- URL parameters are synchronized with application state using Next.js navigation hooks
- NavigationContext manages view transitions and parameter updates
- Invalid model IDs trigger error notifications and redirect to gallery view
