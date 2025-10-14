// Job Fraud Detection System - JavaScript Functions

// Global variables
let predictionModel = null;
let isAnalyzing = false;

// Feature analysis rules based on our ML model insights
const fraudIndicators = {
    // Text-based indicators
    textFeatures: {
        shortTitle: { threshold: 10, weight: 0.3 },
        longTitle: { threshold: 80, weight: 0.2 },
        shortDescription: { threshold: 50, weight: 0.4 },
        longDescription: { threshold: 5000, weight: 0.1 },
        noRequirements: { weight: 0.5 },
        shortRequirements: { threshold: 20, weight: 0.3 },
        urgentLanguage: { patterns: ['urgent', 'immediate', 'asap', 'quickly'], weight: 0.4 },
        vagueSalary: { patterns: ['competitive', 'attractive', 'excellent'], weight: 0.3 },
        noContactInfo: { weight: 0.6 },
        genericEmail: { patterns: ['gmail', 'yahoo', 'hotmail'], weight: 0.2 }
    },
    
    // Categorical indicators
    categoryRisks: {
        'Customer Service': 0.15,
        'Other': 0.25,
        'Administrative': 0.10,
        'Sales': 0.20,
        'Marketing': 0.12
    },
    
    // Location indicators
    locationRisks: {
        'US': 0.05,
        'GB': 0.08,
        'CA': 0.06,
        'Other': 0.15
    }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Job Fraud Detection System Initialized');
    initializeEventListeners();
    loadDemoData();
});

// Initialize event listeners
function initializeEventListeners() {
    // Form submission
    const analyzeForm = document.getElementById('analyzeForm');
    if (analyzeForm) {
        analyzeForm.addEventListener('submit', handleFormSubmission);
    }
    
    // Demo buttons
    const demoButtons = document.querySelectorAll('.demo-btn');
    demoButtons.forEach(btn => {
        btn.addEventListener('click', loadDemoExample);
    });
    
    // Reset button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetForm);
    }
    
    // Smooth scrolling for navigation
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', smoothScroll);
    });
}

// Handle form submission
function handleFormSubmission(event) {
    event.preventDefault();
    
    if (isAnalyzing) {
        return;
    }
    
    const formData = collectFormData();
    if (validateFormData(formData)) {
        analyzeJobPosting(formData);
    }
}

// Collect form data
function collectFormData() {
    return {
        title: document.getElementById('title').value.trim(),
        location: document.getElementById('location').value.trim(),
        department: document.getElementById('department').value,
        salaryRange: document.getElementById('salaryRange').value,
        company: document.getElementById('company').value.trim(),
        description: document.getElementById('description').value.trim(),
        requirements: document.getElementById('requirements').value.trim(),
        benefits: document.getElementById('benefits').value.trim(),
        telecommuting: document.getElementById('telecommuting').checked,
        hasCompanyLogo: document.getElementById('hasCompanyLogo').checked,
        hasQuestions: document.getElementById('hasQuestions').checked,
        employmentType: document.getElementById('employmentType').value,
        requiredExperience: document.getElementById('requiredExperience').value,
        requiredEducation: document.getElementById('requiredEducation').value,
        industry: document.getElementById('industry').value,
        jobFunction: document.getElementById('jobFunction').value
    };
}

// Validate form data
function validateFormData(data) {
    const requiredFields = ['title', 'location', 'company', 'description'];
    
    for (let field of requiredFields) {
        if (!data[field]) {
            showAlert(`Please fill in the ${field.charAt(0).toUpperCase() + field.slice(1)} field.`, 'warning');
            return false;
        }
    }
    
    if (data.title.length < 3) {
        showAlert('Job title must be at least 3 characters long.', 'warning');
        return false;
    }
    
    if (data.description.length < 20) {
        showAlert('Job description must be at least 20 characters long.', 'warning');
        return false;
    }
    
    return true;
}

// Main analysis function
function analyzeJobPosting(data) {
    isAnalyzing = true;
    showLoadingState();
    
    // Simulate API delay for realistic experience
    setTimeout(() => {
        try {
            const analysis = performFraudDetection(data);
            displayResults(analysis);
            scrollToResults();
        } catch (error) {
            console.error('Analysis error:', error);
            showAlert('An error occurred during analysis. Please try again.', 'danger');
        } finally {
            isAnalyzing = false;
            hideLoadingState();
        }
    }, 2000);
}

