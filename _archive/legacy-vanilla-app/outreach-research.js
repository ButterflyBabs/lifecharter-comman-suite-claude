// ============================================
// AI RESEARCH MODULE - COMPLETE SYSTEM
// Criteria Definition → AI Research → Prospect Landing Page → Approval
// ============================================

console.log('🔍 AI Research Module Loading...');

// ============================================
// RESEARCH CRITERIA CONFIGURATION
// ============================================

const RESEARCH_CRITERIA = {
    b2b: {
        name: 'B2B Outreach',
        icon: '💼',
        description: 'Find coaches, consultants, and business owners',
        fields: [
            { id: 'industry', label: 'Industry/Vertical', type: 'multiselect', options: ['Coaching', 'Consulting', 'Professional Services', 'Technology', 'Healthcare', 'Finance', 'Real Estate', 'Marketing', 'Legal', 'Other'] },
            { id: 'companySize', label: 'Company Size', type: 'select', options: ['Any', 'Solo Practitioner', '2-10 employees', '11-50 employees', '50-200 employees', '200+ employees'] },
            { id: 'jobTitles', label: 'Job Titles', type: 'multiselect', options: ['Founder', 'CEO', 'Coach', 'Consultant', 'Business Owner', 'Director', 'Manager', 'Speaker', 'Author', 'Trainer'] },
            { id: 'location', label: 'Location', type: 'text', placeholder: 'e.g., Denver, Colorado, United States, Remote' },
            { id: 'businessMaturity', label: 'Business Maturity', type: 'select', options: ['Any', 'Startup (0-2 years)', 'Growing (2-5 years)', 'Established (5-10 years)', 'Mature (10+ years)'] },
            { id: 'painPoints', label: 'Pain Points/Needs', type: 'multiselect', options: ['Client Acquisition', 'Business Systems', 'Scaling', 'Marketing', 'Sales Process', 'Team Building', 'Time Management', 'Work-Life Balance'] },
            { id: 'techStack', label: 'Technology Stack', type: 'multiselect', options: ['CRM (any)', 'GoHighLevel', 'Salesforce', 'HubSpot', 'ActiveCampaign', 'Zapier', 'Notion', 'Asana', 'Slack', 'Zoom'] },
            { id: 'growthSignals', label: 'Growth Signals', type: 'multiselect', options: ['Hiring', 'New Product Launch', 'Expansion', 'Funding Raised', 'Awards/Recognition', 'Speaking Events', 'Media Coverage'] },
            { id: 'minScore', label: 'Minimum AI Match Score', type: 'range', min: 0, max: 100, default: 60 }
        ]
    },
    b2c: {
        name: 'B2C Outreach',
        icon: '🦋',
        description: 'Find individuals seeking personal transformation',
        fields: [
            { id: 'ageRange', label: 'Age Range', type: 'multiselect', options: ['Any', '18-25', '26-35', '36-45', '46-55', '55+'] },
            { id: 'location', label: 'Location', type: 'text', placeholder: 'e.g., Denver, Colorado, United States, Any' },
            { id: 'gender', label: 'Gender', type: 'multiselect', options: ['Any', 'Female', 'Male', 'Non-binary', 'Prefer not to say'] },
            { id: 'interests', label: 'Interests/Goals', type: 'multiselect', options: ['Personal Transformation', 'Life Alignment', 'Spiritual Growth', 'Career Change', 'Relationship Improvement', 'Health & Wellness', 'Purpose Discovery', 'Overcoming Challenges', 'Mindfulness', 'Self-Discovery'] },
            { id: 'lifeStage', label: 'Life Stage', type: 'multiselect', options: ['Student', 'Early Career', 'Mid-Career', 'Career Transition', 'New Parent', 'Empty Nester', 'Retirement Planning', 'Major Life Change', 'Recently Divorced', 'Newly Single'] },
            { id: 'researchSource', label: 'Research Source', type: 'multiselect', options: ['LinkedIn', 'Facebook', 'Instagram', 'Twitter/X', 'TikTok', 'YouTube', 'Reddit', 'Meetup', 'Eventbrite', 'Google Search', 'Podcast Platforms'] },
            { id: 'readinessLevel', label: 'Readiness Level', type: 'select', options: ['Any', 'Just Exploring', 'Somewhat Interested', 'Ready to Learn', 'Ready to Commit', 'Ready to Invest'] },
            { id: 'challenges', label: 'Challenges/Pain Points', type: 'multiselect', options: ['Feeling Stuck', 'Lack of Clarity', 'Overwhelm', 'Fear/Doubt', 'Work-Life Balance', 'Relationship Issues', 'Career Dissatisfaction', 'Spiritual Disconnection', 'Anxiety', 'Burnout', 'Lack of Purpose'] },
            { id: 'occupation', label: 'Occupation Type', type: 'multiselect', options: ['Any', 'Professional/White Collar', 'Creative/Artist', 'Healthcare Worker', 'Educator', 'Entrepreneur', 'Stay-at-home Parent', 'Student', 'Retired', 'Between Jobs'] },
            { id: 'incomeRange', label: 'Income Range', type: 'select', options: ['Any', 'Under $40k', '$40k-$75k', '$75k-$100k', '$100k-$150k', '$150k+', 'Prefer not to specify'] },
            { id: 'minScore', label: 'Minimum AI Match Score', type: 'range', min: 0, max: 100, default: 60 }
        ]
    },
    partnerships: {
        name: 'Partnerships',
        icon: '🤝',
        description: 'Find brand partners, sponsors, and affiliates',
        fields: [
            { id: 'companyType', label: 'Company Type', type: 'multiselect', options: ['Product Brand', 'Service Provider', 'Technology Company', 'Publisher/Media', 'Event Organizer', 'Nonprofit', 'Educational Institution', 'Influencer/Creator'] },
            { id: 'industry', label: 'Industry Alignment', type: 'multiselect', options: ['Wellness', 'Personal Development', 'Accessibility', 'Technology', 'Publishing', 'Education', 'Nonprofit', 'Lifestyle', 'Fashion', 'Home & Living'] },
            { id: 'partnershipTypes', label: 'Partnership Types', type: 'multiselect', options: ['Affiliate Program', 'Brand Ambassador', 'Sponsorship', 'Product Review', 'Content Collaboration', 'Event Partnership', 'Referral Program', 'Creator Partnership'] },
            { id: 'audienceMatch', label: 'Audience Match', type: 'select', options: ['Any', 'High Alignment Required', 'Exact Match Preferred'] },
            { id: 'commissionStructure', label: 'Commission Structure', type: 'multiselect', options: ['Revenue Share', 'Flat Fee', 'Per Lead', 'Per Sale', 'Free Products', 'Exclusive Discounts', 'Performance Bonus'] },
            { id: 'brandValues', label: 'Brand Values Alignment', type: 'multiselect', options: ['Authenticity', 'Inclusivity', 'Sustainability', 'Social Impact', 'Innovation', 'Quality', 'Community', 'Accessibility'] },
            { id: 'contentPotential', label: 'Content Potential', type: 'select', options: ['Any', 'High - Multiple Content Pieces', 'Medium - Some Content', 'Low - Single Mention'] },
            { id: 'minScore', label: 'Minimum AI Match Score', type: 'range', min: 0, max: 100, default: 60 }
        ]
    }
};

