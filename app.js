// ===================================
// CONFIGURATION
// ===================================
const CONFIG = {
    // API key is now stored securely in Netlify environment variables
    // All API calls go through Netlify Functions
    NETLIFY_FUNCTION_URL: '/.netlify/functions/gemini-proxy',
    GEMINI_API_BASE: 'https://generativelanguage.googleapis.com/v1beta',
    IMAGEN_API_BASE: 'https://generativelanguage.googleapis.com/v1beta',
    DEFAULT_MODEL: 'gemini-2.0-flash-exp', // Latest Gemini 2.0 Flash
    IMAGE_MODEL: 'gemini-2.5-flash-image', // Gemini 2.5 Flash Image (Faster, confirmed working)
    MODELS: {
        'auto': 'gemini-2.0-flash-exp', // Auto-selects Gemini 2.0 Flash
        'gemini-2.0-flash-exp': 'gemini-2.0-flash-exp', // Gemini 2.0 Flash (Fastest, Latest)
        'gemini-2.0-flash-thinking-exp': 'gemini-2.0-flash-thinking-exp-01-21', // Gemini 2.0 with advanced reasoning
        'gemini-1.5-pro': 'gemini-1.5-pro-latest', // Gemini 1.5 Pro (Stable)
        'gemini-1.5-flash': 'gemini-1.5-flash-latest' // Gemini 1.5 Flash (Stable)
    }
};

// ===================================
// STATE MANAGEMENT
// ===================================
const state = {
    uploadedImage: null,
    uploadedImageData: null,
    transformedImage: null,
    topViewImage: null,
    inventory: null,
    currentModel: 'auto'
};

// ===================================
// DOM ELEMENTS
// ===================================
const elements = {
    // Mobile menu
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    mobileMenu: document.getElementById('mobileMenu'),

    // Hero
    heroImage: document.getElementById('heroImage'),

    // Upload
    uploadArea: document.getElementById('uploadArea'),
    fileInput: document.getElementById('fileInput'),
    imagePreview: document.getElementById('imagePreview'),
    previewImage: document.getElementById('previewImage'),
    removeImageBtn: document.getElementById('removeImageBtn'),

    // Sections
    uploadSection: document.getElementById('uploadSection'),
    optionsSection: document.getElementById('optionsSection'),
    loadingSection: document.getElementById('loadingSection'),
    resultsSection: document.getElementById('resultsSection'),

    // Options
    promptInput: document.getElementById('promptInput'),
    autoFillBtn: document.getElementById('autoFillBtn'),
    modelSelect: document.getElementById('modelSelect'),
    generateTopView: document.getElementById('generateTopView'),
    generateInventory: document.getElementById('generateInventory'),
    generateBtn: document.getElementById('generateBtn'),

    // Loading
    loadingStatus: document.getElementById('loadingStatus'),
    progressBar: document.getElementById('progressBar'),

    // Results
    transformedImage: document.getElementById('transformedImage'),
    topViewSection: document.getElementById('topViewSection'),
    topViewImage: document.getElementById('topViewImage'),
    inventorySection: document.getElementById('inventorySection'),
    inventoryContent: document.getElementById('inventoryContent'),
    newDesignBtn: document.getElementById('newDesignBtn'),
    downloadReportBtn: document.getElementById('downloadReportBtn'),
    reuseImageCheckbox: document.getElementById('reuseImageCheckbox'),
    shareBtn: document.getElementById('shareBtn')
};

// ===================================
// INITIALIZATION
// ===================================
function init() {
    // Ensure correct initial visibility
    if (elements.uploadArea) elements.uploadArea.style.display = 'block';
    if (elements.imagePreview) elements.imagePreview.style.display = 'none';
    if (elements.optionsSection) elements.optionsSection.style.display = 'none';
    if (elements.loadingSection) elements.loadingSection.style.display = 'none';
    if (elements.resultsSection) elements.resultsSection.style.display = 'none';

    setupEventListeners();
    loadHeroImage();
    setupSmoothScroll();
}

