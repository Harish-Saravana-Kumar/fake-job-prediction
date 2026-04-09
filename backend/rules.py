"""
Rule-based analysis: risk indicators, review signals, and suggestions
"""

from backend.config import CONFIDENCE_HIGH, CONFIDENCE_MEDIUM


def analyze_risk_indicators(text):
    """
    Extract suspicious indicators from job posting text with nuanced scam patterns.
    
    Args:
        text (str): Job posting text
    
    Returns:
        dict: {categories: [...], details: [...]}
    """
    text_lower = text.lower()
    
    # Richer, nuanced indicator categories with examples and risk levels
    indicator_patterns = {
        # Critical: Direct financial exploitation
        'Upfront fee request': {
            'phrases': ['processing fee', 'upfront fee', 'pay upfront', 'one-time fee', 'registration fee', 'training fee', 'security deposit', 'enrollment fee'],
            'risk_level': 'critical',
            'explanation': 'Legitimate employers never charge fees to apply or start work.'
        },
        'Payment-before-employment': {
            'phrases': ['upon receipt of payment', 'after payment is received', 'starting immediately after payment', 'pay to secure your spot', 'confirm employment with payment'],
            'risk_level': 'critical',
            'explanation': 'No job starts after the candidate sends money.'
        },
        'Suspicious money movement': {
            'phrases': ['receive funds into your personal account', 'transfer the remainder', 'wire money', 'money transfer', 'receive payment and send back', 'cash handling test'],
            'risk_level': 'critical',
            'explanation': 'Legitimate jobs never ask you to move money on their behalf.'
        },
        
        # High: Unrealistic promises & isolation tactics
        'Unrealistic salary claims': {
            'phrases': ['easy money', 'high salary guarantee', 'quick cash', 'guaranteed income', 'make money fast', '$5000', '$10000', 'guaranteed earnings'],
            'risk_level': 'high',
            'explanation': 'Unrealistic pay without corresponding experience/qualifications.'
        },
        'No experience required': {
            'phrases': ['no experience', 'anyone welcome', 'no requirements', 'no qualifications needed', 'entry level for everyone', 'zero experience'],
            'risk_level': 'high',
            'explanation': 'Most legitimate roles require some background; universal acceptance is suspicious.'
        },
        'Urgency pressure tactics': {
            'phrases': ['urgent hiring', 'hiring immediately', 'asap', 'act now', 'limited time', 'closing soon', 'only 2 spots left', 'apply before slots fill'],
            'risk_level': 'high',
            'explanation': 'Creating artificial pressure to bypass rational decision-making.'
        },
        
        # Medium: Vague or work-from-home focused
        'Vague work arrangement': {
            'phrases': ['work from home', 'work at home', 'remote opportunity', 'flexible hours', 'passive income', 'no office required', 'work your schedule'],
            'risk_level': 'medium',
            'explanation': 'Remote-only roles with vague duties or compensation are often pyramid schemes.'
        },
        'Unclear job duties': {
            'phrases': ['simple tasks', 'easy work', 'minimal effort', 'reselling', 'selling our platform', 'recruiting others'],
            'risk_level': 'medium',
            'explanation': 'Legitimate jobs have clear responsibilities; vague duties suggest MLM or data harvesting.'
        },
        'Privacy/contact concerns': {
            'phrases': ['personal number', 'personal email preferred', 'signal or whatsapp', 'encrypted chat', 'avoid company email'],
            'risk_level': 'medium',
            'explanation': 'Avoiding official channels raises red flags about legitimacy.'
        },
        
        # Low-Medium: Call-to-action and communication red flags
        'Suspicious call-to-action': {
            'phrases': ['click here', 'apply now', 'don\'t delay', 'don\'t miss out'],
            'risk_level': 'low-medium',
            'explanation': 'Aggressive language designed to prevent careful consideration.'
        },
        'Non-standard communication': {
            'phrases': ['reply only via', 'text to apply', 'use only this link', 'send cv to personal email'],
            'risk_level': 'low-medium',
            'explanation': 'Legitimate employers use professional application systems.'
        }
    }

    matched = []
    matched_details = []
    
    for category, config in indicator_patterns.items():
        phrases = config['phrases']
        risk_level = config.get('risk_level', 'unknown')
        explanation = config.get('explanation', '')
        
        category_matches = []
        for phrase in phrases:
            if phrase in text_lower:
                category_matches.append(phrase)

        if category_matches:
            matched.append(category)
            matched_details.append({
                'category': category,
                'matched_phrases': category_matches,
                'risk_level': risk_level,
                'explanation': explanation
            })

    return {
        'categories': matched,
        'details': matched_details
    }