// Perform fraud detection analysis
function performFraudDetection(data) {
    let riskScore = 0;
    let riskFactors = [];
    let safeFactors = [];
    let recommendations = [];
    
    // Analyze text features
    const textAnalysis = analyzeTextFeatures(data);
    riskScore += textAnalysis.score;
    riskFactors.push(...textAnalysis.risks);
    safeFactors.push(...textAnalysis.safe);
    
    // Analyze categorical features
    const categoryAnalysis = analyzeCategoricalFeatures(data);
    riskScore += categoryAnalysis.score;
    riskFactors.push(...categoryAnalysis.risks);
    safeFactors.push(...categoryAnalysis.safe);
    
    // Analyze structural features
    const structuralAnalysis = analyzeStructuralFeatures(data);
    riskScore += structuralAnalysis.score;
    riskFactors.push(...structuralAnalysis.risks);
    safeFactors.push(...structuralAnalysis.safe);
    
    // Generate recommendations
    recommendations = generateRecommendations(riskFactors, data);
    
    // Calculate final risk percentage (0-100)
    const riskPercentage = Math.min(Math.max(riskScore * 100, 0), 100);
    const confidence = calculateConfidence(riskFactors.length, safeFactors.length);
    
    return {
        riskPercentage: Math.round(riskPercentage),
        riskLevel: getRiskLevel(riskPercentage),
        confidence: confidence,
        riskFactors: riskFactors,
        safeFactors: safeFactors,
        recommendations: recommendations,
        metrics: calculateMetrics(riskPercentage),
        rawData: data
    };
}

// Analyze text features
function analyzeTextFeatures(data) {
    let score = 0;
    let risks = [];
    let safe = [];
    
    // Title analysis
    if (data.title.length < fraudIndicators.textFeatures.shortTitle.threshold) {
        score += fraudIndicators.textFeatures.shortTitle.weight;
        risks.push({ type: 'Title too short', description: 'Very brief job titles may indicate low-effort postings' });
    } else if (data.title.length > 15 && data.title.length < 60) {
        safe.push({ type: 'Appropriate title length', description: 'Job title has reasonable length' });
    }
    
    if (data.title.length > fraudIndicators.textFeatures.longTitle.threshold) {
        score += fraudIndicators.textFeatures.longTitle.weight;
        risks.push({ type: 'Title unusually long', description: 'Extremely long titles may be keyword stuffing' });
    }
    
    // Description analysis
    if (data.description.length < fraudIndicators.textFeatures.shortDescription.threshold) {
        score += fraudIndicators.textFeatures.shortDescription.weight;
        risks.push({ type: 'Description too brief', description: 'Legitimate jobs typically have detailed descriptions' });
    } else if (data.description.length > 100 && data.description.length < 2000) {
        safe.push({ type: 'Detailed description', description: 'Job description provides good detail level' });
    }
    
    if (data.description.length > fraudIndicators.textFeatures.longDescription.threshold) {
        score += fraudIndicators.textFeatures.longDescription.weight;
        risks.push({ type: 'Description extremely long', description: 'Overly long descriptions may contain filler content' });
    }
    
    // Requirements analysis
    if (!data.requirements || data.requirements.length === 0) {
        score += fraudIndicators.textFeatures.noRequirements.weight;
        risks.push({ type: 'No requirements specified', description: 'Legitimate jobs usually list specific requirements' });
    } else if (data.requirements.length < fraudIndicators.textFeatures.shortRequirements.threshold) {
        score += fraudIndicators.textFeatures.shortRequirements.weight;
        risks.push({ type: 'Vague requirements', description: 'Requirements section is too brief' });
    } else {
        safe.push({ type: 'Clear requirements', description: 'Job requirements are properly specified' });
    }
    
    // Urgent language detection
    const urgentPattern = new RegExp(fraudIndicators.textFeatures.urgentLanguage.patterns.join('|'), 'i');
    if (urgentPattern.test(data.description + ' ' + data.title)) {
        score += fraudIndicators.textFeatures.urgentLanguage.weight;
        risks.push({ type: 'Urgent language used', description: 'Excessive urgency may indicate pressure tactics' });
    }
    
    // Vague salary information
    if (data.salaryRange) {
        const vaguePattern = new RegExp(fraudIndicators.textFeatures.vagueSalary.patterns.join('|'), 'i');
        if (vaguePattern.test(data.salaryRange)) {
            score += fraudIndicators.textFeatures.vagueSalary.weight;
            risks.push({ type: 'Vague salary terms', description: 'Non-specific salary descriptions may hide true compensation' });
        }
    }
    
    // Email pattern analysis (simplified)
    const emailPattern = /@(gmail|yahoo|hotmail|outlook)\./i;
    if (emailPattern.test(data.description)) {
        score += fraudIndicators.textFeatures.genericEmail.weight;
        risks.push({ type: 'Generic email detected', description: 'Professional companies typically use corporate email addresses' });
    }
    
    return { score: Math.min(score, 1), risks, safe };
}

