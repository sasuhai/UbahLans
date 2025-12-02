const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const { model, prompt, imageData, generationConfig } = JSON.parse(event.body);

        // Get API key from environment variable
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'API key not configured' })
            };
        }

        // Build request body
        const requestBody = {
            contents: [{
                parts: []
            }],
            generationConfig: generationConfig || {
                temperature: 0.8,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
            }
        };

        // Add text prompt
        requestBody.contents[0].parts.push({ text: prompt });

        // Add image if provided
        if (imageData) {
            const matches = imageData.match(/^data:(.+);base64,(.+)$/);
            if (matches) {
                const mimeType = matches[1];
                const base64Data = matches[2];
                requestBody.contents[0].parts.push({
                    inline_data: {
                        mime_type: mimeType,
                        data: base64Data
                    }
                });
            }
        }

        // Call Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
                method: 'POST',
                headers: {
                    'x-goog-api-key': GEMINI_API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            }
        );

        const data = await response.json();

        return {
            statusCode: response.status,
            headers,
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error('Function error:', error);
        console.error('Error stack:', error.stack);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: error.message || 'Unknown error occurred',
                details: error.toString()
            })
        };
    }
};
