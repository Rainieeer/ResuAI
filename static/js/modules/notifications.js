/**
 * Simple Notification System for ResuAI
 */

class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.init();
    }
    
    init() {
        this.createSimpleNotificationPanel();
        this.bindSimpleEvents();
        console.log('📢 Simple Notification System initialized');
    }
    
    createSimpleNotificationPanel() {
        // Remove any existing panel
        const existing = document.getElementById('simpleNotificationPanel');
        if (existing) existing.remove();
        
        // Create simple notification panel
        const panelHTML = `
            <div id="simpleNotificationPanel" style="
                position: fixed;
                top: 70px;
                right: 20px;
                width: 300px;
                max-height: 400px;
                background: var(--surface-color, white);
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                z-index: 9999;
                display: none;
                overflow-y: auto;
            ">
                <div style="padding: 15px; border-bottom: 1px solid var(--border-color, #e2e8f0);">
                    <h4 style="margin: 0; color: var(--text-color, #1e293b);">Notifications</h4>
                </div>
                <div id="simpleNotificationList" style="padding: 10px;">
                    <p style="text-align: center; color: var(--text-muted, #64748b); margin: 20px 0;">
                        No notifications yet
                    </p>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', panelHTML);
    }
    
    bindSimpleEvents() {
        const button = document.querySelector('.top-bar-right .btn-icon[title="Notifications"]');
        const panel = document.getElementById('simpleNotificationPanel');
        
        if (button && panel) {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const isVisible = panel.style.display === 'block';
                panel.style.display = isVisible ? 'none' : 'block';
                
                console.log('🔔 Notification panel toggled:', !isVisible);
            });
            
            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (!panel.contains(e.target) && !button.contains(e.target)) {
                    panel.style.display = 'none';
                }
            });
            
            console.log('📢 Simple notification events bound');
        } else {
            console.warn('Could not find notification button or panel');
        }
    }
    
    addNotification(notification) {
        const list = document.getElementById('simpleNotificationList');
        if (!list) return;
        
        // Clear empty message
        if (list.children.length === 1 && list.textContent.includes('No notifications')) {
            list.innerHTML = '';
        }
        
        // Create notification item
        const item = document.createElement('div');
        item.style.cssText = `
            padding: 10px;
            margin: 5px 0;
            background: var(--surface-color, white);
            border: 1px solid var(--border-color, #e2e8f0);
            border-radius: 6px;
            border-left: 3px solid var(--primary-color, #2563eb);
        `;
        
        item.innerHTML = `
            <div style="font-weight: 600; color: var(--text-color, #1e293b); margin-bottom: 4px;">
                ${notification.title || 'Notification'}
            </div>
            <div style="font-size: 14px; color: var(--text-muted, #64748b);">
                ${notification.message || ''}
            </div>
            <div style="font-size: 12px; color: var(--text-muted, #64748b); margin-top: 4px;">
                ${new Date().toLocaleTimeString()}
            </div>
        `;
        
        list.insertBefore(item, list.firstChild);
        console.log('📢 Notification added:', notification.title);
    }
    
    // Simple methods for compatibility
    showNotificationPanel() {
        const panel = document.getElementById('simpleNotificationPanel');
        if (panel) panel.style.display = 'block';
    }
    
    hideNotificationPanel() {
        const panel = document.getElementById('simpleNotificationPanel');
        if (panel) panel.style.display = 'none';
    }
    
    // Compatibility methods for common usage
    success(title, message) {
        this.addNotification({ title, message, type: 'success' });
    }
    
    error(title, message) {
        this.addNotification({ title, message, type: 'error' });
    }
    
    warning(title, message) {
        this.addNotification({ title, message, type: 'warning' });
    }
    
    info(title, message) {
        this.addNotification({ title, message, type: 'info' });
    }
}

// Initialize simple notification system
let notifications;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        notifications = new NotificationSystem();
        window.notifications = notifications;
    });
} else {
    notifications = new NotificationSystem();
    window.notifications = notifications;
}