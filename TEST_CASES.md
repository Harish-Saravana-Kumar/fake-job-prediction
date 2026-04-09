# Fake Job Detector - Edge Case Test Suite

## Test Categories & Cases

### 1. **Text Length Extremes**

#### Case 1.1: Minimal Input (Short Description)
- **Title:** Data Entry Clerk
- **Company:** FastData Inc
- **Description:** Work from home. $5000/month. Must pay $200 upfront.
- **Expected:** Should flag as FAKE (red flags: work-from-home, unrealistic pay, upfront fee)
- **Edge:** Tests minimum viable text processing

#### Case 1.2: Maximum Length (Near 5000 chars)
- **Title:** Senior Full Stack Developer Position
- **Company:** TechCorp Solutions
- **Description:** [Long legitimate job posting with full details about responsibilities, requirements, benefits, company culture, etc. - fill to ~4500 chars with real job content]
- **Expected:** Should handle without truncation/errors
- **Edge:** Tests model robustness with verbose input

#### Case 1.3: Empty/Whitespace Only
- **Title:** (empty or spaces)
- **Company:** (empty or spaces)
- **Description:** (empty or spaces)
- **Expected:** Form validation should catch (error banner: "Please enter job posting information")
- **Edge:** Tests validation layer

---

### 2. **Common Scam Patterns**

#### Case 2.1: Classic Work-From-Home Scam
- **Title:** Work From Home - No Experience Required
- **Company:** Online Opportunities LLC
- **Description:** Make $5000-$10000 per week from home! No experience necessary. No meetings required. Start immediately. Reply with your email and we'll send you the details. This is a legitimate remote opportunity with flexible hours and unlimited income potential.
- **Expected:** FAKE (high confidence)
- **Red Flags:** Unrealistic income claims, no experience needed, work-from-home guarantee

#### Case 2.2: Upfront Fee Scam
- **Title:** Secretary - $3000/month
- **Company:** Global Staffing Corp
- **Description:** Position offers $3000 monthly salary for part-time work. To secure your spot, we require a one-time processing fee of $299. Upon receipt of payment, we will provide training materials and job assignment. Fee covers background check and certification. Starting immediately after payment.
- **Expected:** FAKE (high confidence)
- **Red Flags:** Upfront payment required, vague job details, payment before work

#### Case 2.3: Money Laundering Scam
- **Title:** Financial Clerk - Remote
- **Company:** International Transfer Services
- **Description:** We seek reliable individuals to help process financial transactions. You will receive funds into your personal account, deduct a small percentage as commission, and transfer the remainder to a business account. $2000-$5000 per transaction. Work flexible hours. Must have active bank account and ID.
- **Expected:** FAKE (high confidence)
- **Red Flags:** Suspicious fund movements, commission structure, no legitimate job details

#### Case 2.4: Envelope Stuffing/Data Entry Scam
- **Title:** Easy Data Entry Work - $500/Day
- **Company:** QuickCash Solutions
- **Description:** Earn $500 daily working from home entering data. No experience required. Work your own hours. Start today! Simply reply with your name and phone number and we'll email you the login details. Immediate start. Limited positions available!
- **Expected:** FAKE (high confidence)
- **Red Flags:** Unrealistic pay for simple task, no training required, immediate start

---

### 3. **Legitimate Job Postings**

#### Case 3.1: Professional Tech Role
- **Title:** Senior Software Engineer - Backend
- **Company:** CloudTech Inc
- **Description:** We are seeking an experienced Senior Software Engineer to join our backend team. Requirements: 5+ years experience with Python/Java, strong understanding of distributed systems, experience with AWS or GCP, excellent communication skills. Responsibilities include designing scalable APIs, mentoring junior developers, and collaborating with product teams. Competitive salary commensurate with experience, comprehensive benefits including health insurance, 401k matching, and professional development budget. Hybrid role in San Francisco office. Please apply through our careers page.
- **Expected:** REAL (low confidence)
- **Indicators:** Clear requirements, specific experience levels, legitimate benefits, proper application process

#### Case 3.2: Entry-Level Retail Position
- **Title:** Sales Associate - Part-Time
- **Company:** RetailMart
- **Description:** We're hiring part-time Sales Associates for our downtown store. Responsibilities: customer service, cash handling, inventory management, and visual merchandising. Requirements: high school diploma/GED, customer service experience preferred, ability to work weekends and holidays. Hourly wage $16-18 depending on experience. Benefits include employee discount and flexible scheduling. Applications accepted Monday-Friday, 9am-5pm at our store location or online at retailmart.com/jobs
- **Expected:** REAL (low confidence)
- **Indicators:** Standard wages, clear duties, realistic requirements, legitimate location

