# 🔴 403 Forbidden Error - Google API Blocking Request

## ❌ Error:
```
POST https://ubahlans.netlify.app/.netlify/functions/gemini-proxy 403 (Forbidden)
```

## 🔍 Cause:
Google API is blocking the request from Netlify servers due to **API key restrictions**.

---

## ✅ Solution: Update Google API Key Restrictions

### **Option 1: Remove Restrictions Temporarily (For Testing)**

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click your API key: `YOUR_GEMINI_API_KEY`
3. Under **"Application restrictions"**:
   - Select: **"None"**
4. Click: **"Save"**
5. Wait 1-2 minutes for changes to propagate
6. Test your app again

### **Option 2: Add IP Restrictions (More Secure)**

Since Netlify Functions run on servers (not browsers), HTTP referrer restrictions won't work. You need to use **IP address restrictions** or **no restrictions**.

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click your API key
3. Under **"Application restrictions"**:
   - Select: **"IP addresses (web servers, cron jobs, etc.)"**
   - Add Netlify's IP ranges (this is complex and changes)
   - **OR** select **"None"** for now
4. Under **"API restrictions"**:
   - Keep: **"Restrict key"**
   - Select only: **"Generative Language API"**
5. Click: **"Save"**

### **Option 3: Use a Different API Key (Recommended)**

Create a **separate API key** for server-side use:

1. Go to: https://console.cloud.google.com/apis/credentials
2. Click: **"Create Credentials"** → **"API key"**
3. Copy the new key
4. Configure restrictions:
   - Application restrictions: **"None"** (or IP addresses if you know Netlify's IPs)
   - API restrictions: **"Generative Language API"** only
5. Update Netlify environment variable:
   - Go to Netlify → Site settings → Environment variables
   - Update `GEMINI_API_KEY` with the new key
   - Redeploy the site

---

## 🎯 Quick Fix (For Testing):

**Remove all restrictions temporarily:**

1. Google Cloud Console → API key settings
2. Application restrictions: **"None"**
3. API restrictions: **"Generative Language API"** only
4. Save
5. Wait 2 minutes
6. Test again

---

## 🔒 Security Note:

- **Without restrictions**, anyone with your API key can use it
- **BUT** since the key is in Netlify environment variables (not in your code), it's still relatively secure
- **API restrictions** (limiting to only Generative Language API) still protect you from abuse

---

## 📝 Summary:

The 403 error means Google is blocking the request because:
- Your API key has **HTTP referrer restrictions** (which don't work for server-side calls)
- Or **IP restrictions** that don't include Netlify's servers

**Fix**: Set application restrictions to **"None"** in Google Cloud Console.

---

**After changing restrictions, wait 1-2 minutes and test again!** ⏱️
