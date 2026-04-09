# Fake Job Posting Detector

A full-stack NLP application that detects potentially fake job postings using a BERT-based classifier, rule-based risk indicators, and explainability signals.

## What This Project Does

This project analyzes job postings and returns:
- A fake vs real prediction
- Probability scores and confidence level
- Rule-based risk indicators (for example: unrealistic salary claims, upfront payment signals)
- Actionable review suggestions
- Explainability output (attention and feature-level reasoning)

## Project Structure

- `app.py`: Flask API entry point
- `backend/`: Modular backend business logic
- `bert_ktrain_predictor/`: Local model artifacts
- `frontend/`: React + TypeScript + Vite web app
- `TEST_CASES.md`: Edge-case and regression testing scenarios
- `requirements.txt`: Python dependencies

## System Workflow

1. User enters job data in the frontend (`title`, `company`, `description`)
2. Frontend calls backend validation endpoint (`/api/validate`)
3. Backend prepares and prioritizes text for model inference
4. BERT model runs prediction
5. Rule engine adds risk indicators and review terms
6. API returns prediction, confidence, and suggestions
7. Frontend renders result, flags, and explanation

## Main Backend Endpoints

Base URL: `http://localhost:5000/api`

- `GET /status`: service and model status
- `GET /rules`: validation constraints for UI sync
- `POST /validate`: validate input payload
- `POST /analyze`: model inference only
- `POST /suggest`: post-processing suggestions
- `POST /predict`: full end-to-end prediction
- `POST /explain`: explainability output
- `GET /metrics`: operational metrics

## Prerequisites

- Python 3.10+ (recommended)
- Node.js 18+ and npm
- Git

## How To Start (Windows)

### 1. Clone and open

```powershell
git clone <your-repo-url>
cd nlp_project
```

### 2. Set up Python environment

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Start backend API

```powershell
python app.py
```

Backend runs at `http://localhost:5000`.

### 4. Start frontend (new terminal)

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Environment Notes

- Frontend API base URL defaults to `http://localhost:5000/api`
- CORS allows `http://localhost:5173` and `http://localhost:3000`
- Optional model source can be overridden with env var `HF_MODEL_ID`

## Quick Verification

1. Open `http://localhost:5173`
2. Enter a sample posting
3. Run prediction and verify result card updates
4. Check backend health at `http://localhost:5000/api/status`

## Testing

Use `TEST_CASES.md` for:
- Scam-pattern validation
- Boundary and ambiguity testing
- Length and format edge cases
- Regression checks

## Troubleshooting

- If backend fails to load model:
  - Confirm internet access if Hugging Face fetch is needed
  - Confirm local model files exist in `bert_ktrain_predictor/`
- If frontend cannot reach backend:
  - Confirm backend is running on port `5000`
  - Confirm frontend is running on port `5173`
- If PowerShell blocks activation scripts:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

## Future Improvements

- Add automated unit and integration tests
- Add Docker-based local startup
- Add CI workflow for lint/test/build
- Add model evaluation report pipeline
