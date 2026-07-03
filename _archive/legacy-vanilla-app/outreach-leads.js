// ============================================
// LEADS MANAGEMENT
// ============================================

function renderLeads() {
    const leads = OutreachState.getLeads();
    const pathwayLeads = leads.filter(l => l.pathway === OutreachState.currentPathway);
    
    // Apply filters
    let filteredLeads = pathwayLeads;
    if (OutreachState.filters.status !== 'all') {
        filteredLeads = filteredLeads.filter(l => l.status === OutreachState.filters.status);
    }
    if (OutreachState.filters.priority !== 'all') {
        filteredLeads = filteredLeads.filter(l => l.priority === OutreachState.filters.priority);
    }
    if (OutreachState.filters.search) {
        const search = OutreachState.filters.search.toLowerCase();
        filteredLeads = filteredLeads.filter(l => 
            (l.firstName + ' ' + l.lastName).toLowerCase().includes(search) ||
            l.email.toLowerCase().includes(search) ||
            (l.company && l.company.toLowerCase().includes(search))
        );
    }
    
    return `
        <div class="occ-leads">
            <!-- Filters -->
            <div class="leads-filters">
                <div class="filter-group">
                    <input type="text" class="filter-search" placeholder="🔍 Search leads..." 
                        value="${OutreachState.filters.search}" oninput="updateSearchFilter(this.value)">
                </div>
                <div class="filter-group">
                    <select class="filter-select" onchange="updateStatusFilter(this.value)">
                        <option value="all">All Statuses</option>
                        <option value="new" ${OutreachState.filters.status === 'new' ? 'selected' : ''}>New</option>
                        <option value="researching" ${OutreachState.filters.status === 'researching' ? 'selected' : ''}>Researching</option>
                        <option value="contacted" ${OutreachState.filters.status === 'contacted' ? 'selected' : ''}>Contacted</option>
                        <option value="responded" ${OutreachState.filters.status === 'responded' ? 'selected' : ''}>Responded</option>
                        <option value="converted" ${OutreachState.filters.status === 'converted' ? 'selected' : ''}>Converted</option>
                        <option value="disqualified" ${OutreachState.filters.status === 'disqualified' ? 'selected' : ''}>Disqualified</option>
                    </select>
                </div>
                <div class="filter-group">
                    <select class="filter-select" onchange="updatePriorityFilter(this.value)">
                        <option value="all">All Priorities</option>
                        <option value="high" ${OutreachState.filters.priority === 'high' ? 'selected' : ''}>High</option>
                        <option value="normal" ${OutreachState.filters.priority === 'normal' ? 'selected' : ''}>Normal</option>
                        <option value="low" ${OutreachState.filters.priority === 'low' ? 'selected' : ''}>Low</option>
                    </select>
                </div>
                <div class="filter-actions">
                    <button class="btn btn-sm btn-secondary" onclick="exportLeads()">📥 Export</button>
                    <button class="btn btn-sm btn-secondary" onclick="importLeads()">📤 Import</button>
                </div>
            </div>
            
            <!-- Leads Table -->
            <div class="leads-table-container">
                <table class="leads-table">
                    <thead>
                        <tr>
                            <th>Lead</th>
                            <th>Company/Role</th>
                            <th>Score</th>
                            <th>Status</th>
                            <th>Priority</th>
                            <th>Last Contact</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredLeads.map(lead => `
                            <tr class="lead-row">
                                <td>
                                    <div class="lead-info">
                                        <div class="lead-avatar">${lead.firstName[0]}${lead.lastName[0]}</div>
                                        <div class="lead-details">
                                            <div class="lead-name">${lead.firstName} ${lead.lastName}</div>
                                            <div class="lead-email">${lead.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div class="lead-company">${lead.company || '-'}</div>
                                    <div class="lead-title">${lead.title || '-'}</div>
                                </td>
                                <td>
                                    <div class="lead-score">
                                        <span class="score-value" style="color: ${getScoreColor(lead.score || 0)}">${lead.score || 0}</span>
                                        <span class="score-label">${getScoreLabel(lead.score || 0)}</span>
                                    </div>
                                </td>
                                <td>
                                    <span class="status-badge ${lead.status}">${lead.status}</span>
                                </td>
                                <td>
                                    <span class="priority-badge ${lead.priority || 'normal'}">${lead.priority || 'normal'}</span>
                                </td>
                                <td>${formatDate(lead.lastContactAt)}</td>
                                <td>
                                    <div class="row-actions">
                                        <button class="action-btn" onclick="showLeadDetail('${lead.id}')" title="View">👁️</button>
                                        <button class="action-btn" onclick="sendEmailToLead('${lead.id}')" title="Email">📧</button>
                                        <button class="action-btn" onclick="editLead('${lead.id}')" title="Edit">✏️</button>
                                        <button class="action-btn" onclick="deleteLead('${lead.id}')" title="Delete">🗑️</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('') || '<tr><td colspan="7" class="empty-cell">No leads found</td></tr>'}
                    </tbody>
                </table>
            </div>
            
            <div class="leads-footer">
                <span>Showing ${filteredLeads.length} of ${pathwayLeads.length} leads</span>
            </div>
        </div>
        
        <style>
            .occ-leads {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .leads-filters {
                display: flex;
                gap: 12px;
                flex-wrap: wrap;
                align-items: center;
            }
            
            .filter-group {
                flex: 1;
                min-width: 200px;
            }
            
            .filter-search {
                width: 100%;
                padding: 12px 16px;
                background: rgba(246, 241, 232, 0.05);
                border: 1px solid rgba(212, 175, 99, 0.2);
                border-radius: 10px;
                color: var(--ivory-light);
                font-size: 14px;
            }
            
            .filter-search:focus {
                outline: none;
                border-color: var(--warm-gold);
            }
            
            .filter-select {
                width: 100%;
                padding: 12px 16px;
                background: rgba(246, 241, 232, 0.05);
                border: 1px solid rgba(212, 175, 99, 0.2);
                border-radius: 10px;
                color: var(--ivory-light);
                font-size: 14px;
                cursor: pointer;
            }
            
            .filter-actions {
                display: flex;
                gap: 8px;
            }
            
            .leads-table-container {
                overflow-x: auto;
                background: rgba(31, 49, 91, 0.3);
                border: 1px solid rgba(212, 175, 99, 0.1);
                border-radius: 16px;
            }
            
            .leads-table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .leads-table th {
                text-align: left;
                padding: 16px;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: rgba(246, 241, 232, 0.6);
                border-bottom: 1px solid rgba(212, 175, 99, 0.2);
                font-weight: 600;
            }
            
            .leads-table td {
                padding: 16px;
                border-bottom: 1px solid rgba(246, 241, 232, 0.05);
            }
            
            .lead-row:hover {
                background: rgba(212, 175, 99, 0.05);
            }
            
            .lead-info {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .lead-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--warm-gold), var(--sacred-teal));
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                color: var(--deep-indigo);
                font-size: 14px;
            }
            
            .lead-name {
                font-weight: 500;
                color: var(--ivory-light);
            }
            
            .lead-email {
                font-size: 12px;
                color: rgba(246, 241, 232, 0.5);
            }
            
            .lead-company {
                font-weight: 500;
                color: var(--ivory-light);
            }
            
            .lead-title {
                font-size: 12px;
                color: rgba(246, 241, 232, 0.5);
            }
            
            .lead-score {
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            
            .score-value {
                font-size: 20px;
                font-weight: 700;
            }
            
            .score-label {
                font-size: 11px;
                color: rgba(246, 241, 232, 0.5);
            }
            
            .status-badge {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 500;
                text-transform: uppercase;
            }
            
            .status-badge.new { background: rgba(158, 158, 158, 0.2); color: #9E9E9E; }
            .status-badge.researching { background: rgba(33, 150, 243, 0.2); color: #2196F3; }
            .status-badge.contacted { background: rgba(255, 193, 7, 0.2); color: #FFC107; }
            .status-badge.responded { background: rgba(139, 195, 74, 0.2); color: #8BC34A; }
            .status-badge.converted { background: rgba(76, 175, 80, 0.2); color: #4CAF50; }
            .status-badge.disqualified { background: rgba(244, 67, 54, 0.2); color: #f44336; }
            
            .priority-badge {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 500;
                text-transform: uppercase;
            }
            
            .priority-badge.high { background: rgba(244, 67, 54, 0.2); color: #f44336; }
            .priority-badge.normal { background: rgba(255, 193, 7, 0.2); color: #FFC107; }
            .priority-badge.low { background: rgba(158, 158, 158, 0.2); color: #9E9E9E; }
            
            .row-actions {
                display: flex;
                gap: 8px;
            }
            
            .action-btn {
                background: rgba(246, 241, 232, 0.05);
                border: none;
                padding: 8px;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 14px;
            }
            
            .action-btn:hover {
                background: rgba(212, 175, 99, 0.2);
            }
            
            .leads-footer {
                text-align: right;
                color: rgba(246, 241, 232, 0.5);
                font-size: 13px;
            }
            
            .empty-cell {
                text-align: center;
                padding: 60px;
                color: rgba(246, 241, 232, 0.5);
            }
        </style>
    `;
}

function updateSearchFilter(value) {
    OutreachState.filters.search = value;
    document.getElementById('occ-content').innerHTML = renderLeads();
}

function updateStatusFilter(value) {
    OutreachState.filters.status = value;
    document.getElementById('occ-content').innerHTML = renderLeads();
}

function updatePriorityFilter(value) {
    OutreachState.filters.priority = value;
    document.getElementById('occ-content').innerHTML = renderLeads();
}

function showAddLeadModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content lead-modal">
            <div class="modal-header">
                <h3>👤 Add New Lead</h3>
                <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="add-lead-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label>First Name *</label>
                            <input type="text" name="firstName" required>
                        </div>
                        <div class="form-group">
                            <label>Last Name *</label>
                            <input type="text" name="lastName" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Email *</label>
                        <input type="email" name="email" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Company</label>
                            <input type="text" name="company">
                        </div>
                        <div class="form-group">
                            <label>Title</label>
                            <input type="text" name="title">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Phone</label>
                            <input type="tel" name="phone">
                        </div>
                        <div class="form-group">
                            <label>Website</label>
                            <input type="url" name="website">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>LinkedIn</label>
                            <input type="url" name="linkedin">
                        </div>
                        <div class="form-group">
                            <label>Priority</label>
                            <select name="priority">
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Notes</label>
                        <textarea name="notes" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Tags (comma separated)</label>
                        <input type="text" name="tags" placeholder="coach, consultant, author...">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="saveNewLead()">Add Lead</button>
            </div>
        </div>
        <style>
            .lead-modal { max-width: 600px; }
            .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .form-group { margin-bottom: 16px; }
            .form-group label { display: block; margin-bottom: 6px; font-size: 13px; color: rgba(246, 241, 232, 0.8); }
            .form-group input, .form-group select, .form-group textarea {
                width: 100%;
                padding: 12px;
                background: rgba(246, 241, 232, 0.05);
                border: 1px solid rgba(212, 175, 99, 0.2);
                border-radius: 8px;
                color: var(--ivory-light);
                font-size: 14px;
            }
            .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
                outline: none;
                border-color: var(--warm-gold);
            }
        </style>
    `;
    document.body.appendChild(modal);
}

function saveNewLead() {
    const form = document.getElementById('add-lead-form');
    const formData = new FormData(form);
    
    const lead = {
        id: generateId(),
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        company: formData.get('company'),
        title: formData.get('title'),
        phone: formData.get('phone'),
        website: formData.get('website'),
        linkedin: formData.get('linkedin'),
        priority: formData.get('priority'),
        notes: formData.get('notes'),
        tags: formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()) : [],
        pathway: OutreachState.currentPathway,
        status: 'new',
        score: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Calculate initial score
    lead.score = calculateLeadScore(lead);
    
    const leads = OutreachState.getLeads();
    leads.push(lead);
    OutreachState.saveLeads(leads);
    OutreachState.addActivity('lead_added', `Added lead: ${lead.firstName} ${lead.lastName}`, 'lead', lead.id);
    
    document.querySelector('.modal-overlay').remove();
    document.getElementById('occ-content').innerHTML = renderLeads();
    
    showNotification('Lead added successfully', 'success');
}

function calculateLeadScore(lead) {
    let score = 0;
    
    // Email validation (20 points)
    if (lead.email && lead.email.includes('@')) score += 20;
    
    // Name completeness (15 points)
    if (lead.firstName && lead.lastName) score += 15;
    
    // Company info (15 points)
    if (lead.company) score += 15;
    
    // Title/Role (10 points)
    if (lead.title) score += 10;
    
    // LinkedIn (15 points)
    if (lead.linkedin) score += 15;
    
    // Website (10 points)
    if (lead.website) score += 10;
    
    // Phone (10 points)
    if (lead.phone) score += 10;
    
    // Notes indicate research (5 points)
    if (lead.notes && lead.notes.length > 20) score += 5;
    
    return Math.min(score, 100);
}

function showLeadDetail(leadId) {
    const leads = OutreachState.getLeads();
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content lead-detail-modal">
            <div class="modal-header">
                <div class="lead-header-info">
                    <div class="lead-avatar-large">${lead.firstName[0]}${lead.lastName[0]}</div>
                    <div>
                        <h3>${lead.firstName} ${lead.lastName}</h3>
                        <p>${lead.title || ''} ${lead.company ? 'at ' + lead.company : ''}</p>
                    </div>
                </div>
                <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="lead-detail-grid">
                    <div class="detail-section">
                        <h4>Contact Information</h4>
                        <div class="detail-item">
                            <span class="detail-label">Email</span>
                            <span class="detail-value"><a href="mailto:${lead.email}">${lead.email}</a></span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Phone</span>
                            <span class="detail-value">${lead.phone || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Website</span>
                            <span class="detail-value">${lead.website ? `<a href="${lead.website}" target="_blank">${lead.website}</a>` : '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">LinkedIn</span>
                            <span class="detail-value">${lead.linkedin ? `<a href="${lead.linkedin}" target="_blank">View Profile</a>` : '-'}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>Lead Score</h4>
                        <div class="score-display">
                            <div class="score-circle" style="--score: ${lead.score || 0}">
                                <span class="score-number">${lead.score || 0}</span>
                            </div>
                            <div class="score-breakdown">
                                <p>${getScoreLabel(lead.score || 0)} Match</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section full-width">
                        <h4>Notes</h4>
                        <p class="notes-text">${lead.notes || 'No notes added yet.'}</p>
                    </div>
                    
                    <div class="detail-section full-width">
                        <h4>Research Data</h4>
                        ${lead.research ? `
                            <div class="research-data">
                                <p><strong>Source:</strong> ${lead.research.source}</p>
                                <p><strong>Found:</strong> ${formatDate(lead.research.foundAt)}</p>
                                ${lead.research.summary ? `<p><strong>Summary:</strong> ${lead.research.summary}</p>` : ''}
                            </div>
                        ` : '<p class="empty-text">No research data available.</p>'}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                <button class="btn btn-primary" onclick="sendEmailToLead('${lead.id}')">Send Email</button>
            </div>
        </div>
        <style>
            .lead-detail-modal { max-width: 700px; }
            .lead-header-info { display: flex; align-items: center; gap: 16px; }
            .lead-avatar-large { width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, var(--warm-gold), var(--sacred-teal)); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 600; color: var(--deep-indigo); }
            .lead-detail-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
            .detail-section.full-width { grid-column: 1 / -1; }
            .detail-section h4 { font-family: 'Cormorant Garamond', serif; font-size: 18px; margin-bottom: 16px; color: var(--warm-gold); }
            .detail-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(246, 241, 232, 0.1); }
            .detail-label { color: rgba(246, 241, 232, 0.6); }
            .detail-value a { color: var(--sacred-teal); }
            .score-display { display: flex; align-items: center; gap: 16px; }
            .score-circle { width: 80px; height: 80px; border-radius: 50%; background: conic-gradient(var(--warm-gold) calc(var(--score) * 3.6deg), rgba(246, 241, 232, 0.1) 0); display: flex; align-items: center; justify-content: center; }
            .score-number { font-size: 24px; font-weight: 700; color: var(--ivory-light); }
            .notes-text { background: rgba(246, 241, 232, 0.05); padding: 16px; border-radius: 8px; line-height: 1.6; }
            .empty-text { color: rgba(246, 241, 232, 0.5); font-style: italic; }
        </style>
    `;
    document.body.appendChild(modal);
}

function sendEmailToLead(leadId) {
    const leads = OutreachState.getLeads();
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    
    // Close any open modals
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
    
    // Show email composer
    showEmailComposer(lead);
}

function showEmailComposer(lead) {
    const templates = getTemplatesForPathway(lead.pathway);
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content email-composer-modal">
            <div class="modal-header">
                <h3>📧 Compose Email</h3>
                <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="email-recipient">
                    <strong>To:</strong> ${lead.firstName} ${lead.lastName} &lt;${lead.email}&gt;
                </div>
                <div class="form-group">
                    <label>Template</label>
                    <select id="email-template" onchange="loadTemplate('${lead.id}', this.value)">
                        <option value="">-- Select a template --</option>
                        ${Object.entries(templates).map(([key, template]) => `
                            <option value="${key}">${template.name}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Subject</label>
                    <input type="text" id="email-subject" placeholder="Email subject...">
                </div>
                <div class="form-group">
                    <label>Message</label>
                    <textarea id="email-body" rows="12" placeholder="Write your message..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn btn-secondary" onclick="saveToDrafts('${lead.id}')">Save Draft</button>
                <button class="btn btn-primary" onclick="queueEmail('${lead.id}')">Add to Queue</button>
                <button class="btn btn-primary" onclick="sendEmailNow('${lead.id}')">Send Now</button>
            </div>
        </div>
        <style>
            .email-composer-modal { max-width: 700px; }
            .email-recipient { background: rgba(246, 241, 232, 0.05); padding: 12px; border-radius: 8px; margin-bottom: 16px; }
            .form-group { margin-bottom: 16px; }
            .form-group label { display: block; margin-bottom: 6px; font-size: 13px; color: rgba(246, 241, 232, 0.8); }
            .form-group input, .form-group select, .form-group textarea {
                width: 100%;
                padding: 12px;
                background: rgba(246, 241, 232, 0.05);
                border: 1px solid rgba(212, 175, 99, 0.2);
                border-radius: 8px;
                color: var(--ivory-light);
                font-size: 14px;
                font-family: inherit;
            }
            .form-group textarea { resize: vertical; line-height: 1.6; }
        </style>
    `;
    document.body.appendChild(modal);
}

function getTemplatesForPathway(pathway) {
    const allTemplates = {
        ...WINGS_OUT_TEMPLATES_B2B,
        ...WINGS_OUT_TEMPLATES_B2C,
        ...WINGS_OUT_TEMPLATES_AFFILIATE
    };
    
    return Object.fromEntries(
        Object.entries(allTemplates).filter(([key, template]) => template.path === pathway)
    );
}

function loadTemplate(leadId, templateKey) {
    if (!templateKey) return;
    
    const allTemplates = {
        ...WINGS_OUT_TEMPLATES_B2B,
        ...WINGS_OUT_TEMPLATES_B2C,
        ...WINGS_OUT_TEMPLATES_AFFILIATE
    };
    
    const template = allTemplates[templateKey];
    if (!template) return;
    
    const leads = OutreachState.getLeads();
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    
    // Simple variable replacement
    let body = template.body;
    let subject = template.subject;
    
    const variables = {
        firstName: lead.firstName,
        lastName: lead.lastName,
        company: lead.company || 'your company',
        title: lead.title || '',
        calendarLink: OUTREACH_CONFIG.calendarLink,
        personalNote: ''
    };
    
    Object.entries(variables).forEach(([key, value]) => {
        body = body.replace(new RegExp(`{{${key}}}`, 'g'), value);
        subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    
    document.getElementById('email-subject').value = subject;
    document.getElementById('email-body').value = body;
}

function queueEmail(leadId) {
    const subject = document.getElementById('email-subject').value;
    const body = document.getElementById('email-body').value;
    
    if (!subject || !body) {
        showNotification('Please fill in subject and message', 'error');
        return;
    }
    
    const leads = OutreachState.getLeads();
    const lead = leads.find(l => l.id === leadId);
    
    const queue = OutreachState.getQueue();
    queue.push({
        id: generateId(),
        leadId,
        to: lead.email,
        subject,
        body,
        status: 'pending',
        createdAt: new Date().toISOString()
    });
    OutreachState.saveQueue(queue);
    
    // Update lead status
    lead.status = 'contacted';
    lead.lastContactAt = new Date().toISOString();
    OutreachState.saveLeads(leads);
    
    OutreachState.addActivity('email_queued', `Queued email to ${lead.firstName} ${lead.lastName}`, 'lead', leadId);
    
    document.querySelector('.modal-overlay').remove();
    showNotification('Email added to queue', 'success');
}

function sendEmailNow(leadId) {
    // In a real implementation, this would call the Resend API
    showNotification('Email sending via Resend API...', 'info');
    queueEmail(leadId);
}

function editLead(leadId) {
    // Implementation for editing lead
    showNotification('Edit lead functionality - to be implemented', 'info');
}

function deleteLead(leadId) {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    
    const leads = OutreachState.getLeads();
    const filtered = leads.filter(l => l.id !== leadId);
    OutreachState.saveLeads(filtered);
    
    document.getElementById('occ-content').innerHTML = renderLeads();
    showNotification('Lead deleted', 'success');
}

function exportLeads() {
    const leads = OutreachState.getLeads().filter(l => l.pathway === OutreachState.currentPathway);
    
    const csvContent = [
        ['First Name', 'Last Name', 'Email', 'Company', 'Title', 'Phone', 'Website', 'LinkedIn', 'Status', 'Score', 'Notes'].join(','),
        ...leads.map(lead => [
            lead.firstName,
            lead.lastName,
            lead.email,
            lead.company || '',
            lead.title || '',
            lead.phone || '',
            lead.website || '',
            lead.linkedin || '',
            lead.status,
            lead.score || 0,
            `"${(lead.notes || '').replace(/"/g, '""')}"`
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${OutreachState.currentPathway}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Leads exported successfully', 'success');
}

function importLeads() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const csv = event.target.result;
            const lines = csv.split('\n');
            const headers = lines[0].split(',');
            
            const leads = OutreachState.getLeads();
            let imported = 0;
            
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                
                const values = lines[i].split(',');
                const lead = {
                    id: generateId(),
                    firstName: values[0]?.trim() || '',
                    lastName: values[1]?.trim() || '',
                    email: values[2]?.trim() || '',
                    company: values[3]?.trim() || '',
                    title: values[4]?.trim() || '',
                    phone: values[5]?.trim() || '',
                    website: values[6]?.trim() || '',
                    linkedin: values[7]?.trim() || '',
                    status: values[8]?.trim() || 'new',
                    score: parseInt(values[9]) || 0,
                    notes: values[10]?.trim() || '',
                    pathway: OutreachState.currentPathway,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                if (lead.email && lead.firstName) {
                    leads.push(lead);
                    imported++;
                }
            }
            
            OutreachState.saveLeads(leads);
            document.getElementById('occ-content').innerHTML = renderLeads();
            showNotification(`${imported} leads imported`, 'success');
        };
        reader.readAsText(file);
    };
    input.click();
}

function exportLeads() {
    const leads = OutreachState.getLeads().filter(l => l