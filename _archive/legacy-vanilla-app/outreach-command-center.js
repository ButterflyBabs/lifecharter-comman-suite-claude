// ============================================
// OUTREACH COMMAND CENTER - COMPLETE REBUILD
// Correct Architecture: All Pathways + Individual Pathway Sections
// ============================================

console.log('🎯 Outreach Command Center - Correct Architecture Loading...');

// ============================================
// CONFIGURATION
// ============================================

const OUTREACH_CONFIG = {
    maxDailyEmails: 20, minTimeBetweenEmails: 15, followUpSchedule: [3, 7, 14, 30],
    pathways: { ALL: 'all', B2B: 'b2b', B2C: 'b2c', PARTNERSHIPS: 'partnerships' },
    pathwayLabels: { all: '🌐 All Pathways', b2b: '💼 B2B Outreach', b2c: '🦋 B2C Outreach', partnerships: '🤝 Partnerships' },
    pathwayDescriptions: { all: 'Combined view of all outreach pathways', b2b: 'Coaches, Consultants, Business Owners', b2c: 'Individuals Seeking Transformation', partnerships: 'Brand Deals, Sponsorships, Affiliates' },
    views: { DASHBOARD: 'dashboard', LEADS: 'leads', RESEARCH: 'research', CAMPAIGNS: 'campaigns', QUEUE: 'queue', PIPELINE: 'pipeline', CONVERSATIONS: 'conversations', ANALYTICS: 'analytics' },
    viewLabels: { dashboard: '📊 Dashboard', leads: '👥 Leads', research: '🔍 AI Research', campaigns: '📧 Campaigns', queue: '⏳ Queue', pipeline: '🔄 Pipeline', conversations: '💬 Conversations', analytics: '📈 Analytics' },
    pipelineStages: { b2b: ['new','researching','contacted','responded','meeting_scheduled','proposal_sent','negotiating','closed_won','closed_lost','nurture'], b2c: ['new','researching','contacted','responded','incubator_invited','incubator_attended','circle_invited','circle_enrolled','not_now','nurture'], partnerships: ['new','researching','contacted','responded','media_kit_sent','proposal_sent','contract_negotiating','contract_signed','active','paused','ended'] },
    fromName: 'Babs Carroll', fromEmail: 'babs@sacredkaleidoscope.community', replyTo: 'babs@sacredkaleidoscope.community',
    calendarLink: 'https://calendly.com/sacredkaleidoscope/alignment-call',
    links: { incubator: 'https://lifecharter.co/incubator', circle: 'https://lifecharter.co/circle', alignmentSnapshot: 'https://lifecharter.co/alignment-snapshot', conversations: 'https://lifecharter.co/conversations', commandSuite: 'https://lifecharter.co/command-suite', commandSuiteDemo: 'https://lifecharter.co/command-suite-demo', mediaKit: 'https://babsandbeau.com/media-kit', partnershipDeck: 'https://babsandbeau.com/partnership-deck' }
};

// ============================================
// STATE MANAGEMENT
// ============================================

const OutreachState = {
    currentPathway: 'all', currentView: 'dashboard', selectedLead: null, selectedCampaign: null,
    filters: { pathway: 'all', status: 'all', priority: 'all', search: '', dateRange: 'all' },
    getLeads() { return JSON.parse(localStorage.getItem('occ_leads') || '[]'); },
    saveLeads(leads) { localStorage.setItem('occ_leads', JSON.stringify(leads)); },
    getCampaigns() { return JSON.parse(localStorage.getItem('occ_campaigns') || '[]'); },
    saveCampaigns(campaigns) { localStorage.setItem('occ_campaigns', JSON.stringify(campaigns)); },
    getQueue() { return JSON.parse(localStorage.getItem('occ_queue') || '[]'); },
    saveQueue(queue) { localStorage.setItem('occ_queue', JSON.stringify(queue)); },
    getActivities() { return JSON.parse(localStorage.getItem('occ_activities') || '[]'); },
    saveActivities(activities) { localStorage.setItem('occ_activities', JSON.stringify(activities)); },
    getResearch() { return JSON.parse(localStorage.getItem('occ_research') || '[]'); },
    saveResearch(research) { localStorage.setItem('occ_research', JSON.stringify(research)); },
    getConversations() { return JSON.parse(localStorage.getItem('occ_conversations') || '[]'); },
    saveConversations(conversations) { localStorage.setItem('occ_conversations', JSON.stringify(conversations)); },
    getSettings() { return JSON.parse(localStorage.getItem('occ_settings') || JSON.stringify({ maxDailyEmails: 20, minTimeBetweenEmails: 15, followUpSchedule: [3, 7, 14, 30], fromName: 'Babs Carroll', fromEmail: 'babs@sacredkaleidoscope.community', replyTo: 'babs@sacredkaleidoscope.community', openaiApiKey: '', resendApiKey: '', ghlPrivateToken: '', ghlLocationId: '' })); },
    saveSettings(settings) { localStorage.setItem('occ_settings', JSON.stringify(settings)); },
    addActivity(type, description, entityType = null, entityId = null, pathway = null) { const activities = this.getActivities(); activities.unshift({ id: generateId(), type, description, entityType, entityId, pathway, timestamp: new Date().toISOString() }); this.saveActivities(activities.slice(0, 100)); },
    getLeadsByPathway(pathway) { const leads = this.getLeads(); return pathway === 'all' ? leads : leads.filter(l => l.primary_pathway === pathway); },
    getCampaignsByPathway(pathway) { const campaigns = this.getCampaigns(); return pathway === 'all' ? campaigns : campaigns.filter(c => c.pathway === pathway); },
    getQueueByPathway(pathway) { const queue = this.getQueue(); return pathway === 'all' ? queue : queue.filter(q => q.pathway === pathway); },
    getConversationsByPathway(pathway) { const conversations = this.getConversations(); return pathway === 'all' ? conversations : conversations.filter(c => c.pathway === pathway); },
    getResearchByPathway(pathway) { const research = this.getResearch(); return pathway === 'all' ? research : research.filter(r => r.pathway === pathway); }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateId() { return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9); }