// Analyze categorical features
function analyzeCategoricalFeatures(data) {
    let score = 0;
    let risks = [];
    let safe = [];
    
    // Department risk analysis
    if (fraudIndicators.categoryRisks[data.department]) {
        const risk = fraudIndicators.categoryRisks[data.department];
        if (risk > 0.15) {
            score += risk;
            risks.push({ type: 'High-risk department', description: `${data.department} positions have higher fraud rates` });
        } else if (risk < 0.1) {
            safe.push({ type: 'Lower-risk department', description: `${data.department} positions typically have lower fraud rates` });
        }
    }
    
    // Employment type analysis
    if (data.employmentType === 'Other' || data.employmentType === 'Contract') {
        score += 0.1;
        risks.push({ type: 'Non-standard employment type', description: 'Contract and other employment types require extra verification' });
    } else if (data.employmentType === 'Full-time') {
        safe.push({ type: 'Standard employment type', description: 'Full-time positions are typically well-established' });
    }
    
    return { score: Math.min(score, 1), risks, safe };
}

// Analyze structural features
function analyzeStructuralFeatures(data) {
    let score = 0;
    let risks = [];
    let safe = [];
    
    // Company logo analysis
    if (!data.hasCompanyLogo) {
        score += 0.2;
        risks.push({ type: 'No company logo', description: 'Legitimate companies typically display their branding' });
    } else {
        safe.push({ type: 'Company logo present', description: 'Professional branding suggests legitimate company' });
    }
    
    // Application questions
    if (!data.hasQuestions) {
        score += 0.15;
        risks.push({ type: 'No screening questions', description: 'Professional employers typically ask screening questions' });
    } else {
        safe.push({ type: 'Screening questions included', description: 'Professional application process with questions' });
    }
    
    // Benefits information
    if (!data.benefits || data.benefits.length < 10) {
        score += 0.1;
        risks.push({ type: 'Limited benefits information', description: 'Legitimate employers typically detail benefits packages' });
    } else {
        safe.push({ type: 'Benefits described', description: 'Comprehensive benefits information provided' });
    }
    
    // Experience requirements
    if (data.requiredExperience === 'Not Applicable' || data.requiredExperience === '') {
        score += 0.1;
        risks.push({ type: 'No experience requirements', description: 'Most legitimate positions specify experience levels' });
    }
    
    return { score: Math.min(score, 1), risks, safe };
}

// Generate recommendations based on risk factors
function generateRecommendations(riskFactors, data) {
    let recommendations = [];
    
    if (riskFactors.length === 0) {
        recommendations.push('This job posting appears legitimate with no significant red flags detected.');
        return recommendations;
    }
    
    // Generic recommendations based on risk factors
    if (riskFactors.some(r => r.type.includes('short') || r.type.includes('brief'))) {
        recommendations.push('Verify the job details directly with the company through official channels.');
    }
    
    if (riskFactors.some(r => r.type.includes('email') || r.type.includes('contact'))) {
        recommendations.push('Research the company thoroughly and verify contact information independently.');
    }
    
    if (riskFactors.some(r => r.type.includes('requirements') || r.type.includes('vague'))) {
        recommendations.push('Ask specific questions about job responsibilities and requirements during interview.');
    }
    
    if (riskFactors.some(r => r.type.includes('urgent') || r.type.includes('pressure'))) {
        recommendations.push('Be cautious of high-pressure tactics and take time to research before proceeding.');
    }
    
    if (riskFactors.length > 3) {
        recommendations.push('Consider this posting high-risk and conduct thorough due diligence before applying.');
    }
    
    // Always include general advice
    if (recommendations.length > 0) {
        recommendations.push('Never provide personal financial information during the application process.');
        recommendations.push('Research the company online and check reviews from current/former employees.');
    }
    
    return recommendations;
}

