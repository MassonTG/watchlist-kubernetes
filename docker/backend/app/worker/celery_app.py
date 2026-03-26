from celery import Celery
from app.config import settings

celery_app = Celery(
    "watchlist",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.worker.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Europe/Kyiv",
    enable_utc=True,
    broker_connection_retry_on_startup=True,
)