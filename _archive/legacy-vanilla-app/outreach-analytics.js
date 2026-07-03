// ============================================
// ANALYTICS DASHBOARD
// ============================================

function renderAnalytics() {
    const leads = OutreachState.getLeads();
    const queue = OutreachState.getQueue();
    const campaigns = OutreachState.getCampaigns();
    
    const pathwayLeads = leads.filter(l => l.pathway === OutreachState.currentPathway);
    const pathwayQueue = queue.filter(q => {
        const lead = leads.find(l => l.id === q.leadId);
        return lead && lead.pathway === OutreachState.currentPathway;
    });
    const pathwayCampaigns = campaigns.filter(c => c.pathway === OutreachState.currentPathway);
    
    // Calculate metrics
    const totalLeads = pathwayLeads.length;
    const contacted = pathwayLeads.filter(l => l.status === 'contacted' || l.status === 'responded' || l.status === 'converted').length;
    const responded = pathwayLeads.filter(l => l.status === 'responded' || l.status === 'converted').length;
    const converted = pathwayLeads.filter(l => l.status === 'converted').length;
    
    const sentEmails = pathwayQueue.filter(q => q.status === 'sent').length;
    const openedEmails = pathwayQueue.filter(q => q.status === 'opened' || q.status === 'replied' || q.status === 'converted').length;
    const repliedEmails = pathwayQueue.filter(q => q.status === 'replied' || q.status === 'converted').length;
    
    const openRate = sentEmails > 0 ? Math.round((openedEmails / sentEmails) * 100) : 0;
    const replyRate = sentEmails > 0 ? Math.round((repliedEmails / sentEmails) * 100) : 0;
    const conversionRate = contacted > 0 ? Math.round((converted / contacted) * 100) : 0;
    
    // Generate activity data for chart (last 30 days)
    const activityData = generateActivityData(pathwayQueue, 30);
    
    return `
        <div class="occ-analytics">
            <!-- KPI Cards -->
            <div class="analytics-kpis">
                <div class="kpi-card">
                    <div class="kpi-icon">📧</div>
                    <div class="kpi-content">
                        <div class="kpi-value">${sentEmails}</div>
                        <div class="kpi-label">Emails Sent</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">👁️</div>
                    <div class="kpi-content">
                        <div class="kpi-value">${openRate}%</div>
                        <div class="kpi-label">Open Rate</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">💬</div>
                    <div class="kpi-content">
                        <div class="kpi-value">${replyRate}%</div>
                        <div class="kpi-label">Reply Rate</div>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">✨</div>
                    <div class="kpi-content">
                        <div class="kpi-value">${conversionRate}%</div>
                        <div class="kpi-label">Conversion Rate</div>
                    </div>
                </div>
            </div>
            
            <!-- Charts Row -->
            <div class="analytics-charts">
                <div class="chart-card">
                    <h4>📈 Activity Timeline (30 Days)</h4>
                    <div class="chart-container">
                        ${renderActivityChart(activityData)}
                    </div>
                </div>
                
                <div class="chart-card">
                    <h4>🔄 Pipeline Distribution</h4>
                    <div class="chart-container">
                        ${renderPipelineChart(pathwayLeads)}
                    </div>
                </div>
            </div>
            
            <!-- Funnel Visualization -->
            <div class="analytics-funnel">
                <h4>🎯 Conversion Funnel</h4>
                <div class="funnel-visualization">
                    <div class="funnel-stage" style="width: 100%;">
                        <div class="funnel-bar">
                            <span class="funnel-label">Total Leads</span>
                            <span class="funnel-value">${totalLeads}</span>
                        </div>
                    </div>
                    <div class="funnel-stage" style="width: ${(contacted / totalLeads * 100) || 80}%;">
                        <div class="funnel-bar">
                            <span class="funnel-label">Contacted</span>
                            <span class="funnel-value">${contacted}</span>
                        </div>
                        <div class="funnel-rate">${totalLeads > 0 ? Math.round((contacted / totalLeads) * 100) : 0}%</div>
                    </div>
                    <div class="funnel-stage" style="width: ${(responded / totalLeads * 100) || 60}%;">
                        <div class="funnel-bar">
                            <span class="funnel-label">Responded</span>
                            <span class="funnel-value">${responded}</span>
                        </div>
                        <div class="funnel-rate">${contacted > 0 ? Math.round((responded / contacted) * 100) : 0}%</div>
                    </div>
                    <div class="funnel-stage" style="width: ${(converted / totalLeads * 100) || 40}%;">
                        <div class="funnel-bar">
                            <span class="funnel-label">Converted</span>
                            <span class="funnel-value">${converted}</span>
                        </div>
                        <div class="funnel-rate">${responded > 0 ? Math.round((converted / responded) * 100) : 0}%</div>
                    </div>
                </div>
            </div>
            
            <!-- Campaign Performance -->
            <div class="analytics-campaigns">
                <h4>📧 Campaign Performance</h4>
                <div class="campaigns-table-container">
                    <table class="campaigns-table">
                        <thead>
                            <tr>
                                <th>Campaign</th>
                                <th>Status</th>
                                <th>Sent</th>
                                <th>Opened</th>
                                <th>Replied</th>
                                <th>Open Rate</th>
                                <th>Reply Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pathwayCampaigns.map(campaign => {
                                const stats = campaign.stats || {};
                                const cOpenRate = stats.sent > 0 ? Math.round((stats.opened / stats.sent) * 100) : 0;
                                const cReplyRate = stats.sent > 0 ? Math.round((stats.replied / stats.sent) * 100) : 0;
                                return `
                                    <tr>
                                        <td>
                                            <div class="campaign-name">${campaign.name}</div>
                                            <div class="campaign-desc">${campaign.description || ''}</div>
                                        </td>
                                        <td><span class="status-badge ${campaign.status}">${campaign.status}</span></td>
                                        <td>${stats.sent || 0}</td>
                                        <td>${stats.opened || 0}</td>
                                        <td>${stats.replied || 0}</td>
                                        <td>${cOpenRate}%</td>
                                        <td>${cReplyRate}%</td>
                                    </tr>
                                `;
                            }).join('') || '<tr><td colspan="7" class="empty-cell">No campaigns yet</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Top Performing Templates -->
            <div class="analytics-templates">
                <h4>📄 Template Performance</h4>
                <div class="templates-grid">
                    <div class="template-stat-card">
                        <div class="template-name">Initial Outreach</div>
                        <div class="template-metrics">
                            <div class="metric">
                                <span class="metric-value">32%</span>
                                <span class="metric-label">Open Rate</span>
                            </div>
                            <div class="metric">
                                <span class="metric-value">12%</span>
                                <span class="metric-label">Reply Rate</span>
                            </div>
                        </div>
                    </div>
                    <div class="template-stat-card">
                        <div class="template-name">Follow-up</div>
                        <div class="template-metrics">
                            <div class="metric">
                                <span class="metric-value">45%</span>
                                <span class="metric-label">Open Rate</span>
                            </div>
                            <div class="metric">
                                <span class="metric-value">18%</span>
                                <span class="metric-label">Reply Rate</span>
                            </div>
                        </div>
                    </div>
                    <div class="template-stat-card">
                        <div class="template-name">Value-First</div>
                        <div class="template-metrics">
                            <div class="metric">
                                <span class="metric-value">52%</span>
                                <span class="metric-label">Open Rate</span>
                            </div>
                            <div class="metric">
                                <span class="metric-value">24%</span>
                                <span class="metric-label">Reply Rate</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <style>
            .occ-analytics {
                display: flex;
                flex-direction: column;
                gap: 32px;
            }
            
            .analytics-kpis {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
            }
            
            .kpi-card {
                background: rgba(31, 49, 91, 0.4);
                border: 1px solid rgba(212, 175, 99, 0.2);
                border-radius: 16px;
                padding: 24px;
                display: flex;
                align-items: center;
                gap: 16px;
            }
            
            .kpi-icon {
                font-size: 32px;
            }
            
            .kpi-value {
                font-family: 'Cormorant Garamond', serif;
                font-size: 32px;
                font-weight: 700;
                color: var(--warm-gold);
            }
            
            .kpi-label {
                font-size: 13px;
                color: rgba(246, 241, 232, 0.6);
                text-transform: uppercase;
            }
            
            .analytics-charts {
                display: grid;
                grid-template-columns: 2fr 1fr;
                gap: 24px;
            }
            
            .chart-card {
                background: rgba(31, 49, 91, 0.3);
                border: 1px solid rgba(212, 175, 99, 0.1);
                border-radius: 16px;
                padding: 24px;
            }
            
            .chart-card h4 {
                font-family: 'Cormorant Garamond', serif;
                font-size: 18px;
                color: var(--ivory-light);
                margin-bottom: 20px;
            }
            
            .chart-container {
                height: 250px;
                display: flex;
                align-items: flex-end;
                gap: 4px;
                padding: 20px 0;
            }
            
            .activity-bar {
                flex: 1;
                background: linear-gradient(to top, var(--sacred-teal), var(--warm-gold));
                border-radius: 4px 4px 0 0;
                min-height: 4px;
                position: relative;
                transition: opacity 0.2s;
            }
            
            .activity-bar:hover {
                opacity: 0.8;
            }
            
            .activity-bar .tooltip {
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 6px 10px;
                border-radius: 6px;
                font-size: 11px;
                white-space: nowrap;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.2s;
                margin-bottom: 4px;
            }
            
            .activity-bar:hover .tooltip {
                opacity: 1;
            }
            
            .pipeline-chart {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .pipeline-chart-item {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .pipeline-chart-label {
                width: 100px;
                font-size: 12px;
                color: rgba(246, 241, 232, 0.7);
            }
            
            .pipeline-chart-bar {
                flex: 1;
                height: 24px;
                background: rgba(246, 241, 232, 0.1);
                border-radius: 12px;
                overflow: hidden;
            }
            
            .pipeline-chart-fill {
                height: 100%;
                background: linear-gradient(90deg, var(--warm-gold), var(--sacred-teal));
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: flex-end;
                padding-right: 10px;
                font-size: 11px;
                font-weight: 600;
                color: var(--deep-indigo);
            }
            
            .analytics-funnel {
                background: rgba(31, 49, 91, 0.3);
                border: 1px solid rgba(212, 175, 99, 0.1);
                border-radius: 16px;
                padding: 24px;
            }
            
            .analytics-funnel h4 {
                font-family: 'Cormorant Garamond', serif;
                font-size: 18px;
                color: var(--ivory-light);
                margin-bottom: 24px;
            }
            
            .funnel-visualization {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 16px;
            }
            
            .funnel-stage {
                display: flex;
                align-items: center;
                gap: 16px;
            }
            
            .funnel-bar {
                background: linear-gradient(135deg, var(--warm-gold), var(--sacred-teal));
                border-radius: 8px;
                padding: 16px 24px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                min-width: 200px;
            }
            
            .funnel-label {
                font-weight: 600;
                color: var(--deep-indigo);
            }
            
            .funnel-value {
                font-size: 20px;
                font-weight: 700;
                color: var(--deep-indigo);
            }
            
            .funnel-rate {
                font-size: 14px;
                color: rgba(246, 241, 232, 0.6);
                min-width: 50px;
            }
            
            .analytics-campaigns, .analytics-templates {
                background: rgba(31, 49, 91, 0.3);
                border: 1px solid rgba(212, 175, 99, 0.1);
                border-radius: 16px;
                padding: 24px;
            }
            
            .analytics-campaigns h4, .analytics-templates h4 {
                font-family: 'Cormorant Garamond', serif;
                font-size: 18px;
                color: var(--ivory-light);
                margin-bottom: 20px;
            }
            
            .campaigns-table-container {
                overflow-x: auto;
            }
            
            .campaigns-table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .campaigns-table th {
                text-align: left;
                padding: 12px;
                font-size: 12px;
                text-transform: uppercase;
                color: rgba(246, 241, 232, 0.6);
                border-bottom: 1px solid rgba(212, 175, 99, 0.2);
            }
            
            .campaigns-table td {
                padding: 16px 12px;
                border-bottom: 1px solid rgba(246, 241, 232, 0.05);
            }
            
            .campaign-name {
                font-weight: 500;
                color: var(--ivory-light);
            }
            
            .campaign-desc {
                font-size: 12px;
                color: rgba(246, 241, 232, 0.5);
            }
            
            .templates-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 16px;
            }
            
            .template-stat-card {
                background: rgba(246, 241, 232, 0.05);
                border: 1px solid rgba(212, 175, 99, 0.1);
                border-radius: 12px;
                padding: 20px;
            }
            
            .template-stat-card .template-name {
                font-weight: 600;
                color: var(--ivory-light);
                margin-bottom: 16px;
            }
            
            .template-metrics {
                display: flex;
                gap: 24px;
            }
            
            .metric {
                text-align: center;
            }
            
            .metric-value {
                display: block;
                font-size: 24px;
                font-weight: 700;
                color: var(--warm-gold);
            }
            
            .metric-label {
                font-size: 11px;
                color: rgba(246, 241, 232, 0.5);
                text-transform: uppercase;
            }
            
            .empty-cell {
                text-align: center;
                padding: 40px;
                color: rgba(246, 241, 232, 0.5);
            }
            
            @media (max-width: 768px) {
                .analytics-kpis {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                .analytics-charts {
                    grid-template-columns: 1fr;
                }
                
                .templates-grid {
                    grid-template-columns: 1fr;
                }
            }
        </style>
    `;
}

