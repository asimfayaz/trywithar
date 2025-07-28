'use client';

import { useState, useRef } from 'react';

export default function TestBgRemoval() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    originalImageUrl: string;
    processedImageUrl: string;
    fileName: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
      
      // Create a preview URL for the original image
      const url = URL.createObjectURL(selectedFile);
      setResult(prev => ({
        ...(prev || {}),
        originalImageUrl: url,
      }) as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select an image file');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/remove-background', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to remove background');
      }

      setResult(prev => ({
        ...(prev || {}),
        ...data.data,
      }));
    } catch (err) {
      console.error('Background removal error:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove background');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Background Removal Test</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select an image to remove the background
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
            disabled={isProcessing}
          />
        </div>
        
        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={!file || isProcessing}
            className={`px-4 py-2 rounded-md text-white
              ${!file || isProcessing ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isProcessing ? 'Processing...' : 'Remove Background'}
          </button>
          
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300"
          >
            Reset
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {(result?.originalImageUrl || result?.processedImageUrl) && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Results</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {result.originalImageUrl && (
              <div>
                <h3 className="text-lg font-medium mb-2">Original Image</h3>
                <div className="border rounded-lg p-2 bg-white">
                  <img 
                    src={result.originalImageUrl} 
                    alt="Original" 
                    className="max-w-full h-auto"
                  />
                </div>
              </div>
            )}
            
            {result.processedImageUrl ? (
              <div>
                <h3 className="text-lg font-medium mb-2">Background Removed</h3>
                <div className="border rounded-lg p-2 bg-white">
                  <img 
                    src={result.processedImageUrl} 
                    alt="Background Removed" 
                    className="max-w-full h-auto"
                  />
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  <p>File: {result.fileName}</p>
                  <a 
                    href={result.processedImageUrl} 
                    download={result.fileName}
                    className="text-blue-600 hover:underline mt-1 inline-block"
                  >
                    Download Result
                  </a>
                </div>
              </div>
            ) : isProcessing ? (
              <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                <p className="text-gray-500">Processing image...</p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
