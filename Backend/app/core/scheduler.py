from fastapi import BackgroundTasks
from sqlalchemy.orm import Session
import asyncio
import logging
from datetime import datetime, timedelta

from ..crud.subscription import update_expired_subscriptions
from ..core.database import SessionLocal

logger = logging.getLogger(__name__)

async def check_expired_subscriptions():
    """
    Background task to periodically check and update expired subscriptions.
    Runs every 15 minutes by default.
    """
    while True:
        try:
            logger.info("Starting scheduled check for expired subscriptions...")
            db = SessionLocal()
            count = update_expired_subscriptions(db)
            if count > 0:
                logger.info(f"Updated status of {count} expired subscriptions to 'expired'")
            else:
                logger.debug("No expired subscriptions found")
        except Exception as e:
            logger.error(f"Error in scheduled subscription check: {str(e)}")
        finally:
            db.close()
        
        # Wait for 15 minutes before next check
        await asyncio.sleep(900)  # 900 seconds = 15 minutes

def start_scheduler(background_tasks: BackgroundTasks):
    """
    Start the background scheduler for subscription expiration checks.
    """
    logger.info("Starting subscription expiration scheduler...")
    background_tasks.add_task(check_expired_subscriptions)
    logger.info("Subscription expiration scheduler started successfully") 