function setupEventListeners() {
    // Mobile menu
    elements.mobileMenuBtn?.addEventListener('click', toggleMobileMenu);

    // Upload
    elements.uploadArea?.addEventListener('click', (e) => {
        // Prevent infinite loop if input is clicked
        if (e.target !== elements.fileInput) {
            elements.fileInput?.click();
        }
    });
    // Stop propagation from file input to prevent double-triggering
    elements.fileInput?.addEventListener('click', (e) => e.stopPropagation());

    elements.uploadArea?.addEventListener('dragover', handleDragOver);
    elements.uploadArea?.addEventListener('dragleave', handleDragLeave);
    elements.uploadArea?.addEventListener('drop', handleDrop);
    elements.fileInput?.addEventListener('change', handleFileSelect);
    elements.removeImageBtn?.addEventListener('click', removeImage);

    // Options
    elements.autoFillBtn?.addEventListener('click', autoFillPrompt);
    elements.generateBtn?.addEventListener('click', generateTransformation);

    // Results
    elements.newDesignBtn?.addEventListener('click', resetApp);
    elements.downloadReportBtn?.addEventListener('click', downloadFullReport);
    elements.shareBtn?.addEventListener('click', shareResults);

    // Slider removed - now using simple image display

    // Close mobile menu when clicking links
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', () => {
            elements.mobileMenu?.classList.remove('active');
        });
    });
}

function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// ===================================
// MOBILE MENU
// ===================================
function toggleMobileMenu() {
    elements.mobileMenu?.classList.toggle('active');
}

// ===================================
// HERO IMAGE
// ===================================
function loadHeroImage() {
    // Load the hero image
    if (elements.heroImage) {
        elements.heroImage.src = 'hero-before.jpg';
    }
}

// ===================================
// FILE UPLOAD HANDLING
// ===================================
function handleDragOver(e) {
    e.preventDefault();
    elements.uploadArea?.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    elements.uploadArea?.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    elements.uploadArea?.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

async function handleFile(file) {
    console.log('handleFile called with:', file);

    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
    }

    // Check for HEIC/HEIF format (not supported in browsers)
    if (file.type === 'image/heic' || file.type === 'image/heif' ||
        file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
        alert('HEIC/HEIF format is not supported in web browsers.\n\nPlease convert your image to JPG or PNG format first.\n\nOn iPhone: Go to Settings > Camera > Formats and select "Most Compatible" to save photos as JPG.\n\nOr use an online converter to convert HEIC to JPG.');
        return;
    }

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
    }

    console.log('File validation passed');

    // Read file
    const reader = new FileReader();
    reader.onload = async (e) => {
        const imageData = e.target.result;
        console.log('Image data loaded, length:', imageData.length);
        console.log('Preview image element:', elements.previewImage);

        // Resize image if too large (max 1536px) to speed up API
        const resizedImageData = await resizeImage(imageData, 1536, 0.8);
        console.log('Image resized, new length:', resizedImageData.length);

        // Store in state
        state.uploadedImage = file;
        state.uploadedImageData = resizedImageData;

        // Show preview - set src first, then make visible
        if (elements.previewImage) {
            elements.previewImage.src = resizedImageData;
            console.log('Image src set to:', resizedImageData.substring(0, 50) + '...');

            // Wait for image to load before showing
            elements.previewImage.onload = () => {
                console.log('Image loaded successfully');
                elements.uploadArea.style.display = 'none';
                elements.imagePreview.style.display = 'block';
                elements.optionsSection.style.display = 'flex';
            };

            elements.previewImage.onerror = (err) => {
                console.error('Image failed to load:', err);
                alert('Failed to load image preview. Please try another image.');
            };
        } else {
            console.error('Preview image element not found!');
        }
    };

    reader.onerror = (err) => {
        console.error('FileReader error:', err);
        alert('Failed to read file. Please try again.');
    };

    reader.readAsDataURL(file);
    console.log('FileReader started');
}

// Helper: Resize image
function resizeImage(base64Str, maxWidth = 1536, quality = 0.8) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
    });

}

function removeImage() {
    state.uploadedImage = null;
    state.uploadedImageData = null;
    elements.previewImage.src = '';
    elements.uploadArea.style.display = 'block';
    elements.imagePreview.style.display = 'none';
    elements.optionsSection.style.display = 'none';
    elements.fileInput.value = '';
}

// ===================================
// AI INTEGRATION - GEMINI API
// ===================================
async function callGeminiAPI(prompt, imageData, model = null) {
    const selectedModel = model || CONFIG.MODELS[elements.modelSelect?.value || 'auto'];

    try {
        const response = await fetch(CONFIG.NETLIFY_FUNCTION_URL, {
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
            console.error('Netlify Function error response:', errorData);
            const errorMsg = errorData.error || errorData.details || errorData.message || response.statusText;
            throw new Error(`API Error: ${errorMsg}`);
        }

        const data = await response.json();

        // Check if response has valid candidates
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            console.error('Invalid API response:', data);
            throw new Error('API returned no valid response. The model may not support this request.');
        }

        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Gemini API Error:', error);
        throw error;
    }
}


