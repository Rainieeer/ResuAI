/**
 * Simple Help System for ResuAI
 */

class HelpSystem {
    constructor() {
        this.init();
    }
    
    init() {
        this.createSimpleHelpPanel();
        this.bindSimpleEvents();
        console.log('❓ Simple Help System initialized');
    }
    
    createSimpleHelpPanel() {
        // Remove any existing panel
        const existing = document.getElementById('simpleHelpPanel');
        if (existing) existing.remove();
        
        // Create simple help panel
        const panelHTML = `
            <div id="simpleHelpPanel" style="
                position: fixed;
                top: 70px;
                right: 20px;
                width: 350px;
                max-height: 500px;
                background: var(--surface-color, white);
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                z-index: 9999;
                display: none;
                overflow-y: auto;
            ">
                <div style="padding: 15px; border-bottom: 1px solid var(--border-color, #e2e8f0); display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="margin: 0; color: var(--text-color, #1e293b);">Help & Support</h4>
                    <button id="closeHelpPanel" style="
                        background: none;
                        border: none;
                        color: var(--text-muted, #64748b);
                        cursor: pointer;
                        font-size: 18px;
                        padding: 0;
                        width: 20px;
                        height: 20px;
                    ">&times;</button>
                </div>
                <div style="padding: 15px;">
                    <div style="margin-bottom: 20px;">
                        <h5 style="margin: 0 0 10px 0; color: var(--text-color, #1e293b);">Quick Help</h5>
                        <div style="font-size: 14px; color: var(--text-muted, #64748b); line-height: 1.5;">
                            <p><strong>Dashboard:</strong> View overview and recent activity</p>
                            <p><strong>Assessments:</strong> Create and manage candidate evaluations</p>
                            <p><strong>Job Postings:</strong> Manage job requirements and criteria</p>
                            <p><strong>Candidates:</strong> Browse and evaluate applicants</p>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h5 style="margin: 0 0 10px 0; color: var(--text-color, #1e293b);">Keyboard Shortcuts</h5>
                        <div style="font-size: 14px; color: var(--text-muted, #64748b);">
                            <p><kbd>Ctrl+/</kbd> - Toggle help panel</p>
                            <p><kbd>Esc</kbd> - Close panels</p>
                            <p><kbd>Ctrl+D</kbd> - Go to dashboard</p>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h5 style="margin: 0 0 10px 0; color: var(--text-color, #1e293b);">Common Issues</h5>
                        <div style="font-size: 14px; color: var(--text-muted, #64748b); line-height: 1.5;">
                            <p><strong>Upload failed:</strong> Check file format (XLSX & PDF only)</p>
                            <p><strong>Slow processing:</strong> Large files take more time</p>
                            <p><strong>Assessment error:</strong> Refresh page and try again</p>
                        </div>
                    </div>
                    
                    <div style="text-align: center; padding-top: 15px; border-top: 1px solid var(--border-color, #e2e8f0);">
                        <p style="margin: 0; font-size: 14px; color: var(--text-muted, #64748b);">
                            Need more help? Contact support at<br>
                            <strong>support@resumai.com</strong>
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', panelHTML);
    }
    
    bindSimpleEvents() {
        const button = document.querySelector('.top-bar-right .btn-icon[title="Help"]');
        const panel = document.getElementById('simpleHelpPanel');
        const closeButton = document.getElementById('closeHelpPanel');
        
        if (button && panel) {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const isVisible = panel.style.display === 'block';
                panel.style.display = isVisible ? 'none' : 'block';
                
                console.log('❓ Help panel toggled:', !isVisible);
            });
            
            // Close button
            if (closeButton) {
                closeButton.addEventListener('click', () => {
                    panel.style.display = 'none';
                });
            }
            
            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (!panel.contains(e.target) && !button.contains(e.target)) {
                    panel.style.display = 'none';
                }
            });
            
            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => {
                // Ctrl+/ - Toggle help
                if (e.ctrlKey && e.key === '/') {
                    e.preventDefault();
                    const isVisible = panel.style.display === 'block';
                    panel.style.display = isVisible ? 'none' : 'block';
                }
                
                // Escape - Close panels
                if (e.key === 'Escape') {
                    panel.style.display = 'none';
                }
                
                // Ctrl+D - Go to dashboard
                if (e.ctrlKey && e.key === 'd') {
                    e.preventDefault();
                    window.location.href = '/dashboard';
                }
            });
            
            console.log('❓ Simple help events bound');
        } else {
            console.warn('Could not find help button or panel');
        }
    }
    
    // Simple methods for compatibility
    showHelpPanel() {
        const panel = document.getElementById('simpleHelpPanel');
        if (panel) panel.style.display = 'block';
    }
    
    hideHelpPanel() {
        const panel = document.getElementById('simpleHelpPanel');
        if (panel) panel.style.display = 'none';
    }
    
    showContextualHelp(topic) {
        console.log('Showing contextual help for:', topic);
        this.showHelpPanel();
    }
    
    hideContextualHelp() {
        this.hideHelpPanel();
    }
}

// Initialize simple help system
let helpSystem;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        helpSystem = new HelpSystem();
        window.helpSystem = helpSystem;
    });
} else {
    helpSystem = new HelpSystem();
    window.helpSystem = helpSystem;
}