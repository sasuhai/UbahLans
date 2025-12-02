// ===================================
// CONFIGURATION
// ===================================

// Check if local config exists (for development)
const USE_LOCAL_CONFIG = window.LOCAL_CONFIG && window.LOCAL_CONFIG.USE_LOCAL_API_KEY;

const CONFIG = {
    // For local development: Use API key directly
    // For production: Use Netlify Functions
    GEMINI_API_KEY: USE_LOCAL_CONFIG ? window.LOCAL_CONFIG.GEMINI_API_KEY : null,
    USE_DIRECT_API: USE_LOCAL_CONFIG,
    NETLIFY_FUNCTION_URL: '/.netlify/functions/gemini-proxy',
    GEMINI_API_BASE: 'https://generativelanguage.googleapis.com/v1beta',
    IMAGEN_API_BASE: 'https://generativelanguage.googleapis.com/v1beta',
    DEFAULT_MODEL: 'gemini-2.0-flash-exp', // Latest available Gemini 2.0 Flash (Text/Vision)
    IMAGE_MODEL: 'gemini-2.0-flash-preview-image-generation', // Actual image generation model (10 RPM)
    MODELS: {
        'auto': 'gemini-2.0-flash-exp', // Auto-selects latest available Gemini 2.0 Flash
        'gemini-2.0-flash-exp': 'gemini-2.0-flash-exp', // Gemini 2.0 Flash Experimental (Latest available)
        'gemini-2.0-flash-thinking-exp': 'gemini-2.0-flash-thinking-exp-01-21', // Gemini 2.0 with advanced reasoning
        'gemini-exp-1206': 'gemini-exp-1206', // Gemini 2.0 Experimental (December 2024)
        'gemini-1.5-pro': 'gemini-1.5-pro-latest', // Gemini 1.5 Pro (Stable)
        'gemini-1.5-flash': 'gemini-1.5-flash-latest' // Gemini 1.5 Flash (Stable)
    }
};

// Log configuration mode
console.log(USE_LOCAL_CONFIG ? '🔧 Using LOCAL API key for development' : '🚀 Using Netlify Functions for production');

// ===================================
// AUTO-UPDATE TO LATEST MODELS
// ===================================
async function checkAndUpdateLatestModels() {
    if (!CONFIG.USE_DIRECT_API || !CONFIG.GEMINI_API_KEY) {
        console.log('⏭️ Skipping model check (using Netlify Functions)');
        return;
    }

    try {
        console.log('🔍 Checking for latest available models...');

        const response = await fetch(
            `${CONFIG.GEMINI_API_BASE}/models?key=${CONFIG.GEMINI_API_KEY}`
        );

        if (!response.ok) {
            console.warn('⚠️ Could not fetch model list, using defaults');
            return;
        }

        const data = await response.json();
        const models = data.models || [];

        console.log(`📋 Found ${models.length} total models`);

        // Priority list of actual image generation models (from Google AI Studio)
        const preferredImageModels = [
            'gemini-3-pro-image-preview',                    // Best: Gemini 3 Pro (20 RPM, best reasoning)
            'imagen-3.0-generate-001',                       // Best quality: Imagen 3 (20 RPM)
            'gemini-2.0-flash-preview-image-generation',     // Fastest: Gemini 2.0 Flash (10 RPM)
        ];

        // Find the first available preferred model
        let selectedImageModel = null;
        for (const preferredModel of preferredImageModels) {
            const found = models.find(m => m.name.includes(preferredModel));
            if (found) {
                selectedImageModel = found;
                console.log(`✨ Found preferred image model: ${preferredModel}`);
                break;
            }
        }

        // Fallback: filter for any image generation models
        if (!selectedImageModel) {
            const imageModels = models.filter(m =>
                m.supportedGenerationMethods?.includes('generateContent') &&
                (m.name.includes('image') || m.name.includes('imagen')) &&
                !m.name.includes('vision')
            );

            console.log('📸 All available image generation models:');
            imageModels.forEach(m => console.log('  -', m.name));

            selectedImageModel = imageModels[0];
        }

        // Text models
        const textModels = models.filter(m =>
            m.supportedGenerationMethods?.includes('generateContent') &&
            !m.name.includes('image') &&
            !m.name.includes('imagen')
        );

        console.log(`🖼️ Image model selected: ${selectedImageModel?.name || 'none'}`);
        console.log(`📝 Found ${textModels.length} text models`);

        const latestTextModel = textModels.find(m => m.name.includes('2.0-flash-exp')) ||
            textModels.find(m => m.name.includes('2.0')) ||
            textModels.find(m => m.name.includes('1.5')) ||
            textModels[0];

        if (selectedImageModel) {
            const modelName = selectedImageModel.name.replace('models/', '');
            CONFIG.IMAGE_MODEL = modelName;
            console.log('✅ Updated IMAGE_MODEL to:', modelName);
        }

        if (latestTextModel) {
            const modelName = latestTextModel.name.replace('models/', '');
            CONFIG.DEFAULT_MODEL = modelName;
            CONFIG.MODELS['auto'] = modelName;
            console.log('✅ Updated DEFAULT_MODEL to:', modelName);
        }

        console.log('🎉 Using latest available models!');

    } catch (error) {
        console.warn('⚠️ Error checking models, using defaults:', error.message);
    }
}

