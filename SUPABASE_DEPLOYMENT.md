# Supabase Edge Function Deployment Guide

## 🚀 Deploy Your Secure Backend with Supabase

This guide shows you how to use Supabase Edge Functions to hide your Google Gemini API key.

---

## Prerequisites

- ✅ Supabase account (free tier works!)
- ✅ Supabase CLI installed
- ✅ Your Google Gemini API key

---

## Step-by-Step Deployment

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

This will open your browser for authentication.

### 3. Link Your Project

```bash
# Get your project reference ID from Supabase dashboard
# It looks like: abcdefghijklmnop

supabase link --project-ref YOUR_PROJECT_REF
```

### 4. Set Your API Key as a Secret

```bash
supabase secrets set GEMINI_API_KEY=YOUR_GOOGLE_GEMINI_API_KEY
```

**Important**: Replace `YOUR_GOOGLE_GEMINI_API_KEY` with your actual key.

### 5. Deploy the Edge Function

```bash
supabase functions deploy gemini-proxy
```

### 6. Get Your Function URL

After deployment, you'll see:
```
Deployed Function URLs:
  gemini-proxy: https://YOUR_PROJECT_REF.supabase.co/functions/v1/gemini-proxy
```

**Copy this URL!** You'll need it for your frontend.

---

## Update Your Frontend

### Option 1: Update `app.js` to use Supabase

Replace the `callNanoBananaAPI` function in `app.js`:

```javascript
// OLD CODE (remove this):
async function callNanoBananaAPI(prompt, imageData) {
    // ... direct API call with exposed key
}

// NEW CODE (add this):
async function callNanoBananaAPI(prompt, imageData) {
    const SUPABASE_FUNCTION_URL = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/gemini-proxy';
    
    try {
        const matches = imageData.match(/^data:(.+);base64,(.+)$/);
        if (!matches) throw new Error('Invalid image data format');

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
            throw new Error(error.error || 'API request failed');
        }

        const data = await response.json();
        
        // Extract image from response (same logic as before)
        if (data.candidates && data.candidates[0]) {
            const candidate = data.candidates[0];
            if (candidate.content && candidate.content.parts) {
                for (const part of candidate.content.parts) {
                    const inlineData = part.inlineData || part.inline_data;
                    if (inlineData && inlineData.data) {
                        const responseMime = inlineData.mimeType || inlineData.mime_type || 'image/png';
                        return `data:${responseMime};base64,${inlineData.data}`;
                    }
                }
            }
        }

        throw new Error('No edited image in response');
    } catch (error) {
        console.error('Supabase Edge Function call failed:', error);
        throw error;
    }
}
```

### Option 2: Remove API Key from CONFIG

Since the key is now on Supabase, you can remove it from your frontend:

```javascript
const CONFIG = {
    // GEMINI_API_KEY: 'xxx', // ❌ Remove this line
    SUPABASE_FUNCTION_URL: 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/gemini-proxy',
    IMAGE_MODEL: 'gemini-3-pro-image-preview',
    TEXT_MODEL: 'gemini-2.0-flash-exp'
};
```

---

## Testing Locally

### 1. Start Supabase locally:

```bash
supabase start
```

### 2. Serve the function locally:

```bash
supabase functions serve gemini-proxy --env-file ./supabase/.env.local
```

### 3. Create `.env.local` file:

```bash
echo "GEMINI_API_KEY=your_api_key_here" > supabase/.env.local
```

### 4. Test with curl:

```bash
curl -X POST http://localhost:54321/functions/v1/gemini-proxy \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-2.0-flash-exp",
    "prompt": "Say hello"
  }'
```

---

## Deployment Checklist

- [ ] Supabase CLI installed
- [ ] Logged into Supabase
- [ ] Project linked
- [ ] API key set as secret (`supabase secrets set`)
- [ ] Edge function deployed
- [ ] Function URL copied
- [ ] Frontend updated with function URL
- [ ] API key removed from frontend code
- [ ] Tested locally
- [ ] Deployed to GitHub Pages
- [ ] Tested production

---

## Cost

**Supabase Free Tier Includes:**
- ✅ 500,000 Edge Function invocations/month
- ✅ 2GB Edge Function bandwidth
- ✅ More than enough for personal projects!

**If you exceed free tier:**
- Pro plan: $25/month (2 million invocations)

---

## Monitoring

View your Edge Function logs in Supabase Dashboard:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "Edge Functions" in sidebar
4. Click "gemini-proxy"
5. View logs and metrics

---

## Troubleshooting

### Error: "Function not found"
- Make sure you deployed: `supabase functions deploy gemini-proxy`
- Check your project ref is correct

### Error: "Missing API key"
- Set the secret: `supabase secrets set GEMINI_API_KEY=your_key`
- Redeploy: `supabase functions deploy gemini-proxy`

### CORS errors
- The function already includes CORS headers
- Make sure you're using the correct function URL

### Function times out
- Supabase Edge Functions have a 60s timeout (same as we had before)
- This should be sufficient for Gemini API calls

---

## Security Benefits

✅ **API key is hidden** - Never exposed in frontend code  
✅ **Server-side validation** - Can add rate limiting, authentication  
✅ **Request logging** - Monitor all API usage  
✅ **Easy key rotation** - Update secret without redeploying frontend  

---

## Next Steps

1. Deploy the Edge Function
2. Update your frontend code
3. Remove API key from `app.js`
4. Push to GitHub
5. Your app is now secure! 🎉

Need help? Check the [Supabase Edge Functions docs](https://supabase.com/docs/guides/functions)