#### Case 3.3: Healthcare Professional Role
- **Title:** Registered Nurse - ICU
- **Company:** Metropolitan Hospital
- **Description:** Metropolitan Hospital seeks experienced RN for our 20-bed ICU. Qualifications: RN license (state-specific), BLS/ACLS certification, minimum 2 years ICU experience, excellent clinical skills. Competitive salary $65,000-$75,000 annually based on experience, comprehensive benefits, shift differential, continuing education support, sign-on bonus $5,000. 12-hour shifts. Apply through our online portal and attend required interview.
- **Expected:** REAL (low confidence)
- **Indicators:** Professional credentials required, salary range disclosed, legitimate institution, certification requirements

---

### 4. **Boundary Cases (Hard to Classify)**

#### Case 4.1: Ambiguous/Mixed Signals
- **Title:** Flexible Income Opportunity
- **Company:** Independent Contractor Network
- **Description:** Join our network of independent professionals. Opportunities in various fields. Flexible hours, work when you want. Income varies based on your effort. Some positions may require initial certification. Network with other professionals while earning. No guaranteed income. Ideal for people seeking supplemental income.
- **Expected:** UNCERTAIN (50-70% confidence range)
- **Edge:** Tests boundary decision - legitimate freelance network vs vague opportunity

#### Case 4.2: Legitimate MLM-Like (Network Marketing)
- **Title:** Brand Ambassador - Health & Wellness
- **Company:** Natural Products Direct
- **Description:** Become a brand ambassador for our premium wellness brand. Earn commission on sales (15-25%) plus team bonuses. Comprehensive training provided. Support from experienced mentors. Flexible schedule, work from home. Build your own customer base. Minimal startup investment ($150 starter kit). Legitimate MLM structure with income disclosure. Training webinars weekly.
- **Expected:** UNCERTAIN (varies by interpretation - could be legitimate small business or predatory MLM)
- **Edge:** Tests grey-area classification

#### Case 4.3: Too-Good-To-Be-True Legitimate
- **Title:** Executive Assistant
- **Company:** Silicon Valley Startup
- **Description:** Help us scale! Exciting startup seeking Executive Assistant in downtown Palo Alto. Responsibilities: manage calendar, project coordination, travel planning. Requirements: 3 years EA experience, strong organizational skills, proficiency with Google Workspace and Asana. We offer $80,000-$95,000 salary, unlimited PTO, catered lunches daily, free gym membership, stock options, MacBook provided, quarterly bonuses based on company performance, fully remote option after 90 days.
- **Expected:** REAL (but may get high fake probability due to generous benefits)
- **Edge:** Tests model's handling of genuinely good compensation

---

### 5. **Format & Language Variations**

#### Case 5.1: Poorly Formatted (But Legitimate)
- **Title:** mechanic needed
- **Company:** joes auto repair
- **Description:** we need mechanic\n\n hourly is 18-22 $\n\n muts have own tools and expirience with transmissions\n\n call joe at 555-1234 or stop by shop\n\n
- **Expected:** REAL (should ignore formatting issues)
- **Edge:** Tests robustness to poor grammar/formatting

#### Case 5.2: AI-Generated Style
- **Title:** Innovative Marketing Solutions Coordinator
- **Company:** Strategic Growth Partners LLC
- **Description:** In an ever-evolving digital landscape, Strategic Growth Partners seeks dynamic individuals to join our multifaceted team. This role encompasses strategic positioning, market penetration initiatives, and paradigm-shifting engagement strategies. Synergies across departments will drive organizational excellence. Remuneration commensurate with market standards. Comprehensive benefits architecture supports holistic employee wellness.
- **Expected:** UNCERTAIN (vague corporate-speak could signal scam)
- **Edge:** Tests detection of deliberately obscured job descriptions

#### Case 5.3: Excessive Emojis/Enthusiasm
- **Title:** 🚀 AMAZING Opportunity!!! 🤑💰
- **Company:** Success Now 🎯
- **Description:** YOU CAN MAKE $10,000/WEEK!!! 🎉🤑💵 This is NOT a scam!!! 🙅‍♂️ We are HIRING NOW for EVERYONE!!! 📱💻 No experience required at all!!! Just reply with your info and START TODAY!!! Work from beach!!! 🏖️ DM us NOW before spots fill up!!! 🔥🔥
- **Expected:** FAKE (high confidence)
- **Edge:** Tests detection of emotionally manipulative formatting