async function generateImageWithGemini(prompt, referenceImageData) {
    try {
        // Nano Banana (Gemini 2.5 Flash Image) does image-to-image editing
        // It takes the original image and modifies it based on the prompt

        const editPrompt = `Edit this photo: Keep ALL walls, windows, doors, and building structures EXACTLY as they are. Only modify the landscaping (grass, plants, flowers). ${prompt}. 
        CRITICAL INSTRUCTION: You MUST overlay CLEAR, VISIBLE WHITE CIRCLES with BLACK NUMBERS (1, 2, 3...) on top of the key PLANTS and TREES you add.
        - Focus numbering on the greenery (trees, shrubs, flowers).
        - Only number major hardscape features if they are central to the design.
        - The numbers must be large enough to be read.
        - Place them directly on or next to the new items.
        
        Return the edited image.`;

        console.log('Using Nano Banana (Gemini 2.5 Flash Image) for image editing...');

        // Call Gemini with both image and edit instructions
        const imageUrl = await callNanoBananaAPI(editPrompt, referenceImageData);

        return imageUrl;
    } catch (error) {
        console.error('Image generation error:', error);

        // Fallback to description
        console.log('Falling back to description-based generation...');
        const description = await callGeminiAPI(
            `Describe a landscape transformation: ${prompt}`,
            referenceImageData
        );
        return await generatePlaceholderImage(800, 600, description);
    }
}


