// Feedback Loop MCP - Renderer Process

class FeedbackApp {
  constructor() {
    this.settings = {};
    this.projectDirectory = '';
    this.promptText = '';
    this.quickFeedbackOptions = [];
    
    this.initializeUI();
    this.setupEventListeners();
  }

  initializeUI() {
    // Feedback submission
    document.getElementById('submit-feedback').addEventListener('click', 
      () => this.submitFeedback());
    document.getElementById('feedback-text').addEventListener('keydown', 
      (e) => { 
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isSubmitShortcut = isMac ? (e.metaKey && e.key === 'Enter') : (e.ctrlKey && e.key === 'Enter');
        
        if (isSubmitShortcut) {
          e.preventDefault();
          this.submitFeedback();
        }
      });
    
    // Update keyboard hint based on platform
    const shortcutText = document.querySelector('.shortcut-text');
    if (shortcutText) {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      shortcutText.textContent = isMac ? '⌘ + Enter to send' : 'Ctrl + Enter to send';
    }
  }

  setupEventListeners() {
    // Listen for UI data from main process
    window.electronAPI.onSetUiData((event, data) => { // Assuming onSetUiData is exposed in preload.mjs for 'set-ui-data' channel
      this.projectDirectory = data.projectDirectory || 'N/A';
      this.promptText = data.promptText || 'Please provide your feedback.';
      this.quickFeedbackOptions = data.quickFeedbackOptions || [];
      this.updateUI();
    });
  }

  updateUI() {
    // Update project directory display
    const projectDirDisplay = document.getElementById('project-directory-display');
    if (projectDirDisplay) {
      projectDirDisplay.textContent = this.projectDirectory;
    }

    // Update prompt text with markdown rendering
    const promptTextDisplay = document.getElementById('prompt-text');
    if (promptTextDisplay) {
      try {
        // Configure marked options for better security and performance
        marked.setOptions({
          breaks: true, // Convert line breaks to <br>
          gfm: true, // Use GitHub Flavored Markdown
          headerIds: false, // Don't generate IDs for headers
          mangle: false, // Don't mangle email addresses
          sanitize: false // We'll use DOMPurify instead
        });
        
        // Parse markdown to HTML
        const rawHtml = marked.parse(this.promptText);
        
        // Sanitize HTML to prevent XSS attacks
        const cleanHtml = DOMPurify.sanitize(rawHtml, {
          ALLOWED_TAGS: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'br', 'hr',
            'strong', 'b', 'em', 'i', 'u',
            'code', 'pre',
            'ul', 'ol', 'li',
            'blockquote',
            'a',
            'table', 'thead', 'tbody', 'tr', 'th', 'td'
          ],
          ALLOWED_ATTR: ['href', 'title', 'class'],
          ALLOW_DATA_ATTR: false
        });
        
        // Set the HTML content
        promptTextDisplay.innerHTML = cleanHtml;
      } catch (error) {
        // Fallback to plain text if markdown parsing fails
        console.error('Markdown parsing error:', error);
        promptTextDisplay.textContent = this.promptText;
      }
    }

    // Update quick feedback buttons
    const quickFeedbackContainer = document.getElementById('quick-feedback-container');
    const feedbackTextarea = document.getElementById('feedback-text'); // Corrected ID from 'feedback-textarea' to 'feedback-text'

    if (quickFeedbackContainer && feedbackTextarea) {
      quickFeedbackContainer.innerHTML = ''; // Clear existing buttons
      if (this.quickFeedbackOptions && this.quickFeedbackOptions.length > 0) {
        this.quickFeedbackOptions.forEach(optionText => {
          const box = document.createElement('div');
          box.textContent = optionText;
          box.classList.add('quick-feedback-box'); // New class for box styling
          box.addEventListener('click', () => {
            this.submitFeedback(optionText); // Submit immediately with the box's text
          });
          quickFeedbackContainer.appendChild(box);
        });
      }
    }

    // Request window resize after UI is updated
    // Use requestAnimationFrame to ensure DOM has been updated before measuring
    requestAnimationFrame(() => {
      const container = document.querySelector('.feedback-container');
      if (container) {
        // Add a small buffer to the height to prevent scrollbars due to rounding/borders
        const requiredHeight = container.scrollHeight + 50; // Increased buffer
        window.electronAPI.requestResize(requiredHeight);
      }
    });
  }

  async submitFeedback(feedbackText) {
    const feedback = (typeof feedbackText === 'string') ? feedbackText : document.getElementById('feedback-text').value;
    
    const submitBtn = document.getElementById('submit-feedback');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
      const result = await window.electronAPI.submitFeedback({
        feedback: feedback,
      });

      if (result.success) {
        // Application will close automatically
      } else {
        alert(`Failed to submit feedback: ${result.error}`);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    } catch (error) {
      alert(`Error submitting feedback: ${error.message}`);
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  }


}

// Initialize the app when DOM is loaded
const app = new FeedbackApp();