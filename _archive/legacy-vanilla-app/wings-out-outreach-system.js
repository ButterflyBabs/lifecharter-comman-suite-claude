// ============================================
// WINGS OUT OUTREACH SYSTEM
// For LifeCharter Command Suite
// Sacred Kaleidoscope Community
// ============================================
//
// "Head up, wings out." - This system helps reach
// the right people with compassion, clarity, and aligned action.
//
// DUAL-PATH ARCHITECTURE:
// - B2B Path: Prospect coaches/professionals for Command Suite
// - B2C Path: Prospect individuals for LifeCharter programs
//

console.log('📧 Outreach System - File loading...');

// ============================================
// CONFIGURATION
// ============================================

const WINGS_OUT_CONFIG = {
    // Daily limits to maintain human-scale outreach
    maxDailyEmails: 20,
    minTimeBetweenEmails: 15, // minutes
    
    // Follow-up schedule (days after previous contact)
    followUpSchedule: [3, 7, 14, 30],
    
    // Email statuses
    statuses: {
        PENDING: 'pending',
        SCHEDULED: 'scheduled',
        SENT: 'sent',
        OPENED: 'opened',
        CLICKED: 'clicked',
        REPLIED: 'replied',
        CONVERTED: 'converted',
        UNSUBSCRIBED: 'unsubscribed',
        BOUNCED: 'bounced'
    },
    
    // Priority levels
    priorities: {
        HIGH: 'high',
        NORMAL: 'normal',
        LOW: 'low'
    },
    
    // Outreach paths
    paths: {
        B2B: 'b2b',        // Command Suite prospects (coaches, consultants)
        B2C: 'b2c',        // LifeCharter prospects (individuals seeking transformation)
        AFFILIATE: 'aff'   // Affiliate/Partnership prospects (Babs & Beau brand deals)
    },
    
    // Default sender info (can be overridden in settings)
    fromName: 'Babs Carroll',
    fromEmail: 'babs@sacredkaleidoscope.community',
    replyTo: 'babs@sacredkaleidoscope.community',
    
    // Calendar booking link
    calendarLink: 'https://calendly.com/sacredkaleidoscope/alignment-call',
    
    // LifeCharter links
    links: {
        // B2C - LifeCharter programs
        incubator: 'https://lifecharter.co/incubator',
        circle: 'https://lifecharter.co/circle',
        alignmentSnapshot: 'https://lifecharter.co/alignment-snapshot',
        conversations: 'https://lifecharter.co/conversations',
        // B2B - Command Suite
        commandSuite: 'https://lifecharter.co/command-suite',
        commandSuiteDemo: 'https://lifecharter.co/command-suite-demo',
        // Affiliate - Babs & Beau
        mediaKit: 'https://babsandbeau.com/media-kit',
        partnershipDeck: 'https://babsandbeau.com/partnership-deck'
    }
};

// ============================================
// EMAIL TEMPLATES - B2C PATH (LifeCharter)
// For individuals seeking personal transformation
// ============================================

const WINGS_OUT_TEMPLATES_B2C = {
    // Initial Outreach Templates
    b2c_initial_incubator: {
        id: 'b2c_initial_incubator',
        name: 'LifeCharter Incubator Invitation',
        path: 'b2c',
        category: 'Initial Outreach',
        subject: 'An invitation to remember who you are',
        body: `Hi {{firstName}},

I've been reflecting on something that made me think of you.

So many of us are moving through life on autopilot—reacting, surviving, waiting for the "right time" to finally get clear on what we actually want. But clarity doesn't come from waiting. It comes from choosing to stop and look.

I created the LifeCharter Incubator—a free 90-minute workshop—for people who are ready to do exactly that. Not to fix what's broken, but to remember what's true.

We explore:
• Identity First (who you are beneath the roles and expectations)
• The Yellow Light (recognizing your patterns before they choose for you)
• Aligned Action (moving from clarity, not pressure)

{{personalNote}}

If this resonates, I'd love to have you join us.

{{calendarLink}}

With warmth and respect,
Babs

---
Babs Carroll | Alignment Architect
Sacred Kaleidoscope Community
"Head up, wings out." 🦋`,
        variables: ['firstName', 'personalNote', 'calendarLink'],
        tone: 'warm, invitational, spacious'
    },
    
    b2c_initial_alignment: {
        id: 'b2c_initial_alignment',
        name: 'Alignment Snapshot Offer',
        path: 'b2c',
        category: 'Initial Outreach',
        subject: 'Where are you out of alignment right now?',
        body: `Hi {{firstName}},

Quick question: If you had to name one area of your life where you feel most out of alignment right now, what would it be?

Not the thing you think you "should" work on. The thing that actually keeps you up at night.

I ask because I built something for this exact moment—the LifeCharter Alignment Snapshot. It's a free assessment that takes about 10 minutes and gives you a clear picture of where you stand across all 12 dimensions of life.

{{personalNote}}

The snapshot won't give you a score to judge yourself by. It will give you a mirror to see yourself through.

Curious?

{{alignmentLink}}

With care,
Babs

---
Babs Carroll | Alignment Architect
Sacred Kaleidoscope Community`,
        variables: ['firstName', 'personalNote', 'alignmentLink'],
        tone: 'curious, reflective, gentle'
    },
    
    b2c_initial_conversations: {
        id: 'b2c_initial_conversations',
        name: 'Conversations of Consequence Invite',
        path: 'b2c',
        category: 'Initial Outreach',
        subject: 'A daily practice in remembering',
        body: `Hi {{firstName}},

I wanted to share something that's become a daily touchstone for me and thousands of others.

Every morning, I record a short audio reflection—5 to 7 minutes—on what it means to live with purpose, clarity, and aligned action. I call them Conversations of Consequence.

They're not motivational speeches. They're invitations to pause and remember what matters before the day starts making decisions for you.

{{personalNote}}

You can listen on Spotify, Apple Podcasts, or watch on YouTube. However you take them in, I hope they serve you.

{{conversationsLink}}

With gratitude,
Babs

---
Babs Carroll | Alignment Architect
Sacred Kaleidoscope Community
New episodes daily at 6am MT`,
        variables: ['firstName', 'personalNote', 'conversationsLink'],
        tone: 'invitational, humble, consistent'
    },
    
    // Follow-up Templates
    b2c_follow_up_value: {
        id: 'b2c_follow_up_value',
        name: 'Value-First Follow-up',
        path: 'b2c',
        category: 'Follow-up',
        subject: 'A thought I wanted to share',
        body: `Hi {{firstName}},

I know your inbox is full, so I'll keep this brief.

I was thinking about our conversation around {{topic}} and wanted to share something that might resonate:

{{valueSnippet}}

No agenda here—just wanted to pass it along in case it serves you today.

With respect for your time,
Babs`,
        variables: ['firstName', 'topic', 'valueSnippet'],
        tone: 'generous, no-pressure, brief'
    },
    
    b2c_follow_up_gentle: {
        id: 'b2c_follow_up_gentle',
        name: 'Gentle Check-in',
        path: 'b2c',
        category: 'Follow-up',
        subject: 'Still thinking about you',
        body: `Hi {{firstName}},

I wanted to circle back and see how you're doing.

Last we spoke, you were navigating {{context}}. I know that territory well, and I know it can feel heavy sometimes.

{{personalNote}}

If now isn't the right time for LifeCharter, I completely understand. Timing is everything, and forcing a fit helps no one.

But if you're still feeling that pull toward clarity and alignment, I'm here.

{{calendarLink}}

Either way, I'm holding space for your journey.

With care,
Babs`,
        variables: ['firstName', 'context', 'personalNote', 'calendarLink'],
        tone: 'compassionate, patient, honoring'
    },
    
    // Nurture Templates
    b2c_nurture_resource: {
        id: 'b2c_nurture_resource',
        name: 'Resource Share',
        path: 'b2c',
        category: 'Nurture',
        subject: 'This made me think of you',
        body: `Hi {{firstName}},

I came across something today that immediately made me think of you.

{{resourceDescription}}

{{resourceLink}}

{{personalNote}}

Hope it serves you in some small way.

Babs`,
        variables: ['firstName', 'resourceDescription', 'resourceLink', 'personalNote'],
        tone: 'thoughtful, generous, connected'
    },
    
    b2c_nurture_story: {
        id: 'b2c_nurture_story',
        name: 'Story/Insight Share',
        path: 'b2c',
        category: 'Nurture',
        subject: 'A moment of clarity',
        body: `Hi {{firstName}},

I wanted to share a brief story with you.

{{storyContent}}

{{personalNote}}

Thanks for being someone I can share these reflections with.

With gratitude,
Babs`,
        variables: ['firstName', 'storyContent', 'personalNote'],
        tone: 'personal, reflective, intimate'
    },
    
    // Conversion Templates
    b2c_conversion_circle: {
        id: 'b2c_conversion_circle',
        name: 'LifeCharter Circle Invitation',
        path: 'b2c',
        category: 'Conversion',
        subject: 'An invitation to go deeper',
        body: `Hi {{firstName}},

I've been watching your journey from a distance, and I want to extend a personal invitation.

LifeCharter Circle is opening for new members. This is the deeper container—the place where we don't just talk about alignment, we practice it together.

{{personalNote}}

In Circle, you'll find:
• Weekly live sessions with teaching and reflection
• A community of travel partners walking the same path
• Direct access to me for questions and guidance
• The structure and support to actually live your LifeCharter

This isn't for everyone. It requires commitment, honesty, and a willingness to be seen.

But if you're feeling called to stop navigating alone, I'd love to talk.

{{calendarLink}}

With respect and anticipation,
Babs

---
Babs Carroll | Alignment Architect
Sacred Kaleidoscope Community
LifeCharter Circle - Enrollment Open`,
        variables: ['firstName', 'personalNote', 'calendarLink'],
        tone: 'direct, honoring, invitational'
    },
    
    // Re-engagement Templates
    b2c_reengagement_we_miss_you: {
        id: 'b2c_reengagement_we_miss_you',
        name: 'We Miss You',
        path: 'b2c',
        category: 'Re-engagement',
        subject: 'Checking in with you',
        body: `Hi {{firstName}},

It's been a while since we connected, and I wanted to reach out.

Life moves fast. Priorities shift. Sometimes the things we intended to explore get pushed to "someday."

{{personalNote}}

I don't want to add to your noise. But I do want you to know that the door is still open if LifeCharter ever feels like the right next step.

No pressure. Just presence.

{{calendarLink}}

Wishing you clarity and peace,
Babs`,
        variables: ['firstName', 'personalNote', 'calendarLink'],
        tone: 'gentle, understanding, open'
    }
};

// ============================================
// EMAIL TEMPLATES - B2B PATH (Command Suite)
// For coaches, consultants, and professionals
// ============================================