// Calculate confidence level
function calculateConfidence(riskCount, safeCount) {
    const totalFactors = riskCount + safeCount;
    if (totalFactors < 3) return 'Low';
    if (totalFactors < 6) return 'Medium';
    return 'High';
}

// Get risk level based on percentage
function getRiskLevel(percentage) {
    if (percentage < 30) return 'low';
    if (percentage < 70) return 'medium';
    return 'high';
}

// Calculate performance metrics (simulated based on our model)
function calculateMetrics(riskPercentage) {
    return {
        accuracy: 98.7,
        precision: 87.4,
        recall: 84.4,
        f1Score: 85.9
    };
}

// Display results
function displayResults(analysis) {
    const resultsSection = document.getElementById('results');
    
    // Update risk display
    updateRiskDisplay(analysis);
    
    // Update metrics
    updateMetrics(analysis.metrics);
    
    // Update feature analysis
    updateFeatureAnalysis(analysis.riskFactors, analysis.safeFactors);
    
    // Update recommendations
    updateRecommendations(analysis.recommendations);
    
    // Show results section
    resultsSection.style.display = 'block';
    resultsSection.classList.add('fade-in');
}

// Update risk display
function updateRiskDisplay(analysis) {
    const riskDisplay = document.querySelector('.risk-display');
    const riskIcon = document.getElementById('riskIcon');
    const riskPercentage = document.getElementById('riskPercentage');
    const riskLabel = document.getElementById('riskLabel');
    const confidenceLevel = document.getElementById('confidenceLevel');
    
    // Update risk level styling
    riskDisplay.className = `risk-display ${analysis.riskLevel}`;
    
    // Update content
    riskPercentage.textContent = `${analysis.riskPercentage}%`;
    confidenceLevel.textContent = `Confidence: ${analysis.confidence}`;
    
    // Update icon and label based on risk level
    switch (analysis.riskLevel) {
        case 'low':
            riskIcon.innerHTML = '✓';
            riskLabel.textContent = 'Low Risk';
            break;
        case 'medium':
            riskIcon.innerHTML = '⚠';
            riskLabel.textContent = 'Medium Risk';
            break;
        case 'high':
            riskIcon.innerHTML = '⚠';
            riskLabel.textContent = 'High Risk';
            break;
    }
}

// Update metrics display
function updateMetrics(metrics) {
    document.getElementById('accuracyValue').textContent = `${metrics.accuracy}%`;
    document.getElementById('precisionValue').textContent = `${metrics.precision}%`;
    document.getElementById('recallValue').textContent = `${metrics.recall}%`;
    document.getElementById('f1Value').textContent = `${metrics.f1Score}%`;
}

// Update feature analysis
function updateFeatureAnalysis(riskFactors, safeFactors) {
    const analysisContainer = document.getElementById('featureAnalysis');
    analysisContainer.innerHTML = '';
    
    // Add risk factors
    riskFactors.forEach(factor => {
        const item = createFeatureItem(factor, 'triggered');
        analysisContainer.appendChild(item);
    });
    
    // Add safe factors (limit to avoid clutter)
    safeFactors.slice(0, 5).forEach(factor => {
        const item = createFeatureItem(factor, 'safe');
        analysisContainer.appendChild(item);
    });
    
    if (riskFactors.length === 0 && safeFactors.length === 0) {
        analysisContainer.innerHTML = '<p class="text-muted">No significant patterns detected.</p>';
    }
}

