// ============================================
// SETTINGS & INTEGRATIONS
// ============================================

function showOutreachSettings() {
    const settings = OutreachState.getSettings();
    const ghlConnection = OutreachState.getGHLConnection();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content settings-modal">
            <div class="modal-header">
                <h3>⚙️ Outreach Settings</h3>
                <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="settings-tabs">
                    <button class="settings-tab active" onclick="showSettingsTab('general')">General</button>
                    <button class="settings-tab" onclick="showSettingsTab('api')">API Keys</button>
                    <button class="settings-tab" onclick="showSettingsTab('integrations')">Integrations</button>
                    <button class="settings-tab" onclick="showSettingsTab('templates')">Templates</button>
                </div>
                
                <!-- General Settings -->
                <div id="settings-general" class="settings-panel active">
                    <div class="form-section">
                        <h4>Daily Limits</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Max emails per day</label>
                                <input type="number" id="setting-max-daily" value="${settings.maxDailyEmails}" min="1" max="100">
                            </div>
                            <div class="form-group">
                                <label>Min minutes between emails</label>
                                <input type="number" id="setting-min-interval" value="${settings.minTimeBetweenEmails}" min="1" max="60">
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4>Sender Information</h4>
                        <div class="form-row">
                            <div class="form-group">
                                <label>From Name</label>
                                <input type="text" id="setting-from-name" value="${settings.fromName}">
                            </div>
                            <div class="form-group">
                                <label>From Email</label>
                                <input type="email" id="setting-from-email" value="${settings.fromEmail}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Reply-To Email</label>
                            <input type="email" id="setting-reply-to" value="${settings.replyTo}">
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4>Calendar & Links</h4>
                        <div class="form-group">
                            <label>Calendar Booking Link</label>
                            <input type="url" id="setting-calendar" value="${settings.calendarLink || OUTREACH_CONFIG.calendarLink}">
                        </div>
                    </div>
                </div>
                
                <!-- API Keys -->
                <div id="settings-api" class="settings-panel" style="display: none;">
                    <div class="form-section">
                        <h4>OpenAI API</h4>
                        <p class="section-desc">Used for AI-powered prospect research</p>
                        <div class="form-group">
                            <label>API Key</label>
                            <div class="api-key-input">
                                <input type="password" id="setting-openai-key" value="${settings.openaiApiKey}" placeholder="sk-...">
                                <button class="btn btn-sm btn-secondary" onclick="toggleApiKeyVisibility('setting-openai-key')">👁️</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4>Resend API</h4>
                        <p class="section-desc">Used for sending emails</p>
                        <div class="form-group">
                            <label>API Key</label>
                            <div class="api-key-input">
                                <input type="password" id="setting-resend-key" value="${settings.resendApiKey}" placeholder="re_...">
                                <button class="btn btn-sm btn-secondary" onclick="toggleApiKeyVisibility('setting-resend-key')">👁️</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Integrations -->
                <div id="settings-integrations" class="settings-panel" style="display: none;">
                    <div class="integration-card">
                        <div class="integration-header">
                            <div class="integration-icon">🔗</div>
                            <div class="integration-info">
                                <h4>GoHighLevel</h4>
                                <p>Sync leads and campaigns with your GHL account</p>
                            </div>
                            <div class="integration-status">
                                <span class="status-indicator ${ghlConnection ? 'connected' : 'disconnected'}"></span>
                                <span>${ghlConnection ? 'Connected' : 'Not Connected'}</span>
                            </div>
                        </div>
                        <div class="integration-body">
                            ${ghlConnection ? `
                                <div class="connection-info">
                                    <p><strong>Connected:</strong> ${formatDate(ghlConnection.connectedAt)}</p>
                                    <p><strong>Location ID:</strong> ${ghlConnection.locationId || 'N/A'}</p>
                                </div>
                                <div class="integration-actions">
                                    <button class="btn btn-sm btn-secondary" onclick="syncWithGHL()">Sync Now</button>
                                    <button class="btn btn-sm btn-danger" onclick="disconnectGHL()">Disconnect</button>
                                </div>
                            ` : `
                                <div class="form-group">
                                    <label>Private Integration Token</label>
                                    <div class="api-key-input">
                                        <input type="password" id="ghl-token" placeholder="Enter your GHL Private Integration Token">
                                        <button class="btn btn-sm btn-secondary" onclick="toggleApiKeyVisibility('ghl-token')">👁️</button>
                                    </div>
                                    <p class="help-text">Find this in your GHL Settings > API</p>
                                </div>
                                <button class="btn btn-primary" onclick="connectGHL()">Connect to GoHighLevel</button>
                            `}
                        </div>
                    </div>
                    
                    <div class="integration-card">
                        <div class="integration-header">
                            <div class="integration-icon">🌐</div>
                            <div class="integration-info">
                                <h4>Global Control CRM</h4>
                                <p>Connect with Global Control for advanced CRM features</p>
                            </div>
                            <div class="integration-status">
                                <span class="status-indicator disconnected"></span>
                                <span>Not Connected</span>
                            </div>
                        </div>
                        <div class="integration-body">
                            <p class="coming-soon">Coming soon</p>
                        </div>
                    </div>
                </div>
                
                <!-- Templates -->
                <div id="settings-templates" class="settings-panel" style="display: none;">
                    <div class="templates-manager">
                        <div class="templates-header">
                            <h4>Email Templates</h4>
                            <button class="btn btn-sm btn-primary" onclick="showCreateTemplateModal()">+ New Template</button>
                        </div>
                        <div class="templates-list">
                            ${renderTemplatesList()}
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="saveOutreachSettings()">Save Settings</button>
            </div>
        </div>
        <style>
            .settings-modal { max-width: 800px; max-height: 90vh; overflow-y: auto; }
            .settings-tabs { display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid rgba(212, 175, 99, 0.2); }
            .settings-tab { background: none; border: none; color: rgba(246, 241, 232, 0.6); padding: 12px 20px; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.3s; }
            .settings-tab.active { color: var(--warm-gold); border-bottom-color: var(--warm-gold); }
            .settings-panel { display: none; }
            .settings-panel.active { display: block; }
            .form-section { margin-bottom: 28px; padding-bottom: 28px; border-bottom: 1px solid rgba(212, 175, 99, 0.1); }
            .form-section:last-child { border-bottom: none; }
            .form-section h4 { font-family: 'Cormorant Garamond', serif; font-size: 18px; color: var(--ivory-light); margin-bottom: 8px; }
            .section-desc { color: rgba(246, 241, 232, 0.5); font-size: 13px; margin-bottom: 16px; }
            .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .form-group { margin-bottom: 16px; }
            .form-group label { display: block; margin-bottom: 6px; font-size: 13px; color: rgba(246, 241, 232, 0.8); }
            .form-group input { width: 100%; padding: 12px; background: rgba(246, 241, 232, 0.05); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 8px; color: var(--ivory-light); font-size: 14px; }
            .api-key-input { display: flex; gap: 8px; }
            .api-key-input input { flex: 1; }
            .help-text { font-size: 12px; color: rgba(246, 241, 232, 0.4); margin-top: 4px; }
            
            .integration-card { background: rgba(246, 241, 232, 0.03); border: 1px solid rgba(212, 175, 99, 0.1); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
            .integration-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
            .integration-icon { font-size: 28px; }
            .integration-info { flex: 1; }
            .integration-info h4 { color: var(--ivory-light); margin-bottom: 4px; }
            .integration-info p { font-size: 13px; color: rgba(246, 241, 232, 0.5); }
            .integration-status { display: flex; align-items: center; gap: 8px; font-size: 13px; }
            .status-indicator { width: 8px; height: 8px; border-radius: 50%; }
            .status-indicator.connected { background: #4CAF50; }
            .status-indicator.disconnected { background: #f44336; }
            .connection-info { background: rgba(76, 175, 80, 0.1); padding: 12px; border-radius: 8px; margin-bottom: 16px; }
            .connection-info p { margin-bottom: 4px; font-size: 13px; }
            .integration-actions { display: flex; gap: 8px; }
            .coming-soon { color: rgba(246, 241, 232, 0.4); font-style: italic; }
            
            .templates-manager { display: flex; flex-direction: column; gap: 16px; }
            .templates-header { display: flex; justify-content: space-between; align-items: center; }
            .templates-list { display: flex; flex-direction: column; gap: 8px; }
            .template-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(246, 241, 232, 0.03); border-radius: 8px; }
            .template-item-name { font-weight: 500; color: var(--ivory-light); }
            .template-item-category { font-size: 12px; color: rgba(246, 241, 232, 0.5); }
        </style>
    `;
    document.body.appendChild(modal);
}

function showSettingsTab(tab) {
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`settings-${tab}`).classList.add('active');
}

function toggleApiKeyVisibility(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
}

function saveOutreachSettings() {
    const settings = {
        maxDailyEmails: parseInt(document.getElementById('setting-max-daily').value) || 20,
        minTimeBetweenEmails: parseInt(document.getElementById('setting-min-interval').value) || 15,
        fromName: document.getElementById('setting-from-name').value || 'Babs Carroll',
        fromEmail: document.getElementById('setting-from-email').value || 'babs@sacredkaleidoscope.community',
        replyTo: document.getElementById('setting-reply-to').value || 'babs@sacredkaleidoscope.community',
        calendarLink: document.getElementById('setting-calendar').value || OUTREACH_CONFIG.calendarLink,
        openaiApiKey: document.getElementById('setting-openai-key')?.value || '',
        resendApiKey: document.getElementById('setting-resend-key')?.value || ''
    };
    
    OutreachState.saveSettings(settings);
    
    document.querySelector('.modal-overlay').remove();
    showNotification('Settings saved', 'success');
}

function connectGHL() {
    const token = document.getElementById('ghl-token').value;
    if (!token) {
        showNotification('Please enter your GHL Private Integration Token', 'error');
        return;
    }
    
    // Simulate connection
    const connection = {
        connected: true,
        token: token, // In production, this should be encrypted
        locationId: 'mock-location-id',
        connectedAt: new Date().toISOString()
    };
    
    OutreachState.saveGHLConnection(connection);
    
    // Refresh modal
    document.querySelector('.modal-overlay').remove();
    showOutreachSettings();
    
    showNotification('Connected to GoHighLevel', 'success');
}

function disconnectGHL() {
    if (!confirm('Disconnect from GoHighLevel?')) return;
    
    OutreachState.saveGHLConnection(null);
    
    document.querySelector('.modal-overlay').remove();
    showOutreachSettings();
    
    showNotification('Disconnected from GoHighLevel', 'success');
}

function syncWithGHL() {
    showNotification('Syncing with GoHighLevel...', 'info');
    
    // Simulate sync
    setTimeout(() => {
        showNotification('Sync completed', 'success');
    }, 2000);
}

function renderTemplatesList() {
    const templates = {
        ...WINGS_OUT_TEMPLATES_B2B,
        ...WINGS_OUT_TEMPLATES_B2C,
        ...WINGS_OUT_TEMPLATES_AFFILIATE
    };
    
    return Object.entries(templates).map(([key, template]) => `
        <div class="template-item">
            <div>
                <div class="template-item-name">${template.name}</div>
                <div class="template-item-category">${template.category} • ${template.path}</div>
            </div>
            <button class="btn btn-sm btn-secondary" onclick="editTemplate('${key}')">Edit</button>
        </div>
    `).join('');
}

function showCreateTemplateModal() {
    showNotification('Create template - to be implemented', 'info');
}

function editTemplate(templateKey) {
    showNotification('Edit template - to be implemented', 'info');
}

// Notification helper
function showNotification(message, type = 'info') {
    // Check if notification container exists
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(container);
    }
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        background: ${type === 'success' ? 'rgba(76, 175, 80, 0.9)' : type === 'error' ? 'rgba(244, 67, 54, 0.9)' : 'rgba(33, 150, 243, 0.9)'};
        color: white;
        padding: 16px 24px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
