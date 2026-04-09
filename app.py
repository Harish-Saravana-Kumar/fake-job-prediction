"""
BERT Fake Job Detector - Flask REST API Backend (Modular v2.0)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import time

# Add backend package to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.config import (
    FLASK_HOST, FLASK_PORT, FLASK_DEBUG, CORS_ORIGINS,
    HF_MODEL_ID
)
from backend.model_loader import load_model
from backend.validators import parse_input, validate_input, get_validation_rules
from backend.analyzer import analyze_with_bert, prioritize_text_for_bert
from backend.rules import (
    analyze_risk_indicators,
    get_confidence_band_and_review,
    extract_prediction_review_terms,
    generate_suggestions
)
from backend.explainer import extract_attention_weights, generate_feature_explanation
from backend.metrics import get_collector


# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": CORS_ORIGINS}})

# Global state
predictor = None
MODEL_LOADED = False
MODEL_ERROR = None
metrics = get_collector()


# ==================== INITIALIZATION ====================

def initialize_app():
    """Initialize app on startup."""
    global predictor, MODEL_LOADED, MODEL_ERROR
    
    print("\n" + "="*60)
    print("BERT FAKE JOB DETECTOR - BACKEND API (Modular v2.0)")
    print("="*60)
    
    predictor, success, error = load_model()
    MODEL_LOADED = success
    MODEL_ERROR = error
    
    if not success:
        print(f"\n⚠️  WARNING: Model failed to load")
        print(f"   Error: {error}")
        print(f"   API will be unavailable for predictions")
    else:
        print(f"\n✓ Model loaded successfully!")
        print(f"  API endpoints ready")


# ==================== VALIDATION ENDPOINTS ====================

@app.route('/api/validate', methods=['POST'])
def validate_endpoint():
    """
    Validate job posting input.
    
    Request JSON:
    {
        "description": "...",
        "title": "...",
        "company": "..."
    }
    
    Response JSON:
    {
        "valid": bool,
        "errors": [...],
        "warnings": [...],
        "textLength": int
    }
    """
    start_time = time.time()
    try:
        data = request.json or {}
        
        # Parse input
        parsed = parse_input(
            data.get('description', ''),
            data.get('title', ''),
            data.get('company', '')
        )
        
        # Validate
        validation_result = validate_input(parsed)
        
        # Record metrics
        elapsed_ms = (time.time() - start_time) * 1000
        metrics.record_validation(elapsed_ms, validation_result['valid'], len(validation_result['errors']))
        
        return jsonify({
            'success': True,
            'valid': validation_result['valid'],
            'errors': validation_result['errors'],
            'warnings': validation_result['warnings'],
            'textLength': validation_result['text_length']
        }), 200
    
    except Exception as e:
        elapsed_ms = (time.time() - start_time) * 1000
        metrics.record_error(str(e), '/api/validate')
        return jsonify({
            'success': False,
            'error': f'Validation failed: {str(e)}'
        }), 400


@app.route('/api/rules', methods=['GET'])
def validation_rules():
    """
    Get validation rules (for frontend to sync).
    
    Response JSON:
    {
        "maxDescriptionLength": int,
        "maxTitleLength": int,
        "maxCompanyLength": int,
        "minAnalyzeChars": int
    }
    """
    return jsonify({
        'success': True,
        'rules': get_validation_rules()
    }), 200


# ==================== PREDICTION ENDPOINTS ====================

@app.route('/api/analyze', methods=['POST'])
def analyze_endpoint():
    """
    Analyze job posting (BERT inference only, no post-processing).
    
    Request JSON:
    {
        "text": "combined job posting text"
    }
    
    Response JSON:
    {
        "prediction": 0 or 1,
        "isFake": bool,
        "fakeProbability": float,
        "realProbability": float,
        "confidence": float
    }
    """
    if not MODEL_LOADED:
        return jsonify({
            'success': False,
            'error': 'Model not loaded',
            'details': MODEL_ERROR
        }), 503
    
    try:
        data = request.json or {}
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({
                'success': False,
                'error': 'No text provided'
            }), 400
        
        # BERT inference
        analysis = analyze_with_bert(predictor, text)
        
        return jsonify({
            'success': True,
            'prediction': analysis['prediction'],
            'isFake': analysis['is_fake'],
            'fakeProbability': analysis['fake_probability'],
            'realProbability': analysis['real_probability'],
            'confidence': analysis['confidence']
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Analysis failed: {str(e)}'
        }), 500


@app.route('/api/suggest', methods=['POST'])
def suggest_endpoint():
    """
    Generate suggestions based on prediction details.
    
    Request JSON:
    {
        "text": "job posting text",
        "isFake": bool,
        "fakeProbability": float
    }
    
    Response JSON:
    {
        "suggestions": [...],
        "confidenceBand": "High|Medium|Low",
        "reviewNeeded": bool
    }
    """
    try:
        data = request.json or {}
        text = data.get('text', '').strip()
        is_fake = data.get('isFake', False)
        fake_prob = data.get('fakeProbability', 50)
        real_prob = 100 - fake_prob
        
        if not text:
            return jsonify({
                'success': False,
                'error': 'No text provided'
            }), 400
        
        # Generate suggestions
        suggestions, indicators, indicator_details = generate_suggestions(is_fake, fake_prob, text)
        
        # Get confidence band and review flag
        confidence_band, review_needed = get_confidence_band_and_review(
            fake_prob, real_prob, indicators
        )
        
        return jsonify({
            'success': True,
            'suggestions': suggestions,
            'confidenceBand': confidence_band,
            'reviewNeeded': review_needed,
            'indicators': indicators
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Suggestion generation failed: {str(e)}'
        }), 500


@app.route('/api/predict', methods=['POST'])
def predict_endpoint():
    """
    Complete one-shot prediction (validation + BERT + post-processing).
    
    Request JSON:
    {
        "text": "job posting text",
        "title": "job title (optional)",
        "company": "company name (optional)"
    }
    
    Response JSON: Comprehensive with all signals (prediction, confidence, suggestions, review_signals)
    """
    start_time = time.time()
    
    if not MODEL_LOADED:
        return jsonify({
            'success': False,
            'error': 'Model not loaded',
            'details': MODEL_ERROR
        }), 503
    
    try:
        data = request.json or {}
        
        # Parse input
        parsed = parse_input(
            data.get('text', ''),
            data.get('title', ''),
            data.get('company', '')
        )
        
        # Validate
        validation = validate_input(parsed)
        if not validation['valid']:
            return jsonify({
                'success': False,
                'error': 'Validation failed',
                'errors': validation['errors']
            }), 400
        
        text = parsed['combined_text']
        
        # Prioritize text for BERT: front-load high-signal content
        # This ensures BERT sees the most important fraud indicators first,
        # since the model truncates to 128 tokens (~500 chars)
        bert_text = prioritize_text_for_bert(
            parsed['title'],
            parsed['company'],
            parsed['description']
        )
        
        # BERT inference on prioritized text
        analysis = analyze_with_bert(predictor, bert_text)
        is_fake = analysis['is_fake']
        fake_prob = analysis['fake_probability']
        real_prob = analysis['real_probability']
        
        # Generate suggestions
        suggestions, indicators, indicator_details = generate_suggestions(is_fake, fake_prob, text)
        
        # Get confidence band and review flag
        confidence_band, review_needed = get_confidence_band_and_review(
            fake_prob, real_prob, indicators
        )
        
        # Extract review terms
        review_terms = extract_prediction_review_terms(text, indicator_details)
        
        indicator_feature_text = '; '.join(
            (
                f"{detail['category']}: {', '.join(detail.get('matched_phrases', []))}"
                if detail.get('matched_phrases')
                else detail['category']
            )
            for detail in indicator_details
        )

        # Create summary tuned to probability mix
        if is_fake:
            summary = (
                f"Highly likely fake posting (fake probability {fake_prob:.1f}% vs real {real_prob:.1f}%). "
                "All detected symptoms align with common scam patterns."
            )
        elif review_needed:
            summary = (
                f"Model leans real (fake probability {fake_prob:.1f}% vs real {real_prob:.1f}%), "
                "but caution is advised because several signals require manual verification."
            )
        else:
            summary = (
                f"Low fraud risk signal (real probability {real_prob:.1f}% ). "
                "Still verify recruiter identity and official channels."
            )
        
        if indicator_feature_text:
            reason = f"Risk evidence: {indicator_feature_text}."
        else:
            reason = 'No explicit keyword-based risk indicators were detected.'
        
        # Record metrics
        elapsed_ms = (time.time() - start_time) * 1000
        metrics.record_prediction(elapsed_ms, is_fake, analysis['confidence'], len(text))
        
        return jsonify({
            'success': True,
            'prediction': analysis['prediction'],
            'isFake': is_fake,
            'prediction_label': 'Fake Posting' if is_fake else 'Real Posting',
            'fakeProbability': fake_prob,
            'realProbability': real_prob,
            'confidence': analysis['confidence'],
            'confidenceBand': confidence_band,
            'reviewNeeded': review_needed,
            'textLength': len(text),
            'suggestions': suggestions,
            'indicators': indicators,
            'whyFlagged': {
                'summary': summary,
                'reason': reason,
                'indicatorCount': len(indicator_details),
                'indicatorDetails': indicator_details,
                'reviewSignals': {
                    'fakeTerms': review_terms['fake_terms'],
                    'goodTerms': review_terms['good_terms']
                }
            }
        }), 200
    
    except Exception as e:
        elapsed_ms = (time.time() - start_time) * 1000
        metrics.record_error(str(e), '/api/predict')
        import traceback
        print(f"Prediction error: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'Prediction failed: {str(e)}'
        }), 500


@app.route('/api/explain', methods=['POST'])
def explain_endpoint():
    """
    Get explainability data for a prediction.
    
    Request JSON:
    {
        "text": "job posting text",
        "isFake": bool,
        "indicators": [indicator_detail_dicts]
    }
    
    Response JSON:
    {
        "attention_weights": {...},
        "feature_importance": [...],
        "explanation": str
    }
    """
    if not MODEL_LOADED:
        return jsonify({
            'success': False,
            'error': 'Model not loaded'
        }), 503
    
    try:
        data = request.json or {}
        text = data.get('text', '').strip()
        is_fake = data.get('isFake', False)
        indicators = data.get('indicators', [])
        
        if not text:
            return jsonify({
                'success': False,
                'error': 'No text provided'
            }), 400
        
        # Extract attention weights
        attention_data = extract_attention_weights(predictor, text, top_k=10)
        
        # Generate feature importance explanation
        feature_explanation = generate_feature_explanation(indicators, 
                                                          data.get('fakeProbability', 50),
                                                          data.get('realProbability', 50))
        
        return jsonify({
            'success': True,
            'attention_weights': attention_data,
            'feature_importance': feature_explanation,
            'explanation': feature_explanation['explanation_text']
        }), 200
    
    except Exception as e:
        import traceback
        print(f"Explanation error: {str(e)}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'Explanation generation failed: {str(e)}'
        }), 500


# ==================== STATUS ENDPOINTS ====================

@app.route('/api/status', methods=['GET'])
def status_endpoint():
    """
    Check API and model status with operational metrics.
    
    Response JSON:
    {
        "status": "ready" | "model_not_loaded",
        "modelLoaded": bool,
        "modelPath": str,
        "endpoints": {...},
        "metrics": {...}
    }
    """
    metrics_snapshot = metrics.get_snapshot()
    health_status = metrics.get_health_status()
    
    return jsonify({
        'success': True,
        'status': 'ready' if MODEL_LOADED else 'model_not_loaded',
        'modelLoaded': MODEL_LOADED,
        'modelPath': HF_MODEL_ID if MODEL_LOADED else 'not_loaded',
        'endpoints': {
            'POST /api/validate': 'Validate input',
            'GET /api/rules': 'Get validation rules',
            'POST /api/analyze': 'BERT inference only',
            'POST /api/suggest': 'Generate suggestions',
            'POST /api/predict': 'Complete prediction',
            'POST /api/explain': 'Get explainability data',
            'GET /api/status': 'Check status',
            'GET /api/metrics': 'Get detailed metrics'
        },
        'metrics': {
            'totalPredictions': metrics_snapshot.total_predictions,
            'totalValidations': metrics_snapshot.total_validations,
            'avgPredictionLatencyMs': metrics_snapshot.avg_prediction_latency_ms,
            'avgValidationLatencyMs': metrics_snapshot.avg_validation_latency_ms,
            'fakeCount': metrics_snapshot.fake_count,
            'realCount': metrics_snapshot.real_count,
            'avgConfidence': metrics_snapshot.avg_confidence,
            'errorCount': metrics_snapshot.error_count,
            'uptimeSeconds': metrics_snapshot.uptime_seconds,
            'health': health_status['status']
        }
    }), 200


@app.route('/api/metrics', methods=['GET'])
def metrics_endpoint():
    """
    Get detailed operational metrics.
    
    Response JSON:
    {
        "snapshot": {...},
        "health": {...}
    }
    """
    metrics_snapshot = metrics.get_snapshot()
    health_status = metrics.get_health_status()
    
    return jsonify({
        'success': True,
        'snapshot': {
            'totalPredictions': metrics_snapshot.total_predictions,
            'totalValidations': metrics_snapshot.total_validations,
            'avgPredictionLatencyMs': metrics_snapshot.avg_prediction_latency_ms,
            'avgValidationLatencyMs': metrics_snapshot.avg_validation_latency_ms,
            'fakeCount': metrics_snapshot.fake_count,
            'realCount': metrics_snapshot.real_count,
            'avgConfidence': metrics_snapshot.avg_confidence,
            'errorCount': metrics_snapshot.error_count,
            'uptimeSeconds': metrics_snapshot.uptime_seconds,
            'lastUpdated': metrics_snapshot.last_updated
        },
        'health': health_status,
        'timestamp': health_status
    }), 200


@app.route('/api/info', methods=['GET'])
def info_endpoint():
    """
    Get model information.
    
    Response JSON:
    {
        "name": str,
        "version": str,
        "modelType": str,
        "status": str
    }
    """
    return jsonify({
        'success': True,
        'name': 'BERT Fake Job Posting Detector',
        'version': '2.1.0',
        'modelType': 'BERT-base (Hugging Face Transformers)',
        'status': 'ready' if MODEL_LOADED else 'not_loaded'
    }), 200


@app.route('/', methods=['GET'])
def home():
    """API home."""
    return jsonify({
        'message': 'BERT Fake Job Detector API v2.0',
        'status': 'ready' if MODEL_LOADED else 'model_not_loaded',
        'docs': 'See /api/status for endpoint list'
    }), 200


# ==================== ERROR HANDLERS ====================

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404


@app.errorhandler(500)
def server_error(error):
    """Handle 500 errors."""
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500


# ==================== MAIN ====================

if __name__ == '__main__':
    initialize_app()
    print("\n✓ Starting Flask server...")
    print(f"  API running on: http://{FLASK_HOST}:{FLASK_PORT}")
    print("  Open index.html in your browser")
    print("\nPress Ctrl+C to stop\n")
    app.run(debug=FLASK_DEBUG, host=FLASK_HOST, port=FLASK_PORT)