// ===================================
// STATE MANAGEMENT
// ===================================
const state = {
    uploadedImage: null,
    uploadedImageData: null,
    transformedImage: null,
    topViewImage: null,
    inventory: null,
    currentModel: 'auto',
    isRemovingImage: false
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
    modeSelection: document.getElementById('modeSelection'),
    optionsSection: document.getElementById('optionsSection'),
    loadingSection: document.getElementById('loadingSection'),
    resultsSection: document.getElementById('resultsSection'),

    // Options
    promptInput: document.getElementById('promptInput'),
    autoFillBtn: document.getElementById('autoFillBtn'),
    modelSelect: document.getElementById('modelSelect'),
    inventoryLanguage: document.getElementById('inventoryLanguage'),
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

    // Check for latest models
    checkAndUpdateLatestModels();

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

    // Error Modal
    document.getElementById('errorModalClose')?.addEventListener('click', closeErrorModal);
    document.getElementById('errorModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'errorModal' || e.target.classList.contains('error-modal-overlay')) {
            closeErrorModal();
        }
    });

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
// ERROR MODAL
// ===================================
function showErrorModal(title, message) {
    const modal = document.getElementById('errorModal');
    const modalTitle = document.getElementById('errorModalTitle');
    const modalBody = document.getElementById('errorModalBody');


    if (modal && modalTitle && modalBody) {
        modalTitle.textContent = title;
        modalBody.textContent = message;
        modal.style.display = 'flex';

        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
    }
}

function closeErrorModal() {
    const modal = document.getElementById('errorModal');
    if (modal) {
        modal.style.display = 'none';

        // Restore body scroll
        document.body.style.overflow = '';
    }
}

