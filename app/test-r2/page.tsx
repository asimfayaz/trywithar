'use client';

import { useState } from 'react';

export default function TestR2Page() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/test-r2', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }
      
      setResult(data);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">R2 Storage Test</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select a file to upload
          </label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
            disabled={uploading}
          />
        </div>
        
        <button
          type="submit"
          disabled={uploading || !file}
          className={`px-4 py-2 rounded-md text-white
            ${uploading || !file ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}
            disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
        
        {error && (
          <div className="p-4 text-red-700 bg-red-100 rounded-md">
            Error: {error}
          </div>
        )}
      </form>
      
      {result && (
        <div className="mt-8 p-4 bg-gray-50 rounded-md">
          <h2 className="text-lg font-semibold mb-2">Upload Successful</h2>
          <div className="space-y-2">
            <p><span className="font-medium">URL:</span> {result.data.url}</p>
            <p><span className="font-medium">Key:</span> {result.data.key}</p>
            <p className="break-all">
              <span className="font-medium">Signed URL:</span> {result.data.signedUrl}
            </p>
            {result.data.url.endsWith('.jpg') || result.data.url.endsWith('.png') ? (
              <div className="mt-4">
                <p className="font-medium mb-2">Uploaded Image:</p>
                <img 
                  src={result.data.url} 
                  alt="Uploaded content" 
                  className="max-w-full h-auto rounded-md border"
                />
              </div>
            ) : null}
          </div>
        </div>
      )}
      
      <div className="mt-8 p-4 bg-gray-50 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Environment Check</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">Server-side Environment Variables (used in API routes):</h3>
            <ul className="space-y-1 mt-2">
              <li>R2_ACCOUNT_ID: {process.env.R2_ACCOUNT_ID ? '✅ Set' : '❌ Not set'}</li>
              <li>R2_ACCESS_KEY_ID: {process.env.R2_ACCESS_KEY_ID ? '✅ Set' : '❌ Not set'}</li>
              <li>R2_SECRET_ACCESS_KEY: {process.env.R2_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Not set'}</li>
              <li>R2_PHOTOS_BUCKET: {process.env.R2_PHOTOS_BUCKET || '❌ Not set'}</li>
              <li>R2_MODELS_BUCKET: {process.env.R2_MODELS_BUCKET || '❌ Not set'}</li>
              <li>R2_PUBLIC_URL: {process.env.R2_PUBLIC_URL || '❌ Not set'}</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium">Client-side Environment Variables (prefixed with NEXT_PUBLIC_):</h3>
            <ul className="space-y-1 mt-2">
              <li>NEXT_PUBLIC_R2_ACCOUNT_ID: {process.env.NEXT_PUBLIC_R2_ACCOUNT_ID ? '✅ Set' : '❌ Not set'}</li>
              <li>NEXT_PUBLIC_R2_PHOTOS_BUCKET: {process.env.NEXT_PUBLIC_R2_PHOTOS_BUCKET || '❌ Not set'}</li>
              <li>NEXT_PUBLIC_R2_MODELS_BUCKET: {process.env.NEXT_PUBLIC_R2_MODELS_BUCKET || '❌ Not set'}</li>
              <li>NEXT_PUBLIC_R2_PUBLIC_URL: {process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '❌ Not set'}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
