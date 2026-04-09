"""
BERT model inference and analysis (pure prediction logic)
Includes smart text prioritization for long job postings
"""

import numpy as np


def prioritize_text_for_bert(title, company, description):
    """
    Reorder text to prioritize high-signal content for BERT truncation.
    
    Since BERT truncates at 128 tokens (~500 chars), this function ensures
    the model sees the most important fraud indicators first.
    
    Strategy:
    1. Title (job role, red flags like "work from home")
    2. Company name (short, contextual)
    3. Extract and front-load suspicious keywords/phrases
    4. Requirements section (if present)
    5. Responsibilities section (if present)
    6. Rest of description
    
    Args:
        title (str): Job title
        company (str): Company name
        description (str): Full job description
    
    Returns:
        str: Reordered text that prioritizes fraud signals
    """
    high_risk_keywords = [
        'work from home', 'work at home', 'remote opportunity',
        'easy money', 'make money fast', 'quick cash', 'high salary',
        'no experience', 'experience required', 'anyone welcome',
        'urgent', 'immediately', 'asap', 'act now', 'limited time',
        'upfront fee', 'processing fee', 'registration fee', 'security deposit',
        'pay to secure', 'training fee', 'certification fee',
        'receive funds', 'transfer money', 'wire transfer',
        'unlimited income', 'guaranteed income', '$5000', '$10000'
    ]
    
    desc_lower = description.lower() if description else ""
    
    # Extract high-risk keywords found in description
    found_keywords = [kw for kw in high_risk_keywords if kw in desc_lower]
    
    # Split description into logical sections
    desc_sections = {
        'requirements': '',
        'responsibilities': '',
        'other': description
    }
    
    # Try to extract requirements and responsibilities sections
    desc_split = description.split('\n')
    current_section = 'other'
    responsibilities_lines = []
    requirements_lines = []
    other_lines = []
    
    for line in desc_split:
        line_lower = line.lower()
        if 'requirement' in line_lower or 'qualification' in line_lower:
            current_section = 'requirements'
        elif 'responsibility' in line_lower or 'duty' in line_lower or 'role' in line_lower:
            current_section = 'responsibilities'
        elif line.strip():  # Non-empty line
            if current_section == 'requirements':
                requirements_lines.append(line)
            elif current_section == 'responsibilities':
                responsibilities_lines.append(line)
            else:
                other_lines.append(line)
    
    # Reconstruct: title + company + keywords + requirements + responsibilities + rest
    prioritized_parts = []
    
    if title:
        prioritized_parts.append(title)
    if company:
        prioritized_parts.append(company)
    
    if found_keywords:
        prioritized_parts.append("Key signals: " + ", ".join(found_keywords))
    
    if requirements_lines:
        prioritized_parts.append("Requirements: " + " ".join(requirements_lines[:100]))  # limit
    
    if responsibilities_lines:
        prioritized_parts.append("Responsibilities: " + " ".join(responsibilities_lines[:100]))  # limit
    
    if other_lines:
        prioritized_parts.append(" ".join(other_lines[:200]))  # limit other content
    
    return " ".join(prioritized_parts)


def analyze_with_bert(predictor, text):
    """
    Perform BERT inference on job posting text.
    
    Args:
        predictor: KtrainPredictorAdapter instance
        text (str): Job posting text
    
    Returns:
        dict: {
            'prediction': int (0=real, 1=fake),
            'fake_probability': float (0-100),
            'real_probability': float (0-100),
            'confidence': float (0-100)
        }
    """
    # Get prediction label
    prediction = predictor.predict(text)  # 0 = real, 1 = fake
    
    # Get probabilities
    probabilities = predictor.predict_proba([text])[0]
    
    is_fake = int(prediction) == 1
    fake_prob = round(float(probabilities[1]) * 100, 2)
    real_prob = round(float(probabilities[0]) * 100, 2)
    confidence = max(fake_prob, real_prob)
    
    return {
        'prediction': prediction,
        'is_fake': is_fake,
        'fake_probability': fake_prob,
        'real_probability': real_prob,
        'confidence': confidence
    }