const WINGS_OUT_TEMPLATES_B2B = {
    // Initial Outreach Templates
    b2b_initial_command_suite: {
        id: 'b2b_initial_command_suite',
        name: 'Command Suite Introduction',
        path: 'b2b',
        category: 'Initial Outreach',
        subject: 'A system for coaches who are done with the chaos',
        body: `Hi {{firstName}},

I've been following your work, and I can see you're building something meaningful.

I also know the behind-the-scenes reality: the scattered tools, the manual follow-ups, the feeling that your business is running you instead of the other way around.

I built something for coaches and consultants who are ready for a different way.

The LifeCharter Command Suite is a complete business operating system. Not another tool to juggle—a single, integrated platform that handles:

• Lead capture and nurturing (without the spreadsheet chaos)
• Client journey mapping (from first contact to raving fan)
• Content planning and execution (that actually gets done)
• Sales pipeline management (with follow-ups that don't fall through cracks)
• Team and AI coordination (so you're not doing it all alone)
• Revenue tracking (knowing exactly where you stand)

{{personalNote}}

If you're tired of duct-taping your business together and ready for something that actually works, I'd love to show you what's possible.

{{demoLink}}

With respect for your time and vision,
Babs

---
Babs Carroll | Creator, LifeCharter Command Suite
Sacred Kaleidoscope Community`,
        variables: ['firstName', 'personalNote', 'demoLink'],
        tone: 'empathetic, professional, solution-focused'
    },
    
    b2b_initial_referral_partner: {
        id: 'b2b_initial_referral_partner',
        name: 'Referral Partnership Opportunity',
        path: 'b2b',
        category: 'Initial Outreach',
        subject: 'A partnership that could serve both our audiences',
        body: `Hi {{firstName}},

I've been thinking about the overlap between your work with {{theirAudience}} and the transformation I guide people through with LifeCharter.

There's a natural fit here—your clients who are ready to go deeper, and my community who could benefit from what you offer.

{{personalNote}}

I'd love to explore what a referral partnership might look like. No pressure, just a conversation about how we might serve each other's people.

{{calendarLink}}

Looking forward to connecting,
Babs

---
Babs Carroll | Alignment Architect
Sacred Kaleidoscope Community`,
        variables: ['firstName', 'theirAudience', 'personalNote', 'calendarLink'],
        tone: 'collaborative, professional, open'
    },
    
    b2b_initial_speaking: {
        id: 'b2b_initial_speaking',
        name: 'Speaking Opportunity',
        path: 'b2b',
        category: 'Initial Outreach',
        subject: 'Speaking opportunity for your {{eventType}}',
        body: `Hi {{firstName}},

I'm reaching out because I believe I could bring significant value to your {{eventType}}.

I speak on:
• Living with purpose and clarity (not just productivity)
• Navigating major life transitions with grace
• Building a life that reflects who you actually are
• The intersection of spirituality and practical life design

{{personalNote}}

My approach is warm, grounded, and deeply practical. I don't do hype—I do truth, delivered with compassion.

I'd welcome the opportunity to discuss how I might serve your audience.

{{calendarLink}}

With gratitude,
Babs

---
Babs Carroll | Speaker, Author, Alignment Architect
Sacred Kaleidoscope Community`,
        variables: ['firstName', 'eventType', 'personalNote', 'calendarLink'],
        tone: 'professional, confident, service-oriented'
    },
    
    // Follow-up Templates
    b2b_follow_up_value: {
        id: 'b2b_follow_up_value',
        name: 'Value-First Business Follow-up',
        path: 'b2b',
        category: 'Follow-up',
        subject: 'A resource on {{topic}}',
        body: `Hi {{firstName}},

I came across this and immediately thought of you:

{{valueSnippet}}

{{resourceLink}}

{{personalNote}}

No ask here—just sharing something that might be useful as you grow {{theirBusiness}}.

Best,
Babs`,
        variables: ['firstName', 'topic', 'valueSnippet', 'resourceLink', 'personalNote', 'theirBusiness'],
        tone: 'generous, professional, no-pressure'
    },
    
    b2b_follow_up_gentle: {
        id: 'b2b_follow_up_gentle',
        name: 'Gentle Business Check-in',
        path: 'b2b',
        category: 'Follow-up',
        subject: 'Quick check-in',
        body: `Hi {{firstName}},

I know you're juggling a lot, so I'll keep this short.

When we spoke about {{previousTopic}}, you mentioned {{keyPoint}}. I wanted to circle back and see:

• Is that still a priority for you?
• Has anything shifted in your business?
• Is now a better or worse time to explore solutions?

{{personalNote}}

No pressure either way. I respect your time and your process.

{{calendarLink}}

Best,
Babs`,
        variables: ['firstName', 'previousTopic', 'keyPoint', 'personalNote', 'calendarLink'],
        tone: 'respectful, professional, patient'
    },
    
    // Nurture Templates
    b2b_nurture_insight: {
        id: 'b2b_nurture_insight',
        name: 'Business Insight Share',
        path: 'b2b',
        category: 'Nurture',
        subject: 'An observation about {{industry}}',
        body: `Hi {{firstName}},

I've been noticing something in the {{industry}} space that I wanted to share:

{{insightContent}}

{{personalNote}}

Curious to hear your perspective on this.

Best,
Babs`,
        variables: ['firstName', 'industry', 'insightContent', 'personalNote'],
        tone: 'thoughtful, professional, conversational'
    },
    
    b2b_nurture_case_study: {
        id: 'b2b_nurture_case_study',
        name: 'Case Study/Win Share',
        path: 'b2b',
        category: 'Nurture',
        subject: 'How {{coachName}} transformed their business',
        body: `Hi {{firstName}},

I wanted to share a quick win from one of your peers.

{{coachName}}, a {{coachType}}, was struggling with {{challenge}}. After implementing the Command Suite:

{{results}}

{{personalNote}}

I thought this might resonate with where you are in your business.

{{caseStudyLink}}

Best,
Babs`,
        variables: ['firstName', 'coachName', 'coachType', 'challenge', 'results', 'personalNote', 'caseStudyLink'],
        tone: 'inspirational, professional, relevant'
    },
    
    // Conversion Templates
    b2b_conversion_demo: {
        id: 'b2b_conversion_demo',
        name: 'Command Suite Demo Invitation',
        path: 'b2b',
        category: 'Conversion',
        subject: 'See the Command Suite in action',
        body: `Hi {{firstName}},

You've been on my mind.

I know you've been building {{theirBusiness}} with determination, and I respect that deeply. I also know the weight of doing it mostly alone, with tools that don't quite fit together.

The LifeCharter Command Suite was built specifically for coaches and consultants like you—people who have the vision and the heart, but are ready for systems that match their level of commitment.

{{personalNote}}

I'd love to show you what's possible. Not a sales pitch—a genuine walkthrough of how this could transform your day-to-day operations and free you up to do what you do best.

{{demoLink}}

The investment is significant, but so is the transformation. Let's see if it's the right fit.

With respect,
Babs

---
Babs Carroll | Creator, LifeCharter Command Suite
Sacred Kaleidoscope Community`,
        variables: ['firstName', 'theirBusiness', 'personalNote', 'demoLink'],
        tone: 'direct, respectful, professional'
    },
    
    b2b_conversion_partnership: {
        id: 'b2b_conversion_partnership',
        name: 'Partnership Deep Dive',
        path: 'b2b',
        category: 'Conversion',
        subject: "Let's make this partnership real",
        body: `Hi {{firstName}},

Our conversation about partnering has stayed with me. I think there's real potential here.

Here's what I'm envisioning:

{{partnershipProposal}}

{{personalNote}}

This feels aligned to me—two people serving similar audiences in complementary ways. But I want to hear your thoughts and make sure it works for you too.

{{calendarLink}}

Let's talk details.

Best,
Babs`,
        variables: ['firstName', 'partnershipProposal', 'personalNote', 'calendarLink'],
        tone: 'collaborative, professional, action-oriented'
    },
    
    // Re-engagement Templates
    b2b_reengagement_value: {
        id: 'b2b_reengagement_value',
        name: 'Professional Re-engagement',
        path: 'b2b',
        category: 'Re-engagement',
        subject: "Something new I thought you'd appreciate",
        body: `Hi {{firstName}},

It's been a while since we connected, and I didn't want to let the silence stretch any further without reaching out.

Since we last spoke, {{updateOnYourWork}}.

{{personalNote}}

If the timing wasn't right before, I completely understand. But if you're still navigating {{theirChallenge}} and looking for solutions, the door is open.

{{calendarLink}}

No pressure—just presence.

Best,
Babs`,
        variables: ['firstName', 'updateOnYourWork', 'personalNote', 'theirChallenge', 'calendarLink'],
        tone: 'professional, understanding, open'
    }
};
const WINGS_OUT_TEMPLATES_AFFILIATE = {
    // Initial Outreach Templates
    aff_initial_brand_partnership: {
        id: 'aff_initial_brand_partnership',
        name: 'Brand Partnership Introduction',
        path: 'aff',
        category: 'Initial Outreach',
        subject: 'A partnership that serves the disability community',
        body: `Hi {{firstName}},

I'm Babs Carroll, and I work with my service dog Beau to help companies better serve the disability community through authentic partnership and lived experience.

I've been following {{companyName}} and I'm impressed by {{specificObservation}}. I believe there's a meaningful opportunity for us to work together.

A bit about us:
• I'm a quadriplegic accessibility creator, author, and speaker
• Beau is my fully trained service dog and co-creator
• We reach {{audienceSize}} engaged followers across platforms
• Our community trusts our recommendations because we only partner with brands that genuinely serve them

{{personalNote}}

I'd love to explore what a partnership might look like—whether that's an ambassador relationship, affiliate program, content collaboration, or something we haven't thought of yet.

{{mediaKitLink}}

Would you be open to a conversation?

{{calendarLink}}

With respect and anticipation,
Babs & Beau 🦋🐕‍🦺

---
Babs Carroll | Accessibility Creator & Speaker
Beau | Service Dog & Co-Creator
Sacred Kaleidoscope Community`,
        variables: ['firstName', 'companyName', 'specificObservation', 'audienceSize', 'personalNote', 'mediaKitLink', 'calendarLink'],
        tone: 'professional, warm, confident'
    },
    
    aff_initial_ambassador_program: {
        id: 'aff_initial_ambassador_program',
        name: 'Ambassador Program Inquiry',
        path: 'aff',
        category: 'Initial Outreach',
        subject: 'Your ambassador program + my community = impact',
        body: `Hi {{firstName}},

I noticed {{companyName}} has an ambassador program, and I wanted to reach out because I think there could be a powerful fit.

My community—people living with disabilities, caregivers, and accessibility advocates—are actively looking for products and services that actually work for them. They're tired of being an afterthought.

{{personalNote}}

What I bring to the table:
• Authentic lived experience as a quadriplegic woman
• A service dog who is part of my brand and story
• Content that educates while it promotes
• A highly engaged, trust-based community
• Professional quality photos, videos, and written content

I'd love to learn more about your program and see if there's alignment.

{{calendarLink}}

Looking forward to connecting,
Babs & Beau

---
Babs Carroll | Accessibility Creator
Beau | Service Dog Extraordinaire
{{mediaKitLink}}`,
        variables: ['firstName', 'companyName', 'personalNote', 'calendarLink', 'mediaKitLink'],
        tone: 'professional, value-focused, warm'
    },
    
    aff_initial_product_collab: {
        id: 'aff_initial_product_collab',
        name: 'Product Collaboration Proposal',
        path: 'aff',
        category: 'Initial Outreach',
        subject: 'Making {{productName}} work for quadriplegic users',
        body: `Hi {{firstName}},

I've been using {{productName}} and I see both what's working and what could be better for users like me—quadriplegic individuals who need accessibility built in, not bolted on.

{{personalNote}}

I'd love to collaborate with {{companyName}} to:
• Create content showing how the product works for wheelchair users
• Provide feedback on accessibility features
• Share with my community of {{audienceSize}} disability-focused followers
• Potentially consult on future accessibility improvements

This isn't just about promotion—it's about making sure your product actually serves the people who need it most.

{{calendarLink}}

Let's talk about what this could look like.

Best,
Babs & Beau

---
Babs Carroll | Quadriplegic Creator & Accessibility Consultant
Beau | Service Dog & Product Tester 🐕‍🦺`,
        variables: ['firstName', 'companyName', 'productName', 'personalNote', 'audienceSize', 'calendarLink'],
        tone: 'direct, solution-oriented, collaborative'
    },
    
    aff_initial_speaking_opportunity: {
        id: 'aff_initial_speaking_opportunity',
        name: 'Speaking/Event Collaboration',
        path: 'aff',
        category: 'Initial Outreach',
        subject: 'Speaking on accessibility at {{eventName}}',
        body: `Hi {{firstName}},

I'm reaching out about {{eventName}}. I believe I could bring a unique and valuable perspective to your audience.

I speak on:
• Living with purpose and spinal cord injury
• The service dog-human partnership
• Accessibility as a business imperative, not an afterthought
• Building a meaningful life within limitations
• The intersection of spirituality and disability

{{personalNote}}

My presentations are warm, honest, and deeply practical. I don't do inspiration porn—I do truth, delivered with humor and grace. And Beau usually steals the show. 🐕‍🦺

{{calendarLink}}

I'd welcome the opportunity to discuss how I might serve your audience.

With gratitude,
Babs & Beau

---
Babs Carroll | Speaker, Author, Accessibility Creator
Beau | Scene-Stealing Service Dog
{{mediaKitLink}}`,
        variables: ['firstName', 'eventName', 'personalNote', 'calendarLink', 'mediaKitLink'],
        tone: 'professional, confident, warm'
    },
    
    // Follow-up Templates
    aff_follow_up_value: {
        id: 'aff_follow_up_value',
        name: 'Value-First Partnership Follow-up',
        path: 'aff',
        category: 'Follow-up',
        subject: 'A resource on accessibility marketing',
        body: `Hi {{firstName}},

I came across this and immediately thought of {{companyName}}:

{{valueSnippet}}

{{resourceLink}}

{{personalNote}}

No ask here—just sharing something that might be useful as you think about reaching the disability community.

Best,
Babs & Beau`,
        variables: ['firstName', 'companyName', 'valueSnippet', 'resourceLink', 'personalNote'],
        tone: 'generous, professional, no-pressure'
    },
    
    aff_follow_up_gentle: {
        id: 'aff_follow_up_gentle',
        name: 'Gentle Partnership Check-in',
        path: 'aff',
        category: 'Follow-up',
        subject: 'Following up on partnership possibilities',
        body: `Hi {{firstName}},

I wanted to circle back on our conversation about partnering.

I know these decisions take time, and I respect that. I also know that budgets, priorities, and timelines shift.

{{personalNote}}

If now isn't the right time, I completely understand. But if you're still exploring how {{companyName}} might work with accessibility creators like me, I'm here.

{{calendarLink}}

No pressure either way.

Best,
Babs & Beau`,
        variables: ['firstName', 'companyName', 'personalNote', 'calendarLink'],
        tone: 'respectful, patient, professional'
    },
    
    // Nurture Templates
    aff_nurture_insight: {
        id: 'aff_nurture_insight',
        name: 'Accessibility Insight Share',
        path: 'aff',
        category: 'Nurture',
        subject: 'An observation about {{industry}} and accessibility',
        body: `Hi {{firstName}},

I've been noticing something in the {{industry}} space that I wanted to share:

{{insightContent}}

{{personalNote}}

Companies that get ahead of this are going to win. The disability community has $13 trillion in spending power globally, and we're loyal to brands that actually serve us.

Curious to hear your thoughts.

Best,
Babs & Beau`,
        variables: ['firstName', 'industry', 'insightContent', 'personalNote'],
        tone: 'thoughtful, professional, strategic'
    },
    
    aff_nurture_case_study: {
        id: 'aff_nurture_case_study',
        name: 'Partnership Win/Case Study',
        path: 'aff',
        category: 'Nurture',
        subject: 'How {{brandName}} reached the disability community',
        body: `Hi {{firstName}},

I wanted to share a quick win from one of your peers.

{{brandName}} partnered with me to {{collaborationType}}. The results:

{{results}}

{{personalNote}}

I thought this might be relevant to {{companyName}}'s goals around {{relevantGoal}}.

{{caseStudyLink}}

Happy to discuss how we might create similar results together.

Best,
Babs & Beau`,
        variables: ['firstName', 'brandName', 'collaborationType', 'results', 'personalNote', 'companyName', 'relevantGoal', 'caseStudyLink'],
        tone: 'results-focused, professional, relevant'
    },
    
    // Conversion Templates
    aff_conversion_partnership_proposal: {
        id: 'aff_conversion_partnership_proposal',
        name: 'Partnership Proposal',
        path: 'aff',
        category: 'Conversion',
        subject: "Let's make this partnership happen",
        body: `Hi {{firstName}},

Our conversations have stayed with me, and I want to move this forward.

Here's what I'm proposing:

{{partnershipProposal}}

{{personalNote}}

What I need from you:
• {{ask1}}
• {{ask2}}
• {{ask3}}

What you get:
• {{benefit1}}
• {{benefit2}}
• {{benefit3}}

This feels aligned to me—a genuine partnership that serves your business goals while authentically serving the disability community.

{{calendarLink}}

Let's talk details and make this real.

With excitement,
Babs & Beau

---
Babs Carroll | Accessibility Creator
Beau | Service Dog & Partner
{{mediaKitLink}}`,
        variables: ['firstName', 'partnershipProposal', 'personalNote', 'ask1', 'ask2', 'ask3', 'benefit1', 'benefit2', 'benefit3', 'calendarLink', 'mediaKitLink'],
        tone: 'direct, professional, action-oriented'
    },
    
    aff_conversion_contract_ready: {
        id: 'aff_conversion_contract_ready',
        name: 'Contract/Agreement Ready',
        path: 'aff',
        category: 'Conversion',
        subject: 'Partnership agreement ready for review',
        body: `Hi {{firstName}},

Great news—I've prepared the partnership agreement for {{companyName}}.

{{personalNote}}

The agreement covers:
• {{term1}}
• {{term2}}
• {{term3}}
• {{term4}}

I've structured this to protect both of us and set clear expectations. I'm happy to discuss any adjustments that make sense.

{{contractLink}}

Once we finalize this, we can kick off with {{firstDeliverable}}.

{{calendarLink}}

Looking forward to making this official!

Best,
Babs & Beau

---
Babs Carroll
Beau 🐕‍🦺`,
        variables: ['firstName', 'companyName', 'personalNote', 'term1', 'term2', 'term3', 'term4', 'contractLink', 'firstDeliverable', 'calendarLink'],
        tone: 'professional, clear, enthusiastic'
    },
    
    // Re-engagement Templates
    aff_reengagement_new_opportunity: {
        id: 'aff_reengagement_new_opportunity',
        name: 'New Partnership Opportunity',
        path: 'aff',
        category: 'Re-engagement',
        subject: 'A new way we could work together',
        body: `Hi {{firstName}},

It's been a while since we connected, and I wanted to reach out with something new.

Since we last spoke, {{updateOnWork}}.

{{personalNote}}

I have a new partnership model that might be a better fit for {{companyName}}:

{{newOpportunity}}

If the timing wasn't right before, I understand. But if you're still interested in reaching the disability community, I'd love to reconnect.

{{calendarLink}}

No pressure—just presence.

Best,
Babs & Beau`,
        variables: ['firstName', 'updateOnWork', 'personalNote', 'companyName', 'newOpportunity', 'calendarLink'],
        tone: 'professional, understanding, fresh'
    },
    
    aff_reengagement_we_miss_you: {
        id: 'aff_reengagement_we_miss_you',
        name: 'Partnership Re-engagement',
        path: 'aff',
        category: 'Re-engagement',
        subject: 'Checking in',
        body: `Hi {{firstName}},

It's been a while, and I didn't want to let too much time pass without reaching out.

{{personalNote}}

The door remains open if {{companyName}} ever wants to explore partnership with the disability community. I'm here, Beau's here, and our community is growing.

{{calendarLink}}

Wishing you and {{companyName}} continued success.

Best,
Babs & Beau`,
        variables: ['firstName', 'personalNote', 'companyName', 'calendarLink'],
        tone: 'gentle, professional, open'
    }
};

