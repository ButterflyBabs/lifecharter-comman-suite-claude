// ============================================
// PIPELINE MANAGEMENT
// ============================================

function renderPipeline() {
    const leads = OutreachState.getLeads();
    const pathwayLeads = leads.filter(l => l.pathway === OutreachState.currentPathway);
    
    const stages = OUTREACH_CONFIG.pipelineStages[OutreachState.currentPathway] || OUTREACH_CONFIG.pipelineStages.b2b;
    
    // Group leads by stage
    const leadsByStage = {};
    stages.forEach(stage => {
        leadsByStage[stage] = pathwayLeads.filter(l => l.pipelineStage === stage || (stage === 'new' && !l.pipelineStage));
    });
    
    return `
        <div class="occ-pipeline">
            <!-- Pipeline Header -->
            <div class="pipeline-header">
                <div class="pipeline-stats">
                    <div class="pipeline-stat">
                        <span class="stat-value">${pathwayLeads.length}</span>
                        <span class="stat-label">Total Leads</span>
                    </div>
                    <div class="pipeline-stat">
                        <span class="stat-value">${pathwayLeads.filter(l => l.status === 'converted').length}</span>
                        <span class="stat-label">Converted</span>
                    </div>
                    <div class="pipeline-stat">
                        <span class="stat-value">${calculateConversionRate(pathwayLeads)}%</span>
                        <span class="stat-label">Conversion Rate</span>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="showAddLeadModal()">+ Add Lead</button>
            </div>
            
            <!-- Pipeline Board -->
            <div class="pipeline-board">
                ${stages.map(stage => `
                    <div class="pipeline-column" data-stage="${stage}">
                        <div class="column-header">
                            <h4 class="column-title">${formatStageName(stage)}</h4>
                            <span class="column-count">${leadsByStage[stage]?.length || 0}</span>
                        </div>
                        <div class="column-content" ondrop="dropLead(event, '${stage}')" ondragover="allowDrop(event)">
                            ${(leadsByStage[stage] || []).map(lead => `
                                <div class="pipeline-card" draggable="true" ondragstart="dragLead(event, '${lead.id}')" onclick="showLeadDetail('${lead.id}')">
                                    <div class="card-header">
                                        <div class="card-avatar">${lead.firstName[0]}${lead.lastName[0]}</div>
                                        <div class="card-score" style="background: ${getScoreColor(lead.score || 0)}">${lead.score || 0}</div>
                                    </div>
                                    <div class="card-name">${lead.firstName} ${lead.lastName}</div>
                                    <div class="card-company">${lead.company || lead.title || 'No company'}</div>
                                    <div class="card-meta">
                                        <span class="card-priority ${lead.priority || 'normal'}">${lead.priority || 'normal'}</span>
                                        <span class="card-date">${formatDate(lead.lastContactAt)}</span>
                                    </div>
                                </div>
                            `).join('') || '<div class="empty-column">Drop leads here</div>'}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <style>
            .occ-pipeline {
                display: flex;
                flex-direction: column;
                gap: 24px;
            }
            
            .pipeline-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .pipeline-stats {
                display: flex;
                gap: 24px;
            }
            
            .pipeline-stat {
                text-align: center;
            }
            
            .pipeline-stat .stat-value {
                font-family: 'Cormorant Garamond', serif;
                font-size: 32px;
                font-weight: 700;
                color: var(--warm-gold);
            }
            
            .pipeline-stat .stat-label {
                font-size: 12px;
                color: rgba(246, 241, 232, 0.6);
                text-transform: uppercase;
            }
            
            .pipeline-board {
                display: flex;
                gap: 16px;
                overflow-x: auto;
                padding-bottom: 16px;
            }
            
            .pipeline-column {
                min-width: 280px;
                max-width: 280px;
                background: rgba(31, 49, 91, 0.3);
                border: 1px solid rgba(212, 175, 99, 0.1);
                border-radius: 12px;
                display: flex;
                flex-direction: column;
                max-height: 600px;
            }
            
            .column-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px;
                border-bottom: 1px solid rgba(212, 175, 99, 0.1);
            }
            
            .column-title {
                font-family: 'Cormorant Garamond', serif;
                font-size: 16px;
                font-weight: 600;
                color: var(--ivory-light);
                text-transform: capitalize;
            }
            
            .column-count {
                background: rgba(212, 175, 99, 0.2);
                color: var(--warm-gold);
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
            }
            
            .column-content {
                flex: 1;
                overflow-y: auto;
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .pipeline-card {
                background: rgba(246, 241, 232, 0.05);
                border: 1px solid rgba(212, 175, 99, 0.1);
                border-radius: 10px;
                padding: 14px;
                cursor: grab;
                transition: all 0.2s;
            }
            
            .pipeline-card:hover {
                border-color: rgba(212, 175, 99, 0.3);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            }
            
            .pipeline-card:active {
                cursor: grabbing;
            }
            
            .card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }
            
            .card-avatar {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: linear-gradient(135deg, var(--warm-gold), var(--sacred-teal));
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 600;
                color: var(--deep-indigo);
            }
            
            .card-score {
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 11px;
                font-weight: 600;
                color: white;
            }
            
            .card-name {
                font-weight: 500;
                color: var(--ivory-light);
                margin-bottom: 4px;
            }
            
            .card-company {
                font-size: 12px;
                color: rgba(246, 241, 232, 0.5);
                margin-bottom: 10px;
            }
            
            .card-meta {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .card-priority {
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 10px;
                text-transform: uppercase;
            }
            
            .card-priority.high { background: rgba(244, 67, 54, 0.2); color: #f44336; }
            .card-priority.normal { background: rgba(255, 193, 7, 0.2); color: #FFC107; }
            .card-priority.low { background: rgba(158, 158, 158, 0.2); color: #9E9E9E; }
            
            .card-date {
                font-size: 11px;
                color: rgba(246, 241, 232, 0.4);
            }
            
            .empty-column {
                text-align: center;
                padding: 40px 20px;
                color: rgba(246, 241, 232, 0.3);
                font-size: 13px;
                border: 2px dashed rgba(212, 175, 99, 0.1);
                border-radius: 8px;
            }
        </style>
    `;
}

function formatStageName(stage) {
    return stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function calculateConversionRate(leads) {
    if (leads.length === 0) return 0;
    const converted = leads.filter(l => l.status === 'converted').length;
    return Math.round((converted / leads.length) * 100);
}

// Drag and Drop Functions
function dragLead(event, leadId) {
    event.dataTransfer.setData('leadId', leadId);
    event.target.style.opacity = '0.5';
}

function allowDrop(event) {
    event.preventDefault();
    const column = event.target.closest('.column-content');
    if (column) {
        column.style.background = 'rgba(212, 175, 99, 0.05)';
    }
}

function dropLead(event, stage) {
    event.preventDefault();
    const leadId = event.dataTransfer.getData('leadId');
    
    // Reset opacity
    document.querySelectorAll('.pipeline-card').forEach(card => {
        card.style.opacity = '1';
    });
    
    // Reset column background
    document.querySelectorAll('.column-content').forEach(col => {
        col.style.background = '';
    });
    
    if (!leadId) return;
    
    // Update lead stage
    const leads = OutreachState.getLeads();
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    
    const oldStage = lead.pipelineStage || 'new';
    lead.pipelineStage = stage;
    lead.updatedAt = new Date().toISOString();
    
    // Update status based on stage
    if (stage === 'closed_won' || stage === 'circle_enrolled' || stage === 'contract_signed') {
        lead.status = 'converted';
    } else if (stage === 'contacted' || stage === 'responded') {
        lead.status = stage;
    }
    
    OutreachState.saveLeads(leads);
    OutreachState.addActivity('status_changed', `Moved ${lead.firstName} ${lead.lastName} to ${formatStageName(stage)}`, 'lead', leadId);
    
    // Re-render
    document.getElementById('occ-content').innerHTML = renderPipeline();
    
    showNotification(`Lead moved to ${formatStageName(stage)}`, 'success');
}

// Add drag end handler to reset styles
document.addEventListener('dragend', () => {
    document.querySelectorAll('.pipeline-card').forEach(card => {
        card.style.opacity = '1';
    });
    document.querySelectorAll('.column-content').forEach(col => {
        col.style.background = '';
    });
});