// Success modal function (reuses error modal with different styling)
function showSuccessModal(title, message) {
    const modal = document.getElementById('errorModal');
    const modalTitle = document.getElementById('errorModalTitle');
    const modalBody = document.getElementById('errorModalBody');
    const modalIcon = document.querySelector('.error-modal-icon');

    if (modal && modalTitle && modalBody) {
        modalTitle.textContent = title;
        modalBody.textContent = message;

        // Change icon to success checkmark
        if (modalIcon) {
            modalIcon.textContent = '✅';
        }

        modal.style.display = 'flex';

        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';

        // Auto-close after 2 seconds for success messages
        setTimeout(() => {
            closeErrorModal();
            // Restore error icon
            if (modalIcon) {
                modalIcon.textContent = '⚠️';
            }
        }, 2000);
    }
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeErrorModal();
    }
});


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
        showErrorModal('No Image Selected', 'Please upload an image file to continue.');
        return;
    }

    // Check for HEIC/HEIF format and convert to JPG
    if (file.type === 'image/heic' || file.type === 'image/heif' ||
        file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {

        console.log('HEIC/HEIF file detected, converting to JPG...');

        // Check if heic2any library is available
        if (typeof heic2any === 'undefined') {
            console.error('heic2any library not loaded');
            showErrorModal(
                'HEIC Converter Not Available',
                'The HEIC converter library failed to load. Please try uploading a JPG or PNG image instead.\n\nOn iPhone: Go to Settings > Camera > Formats and select "Most Compatible" to save photos as JPG.'
            );
            return;
        }

        try {
            // Show a brief loading message
            const uploadArea = elements.uploadArea;
            const originalHTML = uploadArea.innerHTML;
            uploadArea.innerHTML = `
                <div class="upload-content">
                    <div class="loading-spinner" style="margin: 0 auto 1rem;"></div>
                    <h3 class="upload-title">Converting HEIC to JPG...</h3>
                    <p class="upload-hint">Please wait a moment</p>
                </div>
            `;

            console.log('Starting HEIC conversion, file size:', file.size);

            // Convert HEIC to JPG using heic2any
            let convertedBlob = await heic2any({
                blob: file,
                toType: 'image/jpeg',
                quality: 0.9
            });

            // heic2any might return an array of blobs, take the first one
            if (Array.isArray(convertedBlob)) {
                console.log('heic2any returned array, taking first blob');
                convertedBlob = convertedBlob[0];
            }

            console.log('Conversion complete, blob size:', convertedBlob.size);

            // Create a new File object from the converted blob
            const convertedFile = new File(
                [convertedBlob],
                file.name.replace(/\.(heic|heif)$/i, '.jpg'),
                { type: 'image/jpeg' }
            );

            console.log('✅ HEIC conversion successful, new file:', convertedFile.name);

            // Restore original upload area
            uploadArea.innerHTML = originalHTML;

            // Continue processing with the converted file
            file = convertedFile;

        } catch (error) {
            console.error('HEIC conversion error:', error);
            console.error('Error details:', error.message, error.code);

            let errorMessage = '⚠️ Unable to convert this HEIC file\n\n';

            // Provide specific error messages based on error type
            if (error.code === 2 || (error.message && error.message.includes('format not supported'))) {
                errorMessage += 'This HEIC file uses a newer format that cannot be converted in the browser.\n\n';
                errorMessage += '📱 For iPhone users - Change your camera settings:\n';
                errorMessage += '1. Open Settings app\n';
                errorMessage += '2. Go to Camera → Formats\n';
                errorMessage += '3. Select "Most Compatible"\n';
                errorMessage += '4. Take a new photo and upload again\n\n';
                errorMessage += '💡 Or convert this file using:\n';
                errorMessage += '• AirDrop to Mac and convert\n';
                errorMessage += '• Use an online HEIC to JPG converter\n';
                errorMessage += '• Share via Messages (auto-converts to JPG)';
            } else if (error.message && error.message.includes('parse')) {
                errorMessage += 'The file appears to be corrupted or in an unsupported format.\n\n';
                errorMessage += 'Please try:\n';
                errorMessage += '1. Taking a new photo\n';
                errorMessage += '2. Converting to JPG using another app\n';
                errorMessage += '3. Changing iPhone camera settings to "Most Compatible"';
            } else {
                errorMessage += 'Please convert your image to JPG or PNG format.\n\n';
                errorMessage += 'iPhone users: Settings → Camera → Formats → "Most Compatible"';
            }

            // Show error modal instead of alert
            showErrorModal('Unable to Convert HEIC File', errorMessage);

            // Restore original upload area
            const uploadArea = elements.uploadArea;
            uploadArea.innerHTML = `
                <input type="file" id="fileInput" accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.heic,.heif" hidden>
                <div class="upload-content">
                    <div class="upload-icon">
                        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                            <circle cx="32" cy="32" r="30" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4" />
                            <path d="M32 20V44M20 32H44" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
                        </svg>
                    </div>
                    <h3 class="upload-title">Drop your image here or click to browse</h3>
                    <p class="upload-hint">Supports: JPG, PNG, WebP, HEIC (Max 10MB)</p>
                </div>
            `;
            // Re-attach event listeners
            setupEventListeners();
            return;
        }
    }

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
        showErrorModal('File Too Large', 'File size must be less than 10MB. Please choose a smaller image.');
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
                elements.modeSelection.style.display = 'block';

                // Set up mode change listener
                setupModeListeners();
            };

            elements.previewImage.onerror = (err) => {
                // Only show error if this is not an intentional image removal
                if (!state.isRemovingImage) {
                    console.error('Image failed to load:', err);
                    showErrorModal('Image Load Failed', 'Failed to load image preview. Please try a different image.');
                }
            };
        } else {
            console.error('Preview image element not found!');
        }
    };

    reader.onerror = (err) => {
        console.error('FileReader error:', err);
        showErrorModal('File Read Error', 'Failed to read file. Please try again.');
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
    // Set flag to prevent error message when clearing the image
    state.isRemovingImage = true;

    state.uploadedImage = null;
    state.uploadedImageData = null;
    elements.previewImage.src = '';
    elements.uploadArea.style.display = 'block';
    elements.imagePreview.style.display = 'none';
    elements.modeSelection.style.display = 'none';
    elements.optionsSection.style.display = 'none';
    elements.fileInput.value = '';

    // Reset flag after a short delay
    setTimeout(() => {
        state.isRemovingImage = false;
    }, 100);
}