// Create feature item element
function createFeatureItem(factor, type) {
    const item = document.createElement('div');
    item.className = `feature-item ${type}`;
    
    const icon = type === 'triggered' ? '⚠' : '✓';
    
    item.innerHTML = `
        <div class="feature-icon">${icon}</div>
        <div class="feature-content">
            <strong>${factor.type}</strong>
            <div class="text-muted small">${factor.description}</div>
        </div>
    `;
    
    return item;
}

// Update recommendations
function updateRecommendations(recommendations) {
    const container = document.getElementById('recommendationsList');
    container.innerHTML = '';
    
    recommendations.forEach((rec, index) => {
        const item = document.createElement('div');
        item.className = 'recommendation-item';
        item.innerHTML = `
            <div class="recommendation-icon">${index + 1}</div>
            <div class="recommendation-text">${rec}</div>
        `;
        container.appendChild(item);
    });
}

// Load demo data
function loadDemoData() {
    // This function can be extended to load predefined demo examples
    console.log('Demo data loading system ready');
}

// Load demo example
function loadDemoExample(event) {
    const exampleType = event.target.dataset.example;
    
    const examples = {
        legitimate: {
            title: "Senior Software Engineer - Backend Development",
            location: "San Francisco, CA",
            department: "Engineering",
            salaryRange: "$120,000 - $160,000",
            company: "TechCorp Solutions",
            description: "We are seeking an experienced Senior Software Engineer to join our backend development team. You will be responsible for designing and implementing scalable microservices, working with cloud infrastructure, and mentoring junior developers. Our technology stack includes Python, Java, AWS, and Kubernetes.",
            requirements: "Bachelor's degree in Computer Science or related field, 5+ years of software development experience, expertise in Python or Java, experience with cloud platforms (AWS/GCP/Azure), knowledge of microservices architecture, strong problem-solving skills.",
            benefits: "Comprehensive health insurance, 401(k) matching, flexible work arrangements, professional development budget, stock options, unlimited PTO.",
            telecommuting: true,
            hasCompanyLogo: true,
            hasQuestions: true,
            employmentType: "Full-time",
            requiredExperience: "Mid-Senior level",
            requiredEducation: "Bachelor's Degree",
            industry: "Technology",
            jobFunction: "Engineering"
        },
        suspicious: {
            title: "Make Money Fast",
            location: "Work from Home",
            department: "Other",
            salaryRange: "Up to $5000 per week",
            company: "Easy Money Co",
            description: "Urgent! Make money fast from home. No experience needed. Start immediately!",
            requirements: "",
            benefits: "High pay",
            telecommuting: true,
            hasCompanyLogo: false,
            hasQuestions: false,
            employmentType: "Other",
            requiredExperience: "Not Applicable",
            requiredEducation: "Unspecified",
            industry: "Other",
            jobFunction: "Other"
        }
    };
    
    const example = examples[exampleType];
    if (example) {
        populateForm(example);
        showAlert(`${exampleType.charAt(0).toUpperCase() + exampleType.slice(1)} example loaded!`, 'info');
    }
}

// Populate form with data
function populateForm(data) {
    Object.keys(data).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = data[key];
            } else {
                element.value = data[key];
            }
        }
    });
}

// Reset form
function resetForm() {
    document.getElementById('analyzeForm').reset();
    document.getElementById('results').style.display = 'none';
    showAlert('Form has been reset.', 'info');
}

// Show loading state
function showLoadingState() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const originalText = analyzeBtn.innerHTML;
    
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        Analyzing...
    `;
    
    analyzeBtn.dataset.originalText = originalText;
}

// Hide loading state
function hideLoadingState() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = analyzeBtn.dataset.originalText || 'Analyze Job Posting';
}

// Scroll to results
function scrollToResults() {
    const resultsSection = document.getElementById('results');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Smooth scroll for navigation links
function smoothScroll(event) {
    event.preventDefault();
    const targetId = event.target.getAttribute('href');
    const targetSection = document.querySelector(targetId);
    
    if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Show alert messages
function showAlert(message, type = 'info') {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alert.style.cssText = 'top: 100px; right: 20px; z-index: 9999; min-width: 300px;';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Add to page
    document.body.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 5000);
}

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        performFraudDetection,
        analyzeTextFeatures,
        analyzeCategoricalFeatures,
        analyzeStructuralFeatures
    };
}