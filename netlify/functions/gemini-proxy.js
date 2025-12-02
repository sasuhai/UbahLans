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
        let { model, prompt, imageData, generationConfig } = JSON.parse(event.body);

        // Get API key from environment variable
        // Check both naming conventions (GEMINI_API_KEY and gemini-api-key)
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env['gemini-api-key'];

        console.log('Environment variables available:', Object.keys(process.env).filter(k => k.toLowerCase().includes('gemini')));
        console.log('API Key found:', !!GEMINI_API_KEY);
        console.log('Requested model:', model);
        console.log('Has image data:', !!imageData);
        console.log('Prompt length:', prompt?.length);

        if (!GEMINI_API_KEY) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'API key not configured',
                    hint: 'Please set GEMINI_API_KEY environment variable in Netlify'
                })
            };
        }

        // CRITICAL FIX: If image data is present and model doesn't support image generation,
        // automatically switch to a model that does
        const imageGenerationModels = [
            'gemini-3-pro-image-preview',
            'imagen-3.0-generate-001',
            'gemini-2.0-flash-preview-image-generation'
        ];

        // Check if the requested model supports image generation
        const isImageGenerationModel = imageGenerationModels.some(m => model?.includes(m));

        if (imageData && !isImageGenerationModel) {
            console.warn(`⚠️ Model ${model} does NOT support image generation!`);
            console.warn(`🔄 Switching to: gemini-3-pro-image-preview`);
            model = 'gemini-3-pro-image-preview';
        }

        console.log('Final model to use:', model);

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

        console.log('Request body structure:');
        console.log('- Contents parts count:', requestBody.contents[0].parts.length);
        console.log('- Has text part:', requestBody.contents[0].parts.some(p => p.text));
        console.log('- Has inline_data part:', requestBody.contents[0].parts.some(p => p.inline_data));
        console.log('- Generation config:', JSON.stringify(requestBody.generationConfig));

        // Call Gemini API
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        console.log('Calling API URL:', apiUrl);

        const response = await fetch(apiUrl,
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

        // Log the response for debugging
        console.log('Gemini API Response Status:', response.status);
        console.log('Response OK:', response.ok);

        // Check if we have candidates
        if (data.candidates && data.candidates[0]) {
            console.log('✅ Response has candidates');
            console.log('Finish reason:', data.candidates[0].finishReason);

            if (data.candidates[0].content && data.candidates[0].content.parts) {
                console.log('Parts count:', data.candidates[0].content.parts.length);
                data.candidates[0].content.parts.forEach((part, idx) => {
                    console.log(`\n--- Part ${idx} ---`);
                    console.log('Keys:', Object.keys(part));

                    if (part.inlineData || part.inline_data) {
                        const inlineData = part.inlineData || part.inline_data;
                        console.log('✅ HAS INLINE DATA!');
                        console.log('MIME type:', inlineData.mimeType || inlineData.mime_type);
                        console.log('Data length:', (inlineData.data || '').length);
                    }

                    if (part.text) {
                        console.log('Has text, length:', part.text.length);
                        console.log('Text preview:', part.text.substring(0, 200));
                    }
                });
            } else {
                console.log('❌ No content.parts in candidate');
            }
        } else {
            console.log('❌ No candidates in response!');
            console.log('Response keys:', Object.keys(data));
            if (data.error) {
                console.log('Error in response:', data.error);
            }
        }

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