// ===================================
// MODE SELECTION
// ===================================
function setupModeListeners() {
    const modeRadios = document.querySelectorAll('input[name="mode"]');

    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const selectedMode = e.target.value;
            handleModeChange(selectedMode);
        });
    });

    // Trigger initial mode setup
    const checkedMode = document.querySelector('input[name="mode"]:checked');
    if (checkedMode) {
        handleModeChange(checkedMode.value);
    }
}

function handleModeChange(mode) {
    console.log('Mode changed to:', mode);

    if (mode === 'transform') {
        // Show transform options
        elements.optionsSection.style.display = 'flex';
        elements.generateBtn.textContent = 'Create New Design';

        // Show all transform-specific options
        if (elements.promptInput) elements.promptInput.closest('.option-group').style.display = 'flex';
        if (elements.generateTopView) elements.generateTopView.closest('.option-group').style.display = 'flex';
        if (elements.generateInventory) elements.generateInventory.closest('.option-group').style.display = 'flex';

    } else if (mode === 'analyze') {
        // Show analyze options
        elements.optionsSection.style.display = 'flex';
        elements.generateBtn.textContent = 'Generate Infographic';

        // Hide transform-specific options
        if (elements.promptInput) elements.promptInput.closest('.option-group').style.display = 'none';
        if (elements.generateTopView) elements.generateTopView.closest('.option-group').style.display = 'none';
        if (elements.generateInventory) elements.generateInventory.closest('.option-group').style.display = 'none';
    }
}

// ===================================
// INFOGRAPHIC GENERATION
// ===================================
async function generateInfographic() {
    const language = elements.inventoryLanguage?.value || 'english';

    const languageInstructions = {
        english: 'Label all plants and trees with their common English names only.',
        malay: 'Label all plants and trees with their Bahasa Malaysia names only.',
        both: 'Label all plants and trees bilingually. Format each label with the English name in regular font on the first line, and the Bahasa Malaysia name in smaller italic font in parentheses on the second line.'
    };

    const prompt = `Transform this garden/landscape photo into a simplified illustrated infographic with plant labels.

${languageInstructions[language]}

STYLE REQUIREMENTS:
1. Convert to a clean, simplified illustration style (NOT realistic photo)
2. Use MUTED, NATURAL COLORS - avoid bright or oversaturated colors
3. Use soft, natural tones for plants (muted greens, soft pinks, gentle purples, natural browns)
4. Simplify shapes while keeping them recognizable
5. Maintain the overall composition and layout of the original scene

LABELING REQUIREMENTS:
1. Identify all visible plants, trees, flowers, and landscape features
2. Add WHITE RECTANGULAR LABEL BOXES with black text
3. Use ARROWS or lines connecting each label to its corresponding plant/feature
4. For bilingual labels:
   - First line: English name in regular font
   - Second line: (Bahasa Malaysia name) in smaller italic font within parentheses
   - Example:
     "Red Maple Tree"
     "(Acer rubrum)"
5. Position labels strategically around the image to avoid overlapping
6. Ensure labels are clearly readable with good contrast

COLOR PALETTE:
- Greens: Muted, natural green tones (not bright lime or neon)
- Flowers: Soft, pastel colors (gentle pinks, purples, blues)
- Trees: Natural browns and muted greens
- Overall: Calm, natural, professional landscape illustration aesthetic

The final result should look like a professional landscape plan illustration with a calm, natural color palette and all plants clearly labeled with white boxes and arrows.`;

    console.log('📝 Generating illustrated infographic with language:', language);
    console.log('🖼️ Image data length:', state.uploadedImageData?.length);

    try {
        console.log('🚀 Calling Gemini API for illustrated infographic...');
        const result = await callNanoBananaAPI(prompt, state.uploadedImageData);
        console.log('✅ Illustrated infographic generated');
        return result;
    } catch (error) {
        console.error('❌ Infographic generation failed:', error);
        throw error;
    }
}

