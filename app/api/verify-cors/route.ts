import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const testUrl = searchParams.get('url');

  if (!testUrl) {
    return Response.json(
      { error: 'Missing url parameter' },
      { status: 400 }
    );
  }

  try {
    // Test CORS preflight (OPTIONS request)
    const preflightResponse = await fetch(testUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': request.headers.get('origin') || 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });

    // Test actual GET request
    const getResponse = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Origin': request.headers.get('origin') || 'http://localhost:3000',
      },
    });

    const corsHeaders = {
      preflight: {
        status: preflightResponse.status,
        headers: {
          'access-control-allow-origin': preflightResponse.headers.get('access-control-allow-origin'),
          'access-control-allow-methods': preflightResponse.headers.get('access-control-allow-methods'),
          'access-control-allow-headers': preflightResponse.headers.get('access-control-allow-headers'),
          'access-control-max-age': preflightResponse.headers.get('access-control-max-age'),
        }
      },
      get: {
        status: getResponse.status,
        headers: {
          'access-control-allow-origin': getResponse.headers.get('access-control-allow-origin'),
          'content-type': getResponse.headers.get('content-type'),
          'content-length': getResponse.headers.get('content-length'),
        }
      }
    };

    return Response.json({
      url: testUrl,
      corsHeaders,
      isCorsConfigured: !!corsHeaders.get.headers['access-control-allow-origin'],
      issues: getCorsIssues(corsHeaders)
    });

  } catch (error) {
    return Response.json(
      { 
        error: 'Failed to test CORS configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function getCorsIssues(corsHeaders: any) {
  const issues = [];

  // Check preflight response
  if (corsHeaders.preflight.status !== 200 && corsHeaders.preflight.status !== 204) {
    issues.push(`Preflight request failed with status ${corsHeaders.preflight.status}`);
  }

  // Check required CORS headers
  if (!corsHeaders.preflight.headers['access-control-allow-origin']) {
    issues.push('Missing Access-Control-Allow-Origin header in preflight');
  }

  if (!corsHeaders.preflight.headers['access-control-allow-methods']) {
    issues.push('Missing Access-Control-Allow-Methods header in preflight');
  }

  // Check GET response
  if (!corsHeaders.get.headers['access-control-allow-origin']) {
    issues.push('Missing Access-Control-Allow-Origin header in GET response');
  }

  return issues;
}
