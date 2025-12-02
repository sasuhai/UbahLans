# 🔧 Local Development Setup

## Overview

For local testing, you can use your Gemini API key directly without needing Netlify Functions. The app automatically detects if you're in development mode and routes API calls accordingly.

---

## 🚀 Quick Setup

### **Step 1: Create Local Config File**

A file named `config.local.js` has been created for you with this content:

```javascript
// Local configuration for development
const LOCAL_CONFIG = {
    // Your Gemini API key for local testing
    GEMINI_API_KEY: 'xxxx',
    
    // Set to true to use local API key
    USE_LOCAL_API_KEY: true
};

window.LOCAL_CONFIG = LOCAL_CONFIG;
```

### **Step 2: That's It!**

The app will automatically:
- ✅ Detect the local config file
- ✅ Use direct API calls to Google
- ✅ Skip Netlify Functions
- ✅ Show a console message: "🔧 Using LOCAL API key for development"

---

## 🔒 Security

### **Files Excluded from Git:**

The `.gitignore` file has been updated to exclude:
- `config.local.js` - Your local config file
- `*.local.js` - Any other local files
- `.env` files - Environment variables

**This means your API key will NEVER be committed to Git!** ✅

---

## 🎯 How It Works

### **Development Mode (Local)**
```
User → app.js → Direct Google API Call → Response
```
- Uses `config.local.js` API key
- Calls Google API directly
- Faster (no proxy)
- Console shows: 🔧 Using LOCAL API key

### **Production Mode (Netlify)**
```
User → app.js → Netlify Function → Google API → Response
```
- No local config file
- Uses Netlify environment variable
- Secure (API key hidden)
- Console shows: 🚀 Using Netlify Functions

---

## 🧪 Testing

### **Test Local Mode:**

1. **Open browser console** (F12)
2. **Load the page**: http://localhost:8000
3. **Check console**: Should see "🔧 Using LOCAL API key for development"
4. **Upload image** and test features
5. **Verify**: API calls go directly to Google (check Network tab)

### **Test Production Mode:**

1. **Rename or delete** `config.local.js`
2. **Reload page**
3. **Check console**: Should see "🚀 Using Netlify Functions for production"
4. **Note**: Will fail locally (Netlify Functions don't work on localhost)

---

## 📝 Configuration Options

### **Enable Local Mode:**
```javascript
USE_LOCAL_API_KEY: true  // Use direct API calls
```

### **Disable Local Mode (Test Production Behavior):**
```javascript
USE_LOCAL_API_KEY: false  // Use Netlify Functions
```

---

## 🔄 Switching Between Modes

### **For Local Development:**
1. Keep `config.local.js` with `USE_LOCAL_API_KEY: true`
2. Run local server: `python3 -m http.server 8000`
3. Test at http://localhost:8000

### **For Production Testing:**
1. Set `USE_LOCAL_API_KEY: false` in `config.local.js`
2. OR delete/rename `config.local.js`
3. Deploy to Netlify to test

### **For Deployment:**
1. Just push to GitHub - `config.local.js` is ignored
2. Netlify will use environment variable automatically
3. No code changes needed!

---

## ⚠️ Important Notes

### **API Key Restrictions:**

When using local mode, your API key should have:
- **Application restrictions**: None (or HTTP referrers with `localhost`)
- **API restrictions**: Generative Language API only

### **Never Commit:**
- ❌ Don't commit `config.local.js`
- ❌ Don't put API key in `app.js`
- ❌ Don't push `.env` files
- ✅ Always use `config.local.js` for local testing

### **Production Checklist:**
- ✅ `config.local.js` is in `.gitignore`
- ✅ API key is set in Netlify environment variables
- ✅ Code automatically switches to Netlify Functions
- ✅ No API key in committed code

---

## 🐛 Troubleshooting

### **"Using Netlify Functions" but I want local mode:**
- Check if `config.local.js` exists
- Check if `USE_LOCAL_API_KEY: true`
- Hard refresh browser (Ctrl+Shift+R)

### **"Using LOCAL API key" but getting errors:**
- Check API key is correct
- Check API key restrictions in Google Cloud Console
- Check browser console for specific errors

### **API calls failing in local mode:**
- Verify API key is valid
- Check Google Cloud Console for quota
- Ensure "Generative Language API" is enabled

---

## 📚 File Structure

```
UbahLansV2/
├── config.local.js          # ← Your API key (NOT in Git)
├── .gitignore               # ← Excludes config.local.js
├── app.js                   # ← Auto-detects local config
├── index.html               # ← Loads config.local.js
└── netlify/functions/       # ← Used in production only
```

---

## ✅ Summary

**Local Development:**
- Create `config.local.js` with your API key
- Set `USE_LOCAL_API_KEY: true`
- App uses direct API calls
- Fast and easy testing

**Production:**
- Push to GitHub (config.local.js ignored)
- Netlify uses environment variable
- App automatically uses Netlify Functions
- API key stays secure

**No code changes needed between environments!** 🎉

---

**You're all set for local development!** 🚀

Just open http://localhost:8000 and start testing with your local API key.
