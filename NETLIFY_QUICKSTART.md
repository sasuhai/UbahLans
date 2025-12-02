# 🚀 Quick Start: Deploy to Netlify

## ✅ Files Created

I've created these files for you:
- `netlify/functions/gemini-proxy.js` - Serverless function to hide API key
- `netlify.toml` - Netlify configuration
- `NETLIFY_DEPLOYMENT.md` - Full deployment guide

## 🎯 Next Steps

### 1. Update Your Frontend Code

You need to update `app.js` to call the Netlify Function instead of Google directly.

**I can do this for you!** Just confirm and I'll update:
- `callGeminiAPI()`
- `callNanoBananaAPI()`  
- `callGeminiAPITextOnly()`

### 2. Deploy to Netlify

**Option A: Via Netlify Dashboard (Easiest)**

1. Push to GitHub:
   ```bash
   git add .
   git commit -m "Add Netlify Functions"
   git push origin main
   ```

2. Go to https://app.netlify.com
3. Click "Add new site" → "Import an existing project"
4. Connect GitHub → Select your repo
5. Deploy settings:
   - Build command: (leave empty)
   - Publish directory: `.`
6. Click "Deploy site"

7. **Add environment variable:**
   - Site settings → Environment variables
   - Add: `GEMINI_API_KEY` = `xxx`
   - Redeploy site

**Option B: Via Netlify CLI**

```bash
# Install CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify init
netlify env:set GEMINI_API_KEY "YOUR_GEMINI_API_KEY"
netlify deploy --prod
```

---

## 🔒 Security Benefits

✅ API key hidden in Netlify environment variables  
✅ Never exposed in browser/source code  
✅ All API calls go through secure backend  
✅ Can set Google API restrictions to your Netlify domain

---

**Ready to update your code?** Let me know and I'll modify `app.js` to use the Netlify Function! 🚀
