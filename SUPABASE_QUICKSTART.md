# Quick Start: Secure Your API Key with Supabase

## 🎯 What You Need

- Supabase account (you have this! ✅)
- 10 minutes of time
- Your Google Gemini API key

---

## ⚡ Quick Deploy (5 Commands)

```bash
# 1. Install CLI
npm install -g supabase

# 2. Login
supabase login

# 3. Link your project (get ref from dashboard)
supabase link --project-ref YOUR_PROJECT_REF

# 4. Set your API key as a secret
supabase secrets set GEMINI_API_KEY=YOUR_GOOGLE_API_KEY

# 5. Deploy!
supabase functions deploy gemini-proxy
```

**Done!** 🎉 Your API key is now secure.

---

## 📝 Update Frontend (One Change)

In `app.js`, replace the `CONFIG` object:

```javascript
const CONFIG = {
    // Remove this line:
    // GEMINI_API_KEY: 'AIzaSy...',  ❌
    
    // Add this line:
    SUPABASE_FUNCTION_URL: 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/gemini-proxy', // ✅
    
    IMAGE_MODEL: 'gemini-3-pro-image-preview',
    TEXT_MODEL: 'gemini-2.0-flash-exp'
};
```

Then update `callNanoBananaAPI` to call Supabase instead of Google directly (see full code in SUPABASE_DEPLOYMENT.md).

---

## ✅ Benefits

| Before (Exposed) | After (Supabase) |
|------------------|------------------|
| ❌ Key visible in code | ✅ Key hidden on server |
| ❌ Anyone can steal it | ✅ Only your function can use it |
| ❌ Hard to rotate | ✅ Easy to update |
| ❌ No usage tracking | ✅ Full logs in dashboard |

---

## 💰 Cost

**FREE** for up to 500,000 requests/month!

---

## 📚 Full Guide

See `SUPABASE_DEPLOYMENT.md` for complete instructions.

---

## 🆘 Need Help?

1. Check `SUPABASE_DEPLOYMENT.md` for troubleshooting
2. View logs in Supabase Dashboard → Edge Functions
3. Test locally first: `supabase functions serve gemini-proxy`
