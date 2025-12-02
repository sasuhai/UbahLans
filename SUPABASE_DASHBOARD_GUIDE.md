# Deploy Edge Function via Supabase Dashboard (No CLI Required!)

## 🎯 Easy Deployment Guide - No Terminal Commands Needed

This guide shows you how to deploy your Edge Function using only the Supabase web dashboard.

---

## Step 1: Open Supabase Dashboard

1. Go to: **https://supabase.com/dashboard**
2. **Sign in** with your account
3. **Select your project** (or create a new one if you don't have one)

---

## Step 2: Create Edge Function

1. In the left sidebar, click **"Edge Functions"**
2. Click the **"Create a new function"** button
3. Enter function name: **`gemini-proxy`**
4. Click **"Create function"**

---

## Step 3: Add the Function Code

1. You'll see a code editor
2. **Delete all the default code**
3. **Copy the code below** and paste it into the editor:

```typescript
// Supabase Edge Function to proxy Gemini API requests
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
```

4. Click **"Deploy"** button (top right)
5. Wait for deployment to complete (usually 10-30 seconds)

---

## Step 4: Add Your API Key as a Secret

1. In the left sidebar, click **"Project Settings"** (gear icon at bottom)
2. Click **"Edge Functions"** in the settings menu
3. Scroll down to **"Secrets"** section
4. Click **"Add new secret"**
5. Enter:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: Your Google Gemini API key
6. Click **"Save"**

---

## Step 5: Get Your Function URL

1. Go back to **"Edge Functions"** in the left sidebar
2. Click on **"gemini-proxy"**
3. You'll see the function URL at the top:
   ```
   https://YOUR_PROJECT_REF.supabase.co/functions/v1/gemini-proxy
   ```
4. **Copy this URL** - you'll need it for your frontend!

---

## Step 6: Update Your Frontend Code

Now you need to update `app.js` to call your Supabase function instead of Google directly.

### Open `app.js` and find the `callNanoBananaAPI` function

**Replace the entire function** with this:

```javascript
async function callNanoBananaAPI(prompt, imageData) {
    // Replace with YOUR actual Supabase function URL
    const SUPABASE_FUNCTION_URL = 'https://pztucbctmrbvrmpibwbf.supabase.co/functions/v1/UbahLansAPIkeyGemini';
    
    try {
        const matches = imageData.match(/^data:(.+);base64,(.+)$/);
        if (!matches) throw new Error('Invalid image data format');

        const mimeType = matches[1];
        const base64Data = matches[2];

        console.log('Calling Supabase Edge Function...');

        const response = await fetch(SUPABASE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: CONFIG.IMAGE_MODEL,
                prompt: prompt,
                imageData: imageData,
                generationConfig: {
                    temperature: 0.4,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 4096,
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Supabase function request failed');
        }

        const data = await response.json();
        console.log('Supabase Edge Function response:', data);

        // Extract the edited image from response
        if (data.candidates && data.candidates[0]) {
            const candidate = data.candidates[0];

            if (candidate.finishReason && candidate.finishReason !== 'STOP') {
                console.warn('Generation stopped due to:', candidate.finishReason);
            }

            if (candidate.content && candidate.content.parts) {
                for (const part of candidate.content.parts) {
                    const inlineData = part.inlineData || part.inline_data;
                    
                    if (inlineData && inlineData.data) {
                        const responseMime = inlineData.mimeType || inlineData.mime_type || 'image/png';
                        return `data:${responseMime};base64,${inlineData.data}`;
                    }
                    
                    if (part.text) {
                        console.warn('Model returned text instead of image:', part.text);
                        if (part.text.includes("cannot") || part.text.includes("sorry") || part.text.includes("apologize")) {
                            throw new Error(`Model refused to edit image: ${part.text}`);
                        }
                    }
                }
            }
        }

        throw new Error('No edited image in response (check console for details)');
    } catch (error) {
        console.error('Supabase Edge Function call failed:', error);
        throw error;
    }
}
```

**Important**: Replace `YOUR_PROJECT_REF` with your actual project reference from Step 5!

---

## Step 7: Remove API Key from Frontend

In `app.js`, find the `CONFIG` object and **remove or comment out** the API key:

```javascript
const CONFIG = {
    // GEMINI_API_KEY: 'AIz...', // ❌ Remove this - no longer needed!
    GEMINI_API_BASE: 'https://generativelanguage.googleapis.com/v1beta',
    IMAGE_MODEL: 'gemini-3-pro-image-preview',
    TEXT_MODEL: 'gemini-2.0-flash-exp'
};
```

---

## Step 8: Test Your Setup

1. **Save all your changes** to `app.js`
2. **Open `index.html`** in your browser
3. **Upload an image** and try generating a design
4. **Check the browser console** (F12) for any errors

If it works, you'll see:
- ✅ "Calling Supabase Edge Function..."
- ✅ "Supabase Edge Function response: ..."
- ✅ Your transformed image appears!

---

## Step 9: Deploy to GitHub Pages

1. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Secure API key with Supabase Edge Function"
   git push origin main
   ```

2. Your GitHub Pages site will automatically update
3. **Your API key is now secure!** 🔒

---

## 🎉 You're Done!

Your API key is now:
- ✅ Hidden from the frontend code
- ✅ Stored securely on Supabase servers
- ✅ Only accessible by your Edge Function
- ✅ Safe to deploy publicly on GitHub Pages

---

## 🔍 Monitoring & Debugging

### View Function Logs

1. Go to **Edge Functions** → **gemini-proxy**
2. Click **"Logs"** tab
3. See all requests and errors in real-time

### Test the Function Directly

You can test your function using curl:

```bash
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/gemini-proxy \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-2.0-flash-exp",
    "prompt": "Say hello"
  }'
```

---

## ❓ Troubleshooting

### "Function not found" error
- Make sure you deployed the function (Step 3)
- Check the URL is correct

### "Missing API key" error
- Make sure you added the secret (Step 4)
- Secret name must be exactly: `GEMINI_API_KEY`

### CORS errors
- The function already includes CORS headers
- Make sure you copied the code exactly

### Function times out
- Supabase Edge Functions have a 150s timeout
- This should be enough for Gemini API calls

---

## 💰 Free Tier Limits

Supabase Free Tier includes:
- ✅ 500,000 Edge Function invocations/month
- ✅ 2GB Edge Function bandwidth
- ✅ Unlimited projects

More than enough for personal use!

---

## 🆘 Need Help?

- Check the **Logs** tab in Supabase dashboard
- View the browser console (F12) for frontend errors
- Make sure your Gemini API key is valid

---

**Congratulations!** Your API key is now secure and your app is production-ready! 🚀
