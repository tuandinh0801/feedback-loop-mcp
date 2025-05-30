class FeedbackUI {
  constructor() {
    this.settings = {};
    this.projectDirectory = '';
    this.promptText = '';
    
    this.initializeUI();
    this.loadSettings();
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
    // Listen for initial data
    window.electronAPI.onInitialData((data) => {
      this.projectDirectory = data.projectDirectory;
      this.promptText = data.promptText;
      this.updateUI();
    });
  }

  async loadSettings() {
    try {
      this.settings = await window.electronAPI.loadSettings();
      this.applySettings();
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  applySettings() {
    // Settings are now minimal since command functionality is removed
  }

  updateUI() {
    // Update prompt text
    if (this.promptText) {
      document.getElementById('prompt-text').textContent = this.promptText;
    } else {
      document.getElementById('prompt-text').textContent = 'Please provide your feedback on the current state of the project.';
    }
  }



  async submitFeedback() {
    const feedback = document.getElementById('feedback-text').value;
    
    const submitBtn = document.getElementById('submit-feedback');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Sending...</span><i class="fas fa-spinner fa-spin"></i>';

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

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new FeedbackUI();
});