---

### 6. **Industry-Specific Cases**

#### Case 6.1: Creative/Gig Economy (Legitimate)
- **Title:** Freelance Graphic Designer
- **Company:** Designhub Platform
- **Description:** Designhub connects freelance designers with clients. Create a portfolio on our platform and start bidding on projects. Earn 85% of project fees (15% platform commission). Work flexible hours on projects that interest you. Built-in dispute resolution and secure payment processing. Designers earn $20-$150+ per project depending on complexity.
- **Expected:** REAL (legitimate gig platform)
- **Edge:** Tests handling of commission-based legitimate work

#### Case 6.2: Medical/Pharma Sales (High-Commission Legitimate)
- **Title:** Pharmaceutical Sales Representative
- **Company:** MediPharm Corp
- **Description:** Pharmaceutical Sales Rep position in the Seattle territory. Base salary $65,000 + performance bonus up to $35,000 annually (total potential $100,000+). Requirements: Bachelor's degree (any field), valid driver's license, willingness to travel 40% of time. Responsibilities: meet with physicians/hospitals, present products, manage accounts. Benefits: company car, health/dental/vision, retirement plan, ongoing training. Sales targets and detailed performance metrics provided.
- **Expected:** REAL (legitimate high-commission role)
- **Edge:** Tests handling of high income potential in legitimate context

#### Case 6.3: Academia/Research
- **Title:** Postdoctoral Researcher - Machine Learning
- **Company:** University Research Institute
- **Description:** The Department of Computer Science seeks a Postdoctoral Researcher specializing in natural language processing. 2-year term position, renewable. Stipend $55,000-$60,000 annually plus health benefits. Responsibilities: conduct independent research, publish findings, collaborate on grant proposals, mentor graduate students. Requirements: PhD in Computer Science or related field, published research record, experience with deep learning frameworks. Apply via [university portal] with CV, research statement, and three references.
- **Expected:** REAL (legitimate academic position)
- **Edge:** Tests handling of lower compensation for specialized/credentialed roles

---

### 7. **Typo/Variation Patterns**

#### Case 7.1: Suspicious Typos
- **Title:** Financial Analist - Remote Opertunity
- **Company:** Glbal Finance Solutoins Inc
- **Description:** We are hiring finanical analists for our remot team. Salary range $45k-50k anually. Please submitt your resume to hr@glbalfinance.xxx. We offer full benefist and relocation assistence.
- **Expected:** UNCERTAIN (typos can indicate scam, but also might be legitimate from non-native speaker)
- **Edge:** Tests model's handling of spelling errors

#### Case 7.2: Inconsistent Details
- **Title:** Marketing Manager
- **Company:** TechStart Inc
- **Description:** TechCorp seeks a Marketing Manager for an entry-level position. Requirements: 10+ years marketing leadership experience, MBA preferred, fluent in 5 languages. Salary: Part-time, $200,000 annually. Work schedule: 2 hours per week, fully remote from anywhere in world. Apply immediately for immediate start!
- **Expected:** FAKE (high confidence - contradictory details)
- **Edge:** Tests detection of internally inconsistent job postings

---

## Test Execution Guide

### Quick Test (5 minutes)
Use these 3 cases to verify basic functionality:
1. **Case 2.1** (Work-From-Home Scam) - should be FAKE
2. **Case 3.1** (Tech Role) - should be REAL
3. **Case 4.1** (Ambiguous) - should be UNCERTAIN

### Comprehensive Test (20 minutes)
Run through one case per category (1.1, 2.1, 2.4, 3.1, 3.3, 4.1, 5.1, 5.3, 6.3)

### Full Regression (45 minutes)
Run all 20+ cases and compare:
- Prediction accuracy vs manual labels
- Confidence scores distribution
- Error banner display for edge cases
- Character counter functionality (especially Case 1.2 near 5000 chars)
- Report generation (JSON/PDF) for mixed cases

---

## Model Validation Checklist

- [ ] Handles min/max text lengths without crashing
- [ ] Detects common scam indicators (unrealistic pay, upfront fees, work-from-home)
- [ ] Recognizes legitimate credentials (nursing, engineering, academia)
- [ ] Scores high-confidence cases consistently
- [ ] Boundary cases return 50-70% confidence (not extreme)
- [ ] Reports include useful explanations for predictions
- [ ] JSON/PDF downloads capture all prediction data
- [ ] Character counter works correctly with long descriptions
- [ ] Error messages appear inline (no browser alerts)
- [ ] Mobile responsiveness maintained for all inputs
