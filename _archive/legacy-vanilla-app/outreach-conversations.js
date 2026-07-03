// ============================================
// CONVERSATIONS & FOLLOW-UP TRACKING
// ============================================

function renderConversations() {
    const leads = OutreachState.getLeads();
    const pathwayLeads = leads.filter(l => l.pathway === OutreachState.currentPathway);
    
    // Get leads with conversations (responded or have notes)
    const activeConversations = pathwayLeads.filter(l => 
        l.status === 'responded' || 
        l.status === 'converted' ||
        (l.conversations && l.conversations.length > 0)
    );
    
    // Get leads needing follow-up
    const needsFollowUp = pathwayLeads.filter(l => {
        if (!l.lastContactAt) return false;
        const lastContact = new Date(l.lastContactAt);
        const daysSince = Math.floor((Date.now() - lastContact) / (1000 * 60 * 60 * 24));
        return daysSince >= 7 && l.status !== 'converted' && l.status !== 'disqualified';
    });
    
    return `
        <div class="occ-conversations">
            <!-- Conversations Header -->
            <div class="conversations-header">
                <div class="header-tabs">
                    <button class="header-tab active" onclick="showConversationTab('active')">
                        💬 Active (${activeConversations.length})
                    </button>
                    <button class="header-tab" onclick="showConversationTab('followup')">
                        ⏰ Follow-up (${needsFollowUp.length})
                    </button>
                </div>
                <button class="btn btn-primary" onclick="showLogConversationModal()">Log Conversation</button>
            </div>
            
            <!-- Active Conversations -->
            <div id="conversations-active" class="conversations-list">
                ${activeConversations.length > 0 ? activeConversations.map(lead => `
                    <div class="conversation-card">
                        <div class="conversation-header">
                            <div class="conversation-avatar">${lead.firstName[0]}${lead.lastName[0]}</div>
                            <div class="conversation-info">
                                <div class="conversation-name">${lead.firstName} ${lead.lastName}</div>
                                <div class="conversation-meta">
                                    <span class="conversation-company">${lead.company || 'No company'}</span>
                                    <span class="conversation-stage ${lead.status}">${lead.status}</span>
                                </div>
                            </div>
                            <div class="conversation-actions">
                                <button class="btn btn-sm btn-secondary" onclick="viewConversation('${lead.id}')">View Thread</button>
                                <button class="btn btn-sm btn-primary" onclick="replyToConversation('${lead.id}')">Reply</button>
                            </div>
                        </div>
                        ${renderLastMessage(lead)}
                    </div>
                `).join('') : '<div class="empty-conversations"><p>No active conversations</p></div>'}
            </div>
            
            <!-- Follow-up Needed -->
            <div id="conversations-followup" class="conversations-list" style="display: none;">
                ${needsFollowUp.length > 0 ? needsFollowUp.map(lead => {
                    const daysSince = Math.floor((Date.now() - new Date(lead.lastContactAt)) / (1000 * 60 * 60 * 24));
                    return `
                        <div class="conversation-card followup">
                            <div class="conversation-header">
                                <div class="conversation-avatar">${lead.firstName[0]}${lead.lastName[0]}</div>
                                <div class="conversation-info">
                                    <div class="conversation-name">${lead.firstName} ${lead.lastName}</div>
                                    <div class="conversation-meta">
                                        <span class="conversation-company">${lead.company || 'No company'}</span>
                                        <span class="followup-badge">${daysSince} days since contact</span>
                                    </div>
                                </div>
                                <div class="conversation-actions">
                                    <button class="btn btn-sm btn-primary" onclick="sendFollowUp('${lead.id}')">Send Follow-up</button>
                                </div>
                            </div>
                            <div class="followup-suggestions">
                                <p>Suggested actions:</p>
                                <ul>
                                    <li>Send value-first follow-up email</li>
                                    <li>Share relevant resource or insight</li>
                                    <li>Check in on their progress</li>
                                </ul>
                            </div>
                        </div>
                    `;
                }).join('') : '<div class="empty-conversations"><p>No follow-ups needed</p></div>'}
            </div>
        </div>
        
        <style>
            .occ-conversations {
                display: flex;
                flex-direction: column;
                gap: 24px;
            }
            
            .conversations-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .header-tabs {
                display: flex;
                gap: 8px;
            }
            
            .header-tab {
                background: rgba(31, 49, 91, 0.4);
                border: 1px solid rgba(212, 175, 99, 0.2);
                border-radius: 8px;
                padding: 10px 20px;
                color: rgba(246, 241, 232, 0.7);
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .header-tab.active {
                background: rgba(212, 175, 99, 0.2);
                border-color: var(--warm-gold);
                color: var(--warm-gold);
            }
            
            .conversations-list {
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            
            .conversation-card {
                background: rgba(31, 49, 91, 0.3);
                border: 1px solid rgba(212, 175, 99, 0.1);
                border-radius: 16px;
                padding: 20px;
                transition: all 0.3s;
            }
            
            .conversation-card:hover {
                border-color: rgba(212, 175, 99, 0.2);
            }
            
            .conversation-card.followup {
                border-left: 3px solid #FFC107;
            }
            
            .conversation-header {
                display: flex;
                align-items: center;
                gap: 16px;
            }
            
            .conversation-avatar {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--warm-gold), var(--sacred-teal));
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                color: var(--deep-indigo);
            }
            
            .conversation-info {
                flex: 1;
            }
            
            .conversation-name {
                font-weight: 600;
                color: var(--ivory-light);
                margin-bottom: 4px;
            }
            
            .conversation-meta {
                display: flex;
                gap: 12px;
                align-items: center;
            }
            
            .conversation-company {
                font-size: 13px;
                color: rgba(246, 241, 232, 0.6);
            }
            
            .conversation-stage {
                padding: 2px 10px;
                border-radius: 12px;
                font-size: 11px;
                text-transform: uppercase;
            }
            
            .conversation-stage.responded { background: rgba(139, 195, 74, 0.2); color: #8BC34A; }
            .conversation-stage.converted { background: rgba(76, 175, 80, 0.2); color: #4CAF50; }
            
            .followup-badge {
                background: rgba(255, 193, 7, 0.2);
                color: #FFC107;
                padding: 2px 10px;
                border-radius: 12px;
                font-size: 11px;
            }
            
            .conversation-actions {
                display: flex;
                gap: 8px;
            }
            
            .last-message {
                margin-top: 16px;
                padding: 16px;
                background: rgba(246, 241, 232, 0.03);
                border-radius: 10px;
            }
            
            .message-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                font-size: 12px;
                color: rgba(246, 241, 232, 0.5);
            }
            
            .message-preview {
                color: rgba(246, 241, 232, 0.8);
                line-height: 1.5;
            }
            
            .followup-suggestions {
                margin-top: 16px;
                padding: 16px;
                background: rgba(255, 193, 7, 0.05);
                border-radius: 10px;
            }
            
            .followup-suggestions p {
                font-size: 13px;
                color: rgba(246, 241, 232, 0.7);
                margin-bottom: 8px;
            }
            
            .followup-suggestions ul {
                margin: 0;
                padding-left: 20px;
                font-size: 13px;
                color: rgba(246, 241, 232, 0.6);
            }
            
            .followup-suggestions li {
                margin-bottom: 4px;
            }
            
            .empty-conversations {
                text-align: center;
                padding: 60px;
                color: rgba(246, 241, 232, 0.5);
            }
        </style>
    `;
}

