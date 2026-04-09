"""
Operational metrics: track prediction counts, latency, and system health.
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, List
import time
from datetime import datetime, timedelta
import threading


@dataclass
class PredictionMetric:
    """Record a single prediction for metrics tracking."""
    timestamp: str
    prediction_time_ms: float
    is_fake: bool
    confidence: float
    text_length: int
    endpoint: str  # '/api/predict', '/api/analyze', etc


@dataclass
class MetricsSnapshot:
    """Aggregated metrics snapshot."""
    total_predictions: int = 0
    total_validations: int = 0
    avg_prediction_latency_ms: float = 0.0
    avg_validation_latency_ms: float = 0.0
    fake_count: int = 0
    real_count: int = 0
    avg_confidence: float = 0.0
    error_count: int = 0
    uptime_seconds: int = 0
    last_updated: str = ""


class MetricsCollector:
    """Collect and aggregate operational metrics."""
    
    def __init__(self):
        self.lock = threading.Lock()
        self.predictions: List[PredictionMetric] = []
        self.validations: List[Dict] = []
        self.errors: List[Dict] = []
        self.startup_time = time.time()
        self.last_error: str = None
    
    def record_prediction(self, prediction_time_ms: float, is_fake: bool, 
                         confidence: float, text_length: int, endpoint: str = '/api/predict'):
        """Record a prediction with metadata."""
        with self.lock:
            metric = PredictionMetric(
                timestamp=datetime.now().isoformat(),
                prediction_time_ms=prediction_time_ms,
                is_fake=is_fake,
                confidence=confidence,
                text_length=text_length,
                endpoint=endpoint
            )
            self.predictions.append(metric)
            
            # Keep only last 1000 predictions to avoid memory issues
            if len(self.predictions) > 1000:
                self.predictions = self.predictions[-1000:]
    
    def record_validation(self, validation_time_ms: float, valid: bool, error_count: int = 0):
        """Record a validation check."""
        with self.lock:
            self.validations.append({
                'timestamp': datetime.now().isoformat(),
                'time_ms': validation_time_ms,
                'valid': valid,
                'error_count': error_count
            })
            
            if len(self.validations) > 1000:
                self.validations = self.validations[-1000:]
    
    def record_error(self, error_msg: str, endpoint: str = ""):
        """Record an error."""
        with self.lock:
            self.errors.append({
                'timestamp': datetime.now().isoformat(),
                'message': error_msg,
                'endpoint': endpoint
            })
            self.last_error = error_msg
            
            if len(self.errors) > 500:
                self.errors = self.errors[-500:]
    
    def get_snapshot(self) -> MetricsSnapshot:
        """Get current metrics aggregated."""
        with self.lock:
            if not self.predictions:
                return MetricsSnapshot(
                    uptime_seconds=int(time.time() - self.startup_time),
                    last_updated=datetime.now().isoformat()
                )
            
            # Calculate prediction metrics
            pred_times = [p.prediction_time_ms for p in self.predictions]
            avg_pred_latency = sum(pred_times) / len(pred_times) if pred_times else 0.0
            
            fake_preds = sum(1 for p in self.predictions if p.is_fake)
            confidences = [p.confidence for p in self.predictions]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
            
            val_times = [v['time_ms'] for v in self.validations]
            avg_val_latency = sum(val_times) / len(val_times) if val_times else 0.0
            
            uptime = int(time.time() - self.startup_time)
            
            return MetricsSnapshot(
                total_predictions=len(self.predictions),
                total_validations=len(self.validations),
                avg_prediction_latency_ms=round(avg_pred_latency, 2),
                avg_validation_latency_ms=round(avg_val_latency, 2),
                fake_count=fake_preds,
                real_count=len(self.predictions) - fake_preds,
                avg_confidence=round(avg_confidence, 2),
                error_count=len(self.errors),
                uptime_seconds=uptime,
                last_updated=datetime.now().isoformat()
            )
    
    def get_health_status(self) -> Dict:
        """Get system health indicators."""
        snapshot = self.get_snapshot()
        
        # Health rules
        is_healthy = (
            snapshot.error_count < 10 and
            snapshot.avg_prediction_latency_ms < 5000  # < 5 seconds
        )
        
        return {
            'status': 'healthy' if is_healthy else 'degraded',
            'predictions_per_minute': round(snapshot.total_predictions / max(1, snapshot.uptime_seconds / 60), 2),
            'error_rate': round(snapshot.error_count / max(1, snapshot.total_predictions + snapshot.total_validations), 4),
            'avg_latency_ms': snapshot.avg_prediction_latency_ms,
            'fake_detection_rate': round(snapshot.fake_count / max(1, snapshot.total_predictions), 2) if snapshot.total_predictions > 0 else 0.0,
            'errors_last_10': [e['message'] for e in self.errors[-10:]]
        }


# Global metrics instance
_metrics = MetricsCollector()


def get_collector() -> MetricsCollector:
    """Get the global metrics collector instance."""
    return _metrics