// Combined templates object
const WINGS_OUT_TEMPLATES = {
    ...WINGS_OUT_TEMPLATES_B2C,
    ...WINGS_OUT_TEMPLATES_B2B,
    ...WINGS_OUT_TEMPLATES_AFFILIATE
};

// ============================================
// OUTREACH QUEUE MANAGER
// ============================================

class WingsOutQueue {
    constructor() {
        this.queue = this.loadFromStorage();
        this.sentToday = this.getSentToday();
    }
    
    loadFromStorage() {
        const saved = localStorage.getItem('wings_out_queue');
        return saved ? JSON.parse(saved) : [];
    }
    
    saveToStorage() {
        localStorage.setItem('wings_out_queue', JSON.stringify(this.queue));
    }
    
    getSentToday() {
        const today = new Date().toDateString();
        return this.queue.filter(item => {
            if (item.status !== WINGS_OUT_CONFIG.statuses.SENT) return false;
            if (!item.sentAt) return false;
            return new Date(item.sentAt).toDateString() === today;
        }).length;
    }
    
    addToQueue(lead, templateId, priority = 'normal', scheduledFor = null) {
        const template = WINGS_OUT_TEMPLATES[templateId];
        if (!template) {
            console.error('Template not found:', templateId);
            return null;
        }
        
        const item = {
            id: 'wings_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            leadId: lead.id,
            leadName: `${lead.firstName} ${lead.lastName}`,
            leadEmail: lead.email,
            templateId: templateId,
            templateName: template.name,
            path: template.path, // 'b2b' or 'b2c'
            subject: template.subject,
            status: scheduledFor ? WINGS_OUT_CONFIG.statuses.SCHEDULED : WINGS_OUT_CONFIG.statuses.PENDING,
            priority: priority,
            createdAt: new Date().toISOString(),
            scheduledFor: scheduledFor,
            sentAt: null,
            openedAt: null,
            repliedAt: null,
            variables: {},
            notes: ''
        };
        
        this.queue.push(item);
        this.saveToStorage();
        
        return item;
    }
    
