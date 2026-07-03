// ============================================
// OUTREACH QUEUE
// ============================================

function renderQueue() {
    const queue = OutreachState.getQueue();
    const pending = queue.filter(q => q.status === 'pending');
    const scheduled = queue.filter(q => q.status === 'scheduled');
    const sent = queue.filter(q => q.status === 'sent').slice(0, 20);
    
    const settings = OutreachState.getSettings();
    
    return `
        <div class="occ-queue">
            <!-- Queue Stats -->
            <div class="queue-stats-bar">
                <div class="queue-stat">
                    <span class="stat-number pending">${pending.length}</span>
                    <span class="stat-label">Pending</span>
                </div>
                <div class="queue-stat">
                    <span class="stat-number scheduled">${scheduled.length}</span>
                    <span class="stat-label">Scheduled</span>
                </div>
                <div class="queue-stat">
                    <span class="stat-number sent">${queue.filter(q => isToday(q.sentAt)).length}</span>
                    <span class="stat-label">Sent Today</span>
                </div>
                <div class="queue-stat">
                    <span class="stat-number">${settings.maxDailyEmails - queue.filter(q => isToday(q.sentAt)).length}</span>
                    <span class="stat-label">Remaining Today</span>
                </div>
            </div>
            
            <!-- Queue Tabs -->
            <div class="queue-tabs">
                <button class="queue-tab active" onclick="showQueueTab('pending')">Pending (${pending.length})</button>
                <button class="queue-tab" onclick="showQueueTab('scheduled')">Scheduled (${scheduled.length})</button>
                <button class="queue-tab" onclick="showQueueTab('sent')">Recently Sent</button>
            </div>
            
            <!-- Queue Actions -->
            <div class="queue-actions-bar">
                <div class="queue-actions-left">
                    <label class="checkbox-label">
                        <input type="checkbox" id="select-all-queue" onchange="toggleAllQueueItems(this)">
                        <span>Select All</span>
                    </label>
                </div>
                <div class="queue-actions-right">
                    <button class="btn btn-sm btn-secondary" onclick="scheduleSelected()" id="btn-schedule" disabled>Schedule</button>
                    <button class="btn btn-sm btn-primary" onclick="sendSelected()" id="btn-send" disabled>Send Selected</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSelected()" id="btn-delete" disabled>Delete</button>
                </div>
            </div>
            
            <!-- Queue List -->
            <div class="queue-list-container">
                <div id="queue-list-pending" class="queue-list">
                    ${renderQueueList(pending)}
                </div>
                <div id="queue-list-scheduled" class="queue-list" style="display: none;">
                    ${renderQueueList(scheduled)}
                </div>
                <div id="queue-list-sent" class="queue-list" style="display: none;">
                    ${renderSentList(sent)}
                </div>
            </div>
        </div>
        
        <style>
            .occ-queue {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .queue-stats-bar {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 16px;
            }
            
            .queue-stat {
                background: rgba(31, 49, 91, 0.4);
                border: 1px solid rgba(212, 175, 99, 0.2);
                border-radius: 16px;
                padding: 20px;
                text-align: center;
            }
            
            .stat-number {
                display: block;
                font-family: 'Cormorant Garamond', serif;
                font-size: 36px;
                font-weight: 700;
                color: var(--ivory-light);
                margin-bottom: 4px;
            }
            
            .stat-number.pending { color: #FFC107; }
            .stat-number.scheduled { color: #2196F3; }
            .stat-number.sent { color: #4CAF50; }
            
            .stat-label {
                font-size: 12px;
                color: rgba(246, 241, 232, 0.6);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .queue-tabs {
                display: flex;
                gap: 8px;
                border-bottom: 1px solid rgba(212, 175, 99, 0.2);
            }
            
            .queue-tab {
                background: none;
                border: none;
                color: rgba(246, 241, 232, 0.6);
                padding: 12px 20px;
                cursor: pointer;
                font-size: 14px;
                border-bottom: 2px solid transparent;
                margin-bottom: -1px;
                transition: all 0.3s;
            }
            
            .queue-tab.active {
                color: var(--warm-gold);
                border-bottom-color: var(--warm-gold);
            }
            
            .queue-actions-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background: rgba(31, 49, 91, 0.3);
                border-radius: 8px;
            }
            
            .queue-actions-right {
                display: flex;
                gap: 8px;
            }
            
            .queue-list-container {
                background: rgba(31, 49, 91, 0.3);
                border: 1px solid rgba(212, 175, 99, 0.1);
                border-radius: 16px;
                overflow: hidden;
            }
            
            .queue-list {
                max-height: 500px;
                overflow-y: auto;
            }
            
            .queue-item {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 16px;
                border-bottom: 1px solid rgba(246, 241, 232, 0.05);
                transition: background 0.2s;
            }
            
            .queue-item:hover {
                background: rgba(212, 175, 99, 0.05);
            }
            
            .queue-item-checkbox {
                width: 20px;
            }
            
            .queue-item-info {
                flex: 1;
                min-width: 0;
            }
            
            .queue-item-recipient {
                font-weight: 500;
                color: var(--ivory-light);
                margin-bottom: 4px;
            }
            
            .queue-item-subject {
                font-size: 13px;
                color: rgba(246, 241, 232, 0.7);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .queue-item-meta {
                display: flex;
                align-items: center;
                gap: 16px;
            }
            
            .queue-item-status {
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 500;
                text-transform: uppercase;
            }
            
            .queue-item-status.pending { background: rgba(255, 193, 7, 0.2); color: #FFC107; }
            .queue-item-status.scheduled { background: rgba(33, 150, 243, 0.2); color: #2196F3; }
            .queue-item-status.sent { background: rgba(76, 175, 80, 0.2); color: #4CAF50; }
            
            .queue-item-actions {
                display: flex;
                gap: 8px;
            }
            
            .empty-queue {
                text-align: center;
                padding: 60px;
                color: rgba(246, 241, 232, 0.5);
            }
        </style>
    `;
}