def get_confidence_band_and_review(fake_prob, real_prob, indicators):
    """
    Create confidence band and review flag for user-facing trust signals.
    
    Args:
        fake_prob (float): Fake probability (0-100)
        real_prob (float): Real probability (0-100)
        indicators (list): List of detected risk indicator categories
    
    Returns:
        tuple: (confidence_band: str, review_needed: bool)
    """
    confidence = max(fake_prob, real_prob)

    if confidence >= CONFIDENCE_HIGH:
        confidence_band = 'High'
    elif confidence >= CONFIDENCE_MEDIUM:
        confidence_band = 'Medium'
    else:
        confidence_band = 'Low'

    fake_prob_mid_zone = 35 <= fake_prob <= 65
    has_indicators = len(indicators) > 0
    review_needed = (
        fake_prob >= 50  # any fake-leaning decision should request review
        or confidence_band != 'High'
        or fake_prob_mid_zone
        or (fake_prob >= 30 and has_indicators)
    )

    return confidence_band, review_needed


def extract_prediction_review_terms(text, indicator_details):
    """
    Return matched terms that support fake vs genuine interpretation.
    
    Args:
        text (str): Job posting text
        indicator_details (list): From analyze_risk_indicators()['details']
    
    Returns:
        dict: {fake_terms: [...], good_terms: [...]}
    """
    text_lower = text.lower()

    # Fake terms come from matched risk indicators
    fake_terms = []
    for item in indicator_details:
        for phrase in item.get('matched_phrases', []):
            if phrase not in fake_terms:
                fake_terms.append(phrase)

    # Good term patterns indicate legitimate job posts
    good_signal_patterns = [
        'requirements', 'responsibilities', 'experience', 'apply through',
        'career page', 'benefits', 'license', 'certification', 'degree',
        'interview', 'full-time', 'part-time', 'hybrid', 'onsite', 'salary range'
    ]

    good_terms = []
    for phrase in good_signal_patterns:
        if phrase in text_lower and phrase not in good_terms:
            good_terms.append(phrase)

    return {
        'fake_terms': fake_terms[:10],
        'good_terms': good_terms[:10]
    }


def generate_suggestions(is_fake, fake_prob, text):
    """
    Generate actionable suggestions based on prediction.
    
    Args:
        is_fake (bool): BERT prediction
        fake_prob (float): Fake probability (0-100)
        text (str): Job posting text
    
    Returns:
        tuple: (suggestions: list, indicators: list, indicator_details: list)
    """
    indicator_analysis = analyze_risk_indicators(text)
    indicators = indicator_analysis['categories']
    suggestions = []

    if is_fake:
        suggestions.append('Verify company website, email domain, and LinkedIn presence before applying.')
        suggestions.append('Do not share personal documents or pay any upfront fee during recruitment.')
        suggestions.append('Cross-check the role on official company career pages or trusted job portals.')
    elif fake_prob >= 35:
        suggestions.append('Proceed carefully: ask for a detailed JD, interview process, and reporting manager details.')
        suggestions.append('Validate compensation range and benefits against market norms for the role.')
    else:
        suggestions.append('Posting appears low-risk, but still verify recruiter identity and company profile.')
        suggestions.append('Prefer applications through official career pages for safer communication.')

    if indicators:
        suggestions.append('Detected risk signals: ' + ', '.join(indicators) + '.')

    return suggestions, indicators, indicator_analysis['details']
