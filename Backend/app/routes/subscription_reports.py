from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone
import logging
import json

from app.core.database import get_db
from app.core.auth import get_current_active_user, check_admin_permission
from app.models.models import (
    User, UserSubscription, Subscription, SubscriptionPlanPackage,
    SubscriptionStatus, User as UserModel
)
from app.schemas.schemas import User as UserSchema

router = APIRouter(
    prefix="/reports/subscriptions",
    tags=["subscription reports"],
    responses={404: {"description": "Not found"}},
)

@router.get("/overview")
def get_subscription_overview(
    time_period: str = Query("all", description="Time period for the report: last_week, last_month, last_3_months, last_6_months, last_year, all"),
    subscription_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(check_admin_permission)
):
    """
    Get an overview of subscription statistics including total subscriptions,
    active subscriptions, revenue, and breakdown by subscription plan.
    """
    try:
        # Calculate date range based on time_period
        end_date = datetime.now(timezone.utc)
        if time_period == "last_week":
            start_date = end_date - timedelta(days=7)
        elif time_period == "last_month":
            start_date = end_date - timedelta(days=30)
        elif time_period == "last_3_months":
            start_date = end_date - timedelta(days=90)
        elif time_period == "last_6_months":
            start_date = end_date - timedelta(days=180)
        elif time_period == "last_year":
            start_date = end_date - timedelta(days=365)
        else:  # all
            start_date = None

        # Base query
        query = db.query(UserSubscription)
        if start_date:
            query = query.filter(UserSubscription.created_at >= start_date)
        if subscription_id:
            query = query.filter(UserSubscription.subscription_plan_packages_id == subscription_id)

        # Get total subscriptions
        total_subscriptions = query.count()

        # Get active subscriptions
        active_subscriptions = query.filter(
            UserSubscription.status == SubscriptionStatus.active,
            UserSubscription.end_date >= end_date
        ).count()

        # Get expired subscriptions
        expired_subscriptions = query.filter(
            or_(
                UserSubscription.status == SubscriptionStatus.expired,
                UserSubscription.end_date < end_date
            )
        ).count()

        # Get cancelled subscriptions
        cancelled_subscriptions = query.filter(
            UserSubscription.status == SubscriptionStatus.cancelled
        ).count()

        # Get subscription breakdown
        subscription_breakdown = []
        subscriptions = db.query(Subscription).all()
        for subscription in subscriptions:
            sub_query = query.filter(
                UserSubscription.subscription_plan_packages_id == subscription.id
            )
            total_users = sub_query.count()
            active_users = sub_query.filter(
                UserSubscription.status == SubscriptionStatus.active,
                UserSubscription.end_date >= end_date
            ).count()
            
            # Calculate revenue only for paid subscriptions
            revenue = 0
            if subscription.price > 0:  # Only calculate revenue for paid subscriptions
                revenue = sub_query.with_entities(
                    func.sum(Subscription.price)
                ).scalar() or 0

            subscription_breakdown.append({
                "subscription_id": subscription.id,
                "name": subscription.name,
                "total_users": total_users,
                "active_users": active_users,
                "revenue": float(revenue)
            })

        # Calculate total revenue from paid subscriptions only
        total_revenue = sum(item["revenue"] for item in subscription_breakdown)

        return {
            "total_subscriptions": total_subscriptions,
            "active_subscriptions": active_subscriptions,
            "expired_subscriptions": expired_subscriptions,
            "cancelled_subscriptions": cancelled_subscriptions,
            "total_revenue": total_revenue,
            "subscription_breakdown": subscription_breakdown
        }

    except Exception as e:
        logging.error(f"Error generating subscription overview: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating subscription overview: {str(e)}"
        )