function renderQueueList(items) {
    if (items.length === 0) {
        return '<div class="empty-queue">No emails in queue</div>';
    }
    
    const leads = OutreachState.getLeads();
    
    return items.map(item => {
        const lead = leads.find(l => l.id === item.leadId);
        return `
            <div class="queue-item">
                <input type="checkbox" class="queue-item-checkbox" value="${item.id}" onchange="updateQueueActions()">
                <div class="queue-item-info">
                    <div class="queue-item-recipient">${lead ? `${lead.firstName} ${lead.lastName}` : item.to}</div>
                    <div class="queue-item-subject">${item.subject}</div>
                </div>
                <div class="queue-item-meta">
                    <span class="queue-item-status ${item.status}">${item.status}</span>
                    <div class="queue-item-actions">
                        <button class="action-btn" onclick="previewQueueEmail('${item.id}')" title="Preview">👁️</button>
                        <button class="action-btn" onclick="editQueueEmail('${item.id}')" title="Edit">✏️</button>
                        <button class="action-btn" onclick="deleteQueueItem('${item.id}')" title="Delete">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderSentList(items) {
    if (items.length === 0) {
        return '<div class="empty-queue">No emails sent recently</div>';
    }
    
    const leads = OutreachState.getLeads();
    
    return items.map(item => {
        const lead = leads.find(l => l.id === item.leadId);
        return `
            <div class="queue-item">
                <div class="queue-item-info" style="margin-left: 36px;">
                    <div class="queue-item-recipient">${lead ? `${lead.firstName} ${lead.lastName}` : item.to}</div>
                    <div class="queue-item-subject">${item.subject}</div>
                </div>
                <div class="queue-item-meta">
                    <span class="queue-item-status sent">Sent ${formatDate(item.sentAt)}</span>
                    <div class="queue-item-actions">
                        <button class="action-btn" onclick="viewEmailStats('${item.id}')" title="Stats">📊</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function showQueueTab(tab) {
    document.querySelectorAll('.queue-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    document.querySelectorAll('.queue-list').forEach(l => l.style.display = 'none');
    document.getElementById(`queue-list-${tab}`).style.display = 'block';
}

function toggleAllQueueItems(checkbox) {
    const activeTab = document.querySelector('.queue-tab.active').textContent.toLowerCase();
    let listId = 'queue-list-pending';
    if (activeTab.includes('scheduled')) listId = 'queue-list-scheduled';
    if (activeTab.includes('sent')) listId = 'queue-list-sent';
    
    const list = document.getElementById(listId);
    list.querySelectorAll('.queue-item-checkbox').forEach(cb => {
        cb.checked = checkbox.checked;
    });
    
    updateQueueActions();
}

function updateQueueActions() {
    const checked = document.querySelectorAll('.queue-item-checkbox:checked').length;
    
    document.getElementById('btn-schedule').disabled = checked === 0;
    document.getElementById('btn-send').disabled = checked === 0;
    document.getElementById('btn-delete').disabled = checked === 0;
}

function getSelectedQueueIds() {
    return Array.from(document.querySelectorAll('.queue-item-checkbox:checked')).map(cb => cb.value);
}

function sendSelected() {
    const ids = getSelectedQueueIds();
    if (ids.length === 0) return;
    
    if (!confirm(`Send ${ids.length} emails now?`)) return;
    
    const queue = OutreachState.getQueue();
    const leads = OutreachState.getLeads();
    
    ids.forEach(id => {
        const item = queue.find(q => q.id === id);
        if (item && item.status === 'pending') {
            item.status = 'sent';
            item.sentAt = new Date().toISOString();
            
            // Update lead
            const lead = leads.find(l => l.id === item.leadId);
            if (lead) {
                lead.lastContactAt = new Date().toISOString();
            }
            
            // In production, this would call the Resend API
            console.log('Sending email via Resend:', item);
        }
    });
    
    OutreachState.saveQueue(queue);
    OutreachState.saveLeads(leads);
    
    OutreachState.addActivity('email_sent', `Sent ${ids.length} emails`, 'queue', null);
    
    document.getElementById('occ-content').innerHTML = renderQueue();
    showNotification(`${ids.length} emails sent`, 'success');
}

function scheduleSelected() {
    const ids = getSelectedQueueIds();
    if (ids.length === 0) return;
    
    // Show schedule modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content schedule-modal">
            <div class="modal-header">
                <h3>📅 Schedule Emails</h3>
                <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Send Date</label>
                    <input type="date" id="schedule-date" min="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label>Send Time</label>
                    <input type="time" id="schedule-time" value="09:00">
                </div>
                <p class="schedule-info">Scheduling ${ids.length} emails</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="confirmSchedule('${ids.join(',')}')">Schedule</button>
            </div>
        </div>
        <style>
            .schedule-modal { max-width: 400px; }
            .form-group { margin-bottom: 16px; }
            .form-group label { display: block; margin-bottom: 6px; font-size: 14px; }
            .form-group input { width: 100%; padding: 12px; background: rgba(246, 241, 232, 0.05); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 8px; color: var(--ivory-light); }
            .schedule-info { color: rgba(246, 241, 232, 0.6); font-size: 14px; margin-top: 16px; }
        </style>
    `;
    document.body.appendChild(modal);
}

function confirmSchedule(idsString) {
    const ids = idsString.split(',');
    const date = document.getElementById('schedule-date').value;
    const time = document.getElementById('schedule-time').value;
    
    if (!date || !time) {
        showNotification('Please select date and time', 'error');
        return;
    }
    
    const scheduledFor = new Date(`${date}T${time}`).toISOString();
    
    const queue = OutreachState.getQueue();
    
    ids.forEach(id => {
        const item = queue.find(q => q.id === id);
        if (item) {
            item.status = 'scheduled';
            item.scheduledFor = scheduledFor;
        }
    });
    
    OutreachState.saveQueue(queue);
    OutreachState.addActivity('email_scheduled', `Scheduled ${ids.length} emails`, 'queue', null);
    
    document.querySelector('.modal-overlay').remove();
    document.getElementById('occ-content').innerHTML = renderQueue();
    showNotification(`${ids.length} emails scheduled`, 'success');
}

function deleteSelected() {
    const ids = getSelectedQueueIds();
    if (ids.length === 0) return;
    
    if (!confirm(`Delete ${ids.length} emails from queue?`)) return;
    
    const queue = OutreachState.getQueue();
    const filtered = queue.filter(q => !ids.includes(q.id));
    OutreachState.saveQueue(filtered);
    
    document.getElementById('occ-content').innerHTML = renderQueue();
    showNotification(`${ids.length} emails deleted`, 'success');
}

function previewQueueEmail(itemId) {
    const queue = OutreachState.getQueue();
    const item = queue.find(q => q.id === itemId);
    if (!item) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content preview-modal">
            <div class="modal-header">
                <h3>👁️ Email Preview</h3>
                <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="email-preview">
                    <div class="preview-field">
                        <span class="preview-label">To:</span>
                        <span class="preview-value">${item.to}</span>
                    </div>
                    <div class="preview-field">
                        <span class="preview-label">Subject:</span>
                        <span class="preview-value">${item.subject}</span>
                    </div>
                    <div class="preview-body">
                        <pre>${item.body}</pre>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                <button class="btn btn-primary" onclick="sendQueueItemNow('${item.id}')">Send Now</button>
            </div>
        </div>
        <style>
            .preview-modal { max-width: 600px; }
            .email-preview { background: rgba(0, 0, 0, 0.2); border-radius: 8px; padding: 20px; }
            .preview-field { margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(246, 241, 232, 0.1); }
            .preview-label { color: rgba(246, 241, 232, 0.5); margin-right: 8px; }
            .preview-value { color: var(--ivory-light); }
            .preview-body { margin-top: 16px; }
            .preview-body pre { white-space: pre-wrap; font-family: inherit; line-height: 1.6; color: rgba(246, 241, 232, 0.9); }
        </style>
    `;
    document.body.appendChild(modal);
}

function editQueueEmail(itemId) {
    showNotification('Edit queue item - to be implemented', 'info');
}

function deleteQueueItem(itemId) {
    if (!confirm('Delete this email from queue?')) return;
    
    const queue = OutreachState.getQueue();
    const filtered = queue.filter(q => q.id !== itemId);
    OutreachState.saveQueue(filtered);
    
    document.getElementById('occ-content').innerHTML = renderQueue();
    showNotification('Email deleted', 'success');
}

function sendQueueItemNow(itemId) {
    const queue = OutreachState.getQueue();
    const item = queue.find(q => q.id === itemId);
    if (!item) return;
    
    item.status = 'sent';
    item.sentAt = new Date().toISOString();
    OutreachState.saveQueue(queue);
    
    document.querySelector('.modal-overlay').remove();
    document.getElementById('occ-content').innerHTML = renderQueue();
    showNotification('Email sent', 'success');
}

function viewEmailStats(itemId) {
    showNotification('Email stats - to be implemented', 'info');
}

function processQueue() {
    const queue = OutreachState.getQueue();
    const pending = queue.filter(q => q.status === 'pending');
    
    if (pending.length === 0) {
        showNotification('No pending emails in queue', 'info');
        return;
    }
    
    setView('queue');
}
