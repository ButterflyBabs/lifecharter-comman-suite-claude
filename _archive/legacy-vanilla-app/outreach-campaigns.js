// ============================================
// CAMPAIGNS MANAGEMENT
// ============================================

function renderCampaigns() {
    const campaigns = OutreachState.getCampaigns();
    const pathwayCampaigns = campaigns.filter(c => c.pathway === OutreachState.currentPathway);
    
    return `
        <div class="occ-campaigns">
            <!-- Campaigns Header -->
            <div class="campaigns-header">
                <div class="header-info">
                    <h3>📧 Email Campaigns</h3>
                    <p>Create and manage outreach campaigns</p>
                </div>
                <button class="btn btn-primary" onclick="showCreateCampaignModal()">
                    <span>+</span> Create Campaign
                </button>
            </div>
            
            <!-- Campaigns Grid -->
            <div class="campaigns-grid">
                ${pathwayCampaigns.map(campaign => `
                    <div class="campaign-card">
                        <div class="campaign-header">
                            <div class="campaign-icon">📧</div>
                            <div class="campaign-status ${campaign.status}">${campaign.status}</div>
                        </div>
                        <h4 class="campaign-name">${campaign.name}</h4>
                        <p class="campaign-description">${campaign.description || 'No description'}</p>
                        
                        <div class="campaign-stats">
                            <div class="stat">
                                <span class="stat-value">${campaign.leads?.length || 0}</span>
                                <span class="stat-label">Leads</span>
                            </div>
                            <div class="stat">
                                <span class="stat-value">${campaign.emails?.length || 0}</span>
                                <span class="stat-label">Emails</span>
                            </div>
                            <div class="stat">
                                <span class="stat-value">${campaign.stats?.sent || 0}</span>
                                <span class="stat-label">Sent</span>
                            </div>
                            <div class="stat">
                                <span class="stat-value">${campaign.stats?.opened || 0}</span>
                                <span class="stat-label">Opened</span>
                            </div>
                        </div>
                        
                        <div class="campaign-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${calculateCampaignProgress(campaign)}%"></div>
                            </div>
                            <span class="progress-text">${calculateCampaignProgress(campaign)}% complete</span>
                        </div>
                        
                        <div class="campaign-actions">
                            <button class="btn btn-sm btn-secondary" onclick="viewCampaign('${campaign.id}')">View</button>
                            <button class="btn btn-sm btn-secondary" onclick="editCampaign('${campaign.id}')">Edit</button>
                            <button class="btn btn-sm btn-primary" onclick="launchCampaign('${campaign.id}')" ${campaign.status === 'active' ? 'disabled' : ''}>
                                ${campaign.status === 'active' ? 'Running' : 'Launch'}
                            </button>
                        </div>
                    </div>
                `).join('') || '<div class="empty-campaigns"><p>No campaigns yet. Create your first campaign to get started.</p></div>'}
            </div>
            
            <!-- Templates Section -->
            <div class="templates-section">
                <div class="templates-header">
                    <h4>📄 Email Templates</h4>
                    <button class="btn btn-sm btn-secondary" onclick="showTemplateManager()">Manage Templates</button>
                </div>
                <div class="templates-grid">
                    ${renderTemplatePreviews()}
                </div>
            </div>
        </div>
        
        <style>
            .occ-campaigns {
                display: flex;
                flex-direction: column;
                gap: 32px;
            }
            
            .campaigns-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .header-info h3 {
                font-family: 'Cormorant Garamond', serif;
                font-size: 24px;
                color: var(--ivory-light);
                margin-bottom: 4px;
            }
            
            .header-info p {
                color: rgba(246, 241, 232, 0.6);
                font-size: 14px;
            }
            
            .campaigns-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                gap: 20px;
            }
            
            .campaign-card {
                background: rgba(31, 49, 91, 0.4);
                border: 1px solid rgba(212, 175, 99, 0.2);
                border-radius: 16px;
                padding: 24px;
                transition: all 0.3s;
            }
            
            .campaign-card:hover {
                transform: translateY(-4px);
                border-color: rgba(212, 175, 99, 0.4);
            }
            
            .campaign-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }
            
            .campaign-icon {
                font-size: 32px;
            }
            
            .campaign-status {
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 500;
                text-transform: uppercase;
            }
            
            .campaign-status.draft { background: rgba(158, 158, 158, 0.2); color: #9E9E9E; }
            .campaign-status.active { background: rgba(76, 175, 80, 0.2); color: #4CAF50; }
            .campaign-status.paused { background: rgba(255, 193, 7, 0.2); color: #FFC107; }
            .campaign-status.completed { background: rgba(33, 150, 243, 0.2); color: #2196F3; }
            
            .campaign-name {
                font-family: 'Cormorant Garamond', serif;
                font-size: 20px;
                color: var(--ivory-light);
                margin-bottom: 8px;
            }
            
            .campaign-description {
                color: rgba(246, 241, 232, 0.6);
                font-size: 14px;
                margin-bottom: 20px;
                line-height: 1.5;
            }
            
            .campaign-stats {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 12px;
                margin-bottom: 20px;
                padding: 16px;
                background: rgba(246, 241, 232, 0.03);
                border-radius: 12px;
            }
            
            .stat {
                text-align: center;
            }
            
            .stat-value {
                display: block;
                font-size: 20px;
                font-weight: 700;
                color: var(--warm-gold);
            }
            
            .stat-label {
                font-size: 11px;
                color: rgba(246, 241, 232, 0.5);
                text-transform: uppercase;
            }
            
            .campaign-progress {
                margin-bottom: 20px;
            }
            
            .progress-bar {
                height: 6px;
                background: rgba(246, 241, 232, 0.1);
                border-radius: 3px;
                overflow: hidden;
                margin-bottom: 8px;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, var(--warm-gold), var(--sacred-teal));
                border-radius: 3px;
                transition: width 0.5s ease;
            }
            
            .progress-text {
                font-size: 12px;
                color: rgba(246, 241, 232, 0.5);
            }
            
            .campaign-actions {
                display: flex;
                gap: 8px;
            }
            
            .empty-campaigns {
                grid-column: 1 / -1;
                text-align: center;
                padding: 60px;
                color: rgba(246, 241, 232, 0.5);
            }
            
            .templates-section {
                background: rgba(31, 49, 91, 0.3);
                border: 1px solid rgba(212, 175, 99, 0.1);
                border-radius: 16px;
                padding: 24px;
            }
            
            .templates-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            
            .templates-header h4 {
                font-family: 'Cormorant Garamond', serif;
                font-size: 20px;
                color: var(--ivory-light);
            }
            
            .templates-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 12px;
            }
            
            .template-preview {
                background: rgba(246, 241, 232, 0.05);
                border: 1px solid rgba(212, 175, 99, 0.1);
                border-radius: 12px;
                padding: 16px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .template-preview:hover {
                border-color: rgba(212, 175, 99, 0.3);
                background: rgba(212, 175, 99, 0.05);
            }
            
            .template-preview h5 {
                font-size: 14px;
                color: var(--ivory-light);
                margin-bottom: 4px;
            }
            
            .template-preview p {
                font-size: 12px;
                color: rgba(246, 241, 232, 0.5);
            }
        </style>
    `;
}