async function generateInfographicMode() {
    console.log('🔍 Starting infographic generation...');

    // Show loading
    elements.optionsSection.style.display = 'none';
    elements.loadingSection.style.display = 'block';

    try {
        // Generate infographic
        updateProgress(20, `Analyzing your landscape with ${CONFIG.IMAGE_MODEL}...`);
        await sleep(500);

        console.log('📊 Calling generateInfographic...');
        updateProgress(60, `Creating annotated drawing with ${CONFIG.IMAGE_MODEL}...`);
        const annotatedImageUrl = await generateInfographic();
        console.log('✅ Annotated image generated');

        updateProgress(100, 'Complete!');
        await sleep(500);

        console.log('📺 Displaying results...');

        // Display results
        elements.loadingSection.style.display = 'none';
        elements.resultsSection.style.display = 'block';
        console.log('Results section shown');

        // Get or create results list
        const resultsList = document.getElementById('resultsList');
        if (!resultsList) {
            console.error('❌ resultsList not found!');
            throw new Error('Results container not found');
        }

        // Clear previous results
        resultsList.innerHTML = '';

        // Create result card with both original and annotated images
        const resultCard = document.createElement('div');
        resultCard.className = 'result-item';
        resultCard.innerHTML = `
            <div style="margin-bottom: 2.5rem;">
                <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--color-dark); margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--color-gray-light);">Original Landscape Photo</h3>
                <div class="result-image-container" style="width: 100%; max-width: 100%; margin-top: 1rem;">
                    <img src="${state.uploadedImageData}" alt="Original Landscape" class="result-image" style="width: 100%; height: auto; display: block; border-radius: 0.5rem;">
                </div>
            </div>
            <div style="margin-top: 2.5rem;">
                <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--color-dark); margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid var(--color-gray-light);">Annotated Landscape Infographic</h3>
                <div class="result-image-container" style="width: 100%; max-width: 100%; margin-top: 1rem;">
                    <img src="${annotatedImageUrl}" alt="Annotated Landscape with Plant Labels" class="result-image" style="width: 100%; height: auto; display: block; border-radius: 0.5rem;">
                </div>
            </div>
        `;

        resultsList.appendChild(resultCard);
        console.log('✅ Original and annotated infographic displayed');

        // Scroll to results
        elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
        console.log('✅ Scrolled to results');

    } catch (error) {
        console.error('Infographic generation error:', error);
        showErrorModal('Infographic Generation Failed', `Failed to generate infographic:\n\n${error.message}\n\nPlease try again in a few moments.`);

        // Reset UI
        elements.loadingSection.style.display = 'none';
        elements.optionsSection.style.display = 'flex';
    }
}

function formatInfographic(text) {
    console.log('Formatting infographic, text length:', text?.length);

    if (!text) {
        console.error('No text to format!');
        return '<p>No infographic data received.</p>';
    }

    // Convert markdown-style formatting to HTML
    let html = text;

    // Convert bold text
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Convert italic text (single asterisks, but not part of bold)
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

    // Convert numbered headers
    html = html.replace(/^(\d+)\.\s\*\*(.+?)\*\*:/gm, '<h4>$1. $2</h4>');

    // Convert line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    // Wrap in div with styling
    html = '<div class="infographic-content">' + html + '</div>';

    console.log('Formatted HTML length:', html.length);
    return html;
}

