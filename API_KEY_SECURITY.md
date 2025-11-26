# API Key Security Guide for UbahLans

## ⚠️ Important Security Notice

Since UbahLans is a **client-side only application** deployed on GitHub Pages, the Google API key **must be visible** in the JavaScript code. This is unavoidable for static sites without a backend server.

## 🔒 How to Protect Your API Key

While you cannot hide the key, you can **restrict its usage** to prevent abuse:

### Step 1: Set Up API Key Restrictions in Google Cloud Console

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/apis/credentials
   - Select your project

2. **Find Your API Key**
   - Click on the API key you're using for UbahLans

3. **Set Application Restrictions**
   - Choose **"HTTP referrers (web sites)"**
   - Add your allowed domains:
     ```
     https://yourusername.github.io/*
     https://your-custom-domain.com/*
     http://localhost:*  (for local testing)
     ```
   - This ensures the key only works from your specific websites

4. **Set API Restrictions**
   - Click **"Restrict key"**
   - Select only the APIs you need:
     - ✅ Generative Language API (for Gemini)
     - ❌ Uncheck everything else
   - This prevents the key from being used for other Google services

5. **Set Usage Quotas**
   - Go to **"Quotas & System Limits"**
   - Set daily/monthly request limits
   - Set up billing alerts
   - This prevents unexpected charges if someone abuses your key

### Step 2: Monitor Usage

1. **Enable API Monitoring**
   - Go to: https://console.cloud.google.com/apis/dashboard
   - Monitor daily requests
   - Set up alerts for unusual activity

2. **Check Logs Regularly**
   - Review API usage logs
   - Look for suspicious patterns
   - Rotate your key if you detect abuse

## 🚀 Alternative Solutions (Recommended for Production)

For a production application, consider these more secure approaches:

### Option 1: Add a Backend Server (Recommended)

Create a simple backend (Node.js, Python Flask, etc.) that:
- Stores the API key securely as an environment variable
- Accepts requests from your frontend
- Makes API calls to Google on behalf of the user
- Returns results to the frontend

**Example Architecture:**
```
User Browser → Your Backend Server → Google Gemini API
              (API key hidden here)
```

### Option 2: Use Firebase (Easy Setup)

1. Deploy your app to Firebase Hosting
2. Use Firebase Cloud Functions to proxy API requests
3. Store API key in Firebase environment variables
4. Frontend calls your Cloud Function instead of Google directly

### Option 3: Use Netlify/Vercel Serverless Functions

Similar to Firebase, but using Netlify or Vercel:
- Deploy to Netlify/Vercel
- Create a serverless function
- Store API key in environment variables
- Frontend calls your function

## 📝 Current Implementation

The current `app.js` file stores the API key in the `CONFIG` object:

```javascript
const CONFIG = {
    GEMINI_API_KEY: 'YOUR_API_KEY_HERE',
    // ...
};
```

**This is acceptable for:**
- ✅ Personal projects
- ✅ Demos and prototypes
- ✅ Applications with proper API restrictions set

**This is NOT recommended for:**
- ❌ Production apps with sensitive data
- ❌ Apps with high traffic
- ❌ Commercial applications

## 🔄 Next Steps

1. **Immediately**: Set up API key restrictions in Google Cloud Console (see Step 1 above)
2. **Short-term**: Monitor usage and set up billing alerts
3. **Long-term**: Consider implementing a backend solution for production use

## 📚 Additional Resources

- [Google API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
- [Restricting API Keys](https://cloud.google.com/docs/authentication/api-keys#securing_an_api_key)
- [Firebase Cloud Functions Guide](https://firebase.google.com/docs/functions)