    getTodaysQueue(pathFilter = null) {
        const today = new Date().toDateString();
        return this.queue
            .filter(item => {
                // Filter by path if specified
                if (pathFilter && item.path !== pathFilter) return false;
                
                if (item.status === WINGS_OUT_CONFIG.statuses.PENDING) return true;
                if (item.status === WINGS_OUT_CONFIG.statuses.SCHEDULED && item.scheduledFor) {
                    return new Date(item.scheduledFor).toDateString() === today;
                }
                return false;
            })
            .sort((a, b) => {
                const priorityOrder = { high: 0, normal: 1, low: 2 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            });
    }
    
    getPendingFollowUps(pathFilter = null) {
        const now = new Date();
        return this.queue.filter(item => {
            // Filter by path if specified
            if (pathFilter && item.path !== pathFilter) return false;
            
            if (item.status !== WINGS_OUT_CONFIG.statuses.SENT) return false;
            if (!item.sentAt) return false;
            
            const daysSinceSent = Math.floor((now - new Date(item.sentAt)) / (1000 * 60 * 60 * 24));
            const followUpDays = WINGS_OUT_CONFIG.followUpSchedule;
            
            // Check if it's time for a follow-up
            const shouldFollowUp = followUpDays.some(days => daysSinceSent >= days && daysSinceSent < days + 2);
            
            // Check if we already have a pending follow-up for this lead
            const hasPendingFollowUp = this.queue.some(q => 
                q.leadId === item.leadId && 
                q.status === WINGS_OUT_CONFIG.statuses.PENDING &&
                q.createdAt > item.sentAt
            );
            
            return shouldFollowUp && !hasPendingFollowUp && !item.repliedAt;
        });
    }
    
    getStatsByPath(path) {
        const pathItems = this.queue.filter(q => q.path === path);
        const today = new Date().toDateString();
        const thisWeek = new Date();
        thisWeek.setDate(thisWeek.getDate() - 7);
        const thisMonth = new Date();
        thisMonth.setMonth(thisMonth.getMonth() - 1);
        
        const sent = pathItems.filter(q => q.status === WINGS_OUT_CONFIG.statuses.SENT);
        const opened = pathItems.filter(q => q.status === WINGS_OUT_CONFIG.statuses.OPENED || q.status === WINGS_OUT_CONFIG.statuses.REPLIED || q.status === WINGS_OUT_CONFIG.statuses.CONVERTED);
        const replied = pathItems.filter(q => q.status === WINGS_OUT_CONFIG.statuses.REPLIED || q.status === WINGS_OUT_CONFIG.statuses.CONVERTED);
        const converted = pathItems.filter(q => q.status === WINGS_OUT_CONFIG.statuses.CONVERTED);
        
        return {
            path: path,
            sentToday: sent.filter(q => new Date(q.sentAt).toDateString() === today).length,
            sentThisWeek: sent.filter(q => new Date(q.sentAt) >= thisWeek).length,
            sentThisMonth: sent.filter(q => new Date(q.sentAt) >= thisMonth).length,
            totalSent: sent.length,
            totalPending: pathItems.filter(q => q.status === WINGS_OUT_CONFIG.statuses.PENDING).length,
            totalScheduled: pathItems.filter(q => q.status === WINGS_OUT_CONFIG.statuses.SCHEDULED).length,
            openRate: sent.length > 0 ? Math.round((opened.length / sent.length) * 100) : 0,
            replyRate: sent.length > 0 ? Math.round((replied.length / sent.length) * 100) : 0,
            conversionRate: sent.length > 0 ? Math.round((converted.length / sent.length) * 100) : 0,
            remainingToday: Math.max(0, WINGS_OUT_CONFIG.maxDailyEmails - this.sentToday)
        };
    }
    
    markAsSent(itemId) {
        const item = this.queue.find(q => q.id === itemId);
        if (item) {
            item.status = WINGS_OUT_CONFIG.statuses.SENT;
            item.sentAt = new Date().toISOString();
            this.saveToStorage();
            this.sentToday = this.getSentToday();
        }
    }
    
    markAsOpened(itemId) {
        const item = this.queue.find(q => q.id === itemId);
        if (item && !item.openedAt) {
            item.status = WINGS_OUT_CONFIG.statuses.OPENED;
            item.openedAt = new Date().toISOString();
            this.saveToStorage();
        }
    }
    
    markAsReplied(itemId) {
        const item = this.queue.find(q => q.id === itemId);
        if (item) {
            item.status = WINGS_OUT_CONFIG.statuses.REPLIED;
            item.repliedAt = new Date().toISOString();
            this.saveToStorage();
        }
    }
    
    markAsConverted(itemId) {
        const item = this.queue.find(q => q.id === itemId);
        if (item) {
            item.status = WINGS_OUT_CONFIG.statuses.CONVERTED;
            item.convertedAt = new Date().toISOString();
            this.saveToStorage();
        }
    }
    
    skipItem(itemId) {
        const index = this.queue.findIndex(q => q.id === itemId);
        if (index > -1) {
            this.queue.splice(index, 1);
            this.saveToStorage();
        }
    }
    
    getAllStats() {
        return {
            b2b: this.getStatsByPath('b2b'),
            b2c: this.getStatsByPath('b2c'),
            aff: this.getStatsByPath('aff'),
            combined: {
                sentToday: this.getSentToday(),
                totalPending: this.queue.filter(q => q.status === WINGS_OUT_CONFIG.statuses.PENDING).length,
                remainingToday: Math.max(0, WINGS_OUT_CONFIG.maxDailyEmails - this.sentToday)
            }
        };
    }
}

// ============================================
// PERSONALIZATION ENGINE
// ============================================

class WingsOutPersonalizer {
    static personalize(template, lead, customVars = {}) {
        let content = template.body;
        let subject = template.subject;
        
        // Standard variables
        const vars = {
            firstName: lead.firstName || 'there',
            lastName: lead.lastName || '',
            fullName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
            company: lead.company || '',
            theirBusiness: lead.company || lead.businessName || 'your business',
            theirAudience: lead.targetAudience || 'your clients',
            industry: lead.industry || 'coaching',
            calendarLink: WINGS_OUT_CONFIG.calendarLink,
            demoLink: WINGS_OUT_CONFIG.links.commandSuiteDemo,
            alignmentLink: WINGS_OUT_CONFIG.links.alignmentSnapshot,
            incubatorLink: WINGS_OUT_CONFIG.links.incubator,
            circleLink: WINGS_OUT_CONFIG.links.circle,
            conversationsLink: WINGS_OUT_CONFIG.links.conversations,
            ...customVars
        };
        
        // Replace all variables
        Object.keys(vars).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            content = content.replace(regex, vars[key] || '');
            subject = subject.replace(regex, vars[key] || '');
        });
        
        return { subject, body: content };
    }
    
    static generatePersonalNote(lead, path) {
        // Generate contextual personal notes based on lead data and path
        const notes = [];
        
        if (path === 'b2b') {
            // B2B specific notes
            if (lead.company) {
                notes.push(`I admire what you're building at ${lead.company}.`);
            }
            if (lead.specialty) {
                notes.push(`Your work with ${lead.specialty} really resonates with my approach.`);
            }
            if (lead.painPoints && lead.painPoints.includes('systems')) {
                notes.push('I know the challenge of trying to grow without the right infrastructure in place.');
            }
        } else {
            // B2C specific notes
            if (lead.source) {
                notes.push(`I noticed you found us through ${lead.source}.`);
            }
            if (lead.interests && lead.interests.length > 0) {
                notes.push(`Your interest in ${lead.interests[0]} really stood out to me.`);
            }
        }
        
        if (lead.lastInteraction) {
            const days = Math.floor((new Date() - new Date(lead.lastInteraction)) / (1000 * 60 * 60 * 24));
            if (days < 7) {
                notes.push('It was wonderful connecting with you recently.');
            }
        }
        
        return notes.length > 0 ? notes.join(' ') : '';
    }
}

// ============================================
// ANALYTICS DASHBOARD
// ============================================

class WingsOutAnalytics {
    constructor(queue) {
        this.queue = queue;
    }
    
    getDashboardData(pathFilter = null) {
        const stats = pathFilter ? this.queue.getStatsByPath(pathFilter) : this.queue.getAllStats();
        const timeline = this.getTimelineData(30, pathFilter);
        const templatePerformance = this.getTemplatePerformance(pathFilter);
        
        return {
            stats,
            timeline,
            templatePerformance
        };
    }
    
    getTemplatePerformance(pathFilter = null) {
        const templateStats = {};
        
        this.queue.queue.forEach(item => {
            if (pathFilter && item.path !== pathFilter) return;
            
            if (!templateStats[item.templateId]) {
                templateStats[item.templateId] = {
                    templateId: item.templateId,
                    sent: 0,
                    opened: 0,
                    replied: 0
                };
            }
            
            templateStats[item.templateId].sent++;
            if (item.openedAt) templateStats[item.templateId].opened++;
            if (item.repliedAt) templateStats[item.templateId].replied++;
        });
        
        return Object.values(templateStats).map(t => ({
            ...t,
            openRate: t.sent > 0 ? Math.round((t.opened / t.sent) * 100) : 0,
            replyRate: t.sent > 0 ? Math.round((t.replied / t.sent) * 100) : 0
        }));
    }
}

// ============================================
// MAIN DASHBOARD - WITH B2B/B2C TABS
// ============================================

let currentOutreachPath = 'b2c'; // Default to B2C (LifeCharter)

function getPathConfig(path) {
    const configs = {
        b2c: {
            label: 'LifeCharter',
            icon: '🦋',
            description: 'Reach individuals seeking transformation through LifeCharter',
            intention: 'Every outreach is an invitation to remember who they are.',
            color: 'var(--royal-plum)'
        },
        b2b: {
            label: 'Command Suite',
            icon: '💼',
            description: 'Reach coaches and professionals who need the Command Suite',
            intention: 'Every outreach is an invitation to build something together.',
            color: 'var(--sacred-teal)'
        },
        aff: {
            label: 'Partnerships',
            icon: '🐕‍🦺',
            description: 'Reach brands and companies for Babs & Beau partnerships',
            intention: 'Every outreach is an invitation to serve the disability community together.',
            color: '#D4AF63'
        }
    };
    return configs[path] || configs.b2c;
}