// ===================================
// AI INTEGRATION - GEMINI API
// ===================================
async function callGeminiAPI(prompt, imageData, model = null) {
    const selectedModel = model || CONFIG.MODELS[elements.modelSelect?.value || 'auto'];

    try {
        let response;

        if (CONFIG.USE_DIRECT_API && CONFIG.GEMINI_API_KEY) {
            // Local development: Call Google API directly
            const base64Data = imageData.split(',')[1];
            const mimeType = imageData.split(',')[0].split(':')[1].split(';')[0];

            response = await fetch(
                `${CONFIG.GEMINI_API_BASE}/models/${selectedModel}:generateContent`,
                {
                    method: 'POST',
                    headers: {
                        'x-goog-api-key': CONFIG.GEMINI_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: prompt },
                                {
                                    inline_data: {
                                        mime_type: mimeType,
                                        data: base64Data
                                    }
                                }
                            ]
                        }],
                        generationConfig: {
                            temperature: 0.8,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 8192,
                        }
                    })
                }
            );
        } else {
            // Production: Use Netlify Function
            response = await fetch(CONFIG.NETLIFY_FUNCTION_URL, {
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
        }

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Netlify Function error response:', errorData);

            // Extract the actual error message
            let errorMsg = 'Unknown error';
            if (errorData.error) {
                if (typeof errorData.error === 'string') {
                    errorMsg = errorData.error;
                } else if (errorData.error.message) {
                    errorMsg = errorData.error.message;
                } else {
                    errorMsg = JSON.stringify(errorData.error);
                }
            } else if (errorData.details) {
                errorMsg = errorData.details;
            } else if (errorData.message) {
                errorMsg = errorData.message;
            } else {
                errorMsg = response.statusText;
            }

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
    // List of image generation models to try in order
    // Only including models that are confirmed to exist
    const imageModels = [
        CONFIG.IMAGE_MODEL, // Try the configured model first
        'gemini-3-pro-image-preview', // Confirmed available (may be overloaded)
    ];

    // Remove duplicates
    const modelsToTry = [...new Set(imageModels)];

    let lastError = null;

    for (let i = 0; i < modelsToTry.length; i++) {
        const modelToUse = modelsToTry[i];

        try {
            console.log(`🎯 Attempting with model: ${modelToUse} (${i + 1}/${modelsToTry.length})`);

            let response;

            if (CONFIG.USE_DIRECT_API && CONFIG.GEMINI_API_KEY) {
                // Local development: Call Google API directly
                console.log('Calling Google API directly for image generation...');

                const base64Data = imageData.split(',')[1];
                const mimeType = imageData.split(',')[0].split(':')[1].split(';')[0];

                response = await fetch(
                    `${CONFIG.GEMINI_API_BASE}/models/${modelToUse}:generateContent`,
                    {
                        method: 'POST',
                        headers: {
                            'x-goog-api-key': CONFIG.GEMINI_API_KEY,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    { text: prompt },
                                    {
                                        inline_data: {
                                            mime_type: mimeType,
                                            data: base64Data
                                        }
                                    }
                                ]
                            }],
                            generationConfig: {
                                temperature: 0.4,
                                topK: 32,
                                topP: 1,
                                maxOutputTokens: 4096,
                            }
                        })
                    }
                );
            } else {
                // Production: Use Netlify Function
                console.log('Calling Netlify Function for image generation...');

                response = await fetch(CONFIG.NETLIFY_FUNCTION_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: modelToUse,
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
            }

            if (!response.ok) {
                const error = await response.json();
                console.error(`Model ${modelToUse} error:`, error);

                // Extract the actual error message
                let errorMsg = 'Unknown error';
                if (error.error) {
                    if (typeof error.error === 'string') {
                        errorMsg = error.error;
                    } else if (error.error.message) {
                        errorMsg = error.error.message;
                    } else {
                        errorMsg = JSON.stringify(error.error);
                    }
                } else if (error.details) {
                    errorMsg = error.details;
                } else if (error.message) {
                    errorMsg = error.message;
                } else {
                    errorMsg = 'API request failed';
                }

                // Check if it's a 503 (overloaded) error - try next model
                if (response.status === 503 || errorMsg.toLowerCase().includes('overloaded')) {
                    console.warn(`⚠️ Model ${modelToUse} is overloaded, trying next model...`);
                    lastError = new Error(errorMsg);
                    continue; // Try next model
                }

                // Check if it's a 404 (not found) error - skip to next model
                if (response.status === 404 || errorMsg.toLowerCase().includes('not found')) {
                    console.warn(`⚠️ Model ${modelToUse} not found, trying next model...`);
                    lastError = new Error(errorMsg);
                    continue; // Try next model
                }

                // For other errors, throw immediately
                throw new Error(errorMsg);
            }

            const data = await response.json();
            console.log(`✅ Model ${modelToUse} succeeded!`);
            console.log('Image generation response received');
            console.log('Response data structure:', JSON.stringify(data, null, 2).substring(0, 500));
            console.log('Has candidates?', !!data.candidates);
            console.log('Candidates length:', data.candidates?.length);
            if (data.candidates && data.candidates[0]) {
                console.log('First candidate keys:', Object.keys(data.candidates[0]));
                console.log('Has content?', !!data.candidates[0].content);
                console.log('Content keys:', data.candidates[0].content ? Object.keys(data.candidates[0].content) : 'N/A');
                console.log('Has parts?', !!data.candidates[0].content?.parts);
                console.log('Parts length:', data.candidates[0].content?.parts?.length);
            }

            // Extract the edited image from response
            if (data.candidates && data.candidates[0]) {
                const candidate = data.candidates[0];

                console.log('🔍 Checking candidate for image data...');
                console.log('Finish reason:', candidate.finishReason);

                if (candidate.finishReason && candidate.finishReason !== 'STOP') {
                    console.warn('⚠️ Generation stopped due to:', candidate.finishReason);

                    // Handle specific finish reasons
                    if (candidate.finishReason === 'SAFETY') {
                        throw new Error('Image generation blocked by safety filters. Try a different image or prompt.');
                    } else if (candidate.finishReason === 'RECITATION') {
                        throw new Error('Image generation blocked due to recitation concerns. Try a different prompt.');
                    } else if (candidate.finishReason === 'MAX_TOKENS') {
                        throw new Error('Response exceeded maximum length. Try simplifying your request.');
                    }
                }

                if (candidate.content && candidate.content.parts) {
                    console.log('📦 Parts found:', candidate.content.parts.length);

                    for (let i = 0; i < candidate.content.parts.length; i++) {
                        const part = candidate.content.parts[i];
                        console.log(`Part ${i} keys:`, Object.keys(part));

                        const inlineData = part.inlineData || part.inline_data;

                        if (inlineData && inlineData.data) {
                            const responseMime = inlineData.mimeType || inlineData.mime_type || 'image/png';
                            console.log('✅ Found image data! MIME type:', responseMime);
                            return `data:${responseMime};base64,${inlineData.data}`;
                        }

                        if (part.text) {
                            console.warn('⚠️ Model returned text instead of image:', part.text.substring(0, 200));

                            // Check if model is explaining why it can't generate
                            if (part.text.toLowerCase().includes("cannot") ||
                                part.text.toLowerCase().includes("sorry") ||
                                part.text.toLowerCase().includes("apologize") ||
                                part.text.toLowerCase().includes("unable")) {
                                throw new Error(`Model cannot generate image: ${part.text.substring(0, 300)}`);
                            }

                            // Model returned text - this means it's analyzing, not editing
                            console.error('❌ Model is in analysis mode, not image generation mode');
                            throw new Error(`The model returned a text description instead of an edited image. This usually means the model doesn't support image editing. Response: "${part.text.substring(0, 200)}..."`);
                        }
                    }
                }
            }

            console.error('❌ No image data found in response');
            console.error('Full response structure:', JSON.stringify(data, null, 2).substring(0, 1000));
            throw new Error('No edited image in response. The model may not support image editing. Check console for full API response.');

        } catch (error) {
            console.error(`Image generation with ${modelToUse} failed:`, error);
            lastError = error;

            // If this is the last model to try, throw the error
            if (i === modelsToTry.length - 1) {
                throw error;
            }

            // Otherwise, try the next model
            console.log(`Trying next model...`);
        }
    }

    // If we get here, all models failed
    throw lastError || new Error('All image generation models failed');
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
    const language = elements.inventoryLanguage?.value || 'english';
    let prompt;
    let result;

    // Language-specific instructions
    const languageInstructions = {
        english: {
            instruction: 'Respond in English only.',
            format: '1. **[Plant/Tree Name]**: [Short description]'
        },
        malay: {
            instruction: 'Respond in Bahasa Malaysia only.',
            format: '1. **[Nama Pokok/Tumbuhan]**: [Penerangan ringkas]'
        },
        both: {
            instruction: 'Provide bilingual response. For each item, give both English and Bahasa Malaysia names and descriptions. Use italic formatting (*text*) for all Bahasa Malaysia text.',
            format: '1. **[Plant Name] / *[Nama Pokok]***: [Description] / *[Penerangan]*'
        }
    };

    const langConfig = languageInstructions[language];

    if (transformedImageUrl) {
        // Multimodal: Look at the image and identify numbered items
        prompt = `Look at this landscape design image. Identify the numbered markers (1, 2, 3...) which mark the PLANTS and TREES.
        
        ${langConfig.instruction}
        
        Create a strictly formatted legend list focusing on the vegetation.
        DO NOT say "Okay" or "Here is the list". Start directly with the first item.
        
        Format exactly like this:
        ${langConfig.format}
        2. **[Plant/Tree Name]**: [Short description]
        
        If there are numbered hardscape features, list them as well, but prioritize the plants.`;

        // Use the multimodal API with the text model (not image model)
        result = await callGeminiAPI(prompt, transformedImageUrl, CONFIG.DEFAULT_MODEL);
    } else {
        // Fallback: Text-only generation
        prompt = `Based on this landscape transformation description: "${transformationDescription}", 
        create a simple list of plants and features.
        
        ${langConfig.instruction}
        
        DO NOT include any conversational text. Start directly with the list.
        
        Format:
        ${langConfig.format}
        2. **[Item Name]**: [Short description]`;

        result = await callGeminiAPITextOnly(prompt);
    }

    return result;
}

