const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Get API key from environment variable
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env['gemini-api-key'];

        console.log('Fetching available models...');
        console.log('API Key found:', !!GEMINI_API_KEY);

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

        // Call Gemini API to list models
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
        );

        if (!response.ok) {
            const error = await response.json();
            console.error('Failed to fetch models:', error);
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({
                    error: 'Failed to fetch models from Gemini API',
                    details: error
                })
            };
        }

        const data = await response.json();
        const models = data.models || [];

        console.log(`Found ${models.length} total models`);

        // Priority list of image generation models
        const preferredImageModels = [
            'gemini-3-pro-image-preview',
            'imagen-3.0-generate-001',
            'gemini-2.0-flash-preview-image-generation',
        ];

        // Find the first available preferred image model
        let selectedImageModel = null;
        for (const preferredModel of preferredImageModels) {
            const found = models.find(m => m.name.includes(preferredModel));
            if (found) {
                selectedImageModel = found;
                console.log(`Found preferred image model: ${preferredModel}`);
                break;
            }
        }

        // Fallback: filter for any image generation models
        if (!selectedImageModel) {
            const imageModels = models.filter(m =>
                m.supportedGenerationMethods?.includes('generateContent') &&
                (m.name.includes('image') || m.name.includes('imagen')) &&
                !m.name.includes('vision')
            );
            selectedImageModel = imageModels[0];
            console.log('Using fallback image model:', selectedImageModel?.name);
        }

        // Find text models
        const textModels = models.filter(m =>
            m.supportedGenerationMethods?.includes('generateContent') &&
            !m.name.includes('image') &&
            !m.name.includes('imagen')
        );

        const latestTextModel = textModels.find(m => m.name.includes('2.0-flash-exp')) ||
            textModels.find(m => m.name.includes('2.0')) ||
            textModels.find(m => m.name.includes('1.5')) ||
            textModels[0];

        console.log('Selected image model:', selectedImageModel?.name);
        console.log('Selected text model:', latestTextModel?.name);

        // Return the selected models (without exposing API key)
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                imageModel: selectedImageModel ? selectedImageModel.name.replace('models/', '') : null,
                textModel: latestTextModel ? latestTextModel.name.replace('models/', '') : null,
                totalModels: models.length
            })
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
