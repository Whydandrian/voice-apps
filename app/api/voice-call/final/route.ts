// app/api/voice-call/final/route.ts
// Next.js API Route untuk final recording

export async function POST(request: Request) {
  console.log('🎯 API Route: Received request to /api/voice-call/final');
  
  try {
    const formData = await request.formData();
    console.log('📦 FormData fields:', Array.from(formData.keys()));
    
    // Forward ke n8n final endpoint
    const n8nUrl = 'https://n8n.itk.ac.id/webhook-test/voice-call/final';
    console.log('➡️ Forwarding to:', n8nUrl);
    
    const response = await fetch(n8nUrl, {
      method: 'POST',
      body: formData,
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
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
    
  } catch (error) {
    console.error('💥 Final recording proxy error:', error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Failed to save recording',
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

export async function OPTIONS(request: Request) {
  console.log('🔄 API Route: Handling OPTIONS preflight for /final');
  
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}