# UbahLans - AI-Powered Landscape Design

Transform outdoor spaces with AI-generated landscape designs in minutes.

## 🚀 Features

- **AI Transformation**: Upload a photo and describe your vision to get photorealistic landscape designs
- **Numbered Plant Legend**: Automatic plant identification with numbered markers and matching legend
- **Smart Inventory**: Detailed list of plants and features for cost estimation
- **Professional Reports**: Download comprehensive reports with original photos, transformations, and inventories
- **Multiple Iterations**: Create multiple design options from the same property photo

## 🔧 Setup

1. Clone this repository
2. Get a Google Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
3. Update the API key in `app.js`:
   ```javascript
   const CONFIG = {
       GEMINI_API_KEY: 'YOUR_API_KEY_HERE',
       // ...
   };
   ```
4. Open `index.html` in your browser or deploy to GitHub Pages

## 🔒 API Key Security

**Important**: For client-side applications like this, the API key will be visible in the code. To protect your key:

1. **Set HTTP Referrer Restrictions** in Google Cloud Console
   - Only allow requests from your domain (e.g., `https://yourusername.github.io/*`)
   
2. **Restrict API Access**
   - Only enable Generative Language API
   - Disable all other Google APIs
   
3. **Set Usage Quotas**
   - Configure daily/monthly request limits
   - Set up billing alerts

4. **For Production**: Use a backend server to hide the API key (see `API_KEY_SECURITY.md` for details)

📖 **Read the full security guide**: [API_KEY_SECURITY.md](./API_KEY_SECURITY.md)

## 📦 Deployment

### GitHub Pages

1. Push your code to GitHub
2. Go to repository Settings → Pages
3. Select your branch and save
4. Your app will be available at `https://yourusername.github.io/repository-name`

**Before deploying**:
- ✅ Set up API key restrictions in Google Cloud Console
- ✅ Add your GitHub Pages URL to allowed referrers
- ✅ Set usage quotas

## 🛠️ Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **AI**: Google Gemini API (gemini-3-pro-image-preview, gemini-2.0-flash-exp)
- **Image Capture**: html2canvas
- **Hosting**: GitHub Pages (or any static hosting)

## 📝 License

MIT License - feel free to use this for your projects!

## ⚠️ Disclaimer

This is a demo application. For production use with sensitive data or high traffic, implement a backend server to secure your API key.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
