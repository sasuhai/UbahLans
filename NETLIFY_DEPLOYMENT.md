# 🚀 Deploy UbahLans to Netlify with Secure API Key

This guide shows you how to deploy your app to Netlify while keeping your Gemini API key secure using Netlify Functions.

---

## 📋 Overview

**Problem**: Your Gemini API key is currently visible in `app.js`, which is exposed to anyone who views your website's source code.

**Solution**: Use Netlify Functions (serverless functions) to act as a secure backend proxy that hides your API key.

---

## 🛠️ Step-by-Step Deployment

### **Step 1: Create Netlify Function**

Create a folder structure for Netlify Functions:

```bash
mkdir -p netlify/functions
```

Create the function file:

**File**: `netlify/functions/gemini-proxy.js`

```javascript
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
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

---

### **Step 2: Create Netlify Configuration**

**File**: `netlify.toml`

```toml
[build]
  publish = "."
  functions = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

### **Step 3: Update Your Frontend Code**

Update `app.js` to call the Netlify Function instead of calling Google directly:

**Find these functions and update them:**

```javascript
// Update the API endpoint
const NETLIFY_FUNCTION_URL = '/.netlify/functions/gemini-proxy';

// Update callGeminiAPI function
async function callGeminiAPI(prompt, imageData, model = null) {
    const selectedModel = model || CONFIG.MODELS[elements.modelSelect?.value || 'auto'];

    try {
        const response = await fetch(NETLIFY_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: selectedModel,
                prompt: prompt,
                imageData: imageData,
                generationConfig: {
                    temperature: 0.8,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 8192,
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error('Invalid API response:', data);
            throw new Error('API returned no valid response.');
        }
        
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Gemini API Error:', error);
        throw error;
    }
}

// Do the same for callNanoBananaAPI and callGeminiAPITextOnly
```

**Remove the API key from CONFIG:**

```javascript
const CONFIG = {
    // REMOVE THIS LINE:
    // GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY',
    
    GEMINI_API_BASE: 'https://generativelanguage.googleapis.com/v1beta',
    IMAGE_MODEL: 'gemini-2.5-flash-image',
    // ... rest of config
};
```

---

### **Step 4: Deploy to Netlify**

#### **Option A: Deploy via Netlify CLI**

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify:**
   ```bash
   netlify login
   ```

3. **Initialize your site:**
   ```bash
   netlify init
   ```
   - Choose "Create & configure a new site"
   - Select your team
   - Enter a site name (e.g., `ubahlans`)

4. **Set environment variable:**
   ```bash
   netlify env:set GEMINI_API_KEY "YOUR_GEMINI_API_KEY"
   ```

5. **Deploy:**
   ```bash
   netlify deploy --prod
   ```

#### **Option B: Deploy via Netlify Dashboard**

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add Netlify Functions for secure API"
   git push origin main
   ```

2. **Go to Netlify Dashboard:**
   - Visit: https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub
   - Select your repository

3. **Configure build settings:**
   - Build command: (leave empty)
   - Publish directory: `.`
   - Functions directory: `netlify/functions`

4. **Add environment variable:**
   - Go to "Site settings" → "Environment variables"
   - Click "Add a variable"
   - Key: `GEMINI_API_KEY`
   - Value: `YOUR_GEMINI_API_KEY`
   - Click "Save"

5. **Deploy:**
   - Click "Deploy site"

---

### **Step 5: Test Your Deployment**

1. **Visit your Netlify URL** (e.g., `https://ubahlans.netlify.app`)
2. **Upload an image**
3. **Try generating a design**
4. **Check browser console** - you should NOT see your API key anywhere!

---

## 🔒 Security Checklist

- ✅ API key is stored as environment variable in Netlify
- ✅ API key is NOT in your code or Git repository
- ✅ All API calls go through Netlify Functions (backend)
- ✅ Frontend only calls `/.netlify/functions/gemini-proxy`
- ✅ Set up Google API key restrictions:
  - Application restrictions: HTTP referrers
  - Add: `https://your-site.netlify.app/*`
  - API restrictions: Only "Generative Language API"

---

## 🐛 Troubleshooting

### Function not working
- Check Netlify Function logs: Site → Functions → gemini-proxy → Logs
- Verify environment variable is set: Site settings → Environment variables

### CORS errors
- Make sure CORS headers are in the function
- Check that you're calling `/.netlify/functions/gemini-proxy` (not the full URL)

### API key not found
- Redeploy after setting environment variable
- Environment variables require a redeploy to take effect

---

## 📚 Additional Resources

- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Google API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)

---

**Your API key is now secure! 🎉**

The key is stored safely in Netlify's environment variables and never exposed to users.