async function callGeminiAPITextOnly(prompt) {
    const selectedModel = CONFIG.MODELS[elements.modelSelect?.value || 'auto'];

    try {
        let response;

        if (CONFIG.USE_DIRECT_API && CONFIG.GEMINI_API_KEY) {
            // Local development: Call Google API directly
            response = await fetch(
                `${CONFIG.GEMINI_API_BASE}/models/${selectedModel}:generateContent`,
                {
                    method: 'POST',
                    headers: {
                        'x-goog-api-key': CONFIG.GEMINI_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: prompt }]
                        }],
                        generationConfig: {
                            temperature: 0.7,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 8192,
                        }
                    })
                }
            );
        } else {
            // Production: Use Netlify Function
            response = await fetch(CONFIG.NETLIFY_FUNCTION_URL, {
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
        }

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
        showErrorModal('No Image Uploaded', 'Please upload an image first before using AI suggestions.');
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
            showErrorModal('API Quota Exceeded', 'The Gemini API has reached its usage limit.\n\nPlease:\n1. Wait a few minutes and try again\n2. Or manually describe your landscape vision in the text box below\n\nYou can still generate transformations by typing your own description!');
        } else {
            showErrorModal('AI Suggestions Failed', 'Failed to generate AI suggestions.\n\nPlease manually describe your desired landscape transformation in the text box below.');
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
        showErrorModal('No Image Uploaded', 'Please upload an image first before generating transformations.');
        return;
    }

    // Check which mode is selected
    const selectedMode = document.querySelector('input[name="mode"]:checked')?.value || 'transform';

    if (selectedMode === 'analyze') {
        // Generate infographic
        await generateInfographicMode();
        return;
    }

    // Transform mode (existing functionality)
    const prompt = elements.promptInput.value.trim();
    if (!prompt) {
        showErrorModal('Missing Description', 'Please describe your desired transformation in the text box above.');
        return;
    }

    // Show loading
    elements.optionsSection.style.display = 'none';
    elements.loadingSection.style.display = 'block';

    try {
        // Step 1: Generate transformation (40%)
        updateProgress(10, `Analyzing your property with ${CONFIG.IMAGE_MODEL}...`);
        await sleep(500);

        updateProgress(40, `Creating your dream landscape with ${CONFIG.IMAGE_MODEL}...`);
        const transformedImageUrl = await generateImageWithGemini(prompt, state.uploadedImageData);
        state.transformedImage = transformedImageUrl;

        // Step 2: Generate inventory if requested (90%)
        let inventory = null;
        if (elements.generateInventory.checked) {
            updateProgress(90, `Creating smart inventory with ${CONFIG.DEFAULT_MODEL}...`);
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

        showErrorModal('Generation Error', errorMessage);
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
        showErrorModal('No Designs Available', 'No designs to download yet. Please generate a transformation first.');
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
        showErrorModal('Report Generation Failed', 'Failed to generate report. Please try again.');
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
            showSuccessModal('Success', 'Link copied to clipboard!');
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
