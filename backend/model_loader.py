"""Model loading and prediction wrapper for the Hugging Face fake job detector."""

import traceback
from typing import List, Tuple, Union

import numpy as np
import torch
import torch.nn.functional as F
from transformers import AutoModelForSequenceClassification, AutoTokenizer

from backend.config import HF_MODEL_ID, HF_MAX_SEQ_LENGTH


TextInput = Union[str, List[str]]


class TransformersPredictorAdapter:
    """Adapter that exposes predict/predict_proba for Hugging Face models."""

    def __init__(self, model, tokenizer, max_length):
        self.model = model
        self.tokenizer = tokenizer
        self.max_length = max_length
        self.device = next(model.parameters()).device

    def _prepare_batch(self, texts: TextInput):
        if isinstance(texts, str):
            texts = [texts]

        encoded = self.tokenizer(
            texts,
            return_tensors='pt',
            padding=True,
            truncation=True,
            max_length=self.max_length
        )
        return {k: v.to(self.device) for k, v in encoded.items()}

    def _forward_logits(self, texts: TextInput):
        inputs = self._prepare_batch(texts)
        with torch.no_grad():
            outputs = self.model(**inputs)
        return outputs.logits

    def predict(self, text: str) -> int:
        probs = self.predict_proba([text])[0]
        return int(np.argmax(probs))

    def predict_proba(self, texts: TextInput):
        logits = self._forward_logits(texts)
        probs = F.softmax(logits, dim=-1)
        return probs.cpu().numpy()


def _resolve_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device('cuda')
    if getattr(torch.backends, 'mps', None) and torch.backends.mps.is_available():
        return torch.device('mps')
    return torch.device('cpu')


def load_model() -> Tuple[TransformersPredictorAdapter, bool, str]:
    """Load the Hugging Face BERT classifier."""

    try:
        print(f"\n✓ Loading Hugging Face model: {HF_MODEL_ID}")
        tokenizer = AutoTokenizer.from_pretrained(HF_MODEL_ID)
        model = AutoModelForSequenceClassification.from_pretrained(HF_MODEL_ID)

        device = _resolve_device()
        model.to(device)
        print(f"   • Model device: {device}")

        predictor_adapter = TransformersPredictorAdapter(
            model=model,
            tokenizer=tokenizer,
            max_length=HF_MAX_SEQ_LENGTH
        )
        print("✅ Hugging Face model loaded successfully!")
        return predictor_adapter, True, None

    except Exception as exc:
        error_msg = f"Error loading Hugging Face model: {exc}"
        print(f"✗ {error_msg}")
        traceback.print_exc()
        return None, False, error_msg
