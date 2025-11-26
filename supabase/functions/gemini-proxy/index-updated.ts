// Supabase Edge Function to proxy Gemini API requests
// Updated to handle anonymous requests
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
            }
        })
    }

    try {
        // Log for debugging
        console.log('Received request:', req.method)
        console.log('API Key available:', !!GEMINI_API_KEY)

        const { model, prompt, imageData, generationConfig } = await req.json()

        if (!model || !prompt) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: model, prompt' }),
                {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                }
            )
        }

        if (!GEMINI_API_KEY) {
            return new Response(
                JSON.stringify({ error: 'GEMINI_API_KEY not configured in Supabase secrets' }),
                {
                    status: 500,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                }
            )
        }

        const requestBody: any = {
            contents: [{
                parts: []
            }]
        }

        requestBody.contents[0].parts.push({ text: prompt })

        if (imageData) {
            const matches = imageData.match(/^data:(.+);base64,(.+)$/)
            if (matches) {
                const mimeType = matches[1]
                const base64Data = matches[2]

                requestBody.contents[0].parts.push({
                    inline_data: {
                        mime_type: mimeType,
                        data: base64Data
                    }
                })
            }
        }

        if (generationConfig) {
            requestBody.generationConfig = generationConfig
        }

        console.log('Calling Gemini API with model:', model)

        const geminiResponse = await fetch(
            `${GEMINI_API_BASE}/models/${model}:generateContent`,
            {
                method: 'POST',
                headers: {
                    'x-goog-api-key': GEMINI_API_KEY!,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            }
        )

        const data = await geminiResponse.json()

        console.log('Gemini API response status:', geminiResponse.status)

        return new Response(
            JSON.stringify(data),
            {
                status: geminiResponse.status,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        )

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        )
    }
})