function calculateCampaignProgress(campaign) {
    if (!campaign.leads || campaign.leads.length === 0) return 0;
    if (!campaign.stats || !campaign.stats.sent) return 0;
    return Math.round((campaign.stats.sent / campaign.leads.length) * 100);
}

function renderTemplatePreviews() {
    const templates = getTemplatesForPathway(OutreachState.currentPathway);
    
    return Object.entries(templates).slice(0, 6).map(([key, template]) => `
        <div class="template-preview" onclick="previewTemplate('${key}')">
            <h5>${template.name}</h5>
            <p>${template.category}</p>
        </div>
    `).join('');
}

function showCreateCampaignModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content campaign-modal">
            <div class="modal-header">
                <h3>📧 Create New Campaign</h3>
                <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="create-campaign-form">
                    <div class="form-group">
                        <label>Campaign Name *</label>
                        <input type="text" name="name" placeholder="e.g., Q2 Coach Outreach" required>
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea name="description" rows="2" placeholder="Brief description of this campaign..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>Select Leads</label>
                        <div class="leads-selection">
                            <div class="selection-header">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="select-all-leads" onchange="toggleAllLeads(this)">
                                    <span>Select All</span>
                                </label>
                                <span class="selection-count">0 selected</span>
                            </div>
                            <div class="leads-list">
                                ${renderLeadSelectionList()}
                            </div>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Email Sequence</label>
                        <div class="email-sequence">
                            <div class="sequence-email">
                                <div class="sequence-header">
                                    <span>Email 1 (Initial)</span>
                                    <button type="button" class="btn btn-sm btn-secondary" onclick="addEmailToSequence(1)">Edit</button>
                                </div>
                                <div class="sequence-body" id="email-1-preview">
                                    <p class="empty-text">Click Edit to compose this email</p>
                                </div>
                            </div>
                            <button type="button" class="btn btn-secondary btn-add-email" onclick="addFollowUpEmail()">
                                <span>+</span> Add Follow-up Email
                            </button>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="saveCampaign()">Create Campaign</button>
            </div>
        </div>
        <style>
            .campaign-modal { max-width: 700px; max-height: 90vh; overflow-y: auto; }
            .form-group { margin-bottom: 20px; }
            .form-group label { display: block; margin-bottom: 8px; font-size: 14px; color: rgba(246, 241, 232, 0.8); }
            .form-group input, .form-group textarea {
                width: 100%;
                padding: 12px;
                background: rgba(246, 241, 232, 0.05);
                border: 1px solid rgba(212, 175, 99, 0.2);
                border-radius: 8px;
                color: var(--ivory-light);
                font-size: 14px;
                font-family: inherit;
            }
            .leads-selection {
                background: rgba(246, 241, 232, 0.03);
                border: 1px solid rgba(212, 175, 99, 0.1);
                border-radius: 8px;
                max-height: 200px;
                overflow-y: auto;
            }
            .selection-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px;
                border-bottom: 1px solid rgba(212, 175, 99, 0.1);
                position: sticky;
                top: 0;
                background: rgba(31, 49, 91, 0.8);
            }
            .leads-list { padding: 8px; }
            .lead-selection-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px;
                border-radius: 6px;
            }
            .lead-selection-item:hover { background: rgba(212, 175, 99, 0.05); }
            .email-sequence { display: flex; flex-direction: column; gap: 12px; }
            .sequence-email {
                background: rgba(246, 241, 232, 0.03);
                border: 1px solid rgba(212, 175, 99, 0.1);
                border-radius: 8px;
                padding: 16px;
            }
            .sequence-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }
            .sequence-body {
                background: rgba(0, 0, 0, 0.2);
                padding: 12px;
                border-radius: 6px;
                font-size: 13px;
            }
            .empty-text { color: rgba(246, 241, 232, 0.4); font-style: italic; }
            .btn-add-email { width: 100%; padding: 12px; }
        </style>
    `;
    document.body.appendChild(modal);
}

function renderLeadSelectionList() {
    const leads = OutreachState.getLeads().filter(l => l.pathway === OutreachState.currentPathway);
    
    return leads.map(lead => `
        <label class="lead-selection-item">
            <input type="checkbox" name="leadIds" value="${lead.id}" onchange="updateSelectionCount()">
            <div class="lead-selection-info">
                <div class="lead-selection-name">${lead.firstName} ${lead.lastName}</div>
                <div class="lead-selection-email">${lead.email}</div>
            </div>
        </label>
    `).join('') || '<p class="empty-text" style="padding: 16px;">No leads available. Add leads first.</p>';
}

function toggleAllLeads(checkbox) {
    document.querySelectorAll('input[name="leadIds"]').forEach(cb => {
        cb.checked = checkbox.checked;
    });
    updateSelectionCount();
}

function updateSelectionCount() {
    const count = document.querySelectorAll('input[name="leadIds"]:checked').length;
    document.querySelector('.selection-count').textContent = `${count} selected`;
}

function saveCampaign() {
    const form = document.getElementById('create-campaign-form');
    const formData = new FormData(form);
    
    const leadIds = Array.from(formData.getAll('leadIds'));
    
    if (leadIds.length === 0) {
        showNotification('Please select at least one lead', 'error');
        return;
    }
    
    const campaign = {
        id: generateId(),
        name: formData.get('name'),
        description: formData.get('description'),
        pathway: OutreachState.currentPathway,
        status: 'draft',
        leads: leadIds,
        emails: [],
        stats: {
            sent: 0,
            opened: 0,
            clicked: 0,
            replied: 0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    const campaigns = OutreachState.getCampaigns();
    campaigns.push(campaign);
    OutreachState.saveCampaigns(campaigns);
    
    OutreachState.addActivity('campaign_created', `Created campaign: ${campaign.name}`, 'campaign', campaign.id);
    
    document.querySelector('.modal-overlay').remove();
    document.getElementById('occ-content').innerHTML = renderCampaigns();
    
    showNotification('Campaign created successfully', 'success');
}

function viewCampaign(campaignId) {
    const campaigns = OutreachState.getCampaigns();
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;
    
    // Show campaign detail view
    showNotification('Campaign detail view - to be implemented', 'info');
}

function editCampaign(campaignId) {
    showNotification('Edit campaign - to be implemented', 'info');
}

function launchCampaign(campaignId) {
    const campaigns = OutreachState.getCampaigns();
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;
    
    campaign.status = 'active';
    campaign.launchedAt = new Date().toISOString();
    OutreachState.saveCampaigns(campaigns);
    
    // Add emails to queue
    const queue = OutreachState.getQueue();
    
    campaign.leads.forEach(leadId => {
        const leads = OutreachState.getLeads();
        const lead = leads.find(l => l.id === leadId);
        if (!lead) return;
        
        // Add initial email to queue
        queue.push({
            id: generateId(),
            campaignId: campaign.id,
            leadId: lead.id,
            to: lead.email,
            subject: campaign.emails[0]?.subject || 'Introduction',
            body: campaign.emails[0]?.body || '',
            status: 'pending',
            createdAt: new Date().toISOString()
        });
        
        // Update lead status
        lead.status = 'contacted';
        lead.lastContactAt = new Date().toISOString();
        OutreachState.saveLeads(leads);
    });
    
    OutreachState.saveQueue(queue);
    OutreachState.addActivity('campaign_launched', `Launched campaign: ${campaign.name}`, 'campaign', campaignId);
    
    document.getElementById('occ-content').innerHTML = renderCampaigns();
    showNotification('Campaign launched successfully', 'success');
}

function showTemplateManager() {
    showNotification('Template manager - to be implemented', 'info');
}

function previewTemplate(templateKey) {
    const templates = getTemplatesForPathway(OutreachState.currentPathway);
    const template = templates[templateKey];
    if (!template) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content template-preview-modal">
            <div class="modal-header">
                <h3>📄 ${template.name}</h3>
                <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="template-meta">
                    <span class="template-category">${template.category}</span>
                    <span class="template-tone">Tone: ${template.tone}</span>
                </div>
                <div class="template-subject">
                    <label>Subject:</label>
                    <p>${template.subject}</p>
                </div>
                <div class="template-body">
                    <label>Body:</label>
                    <pre>${template.body}</pre>
                </div>
                <div class="template-variables">
                    <label>Variables:</label>
                    <div class="variables-list">
                        ${template.variables.map(v => `<span class="variable-tag">{{${v}}}</span>`).join('')}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                <button class="btn btn-primary" onclick="useTemplate('${templateKey}')">Use Template</button>
            </div>
        </div>
        <style>
            .template-preview-modal { max-width: 700px; }
            .template-meta { display: flex; gap: 16px; margin-bottom: 20px; }
            .template-category, .template-tone {
                background: rgba(212, 175, 99, 0.1);
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
            }
            .template-subject, .template-body, .template-variables { margin-bottom: 20px; }
            .template-subject label, .template-body label, .template-variables label {
                display: block;
                font-size: 12px;
                color: rgba(246, 241, 232, 0.6);
                margin-bottom: 8px;
                text-transform: uppercase;
            }
            .template-subject p {
                font-weight: 600;
                color: var(--ivory-light);
            }
            .template-body pre {
                background: rgba(0, 0, 0, 0.3);
                padding: 16px;
                border-radius: 8px;
                white-space: pre-wrap;
                font-family: inherit;
                line-height: 1.6;
                color: rgba(246, 241, 232, 0.9);
            }
            .variables-list { display: flex; flex-wrap: wrap; gap: 8px; }
            .variable-tag {
                background: rgba(46, 124, 131, 0.2);
                color: var(--sacred-teal);
                padding: 4px 10px;
                border-radius: 4px;
                font-size: 12px;
                font-family: monospace;
            }
        </style>
    `;
    document.body.appendChild(modal);
}

function useTemplate(templateKey) {
    document.querySelector('.modal-overlay').remove();
    showNotification('Template selected. Create a campaign to use it.', 'success');
}
