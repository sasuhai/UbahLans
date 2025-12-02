# 🐛 Troubleshooting: 500 Internal Server Error

## ❌ Error You're Seeing:
```
POST https://ubahlans.netlify.app/.netlify/functions/gemini-proxy 500 (Internal Server Error)
Error: API Error: 
```

## 🔍 Most Likely Cause:
**Environment variable `GEMINI_API_KEY` is not set in Netlify**

---

## ✅ Solution: Add Environment Variable

### **Step 1: Add the Environment Variable**

1. Go to: https://app.netlify.com
2. Select your site: **ubahlans**
3. Go to: **Site settings** → **Environment variables**
4. Click: **"Add a variable"**
5. Enter:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: `YOUR_GEMINI_API_KEY`
   - **Scopes**: Select "All scopes" or "Production"
6. Click: **"Create variable"**

### **Step 2: Redeploy Your Site**

⚠️ **CRITICAL**: Environment variables only take effect after redeployment!

1. Go to: **Deploys** tab
2. Click: **"Trigger deploy"** button
3. Select: **"Deploy site"**
4. Wait for deployment to complete (usually 1-2 minutes)

### **Step 3: Test Again**

1. Go to your site: https://ubahlans.netlify.app
2. Upload an image
3. Click "Auto-fill with AI"
4. It should work now!

---

## 🔍 Alternative: Check Function Logs

If it still doesn't work, check the logs:

1. Go to: **Functions** tab in Netlify
2. Click on: **`gemini-proxy`**
3. Click on: **Logs**
4. Look for error messages like:
   - "API key not configured" → Environment variable not set
   - "Cannot find module 'node-fetch'" → Dependencies not installed
   - Other errors → Share with me for debugging

---

## 🔧 Other Possible Issues

### **Issue 1: Dependencies Not Installed**

If you see "Cannot find module 'node-fetch'":

1. Make sure `package.json` exists in your repo root
2. Redeploy the site

### **Issue 2: Function Not Deployed**

If the function doesn't exist:

1. Check that `netlify.toml` exists
2. Check that `netlify/functions/gemini-proxy.js` exists
3. Redeploy the site

### **Issue 3: CORS Error**

If you see CORS errors:

The function already has CORS headers, so this shouldn't happen. But if it does:
- Check that you're calling `/.netlify/functions/gemini-proxy` (relative URL)
- Not `https://ubahlans.netlify.app/.netlify/functions/gemini-proxy` (absolute URL)

---

## 📝 Quick Checklist

- [ ] Environment variable `GEMINI_API_KEY` is set in Netlify
- [ ] Site has been redeployed after adding the variable
- [ ] `package.json` exists in repo
- [ ] `netlify.toml` exists in repo
- [ ] `netlify/functions/gemini-proxy.js` exists in repo
- [ ] All files are committed and pushed to GitHub

---

## 🆘 Still Not Working?

1. **Check function logs** in Netlify dashboard
2. **Share the error message** from the logs
3. **Check browser console** for detailed error
4. **Verify** the environment variable is actually set (Site settings → Environment variables)

---

**Most likely fix: Add environment variable and redeploy!** 🚀