@router.get("/student/{student_id}")
def get_student_subscription_details(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_active_user)
):
    """
    Get detailed subscription history for a specific student.
    """
    try:
        # Check if user is requesting their own data or is an admin
        if current_user.id != student_id and current_user.role not in ["admin", "superadmin"]:
            raise HTTPException(status_code=403, detail="Not enough permissions")

        # Get student details
        student = db.query(UserModel).filter(UserModel.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        # Get subscription history
        subscriptions = db.query(UserSubscription).filter(
            UserSubscription.user_id == student_id
        ).order_by(UserSubscription.created_at.desc()).all()

        subscription_history = []
        for sub in subscriptions:
            # Get subscription plan details
            subscription_plan = db.query(Subscription).filter(
                Subscription.id == sub.subscription_plan_packages_id
            ).first()

            # Get package details
            packages = []
            if sub.subscription_plan_package and sub.subscription_plan_package.package_ids:
                package_ids = json.loads(sub.subscription_plan_package.package_ids)
                for package_id in package_ids:
                    package = db.query(Package).filter(Package.id == package_id).first()
                    if package:
                        packages.append(package.name)

            # Calculate features used
            features_used = {
                "total_exams_taken": db.query(StudentExam).filter(
                    StudentExam.user_id == student_id,
                    StudentExam.created_at >= sub.start_date,
                    StudentExam.created_at <= sub.end_date
                ).count(),
                "max_exams_allowed": subscription_plan.max_exams if subscription_plan else 0,
                "packages_accessed": packages
            }

            subscription_history.append({
                "subscription_id": sub.subscription_plan_packages_id,
                "subscription_name": subscription_plan.name if subscription_plan else "Unknown",
                "start_date": sub.start_date,
                "end_date": sub.end_date,
                "status": sub.status.value,
                "price": float(subscription_plan.price) if subscription_plan else 0,
                "features_used": features_used
            })

        return {
            "student_id": student.id,
            "student_name": student.full_name,
            "subscription_history": subscription_history
        }

    except Exception as e:
        logging.error(f"Error retrieving student subscription details: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving student subscription details: {str(e)}"
        )

@router.get("/revenue")
def get_revenue_report(
    start_date: datetime = Query(..., description="Start date for revenue report"),
    end_date: datetime = Query(..., description="End date for revenue report"),
    group_by: str = Query("month", description="Group by: day, week, month, subscription"),
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(check_admin_permission)
):
    """
    Get detailed revenue report with breakdown by time period and subscription.
    """
    try:
        # Base query
        query = db.query(UserSubscription).filter(
            UserSubscription.created_at >= start_date,
            UserSubscription.created_at <= end_date
        )

        # Group by time period
        if group_by == "day":
            time_format = "%Y-%m-%d"
        elif group_by == "week":
            time_format = "%Y-%W"
        else:  # month
            time_format = "%Y-%m"

        # Get revenue breakdown
        revenue_breakdown = []
        if group_by in ["day", "week", "month"]:
            # Group by time period
            results = db.query(
                func.strftime(time_format, UserSubscription.created_at).label("period"),
                func.sum(Subscription.price).label("revenue"),
                func.count(UserSubscription.id).label("new_subscriptions"),
                func.sum(case((UserSubscription.status == SubscriptionStatus.active, 1), else_=0)).label("renewals")
            ).join(
                Subscription,
                UserSubscription.subscription_plan_packages_id == Subscription.id
            ).group_by("period").all()

            for result in results:
                revenue_breakdown.append({
                    "period": result.period,
                    "revenue": float(result.revenue) if result.revenue else 0,
                    "new_subscriptions": result.new_subscriptions,
                    "renewals": result.renewals
                })
        else:
            # Group by subscription
            results = db.query(
                Subscription.id,
                Subscription.name,
                func.sum(Subscription.price).label("revenue"),
                func.count(UserSubscription.id).label("new_subscriptions"),
                func.sum(case((UserSubscription.status == SubscriptionStatus.active, 1), else_=0)).label("renewals")
            ).join(
                UserSubscription,
                UserSubscription.subscription_plan_packages_id == Subscription.id
            ).group_by(Subscription.id).all()

            for result in results:
                revenue_breakdown.append({
                    "subscription_id": result.id,
                    "name": result.name,
                    "revenue": float(result.revenue) if result.revenue else 0,
                    "new_subscriptions": result.new_subscriptions,
                    "renewals": result.renewals
                })

        # Calculate trends
        total_revenue = sum(item["revenue"] for item in revenue_breakdown)
        total_subscriptions = sum(item["new_subscriptions"] for item in revenue_breakdown)
        total_renewals = sum(item["renewals"] for item in revenue_breakdown)

        # Calculate growth rates
        previous_period_revenue = db.query(func.sum(Subscription.price)).filter(
            UserSubscription.created_at >= start_date - timedelta(days=30),
            UserSubscription.created_at < start_date
        ).scalar() or 0

        revenue_growth = ((total_revenue - float(previous_period_revenue)) / float(previous_period_revenue) * 100) if previous_period_revenue else 0
        renewal_rate = (total_renewals / total_subscriptions * 100) if total_subscriptions else 0

        return {
            "total_revenue": total_revenue,
            "revenue_breakdown": revenue_breakdown,
            "trends": {
                "revenue_growth": round(revenue_growth, 2),
                "subscription_growth": total_subscriptions,
                "renewal_rate": round(renewal_rate, 2)
            }
        }

    except Exception as e:
        logging.error(f"Error generating revenue report: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating revenue report: {str(e)}"
        )

@router.get("/usage")
def get_subscription_usage(
    subscription_id: Optional[int] = None,
    time_period: str = Query("last_month", description="Time period: last_week, last_month, last_3_months, last_6_months, last_year, all"),
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(check_admin_permission)
):
    """
    Get detailed usage metrics for subscriptions including exam attempts,
    package access, and user engagement.
    """
    try:
        # Calculate date range
        end_date = datetime.now(timezone.utc)
        if time_period == "last_week":
            start_date = end_date - timedelta(days=7)
        elif time_period == "last_month":
            start_date = end_date - timedelta(days=30)
        elif time_period == "last_3_months":
            start_date = end_date - timedelta(days=90)
        elif time_period == "last_6_months":
            start_date = end_date - timedelta(days=180)
        elif time_period == "last_year":
            start_date = end_date - timedelta(days=365)
        else:  # all
            start_date = None

        # Base query
        query = db.query(UserSubscription)
        if start_date:
            query = query.filter(UserSubscription.created_at >= start_date)
        if subscription_id:
            query = query.filter(UserSubscription.subscription_plan_packages_id == subscription_id)

        # Get subscription details
        subscription = db.query(Subscription).filter(
            Subscription.id == subscription_id
        ).first() if subscription_id else None

        # Calculate usage metrics
        total_users = query.count()
        active_users = query.filter(
            UserSubscription.status == SubscriptionStatus.active,
            UserSubscription.end_date >= end_date
        ).count()

        # Get exam statistics
        exam_stats = db.query(
            func.count(StudentExam.id).label("total_attempts"),
            func.avg(StudentExam.score).label("average_score"),
            func.count(case((StudentExam.status == "completed", 1), else_=0)).label("completed_exams")
        ).join(
            UserSubscription,
            StudentExam.user_id == UserSubscription.user_id
        ).filter(
            StudentExam.created_at >= start_date if start_date else True
        ).first()

        # Get package access statistics
        package_access = db.query(
            Package.name,
            func.count(UserPackageAccess.id).label("access_count")
        ).join(
            UserPackageAccess,
            Package.id == UserPackageAccess.package_id
        ).group_by(Package.name).order_by(
            func.count(UserPackageAccess.id).desc()
        ).limit(5).all()

        # Calculate engagement score
        engagement_score = 0
        if total_users > 0:
            exam_engagement = (exam_stats.total_attempts / (total_users * subscription.max_exams)) * 100 if subscription else 0
            package_engagement = (sum(p.access_count for p in package_access) / (total_users * len(package_access))) * 100 if package_access else 0
            engagement_score = (exam_engagement + package_engagement) / 2

        return {
            "subscription_id": subscription_id,
            "name": subscription.name if subscription else "All Subscriptions",
            "total_users": total_users,
            "usage_metrics": {
                "average_exams_per_user": round(exam_stats.total_attempts / total_users, 2) if total_users else 0,
                "average_packages_accessed": round(len(package_access) / total_users, 2) if total_users else 0,
                "feature_usage": {
                    "exams": {
                        "total_attempts": exam_stats.total_attempts,
                        "average_score": round(float(exam_stats.average_score), 2) if exam_stats.average_score else 0,
                        "completion_rate": round((exam_stats.completed_exams / exam_stats.total_attempts) * 100, 2) if exam_stats.total_attempts else 0
                    },
                    "packages": {
                        "most_accessed": [p.name for p in package_access],
                        "average_access_time": round(sum(p.access_count for p in package_access) / len(package_access), 2) if package_access else 0
                    }
                }
            },
            "user_engagement": {
                "active_users": active_users,
                "inactive_users": total_users - active_users,
                "engagement_score": round(engagement_score, 2)
            }
        }

    except Exception as e:
        logging.error(f"Error generating subscription usage report: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating subscription usage report: {str(e)}"
        )

@router.get("/analytics")
def get_subscription_analytics(
    time_period: str = Query("last_month", description="Time period: last_week, last_month, last_3_months, last_6_months, last_year, all"),
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(check_admin_permission)
):
    """
    Get comprehensive subscription analytics including metrics, trends, and distribution.
    """
    try:
        # Calculate date range
        end_date = datetime.now(timezone.utc)
        if time_period == "last_week":
            start_date = end_date - timedelta(days=7)
        elif time_period == "last_month":
            start_date = end_date - timedelta(days=30)
        elif time_period == "last_3_months":
            start_date = end_date - timedelta(days=90)
        elif time_period == "last_6_months":
            start_date = end_date - timedelta(days=180)
        elif time_period == "last_year":
            start_date = end_date - timedelta(days=365)
        else:  # all
            start_date = None

        # Base query
        query = db.query(UserSubscription)
        if start_date:
            query = query.filter(UserSubscription.created_at >= start_date)

        # Get subscription metrics
        total_subscriptions = query.count()
        active_subscriptions = query.filter(
            UserSubscription.status == SubscriptionStatus.active,
            UserSubscription.end_date >= end_date
        ).count()

        # Calculate churn and renewal rates
        expired_subscriptions = query.filter(
            or_(
                UserSubscription.status == SubscriptionStatus.expired,
                UserSubscription.end_date < end_date
            )
        ).count()

        churn_rate = (expired_subscriptions / total_subscriptions * 100) if total_subscriptions else 0
        renewal_rate = (active_subscriptions / total_subscriptions * 100) if total_subscriptions else 0

        # Calculate average subscription duration
        avg_duration = db.query(
            func.avg(func.extract('epoch', UserSubscription.end_date - UserSubscription.start_date) / 86400)
        ).filter(
            UserSubscription.end_date.isnot(None)
        ).scalar() or 0

        # Get revenue metrics
        total_revenue = db.query(
            func.sum(Subscription.price)
        ).join(
            UserSubscription,
            UserSubscription.subscription_plan_packages_id == Subscription.id
        ).scalar() or 0

        avg_revenue_per_user = total_revenue / total_subscriptions if total_subscriptions else 0

        # Calculate revenue growth
        previous_period_revenue = db.query(
            func.sum(Subscription.price)
        ).join(
            UserSubscription,
            UserSubscription.subscription_plan_packages_id == Subscription.id
        ).filter(
            UserSubscription.created_at >= start_date - timedelta(days=30),
            UserSubscription.created_at < start_date
        ).scalar() or 0

        revenue_growth = ((total_revenue - float(previous_period_revenue)) / float(previous_period_revenue) * 100) if previous_period_revenue else 0

        # Get user metrics
        new_subscribers = query.filter(
            UserSubscription.created_at >= start_date
        ).count()

        returning_subscribers = query.filter(
            UserSubscription.status == SubscriptionStatus.active,
            UserSubscription.created_at < start_date
        ).count()

        cancelled_subscriptions = query.filter(
            UserSubscription.status == SubscriptionStatus.cancelled
        ).count()

        # Get subscription distribution
        subscription_distribution = []
        subscriptions = db.query(Subscription).all()
        for subscription in subscriptions:
            sub_count = query.filter(
                UserSubscription.subscription_plan_packages_id == subscription.id
            ).count()
            
            percentage = (sub_count / total_subscriptions * 100) if total_subscriptions else 0
            
            # Determine trend
            previous_count = db.query(UserSubscription).filter(
                UserSubscription.subscription_plan_packages_id == subscription.id,
                UserSubscription.created_at >= start_date - timedelta(days=30),
                UserSubscription.created_at < start_date
            ).count()
            
            trend = "increasing" if sub_count > previous_count else "decreasing" if sub_count < previous_count else "stable"
            
            subscription_distribution.append({
                "subscription_id": subscription.id,
                "name": subscription.name,
                "percentage": round(percentage, 2),
                "trend": trend
            })

        return {
            "subscription_metrics": {
                "total_subscriptions": total_subscriptions,
                "active_subscriptions": active_subscriptions,
                "churn_rate": round(churn_rate, 2),
                "renewal_rate": round(renewal_rate, 2),
                "average_subscription_duration": round(avg_duration, 2)
            },
            "revenue_metrics": {
                "total_revenue": float(total_revenue),
                "average_revenue_per_user": round(float(avg_revenue_per_user), 2),
                "revenue_growth": round(revenue_growth, 2)
            },
            "user_metrics": {
                "new_subscribers": new_subscribers,
                "returning_subscribers": returning_subscribers,
                "cancelled_subscriptions": cancelled_subscriptions
            },
            "subscription_distribution": subscription_distribution
        }

    except Exception as e:
        logging.error(f"Error generating subscription analytics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating subscription analytics: {str(e)}"
        ) 