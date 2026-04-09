"""
Explainability module: extract BERT attention weights and feature importance
for transparent fraud detection reasoning.
"""

import numpy as np
from typing import Dict, List, Tuple


def extract_attention_weights(predictor, text: str, top_k: int = 10) -> Dict:
    """
    Extract attention weights from BERT model to identify key tokens.
    
    This uses the last layer's attention to identify which tokens the model
    focused on when making its prediction.
    
    Args:
        predictor: TransformersPredictorAdapter instance
        text (str): Input text
        top_k (int): Number of top attention-weighted tokens to return
    
    Returns:
        dict: {
            'tokens': list of token strings,
            'attention_weights': list of attention values,
            'top_tokens': list of (token, weight) tuples,
            'attention_score': float (0-100)
        }
    """
    try:
        # Tokenize
        encoded = predictor.tokenizer(
            text,
            return_tensors='pt',
            padding=True,
            truncation=True,
            max_length=predictor.max_length
        )
        
        # Move to device
        inputs = {k: v.to(predictor.device) for k, v in encoded.items()}
        
        # Forward pass with attention output
        import torch
        with torch.no_grad():
            outputs = predictor.model(**inputs, output_attentions=True)
        
        # Extract last layer attention (batch=1, heads=12, tokens, tokens)
        last_attention = outputs.attentions[-1][0]  # (12, seq_len, seq_len)
        
        # Average across all heads and take attention to [CLS] or use max attention across positions
        attention_avg = last_attention.mean(dim=0)  # (seq_len, seq_len)
        
        # Get attention weights to [CLS] token (first position) attending to other tokens
        # Or use the mean of all attention values as a general importance score
        cls_attention = attention_avg[0, :]  # attention from CLS to all tokens
        max_attention = attention_avg.max(dim=0)[0]  # max attention received by each token
        
        attention_weights = (cls_attention.cpu().numpy() + max_attention.cpu().numpy()) / 2
        attention_weights = attention_weights / (attention_weights.sum() + 1e-8)
        
        # Decode tokens
        tokens = predictor.tokenizer.convert_ids_to_tokens(encoded['input_ids'][0])
        
        # Get top-k tokens by attention
        top_indices = np.argsort(attention_weights)[-top_k:][::-1]
        top_tokens = [(tokens[i], float(attention_weights[i])) for i in top_indices if tokens[i] not in ['[CLS]', '[SEP]', '[PAD]']]
        
        # Overall attention score (normalized)
        attention_score = float(np.max(attention_weights) * 100)
        
        return {
            'tokens': [t for t in tokens if t not in ['[CLS]', '[SEP]', '[PAD]']],
            'attention_weights': [float(w) for w in attention_weights if float(w) > 0.001],
            'top_tokens': top_tokens[:top_k],
            'attention_score': min(attention_score, 100.0)
        }
    
    except Exception as e:
        # Fallback if attention extraction fails
        return {
            'tokens': [],
            'attention_weights': [],
            'top_tokens': [],
            'attention_score': 0.0,
            'error': str(e)
        }


def generate_feature_explanation(indicators: List[Dict], fake_prob: float, real_prob: float) -> Dict:
    """
    Generate SHAP-style feature importance explanation.
    
    Uses the detected indicators and probability scores to create a human-readable
    explanation of why the model made its prediction.
    
    Args:
        indicators (list): List of detected indicator dicts from analyze_risk_indicators
        fake_prob (float): Fake probability (0-100)
        real_prob (float): Real probability (0-100)
    
    Returns:
        dict: {
            'feature_importance': [
                {
                    'feature': str (indicator category),
                    'impact_direction': 'increases_risk' | 'decreases_risk',
                    'impact_score': float (0-100),
                    'matched_phrases': [str]
                }
            ],
            'base_score': float,
            'final_score': float,
            'explanation_text': str
        }
    """
    
    feature_importance = []
    
    # Map indicator categories to risk scores
    high_risk_indicators = [
        'Upfront fee request',
        'Payment-before-employment',
        'Suspicious money movement',
        'Unrealistic salary claims'
    ]
    
    medium_risk_indicators = [
        'No experience required',
        'Urgency pressure tactics',
        'Vague work arrangement'
    ]
    
    low_risk_indicators = [
        'Suspicious call-to-action'
    ]
    
    base_score = 50.0  # Neutral starting point
    accumulated_score = base_score
    
    for indicator in indicators:
        category = indicator['category']
        matched = indicator.get('matched_phrases', [])
        
        if category in high_risk_indicators:
            impact_score = 25.0
            impact_direction = 'increases_risk'
            accumulated_score += impact_score
        elif category in medium_risk_indicators:
            impact_score = 12.0
            impact_direction = 'increases_risk'
            accumulated_score += impact_score
        elif category in low_risk_indicators:
            impact_score = 5.0
            impact_direction = 'increases_risk'
            accumulated_score += impact_score
        else:
            impact_score = 0.0
            impact_direction = 'neutral'
        
        feature_importance.append({
            'feature': category,
            'impact_direction': impact_direction,
            'impact_score': impact_score,
            'matched_phrases': matched[:3]  # Limit to 3 phrases per feature
        })
    
    # Clamp final score to 0-100
    final_score = min(max(accumulated_score, 0.0), 100.0)
    
    # Generate textual explanation
    if len(indicators) == 0:
        explanation_text = "No specific fraud indicators detected. The model is relying on general pattern matching."
    elif len(indicators) <= 2:
        categories = [ind['category'] for ind in indicators]
        explanation_text = f"Moderate risk signals detected: {', '.join(categories)}. Manual review recommended."
    else:
        high_risk_found = [ind['category'] for ind in indicators if ind['category'] in high_risk_indicators]
        if high_risk_found:
            explanation_text = f"Multiple high-risk indicators found: {', '.join(high_risk_found)}. Strong fraud signals."
        else:
            explanation_text = f"Multiple risk indicators detected ({len(indicators)} categories). Caution advised."
    
    return {
        'feature_importance': feature_importance,
        'base_score': base_score,
        'final_score': final_score,
        'explanation_text': explanation_text,
        'feature_count': len(indicators)
    }
