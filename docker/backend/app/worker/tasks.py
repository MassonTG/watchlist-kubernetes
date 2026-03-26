import logging
from app.worker.celery_app import celery_app

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, max_retries=3)
def log_audit(self, user_id: int, action: str, entity_id: int = None, details: dict = None):
    try:
        from app.database import SessionLocal
        from app.models.media import AuditLog
        db = SessionLocal()
        entry = AuditLog(
            user_id=user_id,
            action=action,
            entity_id=entity_id,
            details=details or {}
        )
        db.add(entry)
        db.commit()
        db.close()
        logger.info(f"Аудит збережено: {action} від user_id={user_id}")
    except Exception as exc:
        logger.error(f"Помилка аудиту: {exc}")
        raise self.retry(exc=exc, countdown=5)