function renderLastMessage(lead) {
    // In a real implementation, this would show the actual last message
    // For now, show a placeholder based on status
    if (lead.status === 'responded') {
        return `
            <div class="last-message">
                <div class="message-header">
                    <span>Last contact: ${formatDate(lead.lastContactAt)}</span>
                    <span>Responded</span>
                </div>
                <div class="message-preview">
                    Lead has responded to your outreach. Click "View Thread" to see the full conversation.
                </div>
            </div>
        `;
    }
    return '';
}

function showConversationTab(tab) {
    document.querySelectorAll('.header-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    document.querySelectorAll('.conversations-list').forEach(l => l.style.display = 'none');
    document.getElementById(`conversations-${tab}`).style.display = 'flex';
}

function viewConversation(leadId) {
    const leads = OutreachState.getLeads();
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content conversation-thread-modal">
            <div class="modal-header">
                <div class="thread-header-info">
                    <div class="thread-avatar">${lead.firstName[0]}${lead.lastName[0]}</div>
                    <div>
                        <h3>${lead.firstName} ${lead.lastName}</h3>
                        <p>${lead.email}</p>
                    </div>
                </div>
                <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="thread-timeline">
                    <div class="timeline-item sent">
                        <div class="timeline-dot"></div>
                        <div class="timeline-content">
                            <div class="timeline-header">
                                <span class="timeline-author">You</span>
                                <span class="timeline-date">${formatDateTime(lead.lastContactAt)}</span>
                            </div>
                            <div class="timeline-message">
                                <p>Initial outreach email sent</p>
                            </div>
                        </div>
                    </div>
                    ${lead.status === 'responded' ? `
                        <div class="timeline-item received">
                            <div class="timeline-dot"></div>
                            <div class="timeline-content">
                                <div class="timeline-header">
                                    <span class="timeline-author">${lead.firstName}</span>
                                    <span class="timeline-date">${formatDateTime(lead.lastContactAt)}</span>
                                </div>
                                <div class="timeline-message">
                                    <p>Lead responded to your email</p>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="replyToConversation('${lead.id}')">Reply</button>
            </div>
        </div>
        <style>
            .conversation-thread-modal { max-width: 700px; }
            .thread-header-info { display: flex; align-items: center; gap: 16px; }
            .thread-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, var(--warm-gold), var(--sacred-teal)); display: flex; align-items: center; justify-content: center; font-weight: 600; color: var(--deep-indigo); }
            .thread-timeline { display: flex; flex-direction: column; gap: 24px; }
            .timeline-item { display: flex; gap: 16px; }
            .timeline-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--warm-gold); margin-top: 4px; flex-shrink: 0; }
            .timeline-item.received .timeline-dot { background: var(--sacred-teal); }
            .timeline-content { flex: 1; }
            .timeline-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .timeline-author { font-weight: 600; color: var(--ivory-light); }
            .timeline-date { font-size: 12px; color: rgba(246, 241, 232, 0.5); }
            .timeline-message { background: rgba(246, 241, 232, 0.05); padding: 16px; border-radius: 10px; }
            .timeline-item.received .timeline-message { background: rgba(46, 124, 131, 0.1); }
        </style>
    `;
    document.body.appendChild(modal);
}

function replyToConversation(leadId) {
    sendEmailToLead(leadId);
}

function sendFollowUp(leadId) {
    const leads = OutreachState.getLeads();
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    
    // Show follow-up template selector
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content followup-modal">
            <div class="modal-header">
                <h3>⏰ Send Follow-up to ${lead.firstName}</h3>
                <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <p class="followup-context">Last contact: ${formatDate(lead.lastContactAt)}</p>
                <div class="followup-templates">
                    <button class="template-option" onclick="sendFollowUpWithTemplate('${leadId}', 'gentle')">
                        <h4>Gentle Check-in</h4>
                        <p>Soft, no-pressure follow-up</p>
                    </button>
                    <button class="template-option" onclick="sendFollowUpWithTemplate('${leadId}', 'value')">
                        <h4>Value-First</h4>
                        <p>Share something useful</p>
                    </button>
                    <button class="template-option" onclick="sendFollowUpWithTemplate('${leadId}', 'direct')">
                        <h4>Direct Ask</h4>
                        <p>Clear next step request</p>
                    </button>
                </div>
            </div>
        </div>
        <style>
            .followup-modal { max-width: 500px; }
            .followup-context { color: rgba(246, 241, 232, 0.6); margin-bottom: 20px; }
            .followup-templates { display: flex; flex-direction: column; gap: 12px; }
            .template-option {
                background: rgba(246, 241, 232, 0.05);
                border: 1px solid rgba(212, 175, 99, 0.2);
                border-radius: 12px;
                padding: 16px;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s;
            }
            .template-option:hover { background: rgba(212, 175, 99, 0.1); border-color: var(--warm-gold); }
            .template-option h4 { color: var(--ivory-light); margin-bottom: 4px; }
            .template-option p { color: rgba(246, 241, 232, 0.6); font-size: 13px; }
        </style>
    `;
    document.body.appendChild(modal);
}

function sendFollowUpWithTemplate(leadId, templateType) {
    document.querySelector('.modal-overlay').remove();
    
    const leads = OutreachState.getLeads();
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    
    // Pre-compose follow-up email
    const subject = templateType === 'gentle' ? 'Quick check-in' : 
                   templateType === 'value' ? 'Thought you might find this helpful' : 
                   'Following up on my last email';
    
    const body = templateType === 'gentle' ? 
        `Hi ${lead.firstName},\n\nI wanted to circle back and see how you're doing. No pressure at all—just checking in.\n\nIf now isn't the right time, I completely understand.\n\nWarmly,\nBabs` :
        templateType === 'value' ?
        `Hi ${lead.firstName},\n\nI came across something that made me think of you and wanted to share.\n\n[Add your value here]\n\nHope it serves you in some way.\n\nBest,\nBabs` :
        `Hi ${lead.firstName},\n\nI wanted to follow up on my email from last week.\n\nAre you still interested in [topic]? I'd love to hear your thoughts.\n\nIf you're open to a brief conversation, here's my calendar: ${OUTREACH_CONFIG.calendarLink}\n\nBest,\nBabs`;
    
    // Show email composer
    showEmailComposer(lead);
    
    // Pre-fill
    setTimeout(() => {
        document.getElementById('email-subject').value = subject;
        document.getElementById('email-body').value = body;
    }, 100);
}

function showLogConversationModal() {
    const leads = OutreachState.getLeads().filter(l => l.pathway === OutreachState.currentPathway);
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content log-conversation-modal">
            <div class="modal-header">
                <h3>📝 Log Conversation</h3>
                <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="log-conversation-form">
                    <div class="form-group">
                        <label>Select Lead</label>
                        <select name="leadId" required>
                            <option value="">-- Select a lead --</option>
                            ${leads.map(lead => `<option value="${lead.id}">${lead.firstName} ${lead.lastName}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Conversation Type</label>
                        <select name="type">
                            <option value="email">Email</option>
                            <option value="call">Phone Call</option>
                            <option value="meeting">Meeting</option>
                            <option value="dm">Direct Message</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Notes</label>
                        <textarea name="notes" rows="4" placeholder="What was discussed..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>Outcome</label>
                        <select name="outcome">
                            <option value="none">No change</option>
                            <option value="positive">Positive</option>
                            <option value="negative">Negative</option>
                            <option value="followup">Needs follow-up</option>
                        </select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="saveConversationLog()">Log Conversation</button>
            </div>
        </div>
        <style>
            .log-conversation-modal { max-width: 500px; }
            .form-group { margin-bottom: 16px; }
            .form-group label { display: block; margin-bottom: 6px; font-size: 14px; }
            .form-group input, .form-group select, .form-group textarea {
                width: 100%; padding: 12px; background: rgba(246, 241, 232, 0.05); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 8px; color: var(--ivory-light);
            }
        </style>
    `;
    document.body.appendChild(modal);
}

function saveConversationLog() {
    const form = document.getElementById('log-conversation-form');
    const formData = new FormData(form);
    
    const leadId = formData.get('leadId');
    if (!leadId) {
        showNotification('Please select a lead', 'error');
        return;
    }
    
    const leads = OutreachState.getLeads();
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    
    // Initialize conversations array if needed
    if (!lead.conversations) lead.conversations = [];
    
    lead.conversations.push({
        id: generateId(),
        type: formData.get('type'),
        notes: formData.get('notes'),
        outcome: formData.get('outcome'),
        timestamp: new Date().toISOString()
    });
    
    lead.lastContactAt = new Date().toISOString();
    
    // Update status based on outcome
    if (formData.get('outcome') === 'positive') {
        lead.status = 'responded';
    } else if (formData.get('outcome') === 'followup') {
        lead.status = 'contacted';
    }
    
    OutreachState.saveLeads(leads);
    OutreachState.addActivity('conversation_logged', `Logged ${formData.get('type')} with ${lead.firstName} ${lead.lastName}`, 'lead', leadId);
    
    document.querySelector('.modal-overlay').remove();
    document.getElementById('occ-content').innerHTML = renderConversations();
    
    showNotification('Conversation logged', 'success');
}
