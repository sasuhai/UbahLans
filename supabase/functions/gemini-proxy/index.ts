// Supabase Edge Function to proxy Gemini API requests
// This keeps your API key secure on the server side

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
                'Access-Control-Allow-Headers': 'Content-Type',
            }
        })
    }

    try {
        const { model, prompt, imageData, generationConfig } = await req.json()

        // Validate required fields
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

        // Build request body
        const requestBody: any = {
            contents: [{
                parts: []
            }]
        }

        // Add text prompt
        requestBody.contents[0].parts.push({ text: prompt })

        // Add image if provided
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

        // Add generation config if provided
        if (generationConfig) {
            requestBody.generationConfig = generationConfig
        }

        // Call Gemini API
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

        // Return response
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