function formatDate(dateString) { return dateString ? new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'; }
function formatDateTime(dateString) { return dateString ? new Date(dateString).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'; }
function formatRelativeTime(dateString) { if (!dateString) return '-'; const date = new Date(dateString), now = new Date(); const diffMins = Math.floor((now - date) / 60000); if (diffMins < 1) return 'Just now'; if (diffMins < 60) return `${diffMins}m ago`; if (diffMins < 1440) return `${Math.floor(diffMins/60)}h ago`; return formatDate(dateString); }
function getScoreColor(score) { return score >= 80 ? '#4CAF50' : score >= 60 ? '#8BC34A' : score >= 40 ? '#FFC107' : score >= 20 ? '#FF9800' : '#f44336'; }
function getPathwayColor(pathway) { return { all: '#D4AF63', b2b: '#2E7C83', b2c: '#5E3B6C', partnerships: '#CDBED6' }[pathway] || '#D4AF63'; }
function getPathwayBadge(pathway) { return { all: '🌐', b2b: '💼', b2c: '🦋', partnerships: '🤝' }[pathway] || '📌'; }
function getStatusColor(status) { const colors = { new: '#9E9E9E', researching: '#2196F3', contacted: '#FFC107', responded: '#8BC34A', meeting_scheduled: '#4CAF50', proposal_sent: '#FF9800', negotiating: '#9C27B0', closed_won: '#4CAF50', closed_lost: '#f44336', converted: '#4CAF50', nurture: '#607D8B', disqualified: '#f44336', incubator_invited: '#FF9800', incubator_attended: '#8BC34A', circle_invited: '#9C27B0', circle_enrolled: '#4CAF50', not_now: '#607D8B', media_kit_sent: '#FF9800', contract_negotiating: '#9C27B0', contract_signed: '#4CAF50', active: '#4CAF50', paused: '#FFC107', ended: '#f44336' }; return colors[status] || '#9E9E9E'; }
function getStatusLabel(status) { return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); }
function isToday(dateString) { return dateString ? new Date(dateString).toDateString() === new Date().toDateString() : false; }
function getActivityIcon(type) { const icons = { lead_added: '👤', lead_updated: '✏️', email_sent: '📤', email_opened: '👁️', email_replied: '💬', research_completed: '🔍', campaign_created: '📧', status_changed: '🔄', conversion: '✨', note_added: '📝', call_made: '📞', meeting_scheduled: '📅' }; return icons[type] || '📌'; }

// ============================================
// MAIN ENTRY POINT
// ============================================

function showOutreachCommandCenter() {
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    document.querySelectorAll('.sidebar-link').forEach(link => link.classList.remove('active'));
    const navLink = document.getElementById('nav-outreach');
    if (navLink) navLink.classList.add('active');
    mainContent.innerHTML = `<div class="outreach-command-center">${renderOutreachHeader()}${renderPathwayNavigation()}${renderMainContentArea()}</div>${renderOutreachStyles()}`;
    initializeOutreachEventListeners();
    // Scroll to top when opening Marketing/Outreach page
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderOutreachHeader() {
    return `<div class="occ-header"><div class="occ-header-left"><div class="occ-breadcrumb"><span onclick="showCommandCenter()" style="cursor:pointer;">Command Suite</span><span class="breadcrumb-separator">/</span><span class="current">Outreach</span></div><h1 class="occ-title">${OUTREACH_CONFIG.pathwayLabels[OutreachState.currentPathway]}<span class="view-indicator">${OUTREACH_CONFIG.viewLabels[OutreachState.currentView]}</span></h1><p class="occ-subtitle">${OUTREACH_CONFIG.pathwayDescriptions[OutreachState.currentPathway]}</p></div><div class="occ-header-actions"><button class="btn btn-secondary" onclick="showOutreachSettings()"><span>⚙️</span> Settings</button><button class="btn btn-primary" onclick="showAddLeadModal()"><span>+</span> Add Lead</button></div></div>`;
}

function renderPathwayNavigation() {
    const pathways = ['all', 'b2b', 'b2c', 'partnerships'], views = ['dashboard', 'leads', 'research', 'campaigns', 'queue', 'pipeline', 'conversations', 'analytics'];
    const getCount = (p) => p === 'all' ? OutreachState.getLeads().length : OutreachState.getLeads().filter(l => l.primary_pathway === p).length;
    return `<div class="occ-pathway-nav"><div class="pathway-tabs">${pathways.map(p => `<button class="pathway-tab ${OutreachState.currentPathway === p ? 'active' : ''}" onclick="selectPathway('${p}')"><span class="pathway-badge">${getPathwayBadge(p)}</span><span class="pathway-name">${OUTREACH_CONFIG.pathwayLabels[p].split(' ').slice(1).join(' ')}</span><span class="pathway-count">${getCount(p)}</span></button>`).join('')}</div>${OutreachState.currentPathway !== 'all' ? `<div class="pathway-submenu"><div class="submenu-label">${OUTREACH_CONFIG.pathwayLabels[OutreachState.currentPathway]} Menu</div><div class="submenu-tabs">${views.map(v => `<button class="submenu-tab ${OutreachState.currentView === v ? 'active' : ''}" onclick="setOutreachView('${v}')"><span>${OUTREACH_CONFIG.viewLabels[v].split(' ')[0]}</span><span class="tab-label">${OUTREACH_CONFIG.viewLabels[v].split(' ').slice(1).join(' ')}</span></button>`).join('')}</div></div>` : `<div class="all-pathways-tabs">${views.map(v => `<button class="view-tab ${OutreachState.currentView === v ? 'active' : ''}" onclick="setOutreachView('${v}')">${OUTREACH_CONFIG.viewLabels[v]}</button>`).join('')}</div>`}</div>`;
}

function selectPathway(pathway) { OutreachState.currentPathway = pathway; OutreachState.currentView = 'dashboard'; showOutreachCommandCenter(); }
function setOutreachView(view) { OutreachState.currentView = view; const contentArea = document.getElementById('occ-main-content'); if (contentArea) contentArea.innerHTML = renderCurrentOutreachView(); document.querySelectorAll('.view-tab, .submenu-tab').forEach(tab => { tab.classList.remove('active'); const onclick = tab.getAttribute('onclick'); if (onclick && onclick.includes(`'${view}'`)) tab.classList.add('active'); }); const titleEl = document.querySelector('.occ-title'); if (titleEl) titleEl.innerHTML = `${OUTREACH_CONFIG.pathwayLabels[OutreachState.currentPathway]}<span class="view-indicator">${OUTREACH_CONFIG.viewLabels[view]}</span>`; }
function renderMainContentArea() { return `<div class="occ-main-content" id="occ-main-content">${renderCurrentOutreachView()}</div>`; }
function renderCurrentOutreachView() { const { currentPathway: p, currentView: v } = OutreachState; if (p === 'all') return renderAllPathwaysView(v); if (p === 'b2b') return renderB2BView(v); if (p === 'b2c') return renderB2CView(v); if (p === 'partnerships') return renderPartnershipsView(v); return renderDashboardView(); }

// ============================================
// VIEW RENDERERS
// ============================================

function renderAllPathwaysView(view) { const views = { dashboard: renderAllPathwaysDashboard, leads: renderAllPathwaysLeads, research: renderAllPathwaysResearch, campaigns: renderAllPathwaysCampaigns, queue: renderAllPathwaysQueue, pipeline: renderAllPathwaysPipeline, conversations: renderAllPathwaysConversations, analytics: renderAllPathwaysAnalytics }; return (views[view] || views.dashboard)(); }
function renderB2BView(view) { const leads = OutreachState.getLeadsByPathway('b2b'), campaigns = OutreachState.getCampaignsByPathway('b2b'), queue = OutreachState.getQueueByPathway('b2b'); const views = { dashboard: () => renderPathwayDashboard('b2b', leads, campaigns, queue), leads: () => renderLeadsTable(leads, 'b2b'), research: () => renderResearchInterface('b2b'), campaigns: () => renderCampaignsList(campaigns, 'b2b'), queue: () => renderQueueInterface(queue, 'b2b'), pipeline: () => renderPipelineView('b2b'), conversations: () => renderConversationsList(OutreachState.getConversationsByPathway('b2b'), 'b2b'), analytics: () => renderAnalyticsDashboard('b2b') }; return (views[view] || views.dashboard)(); }
function renderB2CView(view) { const leads = OutreachState.getLeadsByPathway('b2c'), campaigns = OutreachState.getCampaignsByPathway('b2c'), queue = OutreachState.getQueueByPathway('b2c'); const views = { dashboard: () => renderPathwayDashboard('b2c', leads, campaigns, queue), leads: () => renderLeadsTable(leads, 'b2c'), research: () => renderResearchInterface('b2c'), campaigns: () => renderCampaignsList(campaigns, 'b2c'), queue: () => renderQueueInterface(queue, 'b2c'), pipeline: () => renderPipelineView('b2c'), conversations: () => renderConversationsList(OutreachState.getConversationsByPathway('b2c'), 'b2c'), analytics: () => renderAnalyticsDashboard('b2c') }; return (views[view] || views.dashboard)(); }
function renderPartnershipsView(view) { const leads = OutreachState.getLeadsByPathway('partnerships'), campaigns = OutreachState.getCampaignsByPathway('partnerships'), queue = OutreachState.getQueueByPathway('partnerships'); const views = { dashboard: () => renderPathwayDashboard('partnerships', leads, campaigns, queue), leads: () => renderLeadsTable(leads, 'partnerships'), research: () => renderResearchInterface('partnerships'), campaigns: () => renderCampaignsList(campaigns, 'partnerships'), queue: () => renderQueueInterface(queue, 'partnerships'), pipeline: () => renderPipelineView('partnerships'), conversations: () => renderConversationsList(OutreachState.getConversationsByPathway('partnerships'), 'partnerships'), analytics: () => renderAnalyticsDashboard('partnerships') }; return (views[view] || views.dashboard)(); }

// ============================================
// DASHBOARD VIEWS
// ============================================

function renderAllPathwaysDashboard() {
    const leads = OutreachState.getLeads(), queue = OutreachState.getQueue(), activities = OutreachState.getActivities();
    
    // Calculate metrics for All Pathways
    const totalCompanies = leads.filter(l => l.company && l.company.trim() !== '').length;
    const activeOpportunities = leads.filter(l => ['responded', 'meeting_scheduled', 'proposal_sent', 'negotiating', 'incubator_invited', 'circle_invited', 'contract_negotiating'].includes(l.status)).length;
    const draftsAwaitingApproval = queue.filter(q => q.status === 'pending' && q.requiresApproval).length || Math.floor(queue.filter(q => q.status === 'pending').length / 2);
    const followUpsDue = leads.filter(l => l.followUpDate && new Date(l.followUpDate) <= new Date()).length;
    const applications = leads.filter(l => ['application_started', 'application_completed', 'proposal_sent', 'contract_negotiating'].includes(l.status)).length;
    const activeProspects = leads.filter(l => !['new', 'disqualified', 'closed_lost', 'not_now', 'ended'].includes(l.status)).length;
    
    const [b2b, b2c, partner] = [leads.filter(l => l.primary_pathway === 'b2b').length, leads.filter(l => l.primary_pathway === 'b2c').length, leads.filter(l => l.primary_pathway === 'partnerships').length];
    
    return `<div class="all-pathways-dashboard">
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-icon">🏢</div>
                <div class="metric-value">${totalCompanies}</div>
                <div class="metric-label">Total Companies</div>
            </div>
            <div class="metric-card">
                <div class="metric-icon">🎯</div>
                <div class="metric-value">${activeOpportunities}</div>
                <div class="metric-label">Active Opportunities</div>
            </div>
            <div class="metric-card">
                <div class="metric-icon">📝</div>
                <div class="metric-value">${draftsAwaitingApproval}</div>
                <div class="metric-label">Drafts Awaiting Approval</div>
            </div>
            <div class="metric-card">
                <div class="metric-icon">⏰</div>
                <div class="metric-value">${followUpsDue}</div>
                <div class="metric-label">Follow-ups Due</div>
            </div>
            <div class="metric-card">
                <div class="metric-icon">📄</div>
                <div class="metric-value">${applications}</div>
                <div class="metric-label">Applications</div>
            </div>
            <div class="metric-card highlight">
                <div class="metric-icon">🌟</div>
                <div class="metric-value">${activeProspects}</div>
                <div class="metric-label">Active Prospects</div>
            </div>
        </div>
        <div class="dashboard-two-column">
            <div class="dashboard-panel">
                <h3>⚡ Quick Actions</h3>
                <div class="quick-actions-grid">
                    ${[['b2b','💼','B2B Dashboard'],['b2c','🦋','B2C Dashboard'],['partnerships','🤝','Partnerships']].map(([p,icon,l]) => `<button class="quick-action-card" onclick="selectPathway('${p}')"><span>${icon}</span><span>${l}</span></button>`).join('')}
                    <button class="quick-action-card" onclick="showAddLeadModal()"><span>👤</span><span>Add Lead</span></button>
                    <button class="quick-action-card" onclick="setOutreachView('research')"><span>🔍</span><span>AI Research</span></button>
                    <button class="quick-action-card" onclick="setOutreachView('queue')"><span>⏳</span><span>Queue</span></button>
                </div>
            </div>
            <div class="dashboard-panel">
                <h3>📊 Pathway Breakdown</h3>
                <div class="pathway-performance">
                    ${[['b2b','B2B','#2E7C83'],['b2c','B2C','#5E3B6C'],['partnerships','Partnerships','#CDBED6']].map(([p,label,color]) => `<div class="performance-row"><div class="perf-pathway"><span class="pathway-dot" style="background:${color}"></span><span>${label}</span></div><div class="perf-count">${leads.filter(l => l.primary_pathway === p).length} leads</div><button class="btn-view-small" onclick="selectPathway('${p}')">View</button></div>`).join('')}
                </div>
            </div>
        </div>
        <div class="dashboard-two-column">
            <div class="dashboard-panel">
                <div class="panel-header"><h3>📋 Recent Activity</h3><span>${activities.length} total</span></div>
                <div class="activity-timeline">${activities.slice(0,8).map(a => `<div class="timeline-item"><div class="timeline-icon">${getActivityIcon(a.type)}</div><div><div>${a.description}</div><div class="timeline-meta"><span>${a.pathway?getPathwayBadge(a.pathway):'🌐'}</span><span>${formatRelativeTime(a.timestamp)}</span></div></div></div>`).join('') || '<p class="empty-state">No activity</p>'}</div>
            </div>
            <div class="dashboard-panel">
                <div class="panel-header"><h3>👥 Recent Leads</h3><button class="btn-view-small" onclick="setOutreachView('leads')">View All</button></div>
                <div class="recent-leads-list">${leads.slice(0,6).map(l => `<div class="recent-lead-item" onclick="showLeadDetail('${l.id}')"><div class="lead-avatar">${l.firstName[0]}${l.lastName[0]}</div><div class="lead-info"><div>${l.firstName} ${l.lastName}</div><div>${l.company||l.email}</div></div><div><span class="pathway-badge-small">${getPathwayBadge(l.primary_pathway)}</span><span class="score-badge-small" style="background:${getScoreColor(l.score||0)}">${l.score||0}</span></div></div>`).join('') || '<p class="empty-state">No leads</p>'}</div>
            </div>
        </div>
    </div>`;
}

function renderPathwayDashboard(pathway, leads, campaigns, queue) {
    // Calculate metrics
    const totalCompanies = leads.filter(l => l.company && l.company.trim() !== '').length;
    const activeOpportunities = leads.filter(l => ['responded', 'meeting_scheduled', 'proposal_sent', 'negotiating', 'incubator_invited', 'circle_invited', 'contract_negotiating'].includes(l.status)).length;
    const draftsAwaitingApproval = queue.filter(q => q.status === 'pending' && q.requiresApproval).length || Math.floor(queue.filter(q => q.status === 'pending').length / 2);
    const followUpsDue = leads.filter(l => l.followUpDate && new Date(l.followUpDate) <= new Date()).length;
    const applications = leads.filter(l => ['application_started', 'application_completed', 'proposal_sent', 'contract_negotiating'].includes(l.status)).length;
    const activeProspects = leads.filter(l => !['new', 'disqualified', 'closed_lost', 'not_now', 'ended'].includes(l.status)).length;
    
    const activities = OutreachState.getActivities().filter(a => a.pathway === pathway || pathway === 'all');
    
    return `<div class="pathway-dashboard">
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-icon">🏢</div>
                <div class="metric-value">${totalCompanies}</div>
                <div class="metric-label">Total Companies</div>
            </div>
            <div class="metric-card">
                <div class="metric-icon">🎯</div>
                <div class="metric-value">${activeOpportunities}</div>
                <div class="metric-label">Active Opportunities</div>
            </div>
            <div class="metric-card">
                <div class="metric-icon">📝</div>
                <div class="metric-value">${draftsAwaitingApproval}</div>
                <div class="metric-label">Drafts Awaiting Approval</div>
            </div>
            <div class="metric-card">
                <div class="metric-icon">⏰</div>
                <div class="metric-value">${followUpsDue}</div>
                <div class="metric-label">Follow-ups Due</div>
            </div>
            <div class="metric-card">
                <div class="metric-icon">📄</div>
                <div class="metric-value">${applications}</div>
                <div class="metric-label">Applications</div>
            </div>
            <div class="metric-card highlight">
                <div class="metric-icon">🌟</div>
                <div class="metric-value">${activeProspects}</div>
                <div class="metric-label">Active ${pathway === 'b2b' ? 'Prospects' : pathway === 'b2c' ? 'Leads' : 'Partners'}</div>
            </div>
        </div>
        <div class="pathway-content-row">
            <div class="pathway-panel">
                <h3>🎯 Quick Actions</h3>
                <div class="pathway-actions">
                    <button class="pathway-action-btn" onclick="setOutreachView('research')">
                        <span>🔍</span><span>AI Research</span>
                    </button>
                    <button class="pathway-action-btn" onclick="showAddLeadModal()">
                        <span>👤</span><span>Add Lead</span>
                    </button>
                    <button class="pathway-action-btn" onclick="setOutreachView('campaigns')">
                        <span>📧</span><span>Campaigns</span>
                    </button>
                    <button class="pathway-action-btn" onclick="setOutreachView('queue')">
                        <span>⏳</span><span>Queue</span>
                    </button>
                </div>
            </div>
            <div class="pathway-panel">
                <h3>📈 Pipeline Overview</h3>
                <div class="pipeline-summary">
                    ${getPipelineSummary(pathway, leads)}
                </div>
            </div>
        </div>
        <div class="pathway-panel full-width">
            <div class="panel-header">
                <h3>📋 Recent Activity</h3>
                <button class="btn btn-sm" onclick="setOutreachView('conversations')">View All</button>
            </div>
            <div class="activity-list-compact">
                ${activities.slice(0,5).map(a => `<div class="activity-item-compact">
                    <span>${getActivityIcon(a.type)}</span>
                    <span>${a.description}</span>
                    <span>${formatRelativeTime(a.timestamp)}</span>
                </div>`).join('') || '<p class="empty-state">No activity</p>'}
            </div>
        </div>
    </div>`;
}

function getPipelineSummary(pathway, leads) {
    const stages = pathway === 'all' ? 
        ['new', 'researching', 'contacted', 'responded', 'converted'] :
        OUTREACH_CONFIG.pipelineStages[pathway]?.slice(0, 5) || ['new', 'researching', 'contacted', 'responded', 'converted'];
    
    return stages.map(stage => {
        const count = leads.filter(l => l.status === stage).length;
        const percentage = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
        return `<div class="pipeline-bar-item">
            <div class="bar-label">${getStatusLabel(stage)}</div>
            <div class="bar-visual">
                <div class="bar-fill" style="width: ${Math.max(percentage, 5)}%; background: ${getStatusColor(stage)}"></div>
                <span class="bar-count">${count}</span>
            </div>
        </div>`;
    }).join('');
}

// ============================================
// SHARED COMPONENTS
// ============================================

function renderLeadsTable(leads, pathway) {
    const filtered = leads.filter(l => { if (OutreachState.filters.search) { const s = OutreachState.filters.search.toLowerCase(); return (l.firstName+' '+l.lastName+' '+l.email+' '+(l.company||'')).toLowerCase().includes(s); } if (OutreachState.filters.status !== 'all' && l.status !== OutreachState.filters.status) return false; return true; });
    return `<div class="leads-view"><div class="leads-toolbar"><div class="leads-search"><input type="text" placeholder="Search leads..." value="${OutreachState.filters.search}" onkeyup="OutreachState.filters.search=this.value;document.getElementById('occ-main-content').innerHTML=renderLeadsTable(OutreachState.getLeadsByPathway('${pathway}'),'${pathway}')"></div><div class="leads-filters"><select onchange="OutreachState.filters.status=this.value;document.getElementById('occ-main-content').innerHTML=renderLeadsTable(OutreachState.getLeadsByPathway('${pathway}'),'${pathway}')"><option value="all">All Statuses</option>${['new','researching','contacted','responded','converted','nurture','disqualified'].map(s => `<option value="${s}" ${OutreachState.filters.status===s?'selected':''}>${getStatusLabel(s)}</option>`).join('')}</select></div><button class="btn btn-primary" onclick="showAddLeadModal()">+ Add Lead</button></div><div class="leads-table-container"><table class="leads-table"><thead><tr><th>Name</th><th>Company</th>${pathway==='all'?'<th>Pathway</th>':''}<th>Score</th><th>Status</th><th>Last Contact</th><th>Actions</th></tr></thead><tbody>${filtered.map(l => `<tr onclick="showLeadDetail('${l.id}')" class="clickable-row"><td><div class="lead-name-cell"><div class="lead-avatar-small">${l.firstName[0]}${l.lastName[0]}</div><div><div class="lead-name">${l.firstName} ${l.lastName}</div><div class="lead-email-small">${l.email}</div></div></div></td><td>${l.company||'-'}</td>${pathway==='all'?`<td><span class="pathway-tag ${l.primary_pathway}">${getPathwayBadge(l.primary_pathway)}</span></td>`:''}<td><span class="score-pill" style="background:${getScoreColor(l.score||0)}">${l.score||0}</span></td><td><span class="status-badge" style="background:${getStatusColor(l.status)}20;color:${getStatusColor(l.status)}">${getStatusLabel(l.status)}</span></td><td>${formatRelativeTime(l.lastContactAt)}</td><td><button class="btn-icon-sm" onclick="event.stopPropagation();showLeadActions('${l.id}')">⋮</button></td></tr>`).join('') || '<tr><td colspan="7" class="empty-cell">No leads found</td></tr>'}</tbody></table></div></div>`;
}

function renderResearchInterface(pathway) {
    const research = OutreachState.getResearchByPathway(pathway);
    return `<div class="research-view"><div class="research-header"><h3>🔍 AI Prospect Research</h3><p>Research and score potential leads using AI</p></div><div class="research-input-section"><div class="research-form"><div class="form-row"><div class="form-group"><label>Target Description</label><textarea id="research-input" placeholder="Describe your ideal prospect..." rows="3"></textarea></div></div><div class="form-row three-col"><div class="form-group"><label>Pathway</label><select id="research-pathway">${Object.entries(OUTREACH_CONFIG.pathwayLabels).filter(([k]) => pathway==='all' || k===pathway).map(([k,v]) => `<option value="${k}" ${k===(pathway==='all'?'b2b':pathway)?'selected':''}>${v}</option>`).join('')}</select></div><div class="form-group"><label>Count</label><input type="number" id="research-count" value="10" min="1" max="50"></div><div class="form-group"><label>Depth</label><select id="research-depth"><option value="basic">Basic</option><option value="standard" selected>Standard</option><option value="deep">Deep</option></select></div></div><button class="btn btn-primary btn-large" onclick="startAIResearch()"><span>🚀</span> Start AI Research</button></div></div><div class="research-history"><h4>Recent Sessions</h4>${research.length > 0 ? `<div class="research-list">${research.slice(0,5).map(r => `<div class="research-item"><div><div class="research-query">${r.query}</div><div class="research-meta">${getPathwayBadge(r.pathway)} ${formatRelativeTime(r.timestamp)} • ${r.results?.length||0} found</div></div><button class="btn btn-sm" onclick="viewResearchResults('${r.id}')">View</button></div>`).join('')}</div>` : '<p class="empty-state">No research sessions yet</p>'}</div></div>`;
}

function renderCampaignsList(campaigns, pathway) {
    return `<div class="campaigns-view"><div class="campaigns-header"><h3>📧 Email Campaigns</h3><button class="btn btn-primary" onclick="showCreateCampaignModal('${pathway}')">+ Create Campaign</button></div><div class="campaigns-grid">${campaigns.length > 0 ? campaigns.map(c => `<div class="campaign-card"><div class="campaign-header"><h4>${c.name}</h4><span class="campaign-status ${c.status}">${c.status}</span></div><p>${c.description || 'No description'}</p><div class="campaign-stats"><div><span>${c.emailsSent || 0}</span><span>Sent</span></div><div><span>${c.emailsOpened || 0}</span><span>Opened</span></div><div><span>${c.emailsReplied || 0}</span><span>Replied</span></div></div><div class="campaign-actions"><button class="btn btn-sm" onclick="editCampaign('${c.id}')">Edit</button><button class="btn btn-sm btn-secondary" onclick="viewCampaignStats('${c.id}')">Stats</button></div></div>`).join('') : '<div class="empty-state"><p>No campaigns yet. Create your first campaign to get started.</p></div>'}</div></div>`;
}

function renderQueueInterface(queue, pathway) {
    const pending = queue.filter(q => q.status === 'pending'), scheduled = queue.filter(q => q.status === 'scheduled'), sent = queue.filter(q => q.status === 'sent');
    return `<div class="queue-view"><div class="queue-header"><h3>⏳ Email Queue</h3><div class="queue-actions"><button class="btn btn-primary" onclick="processQueue()">📤 Send Pending (${pending.length})</button><button class="btn btn-secondary" onclick="showScheduleModal('${pathway}')">📅 Schedule</button></div></div><div class="queue-tabs"><button class="queue-tab active" onclick="showQueueTab('pending')">Pending (${pending.length})</button><button class="queue-tab" onclick="showQueueTab('scheduled')">Scheduled (${scheduled.length})</button><button class="queue-tab" onclick="showQueueTab('sent')">Sent (${sent.length})</button></div><div class="queue-list">${pending.length > 0 ? pending.map(q => `<div class="queue-item"><div class="queue-lead"><div class="lead-avatar-small">${q.leadName?.charAt(0)||'?'}</div><div><div>${q.leadName}</div><div class="queue-email">${q.leadEmail}</div></div></div><div class="queue-campaign">${q.campaignName}</div><div class="queue-actions"><button class="btn btn-sm" onclick="sendNow('${q.id}')">Send Now</button><button class="btn btn-sm btn-secondary" onclick="removeFromQueue('${q.id}')">Remove</button></div></div>`).join('') : '<p class="empty-state">No pending emails</p>'}</div></div>`;
}

function renderPipelineView(pathway) {
    const leads = OutreachState.getLeadsByPathway(pathway), stages = pathway === 'all' ? ['new','researching','contacted','responded','converted','nurture'] : OUTREACH_CONFIG.pipelineStages[pathway];
    return `<div class="pipeline-view"><div class="pipeline-header"><h3>🔄 Pipeline</h3><p>Track leads through your sales process</p></div><div class="pipeline-board">${stages.map(stage => `<div class="pipeline-column"><div class="pipeline-column-header" style="border-color:${getStatusColor(stage)}"><h4>${getStatusLabel(stage)}</h4><span class="column-count">${leads.filter(l => l.status === stage).length}</span></div><div class="pipeline-cards">${leads.filter(l => l.status === stage).map(l => `<div class="pipeline-card" onclick="showLeadDetail('${l.id}')"><div class="card-header"><span class="score-pill-small" style="background:${getScoreColor(l.score||0)}">${l.score||0}</span>${pathway==='all'?`<span class="pathway-tag-small ${l.primary_pathway}">${getPathwayBadge(l.primary_pathway)}</span>`:''}</div><div class="card-name">${l.firstName} ${l.lastName}</div><div class="card-company">${l.company||l.email}</div></div>`).join('')}</div></div>`).join('')}</div></div>`;
}

function renderConversationsList(conversations, pathway) {
    return `<div class="conversations-view"><div class="conversations-header"><h3>💬 Conversations</h3><p>Manage all your email conversations</p></div><div class="conversations-list">${conversations.length > 0 ? conversations.map(c => `<div class="conversation-item ${c.unread ? 'unread' : ''}" onclick="openConversation('${c.id}')"><div class="conversation-avatar">${c.leadName?.charAt(0)||'?'}</div><div class="conversation-content"><div class="conversation-header"><span class="conversation-name">${c.leadName}</span><span class="conversation-time">${formatRelativeTime(c.lastMessageAt)}</span></div><div class="conversation-preview">${c.lastMessagePreview}</div></div>${c.unread ? `<span class="unread-badge">${c.unreadCount}</span>` : ''}</div>`).join('') : '<p class="empty-state">No conversations yet</p>'}</div></div>`;
}

function renderAnalyticsDashboard(pathway) {
    const leads = OutreachState.getLeadsByPathway(pathway), campaigns = OutreachState.getCampaignsByPathway(pathway);
    const conversionRate = leads.length > 0 ? Math.round(leads.filter(l => ['converted','circle_enrolled','contract_signed','closed_won'].includes(l.status)).length / leads.length * 100) : 0;
    return `<div class="analytics-view"><div class="analytics-header"><h3>📈 Analytics</h3><p>Performance metrics for ${OUTREACH_CONFIG.pathwayLabels[pathway]}</p></div><div class="analytics-grid"><div class="analytics-card"><h4>Lead Sources</h4><div class="stat-large">${leads.length}</div><p>Total leads</p></div><div class="analytics-card"><h4>Conversion Rate</h4><div class="stat-large">${conversionRate}%</div><p>Of total leads</p></div><div class="analytics-card"><h4>Campaigns</h4><div class="stat-large">${campaigns.length}</div><p>Active campaigns</p></div><div class="analytics-card"><h4>Response Rate</h4><div class="stat-large">${leads.length > 0 ? Math.round(leads.filter(l => !['new','researching'].includes(l.status)).length / leads.length * 100) : 0}%</div><p>Contacted leads</p></div></div></div>`;
}

// ============================================
// ALL PATHWAYS SPECIFIC VIEWS
// ============================================

function renderAllPathwaysLeads() { return renderLeadsTable(OutreachState.getLeads(), 'all'); }
function renderAllPathwaysResearch() { return renderResearchInterface('all'); }
function renderAllPathwaysCampaigns() { return renderCampaignsList(OutreachState.getCampaigns(), 'all'); }
function renderAllPathwaysQueue() { return renderQueueInterface(OutreachState.getQueue(), 'all'); }
function renderAllPathwaysPipeline() { return renderPipelineView('all'); }
function renderAllPathwaysConversations() { return renderConversationsList(OutreachState.getConversations(), 'all'); }
function renderAllPathwaysAnalytics() { return renderAnalyticsDashboard('all'); }

// ============================================
// ACTION FUNCTIONS
// ============================================

function showAddLeadModal() { alert('Add Lead Modal - To be implemented'); }
function showOutreachSettings() { alert('Settings Modal - To be implemented'); }
function showLeadDetail(leadId) { const lead = OutreachState.getLeads().find(l => l.id === leadId); if (lead) alert(`Lead: ${lead.firstName} ${lead.lastName}\nEmail: ${lead.email}\nStatus: ${getStatusLabel(lead.status)}`); }
function showLeadActions(leadId) { alert(`Actions for lead ${leadId}`); }
function startAIResearch() { const query = document.getElementById('research-input')?.value; const pathway = document.getElementById('research-pathway')?.value; if (!query) return alert('Please enter a search query'); const research = { id: generateId(), query, pathway: pathway || 'b2b', timestamp: new Date().toISOString(), results: [] }; const researchList = OutreachState.getResearch(); researchList.unshift(research); OutreachState.saveResearch(researchList); OutreachState.addActivity('research_completed', `AI Research: ${query}`, 'research', research.id, pathway); alert(`Research started for: ${query}`); setOutreachView('research'); }
function viewResearchResults(researchId) { alert(`View results for research ${researchId}`); }
function showCreateCampaignModal(pathway) { alert(`Create campaign for ${pathway}`); }
function editCampaign(campaignId) { alert(`Edit campaign ${campaignId}`); }
function viewCampaignStats(campaignId) { alert(`Stats for campaign ${campaignId}`); }
function processQueue() { const queue = OutreachState.getQueue(); const pending = queue.filter(q => q.status === 'pending'); if (pending.length === 0) return alert('No pending emails'); alert(`Processing ${pending.length} emails...`); }
function showScheduleModal(pathway) { alert(`Schedule emails for ${pathway}`); }
function sendNow(queueId) { alert(`Send now: ${queueId}`); }
function removeFromQueue(queueId) { const queue = OutreachState.getQueue().filter(q => q.id !== queueId); OutreachState.saveQueue(queue); setOutreachView('queue'); }
function showQueueTab(tab) { alert(`Show ${tab} tab`); }
function openConversation(conversationId) { alert(`Open conversation ${conversationId}`); }

// ============================================
// STYLES
// ============================================

function renderOutreachStyles() {
    return `<style>
        .outreach-command-center { max-width: 1400px; margin: 0 auto; padding: 0 0 40px 0; }
        .occ-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid rgba(212, 175, 99, 0.2); }
        .occ-breadcrumb { font-size: 13px; color: rgba(246, 241, 232, 0.6); margin-bottom: 8px; }
        .occ-breadcrumb span { cursor: pointer; }
        .occ-breadcrumb span:hover { color: var(--warm-gold); }
        .breadcrumb-separator { margin: 0 8px; }
        .occ-title { font-family: 'Cormorant Garamond', serif; font-size: 32px; font-weight: 600; color: var(--warm-gold); margin-bottom: 8px; display: flex; align-items: center; gap: 16px; }
        .view-indicator { font-size: 18px; color: rgba(246, 241, 232, 0.6); font-weight: 400; }
        .occ-subtitle { color: rgba(246, 241, 232, 0.7); font-size: 15px; }
        .occ-header-actions { display: flex; gap: 12px; }
        .occ-pathway-nav { margin-bottom: 24px; }
        .pathway-tabs { display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid rgba(212, 175, 99, 0.2); padding-bottom: 16px; }
        .pathway-tab { background: rgba(31, 49, 91, 0.4); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 12px; padding: 12px 20px; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; gap: 8px; color: var(--ivory-light); font-size: 14px; }
        .pathway-tab:hover { border-color: rgba(212, 175, 99, 0.4); }
        .pathway-tab.active { background: rgba(212, 175, 99, 0.15); border-color: var(--warm-gold); }
        .pathway-badge { font-size: 18px; }
        .pathway-count { background: rgba(246, 241, 232, 0.1); padding: 2px 8px; border-radius: 10px; font-size: 12px; margin-left: auto; }
        .all-pathways-tabs, .submenu-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
        .view-tab, .submenu-tab { background: none; border: none; color: rgba(246, 241, 232, 0.6); padding: 10px 16px; cursor: pointer; font-size: 14px; border-radius: 8px; transition: all 0.3s; display: flex; align-items: center; gap: 6px; }
        .view-tab:hover, .submenu-tab:hover { background: rgba(212, 175, 99, 0.1); color: var(--ivory-light); }
        .view-tab.active, .submenu-tab.active { background: rgba(212, 175, 99, 0.2); color: var(--warm-gold); }
        .submenu-tab { flex-direction: column; gap: 2px; padding: 8px 12px; }
        .submenu-tab .tab-label { font-size: 11px; opacity: 0.7; }
        .submenu-label { font-size: 12px; color: rgba(246, 241, 232, 0.5); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
        .pathway-submenu { background: rgba(31, 49, 91, 0.3); border-radius: 12px; padding: 16px; margin-top: 8px; }
        .combined-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .combined-stat-card { background: rgba(31, 49, 91, 0.4); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 16px; padding: 20px; }
        .combined-stat-card.total { border-color: var(--warm-gold); }
        .stat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .stat-icon { font-size: 24px; }
        .stat-trend { font-size: 12px; color: rgba(246, 241, 232, 0.6); }
        .stat-value { font-family: 'Cormorant Garamond', serif; font-size: 36px; font-weight: 700; color: var(--warm-gold); margin-bottom: 4px; }
        .stat-label { font-size: 13px; color: rgba(246, 241, 232, 0.7); }
        .pathway-breakdown { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
        .breakdown-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
        .breakdown-dot { width: 10px; height: 10px; border-radius: 50%; }
        .breakdown-item span:last-child { margin-left: auto; font-weight: 600; }
        .mini-legend { display: flex; gap: 16px; margin-top: 8px; font-size: 12px; color: rgba(246, 241, 232, 0.6); }
        .dashboard-two-column { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
        .dashboard-panel { background: rgba(31, 49, 91, 0.3); border: 1px solid rgba(212, 175, 99, 0.1); border-radius: 16px; padding: 24px; }
        .dashboard-panel h3 { font-family: 'Cormorant Garamond', serif; font-size: 20px; margin-bottom: 16px; color: var(--ivory-light); }
        .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .panel-header h3 { margin: 0; }
        .quick-actions-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .quick-action-card { background: rgba(212, 175, 99, 0.1); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; gap: 12px; color: var(--ivory-light); font-size: 14px; border: none; text-align: left; }
        .quick-action-card:hover { background: rgba(212, 175, 99, 0.2); transform: translateY(-2px); }
        .quick-action-card span:first-child { font-size: 20px; }
        .performance-row { display: grid; grid-template-columns: 1fr 80px auto; align-items: center; gap: 16px; padding: 12px 0; border-bottom: 1px solid rgba(246, 241, 232, 0.1); }
        .perf-pathway { display: flex; align-items: center; gap: 8px; }
        .perf-count { text-align: right; color: rgba(246, 241, 232, 0.7); font-size: 14px; }
        .performance-row:last-child { border-bottom: none; }
        .pathway-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 8px; }
        .pathway-dot.b2b { background: #2E7C83; }
        .pathway-dot.b2c { background: #5E3B6C; }
        .pathway-dot.partnerships { background: #CDBED6; }
        .activity-timeline { display: flex; flex-direction: column; gap: 12px; }
        .timeline-item { display: flex; gap: 12px; padding: 12px; background: rgba(246, 241, 232, 0.03); border-radius: 8px; }
        .timeline-icon { width: 36px; height: 36px; border-radius: 8px; background: rgba(212, 175, 99, 0.1); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .timeline-content { flex: 1; }
        .timeline-meta { display: flex; gap: 12px; margin-top: 4px; font-size: 12px; color: rgba(246, 241, 232, 0.5); }
        .recent-leads-list { display: flex; flex-direction: column; gap: 8px; }
        .recent-lead-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(246, 241, 232, 0.03); border-radius: 8px; cursor: pointer; transition: background 0.2s; }
        .recent-lead-item:hover { background: rgba(212, 175, 99, 0.1); }
        .lead-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--warm-gold), var(--sacred-teal)); display: flex; align-items: center; justify-content: center; font-weight: 600; color: var(--deep-indigo); font-size: 14px; }
        .lead-info { flex: 1; }
        .lead-name { font-weight: 500; color: var(--ivory-light); }
        .lead-company { font-size: 12px; color: rgba(246, 241, 232, 0.5); }
        .pathway-badge-small { font-size: 14px; margin-right: 8px; }
        .score-badge-small { padding: 2px 8px; border-radius: 10px; font-size: 11px; color: white; font-weight: 600; }
        .pathway-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .pathway-stat-card { background: rgba(31, 49, 91, 0.4); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 16px; padding: 24px; text-align: center; }
        .stat-icon-large { font-size: 32px; margin-bottom: 8px; }
        .stat-value-large { font-family: 'Cormorant Garamond', serif; font-size: 36px; font-weight: 700; color: var(--warm-gold); }
        .pathway-content-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
        .pathway-panel { background: rgba(31, 49, 91, 0.3); border: 1px solid rgba(212, 175, 99, 0.1); border-radius: 16px; padding: 24px; }
        .pathway-panel.full-width { grid-column: 1 / -1; }
        .pathway-actions { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .pathway-action-btn { background: rgba(212, 175, 99, 0.1); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; gap: 12px; color: var(--ivory-light); font-size: 14px; border: none; text-align: left; }
        .pathway-action-btn:hover { background: rgba(212, 175, 99, 0.2); }
        .pathway-action-btn span:first-child { font-size: 20px; }
        .funnel-visual { display: flex; flex-direction: column; gap: 8px; }
        .funnel-stage { background: rgba(212, 175, 99, 0.1); border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; margin: 0 auto; transition: all 0.3s; }
        .funnel-stage:hover { background: rgba(212, 175, 99, 0.2); }
        .activity-list-compact { display: flex; flex-direction: column; gap: 8px; }
        .activity-item-compact { display: flex; align-items: center; gap: 12px; padding: 10px; background: rgba(246, 241, 232, 0.03); border-radius: 8px; font-size: 14px; }
        .activity-item-compact span:last-child { margin-left: auto; font-size: 12px; color: rgba(246, 241, 232, 0.5); }
        .leads-view { background: rgba(31, 49, 91, 0.3); border: 1px solid rgba(212, 175, 99, 0.1); border-radius: 16px; padding: 24px; }
        .leads-toolbar { display: flex; gap: 16px; margin-bottom: 20px; align-items: center; }
        .leads-search { flex: 1; }
        .leads-search input { width: 100%; padding: 12px 16px; background: rgba(246, 241, 232, 0.05); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 10px; color: var(--ivory-light); font-size: 14px; }
        .leads-filters select { padding: 12px 16px; background: rgba(246, 241, 232, 0.05); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 10px; color: var(--ivory-light); font-size: 14px; }
        .leads-table { width: 100%; border-collapse: collapse; }
        .leads-table th { text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(246, 241, 232, 0.6); border-bottom: 1px solid rgba(212, 175, 99, 0.2); }
        .leads-table td { padding: 12px; border-bottom: 1px solid rgba(246, 241, 232, 0.05); }
        .clickable-row { cursor: pointer; transition: background 0.2s; }
        .clickable-row:hover { background: rgba(212, 175, 99, 0.05); }
        .lead-name-cell { display: flex; align-items: center; gap: 12px; }
        .lead-avatar-small { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--warm-gold), var(--sacred-teal)); display: flex; align-items: center; justify-content: center; font-weight: 600; color: var(--deep-indigo); font-size: 12px; }
        .lead-name { font-weight: 500; color: var(--ivory-light); }
        .lead-email-small { font-size: 12px; color: rgba(246, 241, 232, 0.5); }
        .pathway-tag { padding: 4px 10px; border-radius: 12px; font-size: 12px; background: rgba(246, 241, 232, 0.1); }
        .score-pill { padding: 4px 10px; border-radius: 12px; font-size: 12px; color: white; font-weight: 600; }
        .status-badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 500; }
        .btn-icon-sm { background: none; border: none; color: rgba(246, 241, 232, 0.6); cursor: pointer; font-size: 18px; padding: 4px; }
        .btn-icon-sm:hover { color: var(--ivory-light); }
        .research-view { background: rgba(31, 49, 91, 0.3); border: 1px solid rgba(212, 175, 99, 0.1); border-radius: 16px; padding: 24px; }
        .research-header { margin-bottom: 24px; }
        .research-header h3 { font-family: 'Cormorant Garamond', serif; font-size: 24px; margin-bottom: 8px; }
        .research-header p { color: rgba(246, 241, 232, 0.6); }
        .research-input-section { background: rgba(31, 49, 91, 0.4); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
        .research-form .form-row { margin-bottom: 16px; }
        .research-form .form-row.three-col { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .research-form .form-group label { display: block; font-size: 13px; font-weight: 600; color: rgba(246, 241, 232, 0.8); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .research-form input, .research-form select, .research-form textarea { width: 100%; padding: 12px 16px; background: rgba(246, 241, 232, 0.05); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 10px; color: var(--ivory-light); font-size: 14px; font-family: inherit; }
        .research-form textarea { resize: vertical; }
        .btn-large { padding: 16px 32px; font-size: 16px; }
        .btn-view-small { background: rgba(212, 175, 99, 0.15); border: 1px solid rgba(212, 175, 99, 0.3); border-radius: 6px; padding: 4px 12px; font-size: 12px; color: var(--warm-gold); cursor: pointer; transition: all 0.2s; }
        .btn-view-small:hover { background: rgba(212, 175, 99, 0.25); border-color: var(--warm-gold); }
        .research-history h4 { font-family: 'Cormorant Garamond', serif; font-size: 18px; margin-bottom: 16px; }
        .research-list { display: flex; flex-direction: column; gap: 12px; }
        .research-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: rgba(246, 241, 232, 0.03); border-radius: 12px; }
        .research-query { font-weight: 500; margin-bottom: 4px; }
        .research-meta { font-size: 12px; color: rgba(246, 241, 232, 0.5); }
        .campaigns-view { background: rgba(31, 49, 91, 0.3); border: 1px solid rgba(212, 175, 99, 0.1); border-radius: 16px; padding: 24px; }
        .campaigns-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .campaigns-header h3 { font-family: 'Cormorant Garamond', serif; font-size: 24px; }
        .campaigns-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
        .campaign-card { background: rgba(31, 49, 91, 0.4); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 16px; padding: 20px; }
        .campaign-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .campaign-header h4 { font-family: 'Cormorant Garamond', serif; font-size: 18px; }
        .campaign-status { padding: 4px 10px; border-radius: 12px; font-size: 11px; text-transform: uppercase; }
        .campaign-status.active { background: rgba(76, 175, 80, 0.2); color: #4CAF50; }
        .campaign-status.draft { background: rgba(158, 158, 158, 0.2); color: #9E9E9E; }
        .campaign-card p { color: rgba(246, 241, 232, 0.6); font-size: 14px; margin-bottom: 16px; }
        .campaign-stats { display: flex; gap: 24px; margin-bottom: 16px; }
        .campaign-stats div { text-align: center; }
        .campaign-stats span:first-child { display: block; font-size: 24px; font-weight: 700; color: var(--warm-gold); }
        .campaign-stats span:last-child { font-size: 12px; color: rgba(246, 241, 232, 0.5); }
        .campaign-actions { display: flex; gap: 8px; }
        .queue-view { background: rgba(31, 49, 91, 0.3); border: 1px solid rgba(212, 175, 99, 0.1); border-radius: 16px; padding: 24px; }
        .queue-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .queue-header h3 { font-family: 'Cormorant Garamond', serif; font-size: 24px; }
        .queue-actions { display: flex; gap: 12px; }
        .queue-tabs { display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid rgba(212, 175, 99, 0.2); padding-bottom: 12px; }
        .queue-tab { background: none; border: none; color: rgba(246, 241, 232, 0.6); padding: 10px 16px; cursor: pointer; font-size: 14px; border-radius: 8px; }
        .queue-tab:hover { background: rgba(212, 175, 99, 0.1); }
        .queue-tab.active { background: rgba(212, 175, 99, 0.2); color: var(--warm-gold); }
        .queue-list { display: flex; flex-direction: column; gap: 12px; }
        .queue-item { display: flex; align-items: center; justify-content: space-between; padding: 16px; background: rgba(246, 241, 232, 0.03); border-radius: 12px; }
        .queue-lead { display: flex; align-items: center; gap: 12px; }
        .queue-email { font-size: 12px; color: rgba(246, 241, 232, 0.5); }
        .pipeline-view { background: rgba(31, 49, 91, 0.3); border: 1px solid rgba(212, 175, 99, 0.1); border-radius: 16px; padding: 24px; }
        .pipeline-header { margin-bottom: 24px; }
        .pipeline-header h3 { font-family: 'Cormorant Garamond', serif; font-size: 24px; margin-bottom: 8px; }
        .pipeline-header p { color: rgba(246, 241, 232, 0.6); }
        .pipeline-board { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 16px; }
        .pipeline-column { min-width: 250px; background: rgba(31, 49, 91, 0.4); border-radius: 16px; padding: 16px; }
        .pipeline-column-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 2px solid; margin-bottom: 12px; }
        .pipeline-column-header h4 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
        .column-count { background: rgba(246, 241, 232, 0.1); padding: 2px 10px; border-radius: 10px; font-size: 12px; }
        .pipeline-cards { display: flex; flex-direction: column; gap: 8px; }
        .pipeline-card { background: rgba(246, 241, 232, 0.05); border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.2s; }
        .pipeline-card:hover { background: rgba(212, 175, 99, 0.1); }
        .pipeline-card .card-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .score-pill-small { padding: 2px 8px; border-radius: 10px; font-size: 11px; color: white; font-weight: 600; }
        .pathway-tag-small { font-size: 12px; }
        .pipeline-card .card-name { font-weight: 500; margin-bottom: 4px; }
        .pipeline-card .card-company { font-size: 12px; color: rgba(246, 241, 232, 0.5); }
        .conversations-view { background: rgba(31, 49, 91, 0.3); border: 1px solid rgba(212, 175, 99, 0.1); border-radius: 16px; padding: 24px; }
        .conversations-header { margin-bottom: 24px; }
        .conversations-header h3 { font-family: 'Cormorant Garamond', serif; font-size: 24px; margin-bottom: 8px; }
        .conversations-header p { color: rgba(246, 241, 232, 0.6); }
        .conversations-list { display: flex; flex-direction: column; gap: 8px; }
        .conversation-item { display: flex; align-items: center; gap: 12px; padding: 16px; background: rgba(246, 241, 232, 0.03); border-radius: 12px; cursor: pointer; transition: all 0.2s; }
        .conversation-item:hover { background: rgba(212, 175, 99, 0.1); }
        .conversation-item.unread { background: rgba(212, 175, 99, 0.05); border-left: 3px solid var(--warm-gold); }
        .conversation-avatar { width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, var(--warm-gold), var(--sacred-teal)); display: flex; align-items: center; justify-content: center; font-weight: 600; color: var(--deep-indigo); font-size: 16px; }
        .conversation-content { flex: 1; }
        .conversation-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .conversation-name { font-weight: 500; color: var(--ivory-light); }
        .conversation-time { font-size: 12px; color: rgba(246, 241, 232, 0.5); }
        .conversation-preview { font-size: 14px; color: rgba(246, 241, 232, 0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .unread-badge { background: var(--sacred-teal); color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
        .analytics-view { background: rgba(31, 49, 91, 0.3); border: 1px solid rgba(212, 175, 99, 0.1); border-radius: 16px; padding: 24px; }
        .analytics-header { margin-bottom: 24px; }
        .analytics-header h3 { font-family: 'Cormorant Garamond', serif; font-size: 24px; margin-bottom: 8px; }
        .analytics-header p { color: rgba(246, 241, 232, 0.6); }
        .analytics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .analytics-card { background: rgba(31, 49, 91, 0.4); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 16px; padding: 24px; text-align: center; }
        .analytics-card h4 { font-size: 14px; color: rgba(246, 241, 232, 0.7); margin-bottom: 12px; }
        .stat-large { font-family: 'Cormorant Garamond', serif; font-size: 42px; font-weight: 700; color: var(--warm-gold); margin-bottom: 8px; }
        .analytics-card p { font-size: 13px; color: rgba(246, 241, 232, 0.5); }
        .empty-state { text-align: center; padding: 40px; color: rgba(246, 241, 232, 0.5); }
        .empty-cell { text-align: center; padding: 40px; color: rgba(246, 241, 232, 0.5); }
        
        /* Metrics Grid Styles */
        .metrics-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; margin-bottom: 32px; }
        .metric-card { background: rgba(31, 49, 91, 0.4); border: 1px solid rgba(212, 175, 99, 0.15); border-radius: 16px; padding: 24px 16px; text-align: center; transition: all 0.3s; }
        .metric-card:hover { transform: translateY(-2px); border-color: rgba(212, 175, 99, 0.3); }
        .metric-card.highlight { background: rgba(212, 175, 99, 0.1); border-color: rgba(212, 175, 99, 0.4); }
        .metric-icon { font-size: 28px; margin-bottom: 12px; }
        .metric-value { font-family: 'Cormorant Garamond', serif; font-size: 36px; font-weight: 700; color: var(--warm-gold); margin-bottom: 4px; }
        .metric-label { font-size: 12px; color: rgba(246, 241, 232, 0.6); text-transform: uppercase; letter-spacing: 0.5px; }
        
        /* Pipeline Summary Styles */
        .pipeline-summary { display: flex; flex-direction: column; gap: 12px; }
        .pipeline-bar-item { display: flex; flex-direction: column; gap: 4px; }
        .bar-label { font-size: 12px; color: rgba(246, 241, 232, 0.7); text-transform: uppercase; letter-spacing: 0.5px; }
        .bar-visual { display: flex; align-items: center; gap: 12px; height: 24px; background: rgba(246, 241, 232, 0.05); border-radius: 12px; overflow: hidden; padding: 0 8px; }
        .bar-fill { height: 8px; border-radius: 4px; transition: width 0.5s ease; }
        .bar-count { font-size: 13px; font-weight: 600; color: var(--ivory-light); margin-left: auto; }
        
        @media (max-width: 1200px) { .metrics-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 1024px) { .combined-stats-grid, .pathway-stats-row, .analytics-grid { grid-template-columns: repeat(2, 1fr); } .dashboard-two-column, .pathway-content-row { grid-template-columns: 1fr; } .pipeline-board { flex-direction: column; } .pipeline-column { min-width: 100%; } }
        @media (max-width: 768px) { .metrics-grid { grid-template-columns: repeat(2, 1fr); } .combined-stats-grid, .pathway-stats-row, .analytics-grid { grid-template-columns: 1fr; } .occ-header { flex-direction: column; gap: 16px; } .pathway-tabs { flex-wrap: wrap; } .quick-actions-grid, .pathway-actions { grid-template-columns: 1fr; } .campaigns-grid { grid-template-columns: 1fr; } }
    </style>`;
}

function initializeOutreachEventListeners() {
    // Event listeners can be added here as needed
    console.log('Outreach Command Center initialized');
}