function showWingsOutOutreach(path = null) {
    if (path) currentOutreachPath = path;
    setActiveNav('growth-outreach');
    
    // Initialize queue
    if (!window.wingsOutQueue) {
        window.wingsOutQueue = new WingsOutQueue();
    }
    
    const queue = window.wingsOutQueue;
    const allStats = queue.getAllStats();
    const currentStats = allStats[currentOutreachPath] || allStats.b2c;
    const todaysQueue = queue.getTodaysQueue(currentOutreachPath);
    
    const pathConfig = getPathConfig(currentOutreachPath);
    const pathLabel = pathConfig.label;
    const pathIcon = pathConfig.icon;
    const pathDescription = pathConfig.description;
    
    const html = `
        <div class="welcome-section">
            <h1 class="welcome-title">${pathIcon} Outreach</h1>
            <p class="welcome-subtitle">${pathDescription}</p>
        </div>

        <!-- Triple Path Selector -->
        <div style="background: rgba(31, 49, 91, 0.3); border: 1px solid rgba(212, 175, 99, 0.15); border-radius: 16px; padding: 8px; margin-bottom: 30px; display: flex; gap: 8px;">
            <button onclick="showWingsOutOutreach('b2c')" style="flex: 1; padding: 12px 16px; border-radius: 12px; border: none; background: ${currentOutreachPath === 'b2c' ? 'linear-gradient(135deg, var(--royal-plum), var(--deep-indigo))' : 'transparent'}; color: ${currentOutreachPath === 'b2c' ? 'white' : 'rgba(246, 241, 232, 0.7)'}; font-weight: 600; cursor: pointer; transition: all 0.3s; font-size: 13px;">
                🦋 LifeCharter
            </button>
            <button onclick="showWingsOutOutreach('b2b')" style="flex: 1; padding: 12px 16px; border-radius: 12px; border: none; background: ${currentOutreachPath === 'b2b' ? 'linear-gradient(135deg, var(--sacred-teal), var(--deep-indigo))' : 'transparent'}; color: ${currentOutreachPath === 'b2b' ? 'white' : 'rgba(246, 241, 232, 0.7)'}; font-weight: 600; cursor: pointer; transition: all 0.3s; font-size: 13px;">
                💼 Command Suite
            </button>
            <button onclick="showWingsOutOutreach('aff')" style="flex: 1; padding: 12px 16px; border-radius: 12px; border: none; background: ${currentOutreachPath === 'aff' ? 'linear-gradient(135deg, #D4AF63, var(--deep-indigo))' : 'transparent'}; color: ${currentOutreachPath === 'aff' ? 'white' : 'rgba(246, 241, 232, 0.7)'}; font-weight: 600; cursor: pointer; transition: all 0.3s; font-size: 13px;">
                🐕‍🦺 Partnerships
            </button>
        </div>

        <!-- Daily Intention Card -->
        <div style="background: linear-gradient(135deg, rgba(94, 59, 108, 0.4) 0%, rgba(31, 49, 91, 0.4) 100%); border: 1px solid rgba(212, 175, 99, 0.3); border-radius: 20px; padding: 30px; margin-bottom: 40px;">
            <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                <div style="font-size: 48px;">${pathIcon}</div>
                <div style="flex: 1;">
                    <h3 style="font-family: 'Cormorant Garamond', serif; font-size: 24px; color: var(--warm-gold); margin-bottom: 8px;">Today's Intention: ${pathLabel}</h3>
                    <p style="color: rgba(246, 241, 232, 0.8); margin: 0; font-style: italic;">${pathConfig.intention}</p>
                </div>
                <div style="text-align: center; padding: 16px 24px; background: rgba(31, 49, 91, 0.5); border-radius: 12px;">
                    <div style="font-size: 32px; font-weight: 700; color: var(--warm-gold);">${currentStats.remainingToday}</div>
                    <div style="font-size: 12px; color: rgba(246, 241, 232, 0.6); text-transform: uppercase; letter-spacing: 1px;">Remaining Today</div>
                </div>
            </div>
        </div>

        <!-- Stats Overview -->
        <div class="progress-overview" style="grid-template-columns: repeat(6, 1fr);">
            <div class="progress-card">
                <div class="progress-number">${currentStats.sentToday}</div>
                <div class="progress-label">Sent Today</div>
            </div>
            <div class="progress-card">
                <div class="progress-number">${currentStats.totalPending}</div>
                <div class="progress-label">In Queue</div>
            </div>
            <div class="progress-card">
                <div class="progress-number">${currentStats.openRate}%</div>
                <div class="progress-label">Open Rate</div>
            </div>
            <div class="progress-card">
                <div class="progress-number">${currentStats.replyRate}%</div>
                <div class="progress-label">Reply Rate</div>
            </div>
            <div class="progress-card">
                <div class="progress-number">${currentStats.conversionRate}%</div>
                <div class="progress-label">Conversion</div>
            </div>
            <div class="progress-card">
                <div class="progress-number">${currentStats.totalSent}</div>
                <div class="progress-label">Total Sent</div>
            </div>
        </div>

        <!-- Quick Actions -->
        <div style="display: flex; gap: 16px; margin-bottom: 40px; flex-wrap: wrap;">
            <button class="btn btn-primary" onclick="generateWingsOutQueue('${currentOutreachPath}')" style="display: flex; align-items: center; gap: 10px;">
                <span>🎯</span>
                <span>Generate ${pathLabel} Queue</span>
            </button>
            <button class="btn btn-secondary" onclick="processWingsOutFollowUps('${currentOutreachPath}')" style="display: flex; align-items: center; gap: 10px;">
                <span>🔄</span>
                <span>Process Follow-ups</span>
            </button>
            <button class="btn btn-secondary" onclick="showWingsOutComposer('${currentOutreachPath}')" style="display: flex; align-items: center; gap: 10px;">
                <span>✉️</span>
                <span>Compose One-Off</span>
            </button>
            <button class="btn btn-secondary" onclick="showWingsOutTemplates('${currentOutreachPath}')" style="display: flex; align-items: center; gap: 10px;">
                <span>📚</span>
                <span>Templates</span>
            </button>
            <button class="btn btn-secondary" onclick="showWingsOutQueueManager('${currentOutreachPath}')" style="display: flex; align-items: center; gap: 10px;">
                <span>📋</span>
                <span>Manage Queue</span>
            </button>
            <button class="btn btn-secondary" onclick="showWingsOutAnalytics('${currentOutreachPath}')" style="display: flex; align-items: center; gap: 10px;">
                <span>📊</span>
                <span>Analytics</span>
            </button>
        </div>

        <!-- Today's Queue -->
        <div class="section-header" style="margin-bottom: 20px;">
            <h2 class="section-title">Today's ${pathLabel} Queue (${todaysQueue.length})</h2>
        </div>
        
        <div style="background: rgba(31, 49, 91, 0.3); border: 1px solid rgba(212, 175, 99, 0.15); border-radius: 20px; padding: 24px; margin-bottom: 40px;">
            ${todaysQueue.length === 0 ? `
                <div style="text-align: center; padding: 60px 40px;">
                    <div style="font-size: 64px; margin-bottom: 24px;">📭</div>
                    <h3 style="font-family: 'Cormorant Garamond', serif; font-size: 28px; color: var(--warm-gold); margin-bottom: 12px;">No ${pathLabel} outreach scheduled for today</h3>
                    <p style="color: rgba(246, 241, 232, 0.7); margin-bottom: 30px;">Generate a daily queue from your ${currentOutreachPath === 'b2b' ? 'prospects' : 'leads'} to begin reaching out with intention.</p>
                    <button class="btn btn-primary" onclick="generateWingsOutQueue('${currentOutreachPath}')">Generate ${pathLabel} Queue →</button>
                </div>
            ` : `
                <div style="display: grid; gap: 12px;">
                    ${todaysQueue.slice(0, 10).map(item => `
                        <div style="display: flex; align-items: center; gap: 16px; padding: 16px; background: rgba(246, 241, 232, 0.05); border-radius: 12px; border: 1px solid rgba(212, 175, 99, 0.1);">
                            <div style="width: 12px; height: 12px; border-radius: 50%; background: ${item.priority === 'high' ? '#e74c3c' : item.priority === 'normal' ? '#f39c12' : '#95a5a6'}; box-shadow: 0 0 8px ${item.priority === 'high' ? 'rgba(231, 76, 60, 0.5)' : item.priority === 'normal' ? 'rgba(243, 156, 18, 0.5)' : 'rgba(149, 165, 166, 0.5)'};"></div>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: var(--ivory-light);">${item.leadName}</div>
                                <div style="font-size: 13px; color: rgba(246, 241, 232, 0.6);">${item.leadEmail}</div>
                                <div style="font-size: 12px; color: var(--warm-gold); margin-top: 4px;">${item.templateName}</div>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button class="btn btn-secondary" style="font-size: 12px; padding: 6px 12px;" onclick="previewWingsOutEmail('${item.id}')">Preview</button>
                                <button class="btn btn-primary" style="font-size: 12px; padding: 6px 12px;" onclick="sendWingsOutEmail('${item.id}')">Send</button>
                                <button class="btn btn-secondary" style="font-size: 12px; padding: 6px 12px;" onclick="skipWingsOutEmail('${item.id}')">Skip</button>
                            </div>
                        </div>
                    `).join('')}
                    ${todaysQueue.length > 10 ? `
                        <div style="text-align: center; padding: 16px; color: rgba(246, 241, 232, 0.6);">
                            And ${todaysQueue.length - 10} more in queue...
                        </div>
                    ` : ''}
                </div>
            `}
        </div>

        <!-- Template Library Preview -->
        <div class="section-header" style="margin-bottom: 20px;">
            <h2 class="section-title">${pathLabel} Templates by Category</h2>
        </div>
        
        <div class="workspace-grid" style="margin-bottom: 40px;">
            ${renderTemplateCategoryCards(currentOutreachPath)}
        </div>

        <!-- Sacred Outreach Principles -->
        <div style="background: rgba(31, 49, 91, 0.3); border: 1px solid rgba(212, 175, 99, 0.15); border-radius: 20px; padding: 40px;">
            <h3 style="font-family: 'Cormorant Garamond', serif; font-size: 24px; color: var(--warm-gold); margin-bottom: 24px; text-align: center;">Sacred Outreach Principles</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px;">
                <div style="text-align: center; padding: 24px;">
                    <div style="font-size: 32px; margin-bottom: 12px;">💜</div>
                    <h4 style="color: var(--ivory-light); margin-bottom: 8px;">Service Over Sales</h4>
                    <p style="color: rgba(246, 241, 232, 0.6); font-size: 14px;">Every outreach is an act of service. We're inviting, not convincing.</p>
                </div>
                <div style="text-align: center; padding: 24px;">
                    <div style="font-size: 32px; margin-bottom: 12px;">🦋</div>
                    <h4 style="color: var(--ivory-light); margin-bottom: 8px;">Aligned Timing</h4>
                    <p style="color: rgba(246, 241, 232, 0.6); font-size: 14px;">We respect where people are. No pressure, only invitations.</p>
                </div>
                <div style="text-align: center; padding: 24px;">
                    <div style="font-size: 32px; margin-bottom: 12px;">✨</div>
                    <h4 style="color: var(--ivory-light); margin-bottom: 8px;">Personal Presence</h4>
                    <p style="color: rgba(246, 241, 232, 0.6); font-size: 14px;">Every email carries your voice—warm, grounded, spiritually spacious.</p>
                </div>
                <div style="text-align: center; padding: 24px;">
                    <div style="font-size: 32px; margin-bottom: 12px;">🌟</div>
                    <h4 style="color: var(--ivory-light); margin-bottom: 8px;">Truth Over Tactics</h4>
                    <p style="color: rgba(246, 241, 232, 0.6); font-size: 14px;">No manipulation, no false urgency. Just honest, compassionate communication.</p>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = html;
}

// Helper function to render template category cards
function renderTemplateCategoryCards(path) {
    const templates = Object.values(WINGS_OUT_TEMPLATES).filter(t => t.path === path);
    const categories = [...new Set(templates.map(t => t.category))];
    
    const categoryIcons = {
        'Initial Outreach': '🌟',
        'Follow-up': '🔄',
        'Nurture': '🌱',
        'Conversion': '💎',
        'Re-engagement': '💫'
    };
    
    return categories.map(category => {
        const categoryTemplates = templates.filter(t => t.category === category);
        return `
            <div class="workspace-card" style="cursor: pointer;" onclick="showWingsOutTemplates('${path}', '${category}')">
                <div class="card-header">
                    <div class="card-icon" style="font-size: 28px;">${categoryIcons[category] || '📧'}</div>
                    <span class="card-status status-locked">${categoryTemplates.length} templates</span>
                </div>
                <h3 class="card-title">${category}</h3>
                <p class="card-description">${getCategoryDescription(category)}</p>
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(212, 175, 99, 0.1);">
                    ${categoryTemplates.slice(0, 3).map(t => `
                        <div style="font-size: 12px; color: rgba(246, 241, 232, 0.6); margin-bottom: 4px;">• ${t.name}</div>
                    `).join('')}
                    ${categoryTemplates.length > 3 ? `<div style="font-size: 11px; color: var(--warm-gold);">+${categoryTemplates.length - 3} more</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function getCategoryDescription(category) {
    const descriptions = {
        'Initial Outreach': 'First contact and introduction templates',
        'Follow-up': 'Gentle continuation and check-ins',
        'Nurture': 'Relationship building and value sharing',
        'Conversion': 'Invitation to deepen the relationship',
        'Re-engagement': 'Reconnecting with dormant contacts'
    };
    return descriptions[category] || 'Email templates';
}

// ============================================
// QUEUE GENERATION
// ============================================

function generateWingsOutQueue(path) {
    const queue = window.wingsOutQueue || new WingsOutQueue();
    
    // Get leads from salesCommandState or localStorage
    const leads = salesCommandState.leads || JSON.parse(localStorage.getItem('lccs_leads') || '[]');
    
    // Filter leads by path (if they have a path designation)
    const pathLeads = leads.filter(lead => {
        if (!lead.outreachPath) return path === 'b2c'; // Default to B2C if not specified
        return lead.outreachPath === path;
    });
    
    if (pathLeads.length === 0) {
        showNotification(`No ${path.toUpperCase()} leads found. Add leads with outreach path set to "${path}".`, 'warning');
        return;
    }
    
    // Filter leads that need outreach
    const leadsNeedingOutreach = pathLeads.filter(lead => {
        const hasPending = queue.queue.some(q => 
            q.leadId === lead.id && 
            (q.status === WINGS_OUT_CONFIG.statuses.PENDING || q.status === WINGS_OUT_CONFIG.statuses.SCHEDULED)
        );
        return !hasPending;
    });
    
    if (leadsNeedingOutreach.length === 0) {
        showNotification('All leads already have outreach scheduled!', 'info');
        return;
    }
    
    // Generate queue items
    let added = 0;
    const maxToAdd = Math.min(leadsNeedingOutreach.length, WINGS_OUT_CONFIG.maxDailyEmails);
    
    leadsNeedingOutreach.slice(0, maxToAdd).forEach(lead => {
        // Determine best template based on path and lead data
        let templateId = path === 'b2b' ? 'b2b_initial_command_suite' : 'b2c_initial_incubator';
        
        if (path === 'b2c') {
            if (lead.source === 'alignment-snapshot') {
                templateId = 'b2c_initial_alignment';
            } else if (lead.source === 'conversations') {
                templateId = 'b2c_initial_conversations';
            }
        } else if (path === 'b2b') {
            if (lead.opportunityType === 'referral') {
                templateId = 'b2b_initial_referral_partner';
            } else if (lead.opportunityType === 'speaking') {
                templateId = 'b2b_initial_speaking';
            }
        }
        
        // Determine priority
        let priority = 'normal';
        if (lead.priority === 'high' || lead.engagementScore > 70) {
            priority = 'high';
        }
        
        queue.addToQueue(lead, templateId, priority);
        added++;
    });
    
    showNotification(`Added ${added} ${path.toUpperCase()} outreach items to queue`, 'success');
    showWingsOutOutreach(path); // Refresh
}

function processWingsOutFollowUps(path) {
    const queue = window.wingsOutQueue || new WingsOutQueue();
    const followUps = queue.getPendingFollowUps(path);
    
    if (followUps.length === 0) {
        showNotification('No follow-ups needed at this time', 'info');
        return;
    }
    
    // Get leads for these follow-ups
    const leads = salesCommandState.leads || JSON.parse(localStorage.getItem('lccs_leads') || '[]');
    
    let added = 0;
    followUps.forEach(item => {
        const lead = leads.find(l => l.id === item.leadId);
        if (lead) {
            const templateId = path === 'b2b' ? 'b2b_follow_up_gentle' : 'b2c_follow_up_gentle';
            queue.addToQueue(lead, templateId, 'high');
            added++;
        }
    });
    
    showNotification(`Added ${added} follow-ups to queue`, 'success');
    showWingsOutOutreach(path); // Refresh
}

// ============================================
// EMAIL ACTIONS
// ============================================

function previewWingsOutEmail(itemId) {
    const queue = window.wingsOutQueue || new WingsOutQueue();
    const item = queue.queue.find(q => q.id === itemId);
    
    if (!item) {
        showNotification('Email not found', 'error');
        return;
    }
    
    const template = WINGS_OUT_TEMPLATES[item.templateId];
    if (!template) {
        showNotification('Template not found', 'error');
        return;
    }
    
    // Get lead data
    const leads = salesCommandState.leads || JSON.parse(localStorage.getItem('lccs_leads') || '[]');
    const lead = leads.find(l => l.id === item.leadId) || { firstName: item.leadName.split(' ')[0], lastName: item.leadName.split(' ')[1] || '' };
    
    // Personalize
    const personalNote = WingsOutPersonalizer.generatePersonalNote(lead, item.path);
    const { subject, body } = WingsOutPersonalizer.personalize(template, lead, { personalNote });
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <h3>📧 Preview: ${template.name}</h3>
                <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div style="background: rgba(31, 49, 91, 0.3); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                    <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid rgba(212, 175, 99, 0.1);">
                        <div style="font-size: 12px; color: rgba(246, 241, 232, 0.5); margin-bottom: 4px;">To:</div>
                        <div style="color: var(--ivory-light);">${item.leadName} &lt;${item.leadEmail}&gt;</div>
                    </div>
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 12px; color: rgba(246, 241, 232, 0.5); margin-bottom: 4px;">Subject:</div>
                        <div style="color: var(--warm-gold); font-weight: 500;">${subject}</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: rgba(246, 241, 232, 0.5); margin-bottom: 8px;">Body:</div>
                        <div style="color: var(--ivory-light); white-space: pre-wrap; line-height: 1.6;">${body}</div>
                    </div>
                </div>
                
                <div style="background: rgba(46, 124, 131, 0.1); border: 1px solid rgba(46, 124, 131, 0.3); border-radius: 12px; padding: 16px;">
                    <h4 style="color: var(--sacred-teal); margin-bottom: 12px;">✨ Personalization Variables</h4>
                    <div style="display: grid; gap: 8px;">
                        ${template.variables.map(v => `
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <code style="background: rgba(31, 49, 91, 0.5); padding: 4px 8px; border-radius: 4px; font-size: 12px;">{{${v}}}</code>
                                <span style="font-size: 13px; color: rgba(246, 241, 232, 0.7);">${v === 'firstName' ? lead.firstName : v === 'personalNote' ? '(auto-generated)' : '(template default)'}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                <button class="btn btn-primary" onclick="sendWingsOutEmail('${item.id}'); this.closest('.modal-overlay').remove();">Send Now</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function sendWingsOutEmail(itemId) {
    const queue = window.wingsOutQueue || new WingsOutQueue();
    
    // Check daily limit
    if (queue.sentToday >= WINGS_OUT_CONFIG.maxDailyEmails) {
        showNotification(`Daily limit reached (${WINGS_OUT_CONFIG.maxDailyEmails} emails). Resume tomorrow.`, 'warning');
        return;
    }
    
    // Mark as sent
    queue.markAsSent(itemId);
    
    showNotification('Email marked as sent! 🦋', 'success');
    showWingsOutOutreach(currentOutreachPath); // Refresh
}

function skipWingsOutEmail(itemId) {
    if (!confirm('Skip this outreach? It will be removed from the queue.')) return;
    
    const queue = window.wingsOutQueue || new WingsOutQueue();
    queue.skipItem(itemId);
    
    showNotification('Outreach skipped', 'info');
    showWingsOutOutreach(currentOutreachPath); // Refresh
}

// ============================================
// TEMPLATE LIBRARY
// ============================================

function showWingsOutTemplates(path, filterCategory = null) {
    setActiveNav('growth-outreach');
    currentOutreachPath = path;
    
    const templates = Object.values(WINGS_OUT_TEMPLATES).filter(t => t.path === path);
    const categories = [...new Set(templates.map(t => t.category))];
    
    const pathLabel = path === 'b2b' ? 'Command Suite' : 'LifeCharter';
    
    const html = `
        <div class="welcome-section">
            <h1 class="welcome-title">📚 ${pathLabel} Templates</h1>
            <p class="welcome-subtitle">${path === 'b2b' ? 'Professional outreach for coaches and business owners' : 'Personal outreach for individuals seeking transformation'}</p>
        </div>

        ${filterCategory ? `
            <div style="margin-bottom: 24px;">
                <button class="btn btn-secondary" onclick="showWingsOutTemplates('${path}')">← All Templates</button>
            </div>
        ` : ''}

        <div style="display: flex; gap: 12px; margin-bottom: 30px; flex-wrap: wrap;">
            <button class="btn ${!filterCategory ? 'btn-primary' : 'btn-secondary'}" onclick="showWingsOutTemplates('${path}')">All</button>
            ${categories.map(cat => `
                <button class="btn ${filterCategory === cat ? 'btn-primary' : 'btn-secondary'}" onclick="showWingsOutTemplates('${path}', '${cat}')">${cat}</button>
            `).join('')}
        </div>

        <div class="workspace-grid">
            ${templates
                .filter(t => !filterCategory || t.category === filterCategory)
                .map(template => `
                    <div class="workspace-card" style="cursor: pointer;" onclick="showWingsOutTemplateDetail('${template.id}')">
                        <div class="card-header">
                            <div class="card-icon" style="font-size: 24px;">📧</div>
                            <span class="card-status status-locked">${template.category}</span>
                        </div>
                        <h3 class="card-title">${template.name}</h3>
                        <p class="card-description" style="font-size: 13px; font-style: italic; margin-bottom: 12px;">${template.subject}</p>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            ${template.variables.slice(0, 3).map(v => `
                                <span style="font-size: 11px; background: rgba(31, 49, 91, 0.5); padding: 4px 8px; border-radius: 4px; color: rgba(246, 241, 232, 0.6);">{{${v}}}</span>
                            `).join('')}
                            ${template.variables.length > 3 ? `<span style="font-size: 11px; color: var(--warm-gold);">+${template.variables.length - 3}</span>` : ''}
                        </div>
                        <div style="margin-top: 12px; font-size: 12px; color: var(--sacred-teal);">Tone: ${template.tone}</div>
                    </div>
                `).join('')}
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = html;
}

function showWingsOutTemplateDetail(templateId) {
    const template = WINGS_OUT_TEMPLATES[templateId];
    if (!template) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <h3>${template.name}</h3>
                <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div style="margin-bottom: 24px;">
                    <div style="font-size: 12px; color: rgba(246, 241, 232, 0.5); margin-bottom: 4px;">Path:</div>
                    <div style="color: var(--warm-gold);">${template.path === 'b2b' ? '💼 Command Suite (B2B)' : '🦋 LifeCharter (B2C)'}</div>
                </div>
                
                <div style="margin-bottom: 24px;">
                    <div style="font-size: 12px; color: rgba(246, 241, 232, 0.5); margin-bottom: 4px;">Category:</div>
                    <div style="color: var(--warm-gold);">${template.category}</div                </div>
                
                <div style="margin-bottom: 24px;">
                    <div style="font-size: 12px; color: rgba(246, 241, 232, 0.5); margin-bottom: 4px;">Subject Line:</div>
                    <div style="color: var(--ivory-light); font-weight: 500;">${template.subject}</div>
                </div>
                
                <div style="margin-bottom: 24px;">
                    <div style="font-size: 12px; color: rgba(246, 241, 232, 0.5); margin-bottom: 8px;">Body:</div>
                    <div style="background: rgba(31, 49, 91, 0.3); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 12px; padding: 24px; color: var(--ivory-light); white-space: pre-wrap; line-height: 1.6;">${template.body}</div>
                </div>
                
                <div style="margin-bottom: 24px;">
                    <div style="font-size: 12px; color: rgba(246, 241, 232, 0.5); margin-bottom: 8px;">Variables:</div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        ${template.variables.map(v => `
                            <code style="background: rgba(46, 124, 131, 0.2); padding: 6px 12px; border-radius: 6px; color: var(--sacred-teal);">{{${v}}}</code>
                        `).join('')}
                    </div>
                </div>
                
                <div>
                    <div style="font-size: 12px; color: rgba(246, 241, 232, 0.5); margin-bottom: 4px;">Tone:</div>
                    <div style="color: rgba(246, 241, 232, 0.8);">${template.tone}</div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                <button class="btn btn-primary" onclick="showWingsOutComposer('${template.path}', '${template.id}'); this.closest('.modal-overlay').remove();">Use Template</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// ============================================
// EMAIL COMPOSER
// ============================================

function showWingsOutComposer(path, templateId = null) {
    setActiveNav('growth-outreach');
    currentOutreachPath = path;
    
    const template = templateId ? WINGS_OUT_TEMPLATES[templateId] : null;
    const leads = salesCommandState.leads || JSON.parse(localStorage.getItem('lccs_leads') || '[]');
    
    // Filter leads by path
    const pathLeads = leads.filter(lead => {
        if (!lead.outreachPath) return path === 'b2c';
        return lead.outreachPath === path;
    });
    
    const pathLabel = path === 'b2b' ? 'Command Suite' : 'LifeCharter';
    
    const html = `
        <div class="welcome-section">
            <h1 class="welcome-title">✉️ Compose ${pathLabel} Outreach</h1>
            <p class="welcome-subtitle">Craft a personalized outreach with intention and care.</p>
        </div>

        <div style="max-width: 800px; margin: 0 auto;">
            <div style="background: rgba(31, 49, 91, 0.3); border: 1px solid rgba(212, 175, 99, 0.15); border-radius: 20px; padding: 40px;">
                
                <div style="margin-bottom: 24px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--ivory-light);">Select Lead *</label>
                    <select id="composer-lead" style="width: 100%; padding: 14px 18px; background: rgba(246, 241, 232, 0.05); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 12px; color: var(--ivory-light); font-size: 15px;">
                        <option value="">Choose a lead...</option>
                        ${pathLeads.map(lead => `
                            <option value="${lead.id}">${lead.firstName} ${lead.lastName} (${lead.email})</option>
                        `).join('')}
                    </select>
                </div>

                <div style="margin-bottom: 24px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--ivory-light);">Template (Optional)</label>
                    <select id="composer-template" onchange="loadTemplateIntoComposer(this.value)" style="width: 100%; padding: 14px 18px; background: rgba(246, 241, 232, 0.05); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 12px; color: var(--ivory-light); font-size: 15px;">
                        <option value="">Start from scratch...</option>
                        ${Object.values(WINGS_OUT_TEMPLATES).filter(t => t.path === path).map(t => `
                            <option value="${t.id}" ${templateId === t.id ? 'selected' : ''}>${t.name}</option>
                        `).join('')}
                    </select>
                </div>

                <div style="margin-bottom: 24px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--ivory-light);">Subject *</label>
                    <input type="text" id="composer-subject" value="${template ? template.subject : ''}" style="width: 100%; padding: 14px 18px; background: rgba(246, 241, 232, 0.05); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 12px; color: var(--ivory-light); font-size: 15px;">
                </div>

                <div style="margin-bottom: 24px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--ivory-light);">Body *</label>
                    <textarea id="composer-body" rows="15" style="width: 100%; padding: 14px 18px; background: rgba(246, 241, 232, 0.05); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 12px; color: var(--ivory-light); font-size: 15px; font-family: inherit; line-height: 1.6; resize: vertical;">${template ? template.body : ''}</textarea>
                </div>

                <div style="margin-bottom: 24px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--ivory-light);">Priority</label>
                    <select id="composer-priority" style="width: 100%; padding: 14px 18px; background: rgba(246, 241, 232, 0.05); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 12px; color: var(--ivory-light); font-size: 15px;">
                        <option value="high">High - Send ASAP</option>
                        <option value="normal" selected>Normal - Standard queue</option>
                        <option value="low">Low - When time permits</option>
                    </select>
                </div>

                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button class="btn btn-secondary" onclick="showWingsOutOutreach('${path}')">Cancel</button>
                    <button class="btn btn-secondary" onclick="saveWingsOutDraft()">Save Draft</button>
                    <button class="btn btn-primary" onclick="queueWingsOutEmail('${path}')">Add to Queue</button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = html;
}

function loadTemplateIntoComposer(templateId) {
    if (!templateId) return;
    
    const template = WINGS_OUT_TEMPLATES[templateId];
    if (!template) return;
    
    document.getElementById('composer-subject').value = template.subject;
    document.getElementById('composer-body').value = template.body;
}

function queueWingsOutEmail(path) {
    const leadId = document.getElementById('composer-lead').value;
    const subject = document.getElementById('composer-subject').value;
    const body = document.getElementById('composer-body').value;
    const priority = document.getElementById('composer-priority').value;
    
    if (!leadId || !subject || !body) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    const leads = salesCommandState.leads || JSON.parse(localStorage.getItem('lccs_leads') || '[]');
    const lead = leads.find(l => l.id === leadId);
    
    if (!lead) {
        showNotification('Lead not found', 'error');
        return;
    }
    
    const queue = window.wingsOutQueue || new WingsOutQueue();
    
    // Create custom one-off item
    const item = {
        id: 'wings_custom_' + Date.now(),
        leadId: lead.id,
        leadName: `${lead.firstName} ${lead.lastName}`,
        leadEmail: lead.email,
        templateId: 'custom',
        templateName: 'Custom Email',
        path: path,
        subject: subject,
        body: body,
        status: WINGS_OUT_CONFIG.statuses.PENDING,
        priority: priority,
        createdAt: new Date().toISOString(),
        scheduledFor: null,
        sentAt: null,
        openedAt: null,
        repliedAt: null,
        variables: {},
        notes: ''
    };
    
    queue.queue.push(item);
    queue.saveToStorage();
    
    showNotification('Email added to queue!', 'success');
    showWingsOutOutreach(path);
}

// ============================================
// QUEUE MANAGER
// ============================================

function showWingsOutQueueManager(path) {
    setActiveNav('growth-outreach');
    currentOutreachPath = path;
    
    const queue = window.wingsOutQueue || new WingsOutQueue();
    const items = queue.queue.filter(q => q.path === path).slice().reverse();
    
    const pathLabel = path === 'b2b' ? 'Command Suite' : 'LifeCharter';
    
    const html = `
        <div class="welcome-section">
            <h1 class="welcome-title">📋 ${pathLabel} Queue Manager</h1>
            <p class="welcome-subtitle">Manage and monitor all your ${pathLabel.toLowerCase()} outreach.</p>
        </div>

        <div style="background: rgba(31, 49, 91, 0.3); border: 1px solid rgba(212, 175, 99, 0.15); border-radius: 20px; padding: 24px;">
            ${items.length === 0 ? `
                <div style="text-align: center; padding: 60px;">
                    <div style="font-size: 64px; margin-bottom: 24px;">📭</div>
                    <h3 style="font-family: 'Cormorant Garamond', serif; font-size: 24px; color: var(--warm-gold); margin-bottom: 12px;">Queue is empty</h3>
                    <p style="color: rgba(246, 241, 232, 0.7);">Generate a queue or compose emails to get started.</p>
                </div>
            ` : `
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 1px solid rgba(212, 175, 99, 0.2);">
                                <th style="text-align: left; padding: 12px; color: var(--warm-gold); font-weight: 600;">Recipient</th>
                                <th style="text-align: left; padding: 12px; color: var(--warm-gold); font-weight: 600;">Template</th>
                                <th style="text-align: left; padding: 12px; color: var(--warm-gold); font-weight: 600;">Status</th>
                                <th style="text-align: left; padding: 12px; color: var(--warm-gold); font-weight: 600;">Date</th>
                                <th style="text-align: left; padding: 12px; color: var(--warm-gold); font-weight: 600;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${items.map(item => `
                                <tr style="border-bottom: 1px solid rgba(212, 175, 99, 0.1);">
                                    <td style="padding: 12px;">
                                        <div style="font-weight: 500; color: var(--ivory-light);">${item.leadName}</div>
                                        <div style="font-size: 12px; color: rgba(246, 241, 232, 0.5);">${item.leadEmail}</div>
                                    </td>
                                    <td style="padding: 12px; color: rgba(246, 241, 232, 0.8);">${item.templateName}</td>
                                    <td style="padding: 12px;">
                                        <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; text-transform: capitalize; background: ${getStatusColor(item.status).bg}; color: ${getStatusColor(item.status).text};">
                                            ${item.status}
                                        </span>
                                    </td>
                                    <td style="padding: 12px; color: rgba(246, 241, 232, 0.6); font-size: 13px;">
                                        ${item.sentAt ? new Date(item.sentAt).toLocaleDateString() : new Date(item.createdAt).toLocaleDateString()}
                                    </td>
                                    <td style="padding: 12px;">
                                        <div style="display: flex; gap: 8px;">
                                            ${item.status === 'pending' ? `
                                                <button class="btn btn-primary" style="font-size: 12px; padding: 6px 12px;" onclick="sendWingsOutEmail('${item.id}')">Send</button>
                                                <button class="btn btn-secondary" style="font-size: 12px; padding: 6px 12px;" onclick="previewWingsOutEmail('${item.id}')">Preview</button>
                                            ` : `
                                                <button class="btn btn-secondary" style="font-size: 12px; padding: 6px 12px;" onclick="previewWingsOutEmail('${item.id}')">View</button>
                                            `}
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = html;
}

function getStatusColor(status) {
    const colors = {
        pending: { bg: 'rgba(243, 156, 18, 0.2)', text: '#f39c12' },
        scheduled: { bg: 'rgba(52, 152, 219, 0.2)', text: '#3498db' },
        sent: { bg: 'rgba(149, 165, 166, 0.2)', text: '#95a5a6' },
        opened: { bg: 'rgba(46, 204, 113, 0.2)', text: '#2ecc71' },
        clicked: { bg: 'rgba(46, 204, 113, 0.2)', text: '#2ecc71' },
        replied: { bg: 'rgba(155, 89, 182, 0.2)', text: '#9b59b6' },
        converted: { bg: 'rgba(212, 175, 99, 0.3)', text: '#d4af63' },
        unsubscribed: { bg: 'rgba(231, 76, 60, 0.2)', text: '#e74c3c' },
        bounced: { bg: 'rgba(231, 76, 60, 0.2)', text: '#e74c3c' }
    };
    return colors[status] || colors.pending;
}

// ============================================
// ANALYTICS
// ============================================

function showWingsOutAnalytics(path) {
    setActiveNav('growth-outreach');
    currentOutreachPath = path;
    
    const queue = window.wingsOutQueue || new WingsOutQueue();
    const analytics = new WingsOutAnalytics(queue);
    const data = analytics.getDashboardData(path);
    
    const pathLabel = path === 'b2b' ? 'Command Suite' : 'LifeCharter';
    
    const html = `
        <div class="welcome-section">
            <h1 class="welcome-title">📊 ${pathLabel} Analytics</h1>
            <p class="welcome-subtitle">Understand how your ${pathLabel.toLowerCase()} outreach is landing.</p>
        </div>

        <!-- Summary Cards -->
        <div class="progress-overview" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 40px;">
            <div class="progress-card">
                <div class="progress-number">${data.stats.totalSent}</div>
                <div class="progress-label">Total Sent</div>
            </div>
            <div class="progress-card">
                <div class="progress-number">${data.stats.openRate}%</div>
                <div class="progress-label">Open Rate</div>
            </div>
            <div class="progress-card">
                <div class="progress-number">${data.stats.replyRate}%</div>
                <div class="progress-label">Reply Rate</div>
            </div>
            <div class="progress-card">
                <div class="progress-number">${data.stats.conversionRate}%</div>
                <div class="progress-label">Conversion Rate</div>
            </div>
        </div>

        <!-- Timeline Chart -->
        <div style="background: rgba(31, 49, 91, 0.3); border: 1px solid rgba(212, 175, 99, 0.15); border-radius: 20px; padding: 30px; margin-bottom: 40px;">
            <h3 style="font-family: 'Cormorant Garamond', serif; font-size: 20px; color: var(--warm-gold); margin-bottom: 20px;">Activity Timeline (Last 30 Days)</h3>
            <div style="display: flex; align-items: flex-end; gap: 4px; height: 200px; padding: 20px; background: rgba(31, 49, 91, 0.5); border-radius: 12px; overflow-x: auto;">
                ${data.timeline.map(day => {
                    const maxSent = Math.max(...data.timeline.map(d => d.sent), 1);
                    const height = (day.sent / maxSent) * 100;
                    return `
                        <div style="flex: 1; min-width: 20px; height: ${height}%; background: linear-gradient(to top, var(--sacred-teal), var(--royal-plum)); border-radius: 3px 3px 0 0; position: relative; cursor: pointer;" title="${day.date}: ${day.sent} sent, ${day.opened} opened">
                        </div>
                    `;
                }).join('')}
            </div>
        </div>

        <!-- Template Performance -->
        <div style="background: rgba(31, 49, 91, 0.3); border: 1px solid rgba(212, 175, 99, 0.15); border-radius: 20px; padding: 30px;">
            <h3 style="font-family: 'Cormorant Garamond', serif; font-size: 20px; color: var(--warm-gold); margin-bottom: 20px;">Template Performance</h3>
            
            ${data.templatePerformance.length === 0 ? `
                <div style="text-align: center; padding: 40px; color: rgba(246, 241, 232, 0.6);">
                    No data yet. Start sending outreach to see performance metrics.
                </div>
            ` : `
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 1px solid rgba(212, 175, 99, 0.2);">
                                <th style="text-align: left; padding: 12px; color: var(--warm-gold);">Template</th>
                                <th style="text-align: center; padding: 12px; color: var(--warm-gold);">Sent</th>
                                <th style="text-align: center; padding: 12px; color: var(--warm-gold);">Opened</th>
                                <th style="text-align: center; padding: 12px; color: var(--warm-gold);">Replied</th>
                                <th style="text-align: center; padding: 12px; color: var(--warm-gold);">Open Rate</th>
                                <th style="text-align: center; padding: 12px; color: var(--warm-gold);">Reply Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.templatePerformance.map(t => `
                                <tr style="border-bottom: 1px solid rgba(212, 175, 99, 0.1);">
                                    <td style="padding: 12px; color: var(--ivory-light);">${WINGS_OUT_TEMPLATES[t.templateId]?.name || t.templateId}</td>
                                    <td style="padding: 12px; text-align: center; color: rgba(246, 241, 232, 0.8);">${t.sent}</td>
                                    <td style="padding: 12px; text-align: center; color: rgba(246, 241, 232, 0.8);">${t.opened}</td>
                                    <td style="padding: 12px; text-align: center; color: rgba(246, 241, 232, 0.8);">${t.replied}</td>
                                    <td style="padding: 12px; text-align: center; color: var(--sacred-teal); font-weight: 600;">${t.openRate}%</td>
                                    <td style="padding: 12px; text-align: center; color: var(--warm-gold); font-weight: 600;">${t.replyRate}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = html;
}

// ============================================
// SETTINGS
// ============================================

function showWingsOutSettings() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
            <div class="modal-header">
                <h3>⚙️ Wings Out Settings</h3>
                <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div style="margin-bottom: 24px;">
                    <h4 style="color: var(--warm-gold); margin-bottom: 16px;">Daily Limits</h4>
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--ivory-light);">Max emails per day</label>
                        <input type="number" id="wings-max-daily" value="${WINGS_OUT_CONFIG.maxDailyEmails}" min="1" max="100" style="width: 100%; padding: 12px; background: rgba(246, 241, 232, 0.05); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 8px; color: var(--ivory-light);">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 8px; color: var(--ivory-light);">Minimum minutes between emails</label>
                        <input type="number" id="wings-min-interval" value="${WINGS_OUT_CONFIG.minTimeBetweenEmails}" min="1" max="60" style="width: 100%; padding: 12px; background: rgba(246, 241, 232, 0.05); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 8px; color: var(--ivory-light);">
                    </div>
                </div>

                <div style="margin-bottom: 24px;">
                    <h4 style="color: var(--warm-gold); margin-bottom: 16px;">Sender Information</h4>
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--ivory-light);">From Name</label>
                        <input type="text" id="wings-from-name" value="${WINGS_OUT_CONFIG.fromName}" style="width: 100%; padding: 12px; background: rgba(246, 241, 232, 0.05); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 8px; color: var(--ivory-light);">
                    </div>
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--ivory-light);">From Email</label>
                        <input type="email" id="wings-from-email" value="${WINGS_OUT_CONFIG.fromEmail}" style="width: 100%; padding: 12px; background: rgba(246, 241, 232, 0.05); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 8px; color: var(--ivory-light);">
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 8px; color: var(--ivory-light);">Calendar Booking Link</label>
                        <input type="url" id="wings-calendar-link" value="${WINGS_OUT_CONFIG.calendarLink}" style="width: 100%; padding: 12px; background: rgba(246, 241, 232, 0.05); border: 1px solid rgba(212, 175, 99, 0.2); border-radius: 8px; color: var(--ivory-light);">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn btn-primary" onclick="saveWingsOutSettings(); this.closest('.modal-overlay').remove();">Save Settings</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function saveWingsOutSettings() {
    WINGS_OUT_CONFIG.maxDailyEmails = parseInt(document.getElementById('wings-max-daily').value) || 20;
    WINGS_OUT_CONFIG.minTimeBetweenEmails = parseInt(document.getElementById('wings-min-interval').value) || 15;
    WINGS_OUT_CONFIG.fromName = document.getElementById('wings-from-name').value || 'Babs Carroll';
    WINGS_OUT_CONFIG.fromEmail = document.getElementById('wings-from-email').value || 'babs@sacredkaleidoscope.community';
    WINGS_OUT_CONFIG.calendarLink = document.getElementById('wings-calendar-link').value || 'https://calendly.com/sacredkaleidoscope/alignment-call';
    
    // Save to localStorage
    localStorage.setItem('wings_out_config', JSON.stringify(WINGS_OUT_CONFIG));
    
    showNotification('Settings saved!', 'success');
}

// Load settings on init
function loadWingsOutSettings() {
    const saved = localStorage.getItem('wings_out_config');
    if (saved) {
        const settings = JSON.parse(saved);
        Object.assign(WINGS_OUT_CONFIG, settings);
    }
}

// ============================================
// NOTIFICATION HELPER
// ============================================

function showNotification(message, type = 'info') {
    // Use the app's notification system if available
    if (typeof showToast === 'function') {
        showToast(message, type);
    } else {
        // Simple fallback
        const colors = {
            success: '#4CAF50',
            error: '#e74c3c',
            warning: '#FF9800',
            info: '#3498db'
        };
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 10000;
            font-weight: 500;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadWingsOutSettings();
    
    // Initialize queue
    if (!window.wingsOutQueue) {
        window.wingsOutQueue = new WingsOutQueue();
    }
    
    console.log('🦋 Wings Out Outreach System loaded successfully');
});

// ============================================
// EXPORTS FOR COMMAND SUITE
// ============================================

window.WingsOutOutreach = {
    show: showWingsOutOutreach,
    Queue: WingsOutQueue,
    Templates: WINGS_OUT_TEMPLATES,
    TemplatesB2B: WINGS_OUT_TEMPLATES_B2B,
    TemplatesB2C: WINGS_OUT_TEMPLATES_B2C,
    Personalizer: WingsOutPersonalizer,
    Analytics: WingsOutAnalytics,
    Config: WINGS_OUT_CONFIG,
    generateQueue: generateWingsOutQueue,
    processFollowUps: processWingsOutFollowUps,
    showComposer: showWingsOutComposer,
    showTemplates: showWingsOutTemplates,
    showQueueManager: showWingsOutQueueManager,
    showAnalytics: showWingsOutAnalytics,
    showSettings: showWingsOutSettings
};

// Expose individual functions for onclick handlers
window.showWingsOutOutreach = showWingsOutOutreach;
window.generateWingsOutQueue = generateWingsOutQueue;
window.processWingsOutFollowUps = processWingsOutFollowUps;
window.showWingsOutComposer = showWingsOutComposer;
window.showWingsOutTemplates = showWingsOutTemplates;
window.showWingsOutQueueManager = showWingsOutQueueManager;
window.showWingsOutAnalytics = showWingsOutAnalytics;
window.showWingsOutSettings = showWingsOutSettings;
window.previewWingsOutEmail = previewWingsOutEmail;
window.sendWingsOutEmail = sendWingsOutEmail;
window.skipWingsOutEmail = skipWingsOutEmail;
window.showWingsOutTemplateDetail = showWingsOutTemplateDetail;
window.loadTemplateIntoComposer = loadTemplateIntoComposer;
window.queueWingsOutEmail = queueWingsOutEmail;

console.log('✅ Outreach System ready - Triple Path (B2B/B2C/Affiliate)');

// Test function for debugging
function testWingsOut() {
    console.log('Wings Out Outreach System is loaded and working!');
    console.log('Available functions:', Object.keys(window).filter(k => k.includes('WingsOut')));
    return 'Test successful';
}
window.testWingsOut = testWingsOut;