function generateActivityData(queue, days) {
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const count = queue.filter(q => {
            if (!q.sentAt) return false;
            return q.sentAt.startsWith(dateStr);
        }).length;
        
        data.push({ date: dateStr, count });
    }
    
    return data;
}

function renderActivityChart(data) {
    const maxCount = Math.max(...data.map(d => d.count), 1);
    
    return data.map(d => {
        const height = (d.count / maxCount) * 100;
        const date = new Date(d.date);
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        return `
            <div class="activity-bar" style="height: ${Math.max(height, 4)}%">
                <div class="tooltip">${label}: ${d.count} sent</div>
            </div>
        `;
    }).join('');
}

function renderPipelineChart(leads) {
    const stages = ['new', 'contacted', 'responded', 'converted'];
    const stageNames = { new: 'New', contacted: 'Contacted', responded: 'Responded', converted: 'Converted' };
    const maxCount = Math.max(...stages.map(s => leads.filter(l => l.status === s || (s === 'new' && !l.status)).length), 1);
    
    return stages.map(stage => {
        const count = leads.filter(l => l.status === stage || (stage === 'new' && !l.status)).length;
        const percentage = Math.round((count / leads.length) * 100) || 0;
        const width = (count / maxCount) * 100;
        
        return `
            <div class="pipeline-chart-item">
                <span class="pipeline-chart-label">${stageNames[stage]}</span>
                <div class="pipeline-chart-bar">
                    <div class="pipeline-chart-fill" style="width: ${width}%; padding-right: ${count > 0 ? '10px' : '0'};">
                        ${count > 0 ? count : ''}
                    </div>
                </div>
                <span style="font-size: 12px; color: rgba(246, 241, 232, 0.5); min-width: 40px;">${percentage}%</span>
            </div>
        `;
    }).join('');
}
