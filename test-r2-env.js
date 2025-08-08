// Simple script to test R2 environment variables
console.log("Testing R2 environment variables:");
console.log("R2_ACCOUNT_ID:", process.env.R2_ACCOUNT_ID ? "✅ Present" : "❌ Missing");
console.log("R2_ACCESS_KEY_ID:", process.env.R2_ACCESS_KEY_ID ? "✅ Present" : "❌ Missing");
console.log("R2_SECRET_ACCESS_KEY:", process.env.R2_SECRET_ACCESS_KEY ? "✅ Present" : "❌ Missing");
console.log("R2_PHOTOS_BUCKET:", process.env.R2_PHOTOS_BUCKET ? "✅ Present" : "❌ Missing");
console.log("R2_MODELS_BUCKET:", process.env.R2_MODELS_BUCKET ? "✅ Present" : "❌ Missing");
