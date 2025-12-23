// app/api/voice-call/route.ts
// Next.js API Route untuk proxy requests ke n8n (bypass CORS)

export async function POST(request: Request) {
  console.log('🎯 API Route: Received request to /api/voice-call');
  
  try {
    // Get form data dari frontend
    const formData = await request.formData();
    
    console.log('📦 FormData fields:', Array.from(formData.keys()));
    
    // Forward ke n8n
    const n8nUrl = 'https://n8n.itk.ac.id/webhook/voice-call';
    console.log('➡️ Forwarding to:', n8nUrl);
    
    const response = await fetch(n8nUrl, {
      method: 'POST',
      body: formData,
      // Server-to-server request, no CORS issue
    });
    
    console.log('✅ n8n Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ n8n Error:', errorText);
      
      return new Response(JSON.stringify({ 
        success: false,
        error: 'n8n workflow error',
        status: response.status,
        details: errorText
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    const data = await response.json();
    console.log('📨 n8n Response:', data);
    
    // Return dengan CORS headers
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
    
  } catch (error) {
    console.error('💥 API Route Error:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Failed to forward request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

// Handle OPTIONS request (preflight)
export async function OPTIONS(request: Request) {
  console.log('🔄 API Route: Handling OPTIONS preflight');
  
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}