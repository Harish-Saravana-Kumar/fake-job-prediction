"""
Input validation rules (shared between frontend and backend)
"""

from backend.config import (
    MAX_DESCRIPTION_LENGTH,
    MAX_TITLE_LENGTH,
    MAX_COMPANY_LENGTH,
    MIN_ANALYZE_CHARS
)

def normalize_text(value):
    """Collapse whitespace and trim input"""
    if not isinstance(value, str):
        return ""
    return ' '.join(value.split()).strip()


def parse_input(description, title, company):
    """
    Parse and normalize all fields.
    
    Returns:
        dict: {description, title, company, combined_text}
    """
    desc_norm = normalize_text(description) if description else ""
    title_norm = normalize_text(title) if title else ""
    company_norm = normalize_text(company) if company else ""
    
    combined_text = ' '.join([desc_norm, title_norm, company_norm]).strip()
    
    return {
        'description': desc_norm,
        'title': title_norm,
        'company': company_norm,
        'combined_text': combined_text
    }


def validate_input(parsed_input):
    """
    Validate parsed input.
    
    Args:
        parsed_input: dict from parse_input()
    
    Returns:
        dict: {valid: bool, errors: [], warnings: []}
    """
    errors = []
    warnings = []
    
    combined_text = parsed_input.get('combined_text', '')
    description = parsed_input.get('description', '')
    title = parsed_input.get('title', '')
    company = parsed_input.get('company', '')
    
    # Empty check
    if not combined_text:
        errors.append('Please provide at least one field (description, title, or company).')
    
    # Minimum length check
    elif len(combined_text) < MIN_ANALYZE_CHARS:
        errors.append(f'Combined text must be at least {MIN_ANALYZE_CHARS} characters. You have {len(combined_text)}.')
    
    # Max length checks
    if len(description) > MAX_DESCRIPTION_LENGTH:
        errors.append(f'Description exceeds maximum length of {MAX_DESCRIPTION_LENGTH} characters.')
    
    if len(title) > MAX_TITLE_LENGTH:
        errors.append(f'Job title exceeds maximum length of {MAX_TITLE_LENGTH} characters.')
    
    if len(company) > MAX_COMPANY_LENGTH:
        errors.append(f'Company name exceeds maximum length of {MAX_COMPANY_LENGTH} characters.')
    
    # Warnings for very short text
    if len(combined_text) < 50:
        warnings.append('Text is very short. Prediction may be less reliable.')
    
    # Warnings for very long text
    if len(combined_text) > 3000:
        warnings.append('Text is very long. Processing may take a moment.')
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings,
        'text_length': len(combined_text)
    }


def get_validation_rules():
    """
    Return validation rules as a dict (can be used by frontend via API).
    
    Returns:
        dict: Configuration for frontend validation
    """
    return {
        'maxDescriptionLength': MAX_DESCRIPTION_LENGTH,
        'maxTitleLength': MAX_TITLE_LENGTH,
        'maxCompanyLength': MAX_COMPANY_LENGTH,
        'minAnalyzeChars': MIN_ANALYZE_CHARS
    }