async function callNanoBananaAPI(prompt, imageData) {
    try {
        console.log('Calling Netlify Function for image generation...');

        const response = await fetch(CONFIG.NETLIFY_FUNCTION_URL, {
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
            console.error('Netlify Function error:', error);
            throw new Error(error.error || JSON.stringify(error) || 'API request failed');
        }

        const data = await response.json();
        console.log('Image generation response received');

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
        console.error('Image generation API call failed:', error);
        throw error;
    }
}


async function callImagenAPI(prompt, modelVersion = 'imagen-4.0-generate-001') {
    try {
        const requestBody = {
            instances: [
                {
                    prompt: prompt
                }
            ],
            parameters: {
                sampleCount: 1,
                aspectRatio: "16:9",
                safetyFilterLevel: "block_some",
                personGeneration: "dont_allow"
            }
        };

        console.log(`Calling Imagen API (${modelVersion}) with prompt:`, prompt.substring(0, 200) + '...');

        const response = await fetch(
            `${CONFIG.IMAGEN_API_BASE}/models/${modelVersion}:predict`,
            {
                method: 'POST',
                headers: {
                    'x-goog-api-key': CONFIG.GEMINI_API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            }
        );

        const data = await response.json();
        console.log('Imagen API full response:', JSON.stringify(data, null, 2));

        if (!response.ok) {
            console.error('Imagen API error response:', data);

            // If Imagen 4 fails, try Imagen 3
            if (modelVersion === 'imagen-4.0-generate-001') {
                console.log('Imagen 4 failed, trying Imagen 3...');
                return await callImagenAPI(prompt, 'imagen-3.0-generate-001');
            }

            throw new Error(`Imagen API Error: ${data.error?.message || response.statusText}`);
        }

        // Extract the generated image from the response
        if (data.predictions && data.predictions[0]) {
            const prediction = data.predictions[0];
            console.log('Prediction object:', prediction);

            // The image is in bytesBase64Encoded or mimeType + bytesBase64Encoded
            if (prediction.bytesBase64Encoded) {
                return `data:image/png;base64,${prediction.bytesBase64Encoded}`;
            } else if (prediction.image && prediction.image.bytesBase64Encoded) {
                return `data:image/png;base64,${prediction.image.bytesBase64Encoded}`;
            } else {
                console.error('Unexpected response format:', prediction);
                throw new Error('No image data in Imagen response - unexpected format');
            }
        } else {
            console.error('No predictions in response. Full response:', data);

            // Check if it's an access/permission error
            if (data.error) {
                throw new Error(`Imagen API Error: ${data.error.message || 'Unknown error'}`);
            }

            throw new Error('No predictions in Imagen response - API may not be enabled for your account');
        }
    } catch (error) {
        console.error('Imagen API call failed:', error);
        throw error;
    }
}

async function generateTopDownView(transformationDescription, originalImageData) {
    try {
        // Step 1: Analyze the property layout
        const layoutPrompt = `Analyze this property image and describe the layout from a top-down perspective:
1. Property boundaries and dimensions
2. Building footprint and structure
3. Current landscape elements and their positions
4. Pathways, driveways, and hardscaping
5. Spatial relationships between elements`;

        const layoutAnalysis = await callGeminiAPI(layoutPrompt, originalImageData);
        console.log('Layout analysis:', layoutAnalysis);

        // Step 2: Create prompt for top-down architectural view
        const topDownPrompt = `Create a professional top-down architectural plan view of this property with the landscape transformation applied.

REQUIREMENTS:
- Bird's eye view / aerial perspective looking straight down
- Architectural style plan with clear boundaries
- Show building footprint, pathways, and all landscape elements
- Professional landscape architecture drawing style
- Include the transformation: ${transformationDescription}

PROPERTY LAYOUT:
${layoutAnalysis}

Generate a clean, professional top-down architectural plan that shows the property layout with the new landscape design. Style should be like a landscape architect's plan view.`;

        console.log('Generating top-down view with Imagen 3...');
        const imageUrl = await callImagenAPI(topDownPrompt);
        return imageUrl;
    } catch (error) {
        console.error('Top-down view generation error:', error);

        // Fallback to placeholder
        const description = await callGeminiAPI(
            `Describe a top-down view of: ${transformationDescription}`,
            originalImageData
        );
        return await generatePlaceholderImage(800, 800, `Top-down view: ${description}`);
    }
}

async function generateInventoryList(transformationDescription, transformedImageUrl) {
    let prompt;
    let result;

    if (transformedImageUrl) {
        // Multimodal: Look at the image and identify numbered items
        prompt = `Look at this landscape design image. Identify the numbered markers (1, 2, 3...) which mark the PLANTS and TREES.
        
        Create a strictly formatted legend list focusing on the vegetation.
        DO NOT say "Okay" or "Here is the list". Start directly with the first item.
        
        Format exactly like this:
        1. **[Plant/Tree Name]**: [Short description]
        2. **[Plant/Tree Name]**: [Short description]
        
        If there are numbered hardscape features, list them as well, but prioritize the plants.`;

        // Use the multimodal API
        result = await callGeminiAPI(prompt, transformedImageUrl);
    } else {
        // Fallback: Text-only generation
        prompt = `Based on this landscape transformation description: "${transformationDescription}", 
        create a simple list of plants and features.
        
        DO NOT include any conversational text. Start directly with the list.
        
        Format:
        1. **[Item Name]**: [Short description]
        2. **[Item Name]**: [Short description]`;

        result = await callGeminiAPITextOnly(prompt);
    }

    return result;
}

async function callGeminiAPITextOnly(prompt) {
    const selectedModel = CONFIG.MODELS[elements.modelSelect?.value || 'auto'];

    try {
        const response = await fetch(CONFIG.NETLIFY_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: selectedModel,
                prompt: prompt,
                generationConfig: {
                    temperature: 0.7,
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
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Gemini API Error:', error);
        throw error;
    }
}

// ===================================
// AUTO-FILL PROMPT
// ===================================
async function autoFillPrompt() {
    if (!state.uploadedImageData) {
        alert('Please upload an image first');
        return;
    }

    elements.autoFillBtn.disabled = true;
    elements.autoFillBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="spinning"><circle cx="8" cy="8" r="6" stroke="currentColor" fill="none" stroke-width="2"/></svg> Analyzing...';

    try {
        const prompt = `Analyze this property image and suggest ONE single, best creative landscape transformation idea.
        
        Provide a concise, descriptive paragraph describing the new design, including specific plants, style, and features.
        
        Do not use bullet points or lists. Just write it as a clear instruction for a designer.`;

        const suggestions = await callGeminiAPI(prompt, state.uploadedImageData);
        elements.promptInput.value = suggestions;
    } catch (error) {
        console.error('Auto-fill error:', error);

        // Check if it's a quota error
        if (error.message.includes('quota') || error.message.includes('exceeded')) {
            alert('⚠️ API Quota Exceeded\n\nThe Gemini API has reached its usage limit.\n\nPlease:\n1. Wait a few minutes and try again\n2. Or manually describe your landscape vision in the text box below\n\nYou can still generate transformations by typing your own description!');
        } else {
            alert('Failed to generate AI suggestions.\n\nPlease manually describe your desired landscape transformation in the text box below.');
        }
    } finally {
        elements.autoFillBtn.disabled = false;
        elements.autoFillBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0L10 6H16L11 10L13 16L8 12L3 16L5 10L0 6H6L8 0Z"/></svg> Auto-fill with AI';
    }
}

// ===================================
// GENERATE TRANSFORMATION
// ===================================
async function generateTransformation() {
    if (!state.uploadedImageData) {
        alert('Please upload an image first');
        return;
    }

    const prompt = elements.promptInput.value.trim();
    if (!prompt) {
        alert('Please describe your desired transformation');
        return;
    }

    // Show loading
    elements.optionsSection.style.display = 'none';
    elements.loadingSection.style.display = 'block';

    try {
        // Step 1: Generate transformation (40%)
        updateProgress(10, 'Analyzing your property...');
        await sleep(500);

        updateProgress(40, 'Creating your dream landscape...');
        const transformedImageUrl = await generateImageWithGemini(prompt, state.uploadedImageData);
        state.transformedImage = transformedImageUrl;

        // Step 2: Generate inventory if requested (90%)
        let inventory = null;
        if (elements.generateInventory.checked) {
            updateProgress(90, 'Creating smart inventory...');
            // Pass the transformed image to generate inventory legend
            inventory = await generateInventoryList(prompt, transformedImageUrl);
            state.inventory = inventory;
        }

        // Complete
        updateProgress(100, 'Finalizing your design...');
        await sleep(500);

        // Add result to list (stacking)
        // Pass original image data as the second argument
        addResultItem(prompt, state.uploadedImageData, transformedImageUrl, inventory);

        // Show results section
        elements.loadingSection.style.display = 'none';
        elements.resultsSection.style.display = 'block';

        // Scroll to the new result
        const resultsList = document.getElementById('resultsList');
        if (resultsList.lastElementChild) {
            resultsList.lastElementChild.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        console.error('Generation error:', error);

        // Provide user-friendly error messages
        let errorMessage = 'Failed to generate transformation.\n\n';

        if (error.message.includes('quota') || error.message.includes('exceeded')) {
            errorMessage += '⚠️ API Quota Exceeded\n\nThe Gemini API has reached its usage limit. This happens when:\n• Too many requests in a short time\n• Daily/monthly quota is reached\n\nSolutions:\n1. Wait 1-2 hours and try again\n2. Use a different API key\n3. Check your Google Cloud Console for quota limits\n\nNote: The free tier has limited requests per minute.';
        } else if (error.message.includes('API Error')) {
            errorMessage += `API Error: ${error.message}\n\nPlease check:\n• Your internet connection\n• API key is valid\n• Try again in a few moments`;
        } else {
            errorMessage += error.message;
        }

        alert(errorMessage);
        elements.loadingSection.style.display = 'none';
        elements.optionsSection.style.display = 'flex';
    }
}

function updateProgress(percent, status) {
    elements.progressBar.style.width = `${percent}%`;
    elements.loadingStatus.textContent = status;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===================================
// SHOW RESULTS
// ===================================
function addResultItem(prompt, originalImageUrl, transformedImageUrl, inventoryText) {
    const resultsList = document.getElementById('resultsList');

    // Check if we need to display the original image (if it's new)
    if (originalImageUrl !== state.lastDisplayedOriginalImage) {
        const originalItem = document.createElement('div');
        originalItem.className = 'result-item';
        originalItem.style.marginBottom = '2rem';
        originalItem.style.border = '2px solid var(--color-primary)'; // Highlight original

        originalItem.innerHTML = `
            <div class="result-prompt" style="border-bottom: none; margin-bottom: 1rem;">
                <span class="prompt-label" style="color: var(--color-primary);">Original Property</span>
            </div>
            <div class="transformed-image-container" style="margin-bottom: 0;">
                <img src="${originalImageUrl}" alt="Original Landscape" class="transformed-image">
            </div>
        `;
        resultsList.appendChild(originalItem);

        // Update state
        state.lastDisplayedOriginalImage = originalImageUrl;
    }

    // Create result item container for the transformation
    const resultItem = document.createElement('div');
    resultItem.className = 'result-item';

    // 1. Prompt Section
    const promptSection = document.createElement('div');
    promptSection.className = 'result-prompt';
    promptSection.innerHTML = `
        <span class="prompt-label">Transformation Vision</span>
        <p class="prompt-text">${prompt}</p>
    `;
    resultItem.appendChild(promptSection);

    // 2. Transformed Image (Stacked & Big)
    const imageContainer = document.createElement('div');
    imageContainer.className = 'transformed-image-container';
    imageContainer.style.marginBottom = '2rem';
    imageContainer.innerHTML = `<img src="${transformedImageUrl}" alt="Transformed Landscape" class="transformed-image">`;
    resultItem.appendChild(imageContainer);

    // 3. Inventory Legend (if available)
    if (inventoryText) {
        const inventorySection = document.createElement('div');
        inventorySection.className = 'inventory-section';
        inventorySection.innerHTML = `
            <div class="inventory-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h4 class="inventory-title" style="margin-bottom: 0;">Smart Inventory & Legend</h4>
            </div>
            <div class="inventory-content">
                ${formatInventory(inventoryText)}
            </div>
        `;
        resultItem.appendChild(inventorySection);
    }

    // 4. Action Buttons
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'results-actions';
    actionsDiv.style.marginTop = '1.5rem';
    actionsDiv.style.borderTop = '1px solid var(--color-gray-light)';
    actionsDiv.style.paddingTop = '1rem';

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn-secondary';
    downloadBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download Design Package
    `;
    downloadBtn.onclick = () => downloadResultItem(transformedImageUrl, inventoryText);

    actionsDiv.appendChild(downloadBtn);
    resultItem.appendChild(actionsDiv);

    // Append to list
    resultsList.appendChild(resultItem);
}

function downloadResultItem(imageUrl, inventoryText) {
    // Download Transformed Image
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = 'ubahlans-transformation.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Download Inventory (if exists)
    if (inventoryText) {
        setTimeout(() => {
            const blob = new Blob([inventoryText], { type: 'text/plain' });
            const link3 = document.createElement('a');
            link3.href = URL.createObjectURL(blob);
            link3.download = 'ubahlans-inventory.txt';
            document.body.appendChild(link3);
            link3.click();
            document.body.removeChild(link3);
        }, 500);
    }
}

async function downloadFullReport() {
    const resultsList = document.getElementById('resultsList');
    if (!resultsList || resultsList.children.length === 0) {
        alert('No designs to download yet.');
        return;
    }

    const btn = elements.downloadReportBtn;
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Generating...';
    btn.disabled = true;

    try {
        // Create and add report header
        const reportHeader = document.createElement('div');
        reportHeader.className = 'report-header';
        reportHeader.style.display = 'block'; // Force display for capture

        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        reportHeader.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h1 style="margin: 0; font-size: 1.75rem; font-weight: 700;">UbahLans</h1>
                    <p style="margin: 0.25rem 0 0 0; font-size: 0.95rem; opacity: 0.9;">AI-Powered Landscape Design Report</p>
                </div>
                <div style="text-align: right;">
                    <p style="margin: 0; font-size: 0.9rem; opacity: 0.9;">Generated: ${currentDate}</p>
                    <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem; opacity: 0.8;">${resultsList.children.length} Design${resultsList.children.length > 1 ? 's' : ''}</p>
                </div>
            </div>
        `;

        // Insert header at the beginning of results list
        resultsList.insertBefore(reportHeader, resultsList.firstChild);

        // Use html2canvas to capture the results list
        const canvas = await html2canvas(resultsList, {
            scale: 2, // Higher quality
            useCORS: true, // Allow cross-origin images
            backgroundColor: '#ffffff',
            logging: false
        });

        // Remove the header after capture
        reportHeader.remove();

        // Convert to blob and download
        canvas.toBlob((blob) => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `ubahlans-report-${new Date().toISOString().split('T')[0]}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 'image/jpeg', 0.95);

    } catch (error) {
        console.error('Report generation failed:', error);
        alert('Failed to generate report. Please try again.');
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function formatInventory(inventoryText) {
    // Clean up conversational text
    let html = inventoryText;

    // Aggressive cleanup: Find the first list item or bold header and discard everything before it
    // Look for: "1.", "-", "*", or "**" at the start of a line
    const listStartIndex = html.search(/^(\d+\.|-|\*|\*\*)/m);

    if (listStartIndex >= 0) {
        html = html.substring(listStartIndex);
    } else {
        // Fallback: If no clear list start, try to strip common intros
        html = html.replace(/^(Okay|Sure|Here|Certainly|I have|The list|Legend:|\*\*Legend:\*\*).*?(\n|$)/gim, '');
    }

    // Convert **bold** to <h5> for items
    html = html.replace(/\*\*(.*?)\*\*/g, '<h5>$1</h5>');

    // Convert numbered lists (1. Item: Desc)
    html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<div class="inventory-item"><div class="inventory-number">$1</div><div class="inventory-details">$2</div></div>');

    // Convert bullet points
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');

    // Wrap lists in <ul>
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Convert newlines to breaks for other text
    html = html.replace(/\n/g, '<br>');

    return html;
}

// Slider functionality removed - using simple image display

// ===================================
// RESET APP
// ===================================
function resetApp() {
    const reuseImage = elements.reuseImageCheckbox?.checked;

    // Reset state
    if (!reuseImage) {
        state.uploadedImage = null;
        state.uploadedImageData = null;

        // Reset UI for Image
        // Clear handlers first to prevent errors when clearing src
        elements.previewImage.onload = null;
        elements.previewImage.onerror = null;
        elements.previewImage.src = '';
        elements.fileInput.value = '';

        elements.uploadArea.style.display = 'block';
        elements.imagePreview.style.display = 'none';
        elements.optionsSection.style.display = 'none';

        // Scroll to upload section
        elements.uploadSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        // Keeping image, just reset prompt and scroll to options
        elements.optionsSection.style.display = 'flex'; // Ensure visible
        // Scroll to options section
        elements.optionsSection.scrollIntoView({ behavior: 'smooth' });
    }

    state.transformedImage = null;
    state.topViewImage = null;
    state.inventory = null;
    // state.lastDisplayedOriginalImage = null; // REMOVED: Do not reset this, so we remember what we showed!

    // Reset Prompt
    elements.promptInput.value = '';

    // Only hide results section if there are no results (keep them if stacking)
    const resultsList = document.getElementById('resultsList');
    if (!resultsList || resultsList.children.length === 0) {
        elements.resultsSection.style.display = 'none';
    }
    elements.progressBar.style.width = '0%';
}

// ===================================
// DOWNLOAD IMAGES
// ===================================
async function downloadImages() {
    const images = [
        { url: state.uploadedImageData, name: 'original.jpg' },
        { url: state.transformedImage, name: 'transformed.jpg' }
    ];

    if (state.topViewImage) {
        images.push({ url: state.topViewImage, name: 'top-view.jpg' });
    }

    for (const img of images) {
        const link = document.createElement('a');
        link.href = img.url;
        link.download = img.name;
        link.click();
        await sleep(100);
    }
}

// ===================================
// SHARE RESULTS
// ===================================
async function shareResults() {
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'UbahLans - My Landscape Transformation',
                text: 'Check out my AI-generated landscape transformation!',
                url: window.location.href
            });
        } catch (error) {
            console.log('Share cancelled or failed:', error);
        }
    } else {
        // Fallback: copy link
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            alert('Link copied to clipboard!');
        });
    }
}

// ===================================
// PLACEHOLDER IMAGE GENERATION
// ===================================
async function generatePlaceholderImage(width, height, description) {
    // Create a canvas with a gradient and text
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#10b981');
    gradient.addColorStop(0.5, '#059669');
    gradient.addColorStop(1, '#047857');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add overlay pattern
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i < width; i += 40) {
        for (let j = 0; j < height; j += 40) {
            ctx.fillRect(i, j, 20, 20);
        }
    }

    // Add text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lines = wrapText(ctx, description, width - 100);
    const lineHeight = 35;
    const startY = (height - (lines.length * lineHeight)) / 2;

    lines.forEach((line, index) => {
        ctx.fillText(line, width / 2, startY + (index * lineHeight));
    });

    // Add watermark
    ctx.font = '16px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('Generated by UbahLans AI', width / 2, height - 30);

    return canvas.toDataURL('image/jpeg', 0.9);
}

function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    });

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines.slice(0, 5); // Limit to 5 lines
}

// ===================================
// START APP
// ===================================
document.addEventListener('DOMContentLoaded', init);
