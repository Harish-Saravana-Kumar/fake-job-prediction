"""Configuration and constants for BERT Fake Job Detector."""

import os

# Hugging Face model configuration
HF_MODEL_ID = os.getenv('HF_MODEL_ID', 'AventIQ-AI/BERT-Spam-Job-Posting-Detection-Model')
HF_MAX_SEQ_LENGTH = 128

# Input constraints
MAX_DESCRIPTION_LENGTH = 5000
MAX_TITLE_LENGTH = 120
MAX_COMPANY_LENGTH = 120
MIN_ANALYZE_CHARS = 10

# API settings
FLASK_HOST = 'localhost'
FLASK_PORT = 5000
FLASK_DEBUG = False
CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:3000']  # Vite dev + alternatives

# Model settings
CONFIDENCE_HIGH = 85
CONFIDENCE_MEDIUM = 70

# Suggestion limits
MAX_SUGGESTIONS = 5