// ============================================
// RESEARCH STATE
// ============================================

const ResearchState = {
    currentCriteria: null,
    currentProfileId: null,
    researchResults: [],
    selectedProspects: [],
    
    // Legacy criteria (for backward compatibility)
    getCriteria() {
        return JSON.parse(localStorage.getItem('occ_research_criteria') || '{}');
    },
    
    saveCriteria(criteria) {
        localStorage.setItem('occ_research_criteria', JSON.stringify(criteria));
    },
    
    // NEW: Research Profiles System
    getResearchProfiles() {
        return JSON.parse(localStorage.getItem('occ_research_profiles') || '[]');
    },
    
    saveResearchProfile(profile) {
        const profiles = this.getResearchProfiles();
        const existingIndex = profiles.findIndex(p => p.id === profile.id);
        
        if (existingIndex >= 0) {
            profiles[existingIndex] = { ...profiles[existingIndex], ...profile, updatedAt: new Date().toISOString() };
        } else {
            profiles.push({
                ...profile,
                id: profile.id || generateId(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
        
        localStorage.setItem('occ_research_profiles', JSON.stringify(profiles));
        return profile.id || profiles[profiles.length - 1].id;
    },
    
    deleteResearchProfile(profileId) {
        const profiles = this.getResearchProfiles().filter(p => p.id !== profileId);
        localStorage.setItem('occ_research_profiles', JSON.stringify(profiles));
    },
    
    getProfilesByPathway(pathway) {
        return this.getResearchProfiles().filter(p => p.pathway === pathway);
    },
    
    getProfileById(profileId) {
        return this.getResearchProfiles().find(p => p.id === profileId);
    },
    
    duplicateProfile(profileId, newName) {
        const profile = this.getProfileById(profileId);
        if (!profile) return null;
        
        const newProfile = {
            ...profile,
            id: generateId(),
            name: newName || `${profile.name} (Copy)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        return this.saveResearchProfile(newProfile);
    },
    
    getPendingProspects() {
        return JSON.parse(localStorage.getItem('occ_pending_prospects') || '[]');
    },
    
    savePendingProspects(prospects) {
        localStorage.setItem('occ_pending_prospects', JSON.stringify(prospects));
    },
    
    getResearchHistory() {
        return JSON.parse(localStorage.getItem('occ_research_history') || '[]');
    },
    
    saveResearchHistory(history) {
        localStorage.setItem('occ_research_history', JSON.stringify(history));
    }
};

// ============================================
// MAIN RESEARCH INTERFACE
// ============================================

function renderResearchInterface(pathway, selectedProfileId = null) {
    const criteria = RESEARCH_CRITERIA[pathway] || RESEARCH_CRITERIA.b2b;
    const profiles = ResearchState.getProfilesByPathway(pathway);
    const pendingProspects = ResearchState.getPendingProspects().filter(p => p.pathway === pathway);
    
    // Load selected profile or create new
    let currentProfile = null;
    let profileCriteria = {};
    
    if (selectedProfileId) {
        currentProfile = ResearchState.getProfileById(selectedProfileId);
        if (currentProfile) {
            profileCriteria = currentProfile.criteria || {};
            ResearchState.currentProfileId = selectedProfileId;
        }
    } else if (profiles.length > 0) {
        // Default to most recently used profile
        currentProfile = profiles.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
        profileCriteria = currentProfile.criteria || {};
        ResearchState.currentProfileId = currentProfile.id;
    }
    
    return `
        <div class="research-container">
            <!-- Header -->
            <div class="research-header-section">
                <div class="research-title">
                    <span class="pathway-icon-large">${criteria.icon}</span>
                    <div>
                        <h2>AI Research: ${criteria.name}</h2>
                        <p>${criteria.description}</p>
                    </div>
                </div>
                ${pendingProspects.length > 0 ? `
                    <div class="pending-badge" onclick="showProspectLandingPage('${pathway}')">
                        <span>⏳</span>
                        <span>${pendingProspects.length} Prospects Awaiting Review</span>
                        <button class="btn btn-sm btn-primary">Review Now</button>
                    </div>
                ` : ''}
            </div>
            
            <!-- Profile Management Bar -->
            <div class="profile-management-bar">
                <div class="profile-selector">
                    <label>Research Profile:</label>
                    <select id="profile-selector" onchange="loadResearchProfile('${pathway}', this.value)">
                        <option value="">-- Create New Search --</option>
                        ${profiles.map(p => `<option value="${p.id}" ${currentProfile?.id === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                </div>
                <div class="profile-actions">
                    ${currentProfile ? `
                        <button class="btn btn-sm btn-secondary" onclick="saveCurrentProfile('${pathway}')" title="Save changes to this profile">
                            💾 Save
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="duplicateCurrentProfile('${pathway}')" title="Duplicate this profile">
                            📋 Duplicate
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteCurrentProfile('${pathway}')" title="Delete this profile">
                            🗑️ Delete
                        </button>
                    ` : ''}
                </div>
            </div>
            
            <!-- Profile Name Input (for new profiles) -->
            <div class="profile-name-section" id="profile-name-section" style="${currentProfile ? 'display:none;' : ''}">
                <div class="form-group">
                    <label>Profile Name *</label>
                    <input type="text" id="profile-name-input" placeholder="e.g., Denver Coaches Q3, Wellness Brands Summer 2024..." value="${currentProfile?.name || ''}">
                    <small class="help-text">Give your search a memorable name so you can reuse it later</small>
                </div>
            </div>
            
            <!-- Two Column Layout -->
            <div class="research-layout">
                <!-- Left: Criteria Definition -->
                <div class="criteria-panel">
                    <div class="panel-header">
                        <h3>🎯 Define Your Ideal Prospect</h3>
                        <p>${currentProfile ? `Editing: ${currentProfile.name}` : 'Set criteria for AI to find your best matches'}</p>
                    </div>
                    
                    <form id="research-criteria-form" class="criteria-form">
                        ${criteria.fields.map(field => renderCriteriaField(field, profileCriteria[field.id])).join('')}
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="resetCriteriaForm('${pathway}')">
                                🔄 Reset
                            </button>
                            <button type="button" class="btn btn-primary" onclick="startAIResearch('${pathway}')">
                                🚀 Start AI Research
                            </button>
                        </div>
                    </form>
                </div>
                
                <!-- Right: Saved Profiles & Research History -->
                <div class="research-sidebar">
                    <div class="saved-profiles-panel">
                        <h4>📁 Saved Profiles (${profiles.length})</h4>
                        ${profiles.length > 0 ? `
                            <div class="profiles-list">
                                ${profiles.slice(0, 5).map(p => `
                                    <div class="profile-item ${currentProfile?.id === p.id ? 'active' : ''}" onclick="loadResearchProfile('${pathway}', '${p.id}')">
                                        <div class="profile-name">${p.name}</div>
                                        <div class="profile-meta">
                                            <span>${formatRelativeTime(p.updatedAt)}</span>
                                            <span>•</span>
                                            <span>${p.searchCount || 0} searches</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p class="empty-state">No saved profiles yet</p>'}
                    </div>
                    
                    <div class="research-history-panel">
                        <h4>📚 Recent Searches</h4>
                        ${renderResearchHistory(pathway)}
                    </div>
                    
                    <div class="research-tips">
                        <h4>💡 Tips for Better Results</h4>
                        <ul>
                            <li>Save profiles with descriptive names</li>
                            <li>Reuse successful search criteria</li>
                            <li>Duplicate and tweak for variations</li>
                            <li>Set minimum score to 60+ for quality</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
        
        ${renderResearchStyles()}
    `;
}

function renderCriteriaField(field, savedValue) {
    const value = savedValue || (field.type === 'multiselect' ? [] : field.default || '');
    
    switch(field.type) {
        case 'text':
            return `
                <div class="form-group">
                    <label for="criteria-${field.id}">${field.label}</label>
                    <input type="text" id="criteria-${field.id}" name="${field.id}" 
                           placeholder="${field.placeholder || ''}" value="${value}">
                </div>
            `;
            
        case 'select':
            return `
                <div class="form-group">
                    <label for="criteria-${field.id}">${field.label}</label>
                    <select id="criteria-${field.id}" name="${field.id}">
                        ${field.options.map(opt => `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                    </select>
                </div>
            `;
            
        case 'multiselect':
            return `
                <div class="form-group">
                    <label>${field.label}</label>
                    <div class="multiselect-options">
                        ${field.options.map(opt => `
                            <label class="checkbox-pill">
                                <input type="checkbox" name="${field.id}" value="${opt}" 
                                    ${(Array.isArray(value) && value.includes(opt)) ? 'checked' : ''}>
                                <span>${opt}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
            
        case 'range':
            return `
                <div class="form-group">
                    <label for="criteria-${field.id}">${field.label}</label>
                    <div class="range-input">
                        <input type="range" id="criteria-${field.id}" name="${field.id}" 
                               min="${field.min}" max="${field.max}" value="${value}" 
                               oninput="document.getElementById('range-value-${field.id}').textContent = this.value">
                        <span class="range-value" id="range-value-${field.id}">${value}</span>
                    </div>
                </div>
            `;
            
        default:
            return '';
    }
}

function renderResearchHistory(pathway) {
    const history = ResearchState.getResearchHistory()
        .filter(h => h.pathway === pathway)
        .slice(0, 5);
    
    if (history.length === 0) {
        return '<p class="empty-state">No research sessions yet</p>';
    }
    
    return `
        <div class="history-list">
            ${history.map(session => `
                <div class="history-item">
                    <div class="history-info">
                        <div class="history-date">${formatDate(session.date)}</div>
                        <div class="history-stats">
                            <span>${session.prospectsFound} found</span>
                            <span>${session.approved} approved</span>
                            <span>${session.declined} declined</span>
                        </div>
                    </div>
                    <button class="btn btn-sm" onclick="loadResearchSession('${session.id}')">View</button>
                </div>
            `).join('')}
        </div>
    `;
}

// ============================================
// PROSPECT LANDING PAGE
// ============================================

function showProspectLandingPage(pathway) {
    const prospects = ResearchState.getPendingProspects().filter(p => p.pathway === pathway);
    const criteria = RESEARCH_CRITERIA[pathway];
    
    const mainContent = document.getElementById('occ-main-content');
    if (!mainContent) return;
    
    mainContent.innerHTML = `
        <div class="prospect-landing-page">
            <!-- Header -->
            <div class="prospect-header">
                <div class="prospect-title">
                    <span class="pathway-icon-large">${criteria.icon}</span>
                    <div>
                        <h2>Review AI-Found Prospects</h2>
                        <p>${prospects.length} prospects awaiting your approval</p>
                    </div>
                </div>
                <div class="bulk-actions">
                    <button class="btn btn-secondary" onclick="selectAllProspects(true)">Select All</button>
                    <button class="btn btn-secondary" onclick="selectAllProspects(false)">Deselect All</button>
                    <button class="btn btn-success" onclick="bulkApproveProspects()">✓ Approve Selected</button>
                    <button class="btn btn-danger" onclick="bulkDeclineProspects()">✗ Decline Selected</button>
                </div>
            </div>
            
            <!-- Filter Bar -->
            <div class="prospect-filters">
                <div class="filter-group">
                    <label>Sort by:</label>
                    <select onchange="sortProspects(this.value)">
                        <option value="score-desc">AI Score (High to Low)</option>
                        <option value="score-asc">AI Score (Low to High)</option>
                        <option value="name">Name (A-Z)</option>
                        <option value="company">Company (A-Z)</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Min Score:</label>
                    <select onchange="filterByScore(this.value)">
                        <option value="0">All</option>
                        <option value="80">80+ (Excellent)</option>
                        <option value="60">60+ (Good)</option>
                        <option value="40">40+ (Fair)</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Search:</label>
                    <input type="text" placeholder="Name, company, or keyword..." onkeyup="filterProspects(this.value)">
                </div>
            </div>
            
            <!-- Prospects Grid -->
            <div class="prospects-grid" id="prospects-grid">
                ${prospects.map((prospect, index) => renderProspectCard(prospect, index)).join('')}
            </div>
            
            ${prospects.length === 0 ? '<div class="empty-state-large"><span>🎉</span><p>All prospects have been reviewed!</p><button class="btn btn-primary" onclick="setOutreachView(\'research\')">Start New Research</button></div>' : ''}
        </div>
        
        ${renderProspectLandingStyles()}
    `;
}

function renderProspectCard(prospect, index) {
    return `
        <div class="prospect-card" id="prospect-${prospect.id}" data-score="${prospect.aiScore}">
            <div class="prospect-select">
                <input type="checkbox" class="prospect-checkbox" data-id="${prospect.id}" onchange="toggleProspectSelection('${prospect.id}')">
            </div>
            
            <div class="prospect-header">
                <div class="prospect-avatar">${prospect.firstName[0]}${prospect.lastName[0]}</div>
                <div class="prospect-info">
                    <h4>${prospect.firstName} ${prospect.lastName}</h4>
                    <p class="prospect-title">${prospect.title || 'No title'}</p>
                    <p class="prospect-company">${prospect.company || 'No company'}</p>
                </div>
                <div class="prospect-score">
                    <div class="score-circle" style="background: ${getScoreColor(prospect.aiScore)}">
                        <span>${prospect.aiScore}</span>
                    </div>
                    <span class="score-label">AI Match</span>
                </div>
            </div>
            
            <div class="prospect-details">
                <div class="detail-row">
                    <span class="detail-label">Location:</span>
                    <span class="detail-value">${prospect.location || 'Unknown'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Industry:</span>
                    <span class="detail-value">${prospect.industry || 'Unknown'}</span>
                </div>
                ${prospect.website ? `
                    <div class="detail-row">
                        <span class="detail-label">Website:</span>
                        <a href="${prospect.website}" target="_blank" class="detail-link">${prospect.website.replace(/^https?:\/\//, '').substring(0, 30)}...</a>
                    </div>
                ` : ''}
            </div>
            
            <div class="prospect-reasoning">
                <h5>🤖 Why This Match?</h5>
                <p>${prospect.aiReasoning || 'Profile matches your criteria based on industry, role, and engagement signals.'}</p>
            </div>
            
            <div class="prospect-outreach-angle">
                <h5>💡 Recommended Outreach</h5>
                <p>${prospect.outreachAngle || 'Personalized message based on their profile and your offer.'}</p>
            </div>
            
            <div class="prospect-actions">
                <button class="btn btn-success" onclick="approveProspect('${prospect.id}')">
                    ✓ Approve
                </button>
                <button class="btn btn-secondary" onclick="researchMore('${prospect.id}')">
                    🔍 Research More
                </button>
                <button class="btn btn-danger" onclick="declineProspect('${prospect.id}')">
                    ✗ Decline
                </button>
            </div>
        </div>
    `;
}

// ============================================
// ACTIONS & WORKFLOWS
// ============================================

function saveResearchCriteria(pathway) {
    const form = document.getElementById('research-criteria-form');
    if (!form) return;
    
    const criteria = {};
    const formData = new FormData(form);
    
    // Handle regular fields
    RESEARCH_CRITERIA[pathway].fields.forEach(field => {
        if (field.type === 'multiselect') {
            criteria[field.id] = formData.getAll(field.id);
        } else {
            criteria[field.id] = formData.get(field.id);
        }
    });
    
    // Save to state
    const allCriteria = ResearchState.getCriteria();
    allCriteria[pathway] = criteria;
    ResearchState.saveCriteria(allCriteria);
    
    showNotification('Criteria saved successfully!', 'success');
}

// ============================================
// PROFILE MANAGEMENT FUNCTIONS
// ============================================

function loadResearchProfile(pathway, profileId) {
    if (!profileId) {
        // Create new search - reset form
        ResearchState.currentProfileId = null;
        const mainContent = document.getElementById('occ-main-content');
        if (mainContent) {
            mainContent.innerHTML = renderResearchInterface(pathway, null);
        }
        showNotification('Create a new search profile', 'info');
        return;
    }
    
    const profile = ResearchState.getProfileById(profileId);
    if (!profile) {
        showNotification('Profile not found', 'error');
        return;
    }
    
    // Reload interface with selected profile
    const mainContent = document.getElementById('occ-main-content');
    if (mainContent) {
        mainContent.innerHTML = renderResearchInterface(pathway, profileId);
    }
    
    showNotification(`Loaded profile: ${profile.name}`, 'success');
}

function saveCurrentProfile(pathway) {
    const profileNameInput = document.getElementById('profile-name-input');
    const profileName = profileNameInput ? profileNameInput.value.trim() : '';
    
    // Get current profile ID if editing existing
    const currentProfileId = ResearchState.currentProfileId;
    let existingProfile = currentProfileId ? ResearchState.getProfileById(currentProfileId) : null;
    
    // If no name provided and no existing profile, require name
    if (!profileName && !existingProfile) {
        showNotification('Please enter a profile name', 'warning');
        if (profileNameInput) profileNameInput.focus();
        return;
    }
    
    // Collect criteria from form
    const form = document.getElementById('research-criteria-form');
    if (!form) return;
    
    const criteria = {};
    const formData = new FormData(form);
    
    RESEARCH_CRITERIA[pathway].fields.forEach(field => {
        if (field.type === 'multiselect') {
            criteria[field.id] = formData.getAll(field.id);
        } else {
            criteria[field.id] = formData.get(field.id);
        }
    });
    
    // Save profile
    const profile = {
        id: existingProfile ? existingProfile.id : generateId(),
        name: profileName || (existingProfile ? existingProfile.name : 'Unnamed Search'),
        pathway: pathway,
        criteria: criteria,
        searchCount: existingProfile ? (existingProfile.searchCount || 0) : 0
    };
    
    const savedId = ResearchState.saveResearchProfile(profile);
    ResearchState.currentProfileId = savedId;
    
    // Reload to show updated state
    const mainContent = document.getElementById('occ-main-content');
    if (mainContent) {
        mainContent.innerHTML = renderResearchInterface(pathway, savedId);
    }
    
    showNotification(`Profile saved: ${profile.name}`, 'success');
}

function duplicateCurrentProfile(pathway) {
    const currentProfileId = ResearchState.currentProfileId;
    if (!currentProfileId) {
        showNotification('No profile selected to duplicate', 'warning');
        return;
    }
    
    const currentProfile = ResearchState.getProfileById(currentProfileId);
    if (!currentProfile) {
        showNotification('Profile not found', 'error');
        return;
    }
    
    const newName = `${currentProfile.name} (Copy)`;
    const newId = ResearchState.duplicateProfile(currentProfileId, newName);
    
    if (newId) {
        // Load the duplicated profile
        const mainContent = document.getElementById('occ-main-content');
        if (mainContent) {
            mainContent.innerHTML = renderResearchInterface(pathway, newId);
        }
        showNotification(`Profile duplicated: ${newName}`, 'success');
    }
}

function deleteCurrentProfile(pathway) {
    const currentProfileId = ResearchState.currentProfileId;
    if (!currentProfileId) {
        showNotification('No profile selected to delete', 'warning');
        return;
    }
    
    const currentProfile = ResearchState.getProfileById(currentProfileId);
    if (!currentProfile) {
        showNotification('Profile not found', 'error');
        return;
    }
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete "${currentProfile.name}"?\n\nThis cannot be undone.`)) {
        return;
    }
    
    ResearchState.deleteResearchProfile(currentProfileId);
    ResearchState.currentProfileId = null;
    
    // Reload with no profile selected
    const mainContent = document.getElementById('occ-main-content');
    if (mainContent) {
        mainContent.innerHTML = renderResearchInterface(pathway, null);
    }
    
    showNotification('Profile deleted', 'info');
}

function resetCriteriaForm(pathway) {
    const currentProfileId = ResearchState.currentProfileId;
    
    if (currentProfileId) {
        // Reset to saved profile values
        const mainContent = document.getElementById('occ-main-content');
        if (mainContent) {
            mainContent.innerHTML = renderResearchInterface(pathway, currentProfileId);
        }
        showNotification('Form reset to saved profile values', 'info');
    } else {
        // Clear all fields for new search
        const form = document.getElementById('research-criteria-form');
        if (form) {
            form.reset();
        }
        showNotification('Form cleared', 'info');
    }
}

function startAIResearch(pathway) {
    // Save current profile first (if named)
    const profileNameInput = document.getElementById('profile-name-input');
    const profileName = profileNameInput ? profileNameInput.value.trim() : '';
    
    // Auto-save if we have a name or existing profile
    if (profileName || ResearchState.currentProfileId) {
        saveCurrentProfile(pathway);
    }
    
    // Save criteria to legacy storage as well
    saveResearchCriteria(pathway);
    
    // Increment search count on profile
    if (ResearchState.currentProfileId) {
        const profile = ResearchState.getProfileById(ResearchState.currentProfileId);
        if (profile) {
            profile.searchCount = (profile.searchCount || 0) + 1;
            ResearchState.saveResearchProfile(profile);
        }
    }
    
    // Show loading state
    const mainContent = document.getElementById('occ-main-content');
    if (mainContent) {
        const profile = ResearchState.currentProfileId ? ResearchState.getProfileById(ResearchState.currentProfileId) : null;
        mainContent.innerHTML = `
            <div class="research-loading">
                <div class="loading-animation">
                    <span>🔍</span>
                    <div class="loading-pulse"></div>
                </div>
                <h3>AI Research in Progress...</h3>
                <p>${profile ? `Using profile: ${profile.name}` : 'Scanning for your ideal prospects'}</p>
                <div class="loading-steps">
                    <div class="step active">Analyzing criteria...</div>
                    <div class="step">Searching databases...</div>
                    <div class="step">Scoring matches...</div>
                    <div class="step">Generating insights...</div>
                </div>
            </div>
            ${renderLoadingStyles()}
        `;
    }
    
    // Call real AI Research API
    (async () => {
        try {
            const form = document.getElementById('research-criteria-form');
            const formData = new FormData(form);
            
            const criteria = {};
            RESEARCH_CRITERIA[pathway].fields.forEach(field => {
                if (field.type === 'multiselect') {
                    criteria[field.id] = formData.getAll(field.id);
                } else {
                    criteria[field.id] = formData.get(field.id);
                }
            });
            
            const response = await fetch('/api/research', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': getCurrentUserId() || 'anonymous'
                },
                body: JSON.stringify({
                    pathway: pathway,
                    criteria: criteria,
                    researchSource: criteria.researchSource || ['LinkedIn']
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Research failed');
            }
            
            if (data.error) {
                throw new Error(data.message);
            }
            
            // Save prospects
            ResearchState.savePendingProspects([
                ...ResearchState.getPendingProspects(),
                ...data.prospects
            ]);
            
            // Add to history
            const history = ResearchState.getResearchHistory();
            const profile = ResearchState.currentProfileId ? ResearchState.getProfileById(ResearchState.currentProfileId) : null;
            history.unshift({
                id: generateId(),
                pathway: pathway,
                date: new Date().toISOString(),
                prospectsFound: data.prospects.length,
                approved: 0,
                declined: 0,
                criteria: criteria,
                profileId: ResearchState.currentProfileId,
                profileName: profile ? profile.name : null,
                searchesUsed: data.searchesUsed,
                searchesRemaining: data.searchesRemaining
            });
            ResearchState.saveResearchHistory(history);
            
            // Show prospect landing page
            showProspectLandingPage(pathway);
            
            showNotification(`Found ${data.prospects.length} prospects! ${data.searchesRemaining} searches remaining today.`, 'success');
            
        } catch (error) {
            console.error('AI Research Error:', error);
            showNotification(error.message || 'Research failed. Please try again.', 'error');
            
            // Reload research interface on error
            const mainContent = document.getElementById('occ-main-content');
            if (mainContent) {
                mainContent.innerHTML = renderResearchInterface(pathway, ResearchState.currentProfileId);
            }
        }
    })();
}

function generateSimulatedProspects(pathway) {
    const prospects = [];
    const count = Math.floor(Math.random() * 8) + 5; // 5-12 prospects
    
    const firstNames = ['Sarah', 'Michael', 'Jennifer', 'David', 'Emily', 'James', 'Jessica', 'Robert', 'Amanda', 'John', 'Laura', 'Christopher'];
    const lastNames = ['Johnson', 'Smith', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez'];
    const companies = ['Growth Partners', 'Transform Coaching', 'Elevate Consulting', 'Mindful Business', 'Sacred Success', 'Aligned Ventures', 'Purpose Driven', 'Clarity Works'];
    const titles = ['Founder', 'CEO', 'Life Coach', 'Business Consultant', 'Transformation Coach', 'Executive Coach', 'Wellness Coach'];
    const industries = ['Coaching', 'Consulting', 'Professional Services', 'Wellness', 'Personal Development'];
    const locations = ['Denver, CO', 'Austin, TX', 'Portland, OR', 'Remote', 'New York, NY', 'Los Angeles, CA'];
    
    for (let i = 0; i < count; i++) {
        const score = Math.floor(Math.random() * 40) + 60; // 60-100 score
        prospects.push({
            id: generateId(),
            pathway: pathway,
            firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
            lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
            company: companies[Math.floor(Math.random() * companies.length)],
            title: titles[Math.floor(Math.random() * titles.length)],
            industry: industries[Math.floor(Math.random() * industries.length)],
            location: locations[Math.floor(Math.random() * locations.length)],
            email: `prospect${i}@example.com`,
            website: Math.random() > 0.3 ? `https://www.${companies[Math.floor(Math.random() * companies.length)].toLowerCase().replace(/\s/g, '')}.com` : null,
            aiScore: score,
            aiReasoning: `Strong match based on ${Math.random() > 0.5 ? 'industry alignment' : 'role relevance'} and ${Math.random() > 0.5 ? 'growth signals' : 'engagement potential'}.`,
            outreachAngle: `Personalized message highlighting ${Math.random() > 0.5 ? 'shared values' : 'complementary services'} and ${Math.random() > 0.5 ? 'potential collaboration' : 'mutual benefit'}.`,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
    }
    
    return prospects.sort((a, b) => b.aiScore - a.aiScore);
}

function approveProspect(prospectId) {
    const pending = ResearchState.getPendingProspects();
    const prospect = pending.find(p => p.id === prospectId);
    
    if (!prospect) return;
    
    // Add to leads
    const leads = OutreachState.getLeads();
    leads.push({
        ...prospect,
        status: 'new',
        source: 'AI Research',
        primary_pathway: prospect.pathway,
        score: prospect.aiScore,
        approvedAt: new Date().toISOString()
    });
    OutreachState.saveLeads(leads);
    
    // Remove from pending
    ResearchState.savePendingProspects(pending.filter(p => p.id !== prospectId));
    
    // Update history
    updateResearchHistory(prospect.pathway, 'approved');
    
    // Log activity
    OutreachState.addActivity('lead_added', `Approved ${prospect.firstName} ${prospect.lastName} from AI research`, 'lead', prospectId, prospect.pathway);
    
    // Remove card from UI
    const card = document.getElementById(`prospect-${prospectId}`);
    if (card) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        setTimeout(() => card.remove(), 300);
    }
    
    showNotification(`${prospect.firstName} ${prospect.lastName} approved and added to leads!`, 'success');
}

function declineProspect(prospectId) {
    const pending = ResearchState.getPendingProspects();
    const prospect = pending.find(p => p.id === prospectId);
    
    if (!prospect) return;
    
    // Remove from pending (could also save to declined list)
    ResearchState.savePendingProspects(pending.filter(p => p.id !== prospectId));
    
    // Update history
    updateResearchHistory(prospect.pathway, 'declined');
    
    // Remove card from UI
    const card = document.getElementById(`prospect-${prospectId}`);
    if (card) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';
        setTimeout(() => card.remove(), 300);
    }
    
    showNotification('Prospect declined', 'info');
}

function updateResearchHistory(pathway, action) {
    const history = ResearchState.getResearchHistory();
    const latest = history.find(h => h.pathway === pathway);
    if (latest) {
        latest[action] = (latest[action] || 0) + 1;
        ResearchState.saveResearchHistory(history);
    }
}

function bulkApproveProspects() {
    const checkboxes = document.querySelectorAll('.prospect-checkbox:checked');
    const ids = Array.from(checkboxes).map(cb => cb.dataset.id);
    
    ids.forEach(id => approveProspect(id));
    showNotification(`${ids.length} prospects approved!`, 'success');
}

function bulkDeclineProspects() {
    const checkboxes = document.querySelectorAll('.prospect-checkbox:checked');
    const ids = Array.from(checkboxes).map(cb => cb.dataset.id);
    
    ids.forEach(id => declineProspect(id));
    showNotification(`${ids.length} prospects declined`, 'info');
}

function selectAllProspects(select) {
    document.querySelectorAll('.prospect-checkbox').forEach(cb => {
        cb.checked = select;
    });
}

function toggleProspectSelection(id) {
    // Track selected prospects if needed
}

function sortProspects(sortBy) {
    const grid = document.getElementById('prospects-grid');
    if (!grid) return;
    
    const cards = Array.from(grid.children);
    
    cards.sort((a, b) => {
        switch(sortBy) {
            case 'score-desc':
                return parseInt(b.dataset.score) - parseInt(a.dataset.score);
            case 'score-asc':
                return parseInt(a.dataset.score) - parseInt(b.dataset.score);
            case 'name':
                return a.querySelector('h4').textContent.localeCompare(b.querySelector('h4').textContent);
            case 'company':
                return a.querySelector('.prospect-company').textContent.localeCompare(b.querySelector('.prospect-company').textContent);
            default:
                return 0;
        }
    });
    
    cards.forEach(card => grid.appendChild(card));
}

function filterByScore(minScore) {
    document.querySelectorAll('.prospect-card').forEach(card => {
        const score = parseInt(card.dataset.score);
        card.style.display = score >= parseInt(minScore) ? 'block' : 'none';
    });
}

function filterProspects(searchTerm) {
    const term = searchTerm.toLowerCase();
    document.querySelectorAll('.prospect-card').forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(term) ? 'block' : 'none';
    });
}

function researchMore(prospectId) {
    showNotification('Deep research feature coming soon!', 'info');
}

// ============================================
// STYLES
// ============================================

function renderProspectLandingStyles() {
    return `
        <style>
            .prospect-landing-page { max-width: 1400px; }
            .prospect-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid rgba(212, 175, 99, 0.2); }
            .prospect-title { display: flex; align-items: center; gap: 16px; }
            .prospect-title h2 { font-family: 'Cormorant Garamond', serif; font-size: 32px; margin-bottom: 4px; }
            .prospect-title p { color: rgba(246, 241, 232, 0.6); }
            .bulk-actions { display: flex; gap: 12px; }
            
            .prospect-filters { display: flex; gap: 20px; margin-bottom: 24px; padding: 16px; background: rgba(31, 49, 91, 0.3); border-radius: 12px; }
            .filter-group { display: flex; align-items: center; gap: 8px; }
            .filter-group label { font-size: 13px; color: rgba(246, 241, 232, 0.7); }
            .filter-group select, .filter-group input { padding: 8px 12px; background: rgba(246, 241, 232, 0.05); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 8px; color: var(--ivory-light); font-size: 14px; }
            
            .prospects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 20px; }
            .prospect-card { background: rgba(31, 49, 91, 0.4); border: 1px solid rgba(212, 175, 99, 0.15); border-radius: 16px; padding: 20px; transition: all 0.3s; position: relative; }
            .prospect-card:hover { border-color: rgba(212, 175, 99, 0.3); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
            .prospect-select { position: absolute; top: 16px; left: 16px; }
            .prospect-select input { width: 20px; height: 20px; cursor: pointer; }
            
            .prospect-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding-left: 32px; }
            .prospect-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, var(--warm-gold), var(--sacred-teal)); display: flex; align-items: center; justify-content: center; font-weight: 600; color: var(--deep-indigo); font-size: 18px; }
            .prospect-info { flex: 1; }
            .prospect-info h4 { font-size: 16px; margin-bottom: 2px; }
            .prospect-title { font-size: 13px; color: rgba(246, 241, 232, 0.7); }
            .prospect-company { font-size: 12px; color: rgba(246, 241, 232, 0.5); }
            
            .prospect-score { text-align: center; }
            .score-circle { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
            .score-circle span { font-weight: 700; color: white; font-size: 14px; }
            .score-label { font-size: 10px; color: rgba(246, 241, 232, 0.5); text-transform: uppercase; }
            
            .prospect-details { margin-bottom: 16px; padding: 12px; background: rgba(246, 241, 232, 0.03); border-radius: 8px; }
            .detail-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
            .detail-row:last-child { margin-bottom: 0; }
            .detail-label { color: rgba(246, 241, 232, 0.5); }
            .detail-value { color: var(--ivory-light); }
            .detail-link { color: var(--sacred-teal); text-decoration: none; }
            .detail-link:hover { text-decoration: underline; }
            
            .prospect-reasoning, .prospect-outreach-angle { margin-bottom: 16px; }
            .prospect-reasoning h5, .prospect-outreach-angle h5 { font-size: 12px; color: rgba(246, 241, 232, 0.7); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
            .prospect-reasoning p, .prospect-outreach-angle p { font-size: 13px; color: rgba(246, 241, 232, 0.8); line-height: 1.5; }
            
            .prospect-actions { display: flex; gap: 8px; }
            .prospect-actions .btn { flex: 1; padding: 10px; font-size: 13px; }
            
            .empty-state-large { text-align: center; padding: 80px 40px; }
            .empty-state-large span { font-size: 64px; display: block; margin-bottom: 16px; }
            .empty-state-large p { font-size: 18px; color: rgba(246, 241, 232, 0.7); margin-bottom: 24px; }
            
            @media (max-width: 768px) {
                .prospect-header { flex-direction: column; gap: 16px; }
                .bulk-actions { flex-wrap: wrap; }
                .prospect-filters { flex-direction: column; }
                .prospects-grid { grid-template-columns: 1fr; }
            }
        </style>
    `;
}

function renderLoadingStyles() {
    return `
        <style>
            .research-loading { text-align: center; padding: 80px 40px; }
            .loading-animation { position: relative; display: inline-block; margin-bottom: 32px; }
            .loading-animation span { font-size: 64px; position: relative; z-index: 2; }
            .loading-pulse { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; background: rgba(212, 175, 99, 0.3); border-radius: 50%; animation: pulse 2s infinite; }
            @keyframes pulse { 0% { transform: translate(-50%, -50%) scale(1); opacity: 1; } 100% { transform: translate(-50%, -50%) scale(2); opacity: 0; } }
            .research-loading h3 { font-family: 'Cormorant Garamond', serif; font-size: 28px; margin-bottom: 8px; }
            .research-loading p { color: rgba(246, 241, 232, 0.6); margin-bottom: 40px; }
            .loading-steps { display: flex; flex-direction: column; gap: 12px; max-width: 300px; margin: 0 auto; }
            .step { padding: 12px 20px; background: rgba(246, 241, 232, 0.05); border-radius: 8px; color: rgba(246, 241, 232, 0.5); font-size: 14px; transition: all 0.3s; }
            .step.active { background: rgba(212, 175, 99, 0.2); color: var(--warm-gold); }
        </style>
    `;
}

function renderResearchStyles() {
    return `
        <style>
            .research-container { max-width: 1400px; }
            .research-header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid rgba(212, 175, 99, 0.2); }
            .research-title { display: flex; align-items: center; gap: 16px; }
            .pathway-icon-large { font-size: 48px; }
            .research-title h2 { font-family: 'Cormorant Garamond', serif; font-size: 32px; margin-bottom: 4px; }
            .research-title p { color: rgba(246, 241, 232, 0.6); }
            .pending-badge { display: flex; align-items: center; gap: 12px; background: rgba(212, 175, 99, 0.1); border: 1px solid rgba(212, 175, 99, 0.3); border-radius: 12px; padding: 12px 20px; cursor: pointer; transition: all 0.3s; }
            .pending-badge:hover { background: rgba(212, 175, 99, 0.2); transform: translateY(-2px); }
            .pending-badge span:first-child { font-size: 24px; }
            
            .research-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 32px; }
            .criteria-panel { background: rgba(31, 49, 91, 0.4); border: 1px solid rgba(212, 175, 99, 0.15); border-radius: 20px; padding: 32px; }
            .panel-header { margin-bottom: 24px; }
            .panel-header h3 { font-family: 'Cormorant Garamond', serif; font-size: 24px; margin-bottom: 8px; }
            .panel-header p { color: rgba(246, 241, 232, 0.6); }
            
            .criteria-form { display: flex; flex-direction: column; gap: 20px; }
            .form-group { display: flex; flex-direction: column; gap: 8px; }
            .form-group label { font-size: 13px; font-weight: 600; color: rgba(246, 241, 232, 0.8); text-transform: uppercase; letter-spacing: 0.5px; }
            .form-group input, .form-group select { padding: 12px 16px; background: rgba(246, 241, 232, 0.05); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 10px; color: var(--ivory-light); font-size: 14px; }
            .form-group input:focus, .form-group select:focus { outline: none; border-color: var(--warm-gold); }
            .multiselect-options { display: flex; flex-wrap: wrap; gap: 8px; }
            .checkbox-pill { display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: rgba(246, 241, 232, 0.05); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 20px; cursor: pointer; transition: all 0.2s; font-size: 13px; }
            .checkbox-pill:hover { background: rgba(212, 175, 99, 0.1); }
            .checkbox-pill input { display: none; }
            .checkbox-pill:has(input:checked) { background: rgba(212, 175, 99, 0.2); border-color: var(--warm-gold); color: var(--warm-gold); }
            .range-input { display: flex; align-items: center; gap: 16px; }
            .range-input input[type="range"] { flex: 1; -webkit-appearance: none; height: 6px; background: rgba(246, 241, 232, 0.1); border-radius: 3px; outline: none; }
            .range-input input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; background: var(--warm-gold); border-radius: 50%; cursor: pointer; }
            .range-value { font-weight: 600; color: var(--warm-gold); min-width: 36px; text-align: center; }
            .form-actions { display: flex; gap: 12px; margin-top: 12px; }
            .form-actions .btn { flex: 1; padding: 14px; }
            
            .research-sidebar { display: flex; flex-direction: column; gap: 24px; }
            
            /* Profile Management Styles */
            .profile-management-bar { display: flex; justify-content: space-between; align-items: center; background: rgba(31, 49, 91, 0.4); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; }
            .profile-selector { display: flex; align-items: center; gap: 12px; }
            .profile-selector label { font-size: 14px; font-weight: 600; color: rgba(246, 241, 232, 0.8); }
            .profile-selector select { min-width: 250px; padding: 10px 14px; background: rgba(246, 241, 232, 0.05); border: 1px solid rgba(212, 175, 99, 0.3); border-radius: 8px; color: var(--ivory-light); font-size: 14px; cursor: pointer; }
            .profile-actions { display: flex; gap: 8px; }
            .profile-actions .btn { padding: 8px 14px; font-size: 13px; }
            
            .profile-name-section { background: rgba(212, 175, 99, 0.05); border: 1px solid rgba(212, 175, 99, 0.15); border-radius: 12px; padding: 20px; margin-bottom: 24px; }
            .profile-name-section .form-group { margin-bottom: 0; }
            .profile-name-section input { font-size: 16px; padding: 14px 16px; }
            .help-text { font-size: 12px; color: rgba(246, 241, 232, 0.5); margin-top: 6px; }
            
            .saved-profiles-panel { background: rgba(31, 49, 91, 0.3); border: 1px solid rgba(212, 175, 99, 0.1); border-radius: 16px; padding: 24px; }
            .saved-profiles-panel h4 { font-family: 'Cormorant Garamond', serif; font-size: 18px; margin-bottom: 16px; }
            .profiles-list { display: flex; flex-direction: column; gap: 8px; }
            .profile-item { padding: 12px 16px; background: rgba(246, 241, 232, 0.03); border-radius: 10px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
            .profile-item:hover { background: rgba(212, 175, 99, 0.1); border-color: rgba(212, 175, 99, 0.2); }
            .profile-item.active { background: rgba(212, 175, 99, 0.15); border-color: var(--warm-gold); }
            .profile-name { font-weight: 500; font-size: 14px; margin-bottom: 4px; }
            .profile-meta { font-size: 12px; color: rgba(246, 241, 232, 0.5); display: flex; gap: 8px; }
            
            .research-history-panel { background: rgba(31, 49, 91, 0.3); border: 1px solid rgba(212, 175, 99, 0.1); border-radius: 16px; padding: 24px; }
            .research-history-panel h4 { font-family: 'Cormorant Garamond', serif; font-size: 18px; margin-bottom: 16px; }
            .history-list { display: flex; flex-direction: column; gap: 12px; }
            .history-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(246, 241, 232, 0.03); border-radius: 8px; }
            .history-date { font-size: 13px; font-weight: 500; margin-bottom: 4px; }
            .history-stats { display: flex; gap: 12px; font-size: 12px; color: rgba(246, 241, 232, 0.5); }
            
            .research-tips { background: rgba(46, 124, 131, 0.1); border: 1px solid rgba(46, 124, 131, 0.2); border-radius: 16px; padding: 24px; }
            .research-tips h4 { font-family: 'Cormorant Garamond', serif; font-size: 18px; margin-bottom: 12px; color: var(--sacred-teal); }
            .research-tips ul { list-style: none; }
            .research-tips li { position: relative; padding-left: 20px; margin-bottom: 8px; font-size: 13px; color: rgba(246, 241, 232, 0.7); }
            .research-tips li::before { content: "•"; position: absolute; left: 0; color: var(--sacred-teal); }
            
            @media (max-width: 1024px) {
                .research-layout { grid-template-columns: 1fr; }
                .research-header-section { flex-direction: column; gap: 16px; align-items: flex-start; }
            }
        </style>
    `;
}

// Helper function for notifications
function showNotification(message, type = 'info') {
    // Use existing notification system if available
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
        alert(message);
    }
}