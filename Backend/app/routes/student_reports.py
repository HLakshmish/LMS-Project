from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from sqlalchemy import func, desc, Integer

from app.core.database import get_db
from app.core.auth import get_current_active_user, check_teacher_permission, check_admin_permission
from app.crud import student_exam as student_exam_crud
from app.schemas.schemas import User
from app.models.models import (
    StudentExam, ExamResult as ExamResultModel, User as UserModel, Exam,
    ExamAttempt, UserSubscription, SubscriptionStatus
)
from app.schemas.report_schema import (
    StudentReport, ClassReport, DashboardStats, RecentExam, 
    StudentReportSummary, AttemptReport, AttemptDetails
)

router = APIRouter(
    prefix="/reports",
    tags=["Student Reports"],
    responses={404: {"description": "Not found"}},
)

# Custom permission check for admin or teacher
def check_admin_or_teacher_permission(
    current_user: User = Depends(get_current_active_user),
):
    if current_user.role not in ["admin", "superadmin", "teacher"]:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions. Only administrators and teachers can access this resource.",
        )
    return current_user

@router.get("/student/{student_id}")
def get_student_report(
    student_id: int,
    time_period: Optional[str] = Query(None, description="Time period for the report: 'last_week', 'last_month', 'last_3_months', 'last_6_months', 'last_year', 'all'"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a comprehensive report for a specific student.
    
    This report includes:
    - Overall performance statistics
    - Subject-wise performance breakdown
    - Exam history details
    
    The time_period parameter can filter results to specific time ranges.
    """
    try:
        # Check if current user has permission to view this student's report
        # Students can only view their own reports
        if current_user.role == "student" and current_user.id != student_id:
            raise HTTPException(status_code=403, detail="You can only view your own reports")
        
        # Verify that the student exists
        student = db.query(UserModel).filter(UserModel.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail=f"Student with ID {student_id} not found")
        
        # Calculate date range based on time_period
        start_date = None
        if time_period:
            end_date = datetime.now()
            if time_period == "last_week":
                start_date = end_date - relativedelta(weeks=1)
            elif time_period == "last_month":
                start_date = end_date - relativedelta(months=1)
            elif time_period == "last_3_months":
                start_date = end_date - relativedelta(months=3)
            elif time_period == "last_6_months":
                start_date = end_date - relativedelta(months=6)
            elif time_period == "last_year":
                start_date = end_date - relativedelta(years=1)
        
        # Initialize default empty performance stats
        performance_stats = {
            'total_exams': 0,
            'average_score': 0.0,
            'highest_score': 0.0,
            'lowest_score': 0.0,
            'total_passed': 0
        }
        
        # Get student exams directly from database
        student_exams_query = db.query(StudentExam).filter(StudentExam.student_id == student_id)
        if start_date:
            student_exams_query = student_exams_query.filter(StudentExam.created_at >= start_date)
        
        student_exams = student_exams_query.all()
        
        # Get exam results for the student
        exam_results_query = db.query(ExamResultModel).join(
            StudentExam, StudentExam.id == ExamResultModel.student_exam_id
        ).filter(
            StudentExam.student_id == student_id
        )
        
        if start_date:
            exam_results_query = exam_results_query.filter(StudentExam.created_at >= start_date)
        
        exam_results_db = exam_results_query.all()
        
        # Calculate performance stats
        if exam_results_db:
            total_exams = len(exam_results_db)
            avg_score = sum(float(r.score_percentage or 0) for r in exam_results_db) / total_exams if total_exams > 0 else 0
            highest_score = max((float(r.score_percentage or 0) for r in exam_results_db), default=0)
            lowest_score = min((float(r.score_percentage or 0) for r in exam_results_db), default=0) 
            total_passed = sum(1 for r in exam_results_db if r.passed_status)
            
            performance_stats = {
                'total_exams': total_exams,
                'average_score': round(avg_score, 2),
                'highest_score': round(highest_score, 2),
                'lowest_score': round(lowest_score, 2),
                'total_passed': total_passed
            }
        
        # Get subject-wise performance - simplified version
        subject_performance = []
        
        # Get all exams with results
        exams_with_results = db.query(
            Exam.subject_id,
            StudentExam.id,
            ExamResultModel.score_percentage,
            ExamResultModel.passed_status
        ).join(
            StudentExam, StudentExam.exam_id == Exam.id
        ).join(
            ExamResultModel, ExamResultModel.student_exam_id == StudentExam.id
        ).filter(
            StudentExam.student_id == student_id,
            Exam.subject_id != None  # Ensure we have a subject_id
        )
        
        if start_date:
            exams_with_results = exams_with_results.filter(StudentExam.created_at >= start_date)
            
        exams_with_results = exams_with_results.all()
        
        # Group by subject_id
        subject_stats = {}
        for exam in exams_with_results:
            if exam.subject_id not in subject_stats:
                subject_stats[exam.subject_id] = {
                    'total_exams': 0,
                    'scores': [],
                    'passed': 0
                }
            
            subject_stats[exam.subject_id]['total_exams'] += 1
            subject_stats[exam.subject_id]['scores'].append(float(exam.score_percentage or 0))
            if exam.passed_status:
                subject_stats[exam.subject_id]['passed'] += 1
        
        # Convert to the expected format
        for subject_id, stats in subject_stats.items():
            avg_score = sum(stats['scores']) / len(stats['scores']) if stats['scores'] else 0
            highest_score = max(stats['scores']) if stats['scores'] else 0
            
            subject_performance.append({
                'subject_id': subject_id,
                'total_exams': stats['total_exams'],
                'average_score': round(avg_score, 2),
                'highest_score': round(highest_score, 2),
                'total_passed': stats['passed']
            })
        
        # Prepare exam results for response
        exam_results_response = []
        for student_exam in student_exams:
            # Find the corresponding exam result
            result = next((r for r in exam_results_db if r.student_exam_id == student_exam.id), None)
            if result:
                # Find the exam title
                exam = db.query(Exam).filter(Exam.id == student_exam.exam_id).first()
                exam_title = exam.title if exam else "Unknown"
                
                # Format the date
                date_taken = None
                if student_exam.end_time:
                    date_taken = student_exam.end_time.isoformat()
                elif student_exam.created_at:
                    date_taken = student_exam.created_at.isoformat()
                else:
                    date_taken = datetime.now().isoformat()
                
                exam_results_response.append({
                    "exam_id": student_exam.exam_id,
                    "exam_title": exam_title,
                    "date_taken": date_taken,
                    "score_percentage": float(result.score_percentage or 0),
                    "obtained_marks": float(result.obtained_marks or 0),
                    "max_marks": float(result.max_marks or 0),
                    "total_questions": result.total_questions or 0,
                    "correct_answers": result.correct_answers or 0,
                    "passed": bool(result.passed_status)
                })
        
        # Check for active subscription
        from sqlalchemy import and_
        
        try:
            # Use a more defensive approach to query for subscriptions
            # Select only columns we need to avoid errors with mismatched columns
            subscription = db.query(
                UserSubscription.id,
                UserSubscription.end_date
            ).filter(
                and_(
                    UserSubscription.user_id == student_id,
                    UserSubscription.status == SubscriptionStatus.active,
                    UserSubscription.end_date >= datetime.now()
                )
            ).first()
            
            # Return the final report
            return {
                "student_id": student_id,
                "overall_performance": performance_stats,
                "subject_performance": subject_performance,
                "exam_results": exam_results_response,
                "has_active_subscription": subscription is not None,
                "subscription_end_date": subscription.end_date.isoformat() if subscription and subscription.end_date else None
            }
        except Exception as subscription_error:
            # If there's an error with subscription query, still return the report without subscription data
            print(f"Error checking subscription: {str(subscription_error)}")
            return {
                "student_id": student_id,
                "overall_performance": performance_stats,
                "subject_performance": subject_performance,
                "exam_results": exam_results_response,
                "has_active_subscription": False,
                "subscription_end_date": None
            }
    
    except Exception as e:
        print(f"Error generating student report: {str(e)}")
        # Return a more helpful error message
        raise HTTPException(
            status_code=500, 
            detail=f"Error generating student report: {str(e)}"
        )

@router.get("/students")
def get_all_students_reports(
    time_period: Optional[str] = Query(None, description="Time period for the report: 'last_week', 'last_month', 'last_3_months', 'last_6_months', 'last_year', 'all'"),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Get comprehensive reports for all students.
    
    This endpoint is only accessible to teachers and administrators.
    The time_period parameter can filter results to specific time ranges.
    """
    # Get all user IDs with the "student" role
    from app.models.models import User
    student_ids = [user.id for user in db.query(User).filter(User.role == "student").all()]
    
    all_reports = []
    for student_id in student_ids:
        try:
            # Call get_student_report to get the report
            report = get_student_report(
                student_id=student_id,
                time_period=time_period,
                db=db,
                current_user=current_user
            )
            all_reports.append(report)
        except Exception as e:
            # Log the error but continue with other students
            print(f"Error generating report for student {student_id}: {str(e)}")
            continue
            
    return all_reports

@router.get("/class/{class_id}")
def get_class_report(
    class_id: int,
    subject_id: Optional[int] = None,
    time_period: Optional[str] = Query(None, description="Time period for the report"),
    db: Session = Depends(get_db),
    current_user: User = Depends(check_teacher_permission)
):
    """
    Get a comprehensive performance report for an entire class.
    
    This report includes:
    - Overall class performance metrics
    - Individual student performance within the class
    - Optional subject-specific filtering
    
    The time_period parameter can filter results to specific time ranges.
    """
    # Calculate date range based on time_period (similar to above)
    start_date = None
    if time_period:
        end_date = datetime.now()
        if time_period == "last_week":
            start_date = end_date - relativedelta(weeks=1)
        elif time_period == "last_month":
            start_date = end_date - relativedelta(months=1)
        elif time_period == "last_3_months":
            start_date = end_date - relativedelta(months=3)
        elif time_period == "last_6_months":
            start_date = end_date - relativedelta(months=6)
        elif time_period == "last_year":
            start_date = end_date - relativedelta(years=1)
    
    # Get class performance data
    class_performance = student_exam_crud.get_class_performance(
        db, class_id=class_id, subject_id=subject_id
    )
    
    # Calculate class-wide statistics
    total_students = len(class_performance)
    if total_students > 0:
        avg_class_score = sum(student['average_score'] for student in class_performance) / total_students
        highest_avg_score = max(student['average_score'] for student in class_performance) if class_performance else 0
        lowest_avg_score = min(student['average_score'] for student in class_performance) if class_performance else 0
        passing_students = sum(1 for student in class_performance if student['average_score'] >= 40)  # Assuming 40% is passing
    else:
        avg_class_score = 0
        highest_avg_score = 0
        lowest_avg_score = 0
        passing_students = 0
    
    return {
        "class_id": class_id,
        "subject_id": subject_id,
        "total_students": total_students,
        "average_class_score": round(avg_class_score, 2),
        "highest_average_score": round(highest_avg_score, 2),
        "lowest_average_score": round(lowest_avg_score, 2),
        "passing_students": passing_students,
        "passing_rate": round((passing_students / total_students * 100), 2) if total_students > 0 else 0,
        "student_performances": class_performance
    }

@router.get("/dashboard", response_model=DashboardStats)
def get_admin_dashboard(
    time_period: Optional[str] = Query("last_month", description="Time period for the stats: 'last_week', 'last_month', 'last_3_months', 'last_6_months', 'last_year', 'all'"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get overall statistics for administrative dashboard.
    
    This endpoint provides a summary of system-wide statistics including:
    - Total number of students
    - Total exams taken
    - Average overall score
    - Recent exams conducted
    - Top performing students
    
    This endpoint is accessible to both administrators and teachers.
    """
    try:
        # Calculate date range based on time_period
        start_date = None
        if time_period:
            end_date = datetime.now()
            if time_period == "last_week":
                start_date = end_date - relativedelta(weeks=1)
            elif time_period == "last_month":
                start_date = end_date - relativedelta(months=1)
            elif time_period == "last_3_months":
                start_date = end_date - relativedelta(months=3)
            elif time_period == "last_6_months":
                start_date = end_date - relativedelta(months=6)
            elif time_period == "last_year":
                start_date = end_date - relativedelta(years=1)
        
        # Total number of students
        total_students = db.query(func.count(UserModel.id)).filter(UserModel.role == "student").scalar() or 0
        
        # Query for total exams count
        exam_count_query = db.query(func.count(StudentExam.id))
        if start_date:
            exam_count_query = exam_count_query.filter(StudentExam.created_at >= start_date)
        total_exams = exam_count_query.scalar() or 0
        
        # Query for average score
        avg_score_query = db.query(func.avg(ExamResultModel.score_percentage))
        if start_date:
            avg_score_query = avg_score_query.join(
                StudentExam, StudentExam.id == ExamResultModel.student_exam_id
            ).filter(StudentExam.created_at >= start_date)
        
        avg_score_result = avg_score_query.scalar()
        average_score = round(float(avg_score_result), 2) if avg_score_result is not None else 0
        
        # Recent exams (with basic stats) - apply time filter before limit
        recent_exams_query = db.query(
            Exam.id,
            Exam.title
        ).order_by(
            desc(Exam.created_at)
        )
        
        if start_date:
            recent_exams_query = recent_exams_query.filter(Exam.created_at >= start_date)
            
        # Apply limit after all filters
        recent_exams_basic = recent_exams_query.limit(5).all()
        
        # Prepare the data structure for recent exams
        recent_exams = []
        
        # For each exam, get attempt count and average score separately to avoid None values
        for exam in recent_exams_basic:
            try:
                # Count attempts for this exam
                attempts_query = db.query(func.count(StudentExam.id)).filter(
                    StudentExam.exam_id == exam.id
                )
                if start_date:
                    attempts_query = attempts_query.filter(StudentExam.created_at >= start_date)
                total_attempts = attempts_query.scalar() or 0
                
                # Get average score for this exam
                avg_query = db.query(func.avg(ExamResultModel.score_percentage)).join(
                    StudentExam, StudentExam.id == ExamResultModel.student_exam_id
                ).filter(
                    StudentExam.exam_id == exam.id
                )
                if start_date:
                    avg_query = avg_query.filter(StudentExam.created_at >= start_date)
                
                avg_result = avg_query.scalar()
                avg_score = round(float(avg_result), 2) if avg_result is not None else 0
                
                # Add to recent exams list
                recent_exams.append({
                    "id": exam.id,
                    "title": exam.title,
                    "total_attempts": total_attempts,
                    "average_score": avg_score
                })
            except Exception as e:
                # Log the error but continue with other exams
                print(f"Error processing exam {exam.id}: {str(e)}")
                # Add a basic record without the score data
                recent_exams.append({
                    "id": exam.id,
                    "title": exam.title,
                    "total_attempts": 0,
                    "average_score": 0
                })
        
        # Top performing students - apply filters before limits
        top_students_basic_query = db.query(
            UserModel.id,
            UserModel.full_name,
            UserModel.username,  # Add username as a fallback
            UserModel.email
        ).filter(
            UserModel.role == "student"
        ).order_by(
            UserModel.id
        )
        
        # No time filter applied directly here since we need to check exams for each student
        top_students_basic = top_students_basic_query.limit(10).all()
        
        # For each student, calculate their statistics separately
        student_performances = []
        
        for student in top_students_basic:
            try:
                # Count exams for this student
                exams_query = db.query(func.count(StudentExam.id)).filter(
                    StudentExam.student_id == student.id
                )
                if start_date:
                    exams_query = exams_query.filter(StudentExam.created_at >= start_date)
                total_student_exams = exams_query.scalar() or 0
                
                # Skip students with no exams
                if total_student_exams == 0:
                    continue
                
                # Get average score for this student
                avg_score_query = db.query(func.avg(ExamResultModel.score_percentage)).join(
                    StudentExam, StudentExam.id == ExamResultModel.student_exam_id
                ).filter(
                    StudentExam.student_id == student.id
                )
                if start_date:
                    avg_score_query = avg_score_query.filter(StudentExam.created_at >= start_date)
                
                avg_score_result = avg_score_query.scalar()
                avg_student_score = round(float(avg_score_result), 2) if avg_score_result is not None else 0
                
                # Get last exam date for this student
                last_exam_query = db.query(func.max(StudentExam.end_time)).filter(
                    StudentExam.student_id == student.id
                )
                if start_date:
                    last_exam_query = last_exam_query.filter(StudentExam.created_at >= start_date)
                
                last_exam_date = last_exam_query.scalar()
                
                # Use full_name if available, otherwise fallback to username or ID
                student_name = student.full_name
                if not student_name:
                    student_name = student.username or f"Student {student.id}"
                
                # Add to student performances list
                student_performances.append({
                    "student_id": student.id,
                    "name": student_name,
                    "total_exams": total_student_exams,
                    "average_score": avg_student_score,
                    "last_exam_date": last_exam_date.isoformat() if last_exam_date else None
                })
            except Exception as e:
                # Log the error but continue with other students
                print(f"Error processing student {student.id}: {str(e)}")
                continue
        
        # Sort the student performances by average score and limit to top 5
        top_performers = sorted(
            student_performances, 
            key=lambda x: x["average_score"], 
            reverse=True
        )[:5]
        
        return {
            "total_students": total_students,
            "total_exams": total_exams,
            "average_score": average_score,
            "recent_exams": recent_exams,
            "top_performers": top_performers
        } 
    except Exception as e:
        # Log the error for debugging
        print(f"Dashboard error: {str(e)}")
        # Return a more specific error message to help with debugging
        raise HTTPException(status_code=500, detail=f"Error generating dashboard: {str(e)}") 

@router.get("/exam/{exam_id}/attempts", response_model=List[AttemptReport])
def get_exam_attempts_report(
    exam_id: int,
    student_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(check_admin_or_teacher_permission)
):
    """
    Generate a detailed report of student attempts for a specific exam.
    
    This report includes:
    - Per-student attempt statistics
    - Score trends across attempts
    - Improvement metrics
    - Remaining attempts information
    
    Teachers and admins can access this report to track student progress over multiple attempts.
    If student_id is provided, the report will be filtered to that specific student.
    """
    try:
        # Check if exam exists
        exam = db.query(Exam).filter(Exam.id == exam_id).first()
        if not exam:
            raise HTTPException(status_code=404, detail=f"Exam with ID {exam_id} not found")
        
        # Get all student exams for this exam
        student_exams_query = db.query(StudentExam).filter(StudentExam.exam_id == exam_id)
        
        # Filter by student if specified
        if student_id:
            # Verify this student exists
            student = db.query(UserModel).filter(UserModel.id == student_id).first()
            if not student:
                raise HTTPException(status_code=404, detail=f"Student with ID {student_id} not found")
            
            student_exams_query = student_exams_query.filter(StudentExam.student_id == student_id)
        
        student_exams = student_exams_query.all()
        
        # Group by student
        student_groups = {}
        for student_exam in student_exams:
            if student_exam.student_id not in student_groups:
                student_groups[student_exam.student_id] = []
            student_groups[student_exam.student_id].append(student_exam)
        
        report_results = []
        
        # Process each student's attempts
        for student_id, student_exams in student_groups.items():
            # Get student info
            student = db.query(UserModel).filter(UserModel.id == student_id).first()
            if not student:
                continue
            
            student_name = student.full_name or student.username or f"Student {student_id}"
            
            # Get all exam results for this student and exam
            results = []
            for student_exam in student_exams:
                exam_results = db.query(ExamResultModel).filter(
                    ExamResultModel.student_exam_id == student_exam.id
                ).order_by(ExamResultModel.attempt_number).all()
                
                if exam_results:
                    results.extend(exam_results)
            
            # Skip if no results
            if not results:
                continue
            
            # Get subscription and attempt info
            active_subscription = db.query(UserSubscription).filter(
                UserSubscription.user_id == student_id,
                UserSubscription.status == SubscriptionStatus.active,
                UserSubscription.end_date >= datetime.now()
            ).first()
            
            attempts_remaining = 0
            max_attempts = 0
            
            if active_subscription:
                subscription = active_subscription.subscription_plan_package.subscription
                max_attempts = subscription.max_exams or 1
                
                # Get remaining attempts
                exam_attempt = db.query(ExamAttempt).filter(
                    ExamAttempt.user_subscription_id == active_subscription.id,
                    ExamAttempt.exam_id == exam_id
                ).first()
                
                if exam_attempt:
                    attempts_remaining = exam_attempt.remaining_attempts
            
            # Calculate statistics
            total_attempts = len(results)
            scores = [float(r.score_percentage or 0) for r in results]
            avg_score = sum(scores) / total_attempts if total_attempts > 0 else 0
            best_score = max(scores) if scores else 0
            
            # Calculate improvement percentage (if multiple attempts)
            improvement_percentage = None
            if total_attempts >= 2:
                first_score = scores[0]
                last_score = scores[-1]
                if first_score > 0:  # Avoid division by zero
                    improvement_percentage = ((last_score - first_score) / first_score) * 100
            
            # Create attempt details
            attempt_details = []
            for result in results:
                student_exam = next((se for se in student_exams if se.id == result.student_exam_id), None)
                attempt_date = student_exam.updated_at if student_exam else result.created_at
                
                attempt_details.append(
                    AttemptDetails(
                        attempt_number=result.attempt_number,
                        score_percentage=float(result.score_percentage or 0),
                        obtained_marks=float(result.obtained_marks or 0),
                        max_marks=float(result.max_marks or 0),
                        total_questions=result.total_questions or 0,
                        correct_answers=result.correct_answers or 0,
                        passed=bool(result.passed_status),
                        attempt_date=attempt_date
                    )
                )
            
            # Sort by attempt number
            attempt_details.sort(key=lambda x: x.attempt_number)
            
            # Create report
            report = AttemptReport(
                exam_id=exam_id,
                exam_title=exam.title,
                student_id=student_id,
                student_name=student_name,
                total_attempts=total_attempts,
                avg_score=round(avg_score, 2),
                best_score=round(best_score, 2),
                attempts_remaining=attempts_remaining,
                max_attempts=max_attempts,
                attempts=attempt_details,
                improvement_percentage=round(improvement_percentage, 2) if improvement_percentage is not None else None
            )
            
            report_results.append(report)
        
        return report_results
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating exam attempts report: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Error generating exam attempts report: {str(e)}"
        ) 

@router.get("/student/{student_id}/attempts", response_model=List[AttemptReport])
def get_student_attempts_report(
    student_id: int,
    exam_id: Optional[int] = None,
    time_period: Optional[str] = Query(None, description="Time period for the report: 'last_week', 'last_month', 'last_3_months', 'last_6_months', 'last_year', 'all'"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Generate a detailed report of all exam attempts for a specific student.
    
    This report includes:
    - Per-exam attempt statistics
    - Score trends across attempts
    - Improvement metrics
    - Remaining attempts information
    
    Students can only view their own attempt reports, while teachers and admins can view any student's report.
    If exam_id is provided, the report will be filtered to that specific exam.
    """
    try:
        # Check permissions - students can only view their own reports
        if current_user.role == "student" and current_user.id != student_id:
            raise HTTPException(status_code=403, detail="You can only view your own attempt reports")
        
        # Verify that the student exists
        student = db.query(UserModel).filter(UserModel.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail=f"Student with ID {student_id} not found")
        
        student_name = student.full_name or student.username or f"Student {student_id}"
        
        # Calculate date range based on time_period
        start_date = None
        if time_period:
            end_date = datetime.now()
            if time_period == "last_week":
                start_date = end_date - relativedelta(weeks=1)
            elif time_period == "last_month":
                start_date = end_date - relativedelta(months=1)
            elif time_period == "last_3_months":
                start_date = end_date - relativedelta(months=3)
            elif time_period == "last_6_months":
                start_date = end_date - relativedelta(months=6)
            elif time_period == "last_year":
                start_date = end_date - relativedelta(years=1)
        
        # Query for student exams
        student_exams_query = db.query(StudentExam).filter(StudentExam.student_id == student_id)
        
        # Filter by exam if specified
        if exam_id:
            # Verify exam exists
            exam = db.query(Exam).filter(Exam.id == exam_id).first()
            if not exam:
                raise HTTPException(status_code=404, detail=f"Exam with ID {exam_id} not found")
            
            student_exams_query = student_exams_query.filter(StudentExam.exam_id == exam_id)
        
        # Apply time period filter if specified
        if start_date:
            student_exams_query = student_exams_query.filter(StudentExam.created_at >= start_date)
        
        student_exams = student_exams_query.all()
        
        # Group by exam
        exam_groups = {}
        for student_exam in student_exams:
            if student_exam.exam_id not in exam_groups:
                exam_groups[student_exam.exam_id] = []
            exam_groups[student_exam.exam_id].append(student_exam)
        
        # Get active subscription for attempts info
        active_subscription = db.query(UserSubscription).filter(
            UserSubscription.user_id == student_id,
            UserSubscription.status == SubscriptionStatus.active,
            UserSubscription.end_date >= datetime.now()
        ).first()
        
        subscription_max_attempts = 0
        if active_subscription and active_subscription.subscription_plan_package and active_subscription.subscription_plan_package.subscription:
            subscription_max_attempts = active_subscription.subscription_plan_package.subscription.max_exams or 1
        
        report_results = []
        
        # Process each exam's attempts
        for exam_id, exams in exam_groups.items():
            # Get exam info
            exam = db.query(Exam).filter(Exam.id == exam_id).first()
            if not exam:
                continue
            
            # Get all exam results for these student exams
            results = []
            for student_exam in exams:
                exam_results = db.query(ExamResultModel).filter(
                    ExamResultModel.student_exam_id == student_exam.id
                ).order_by(ExamResultModel.attempt_number).all()
                
                if exam_results:
                    results.extend(exam_results)
            
            # Skip if no results
            if not results:
                continue
            
            # Get remaining attempts
            attempts_remaining = 0
            max_attempts = subscription_max_attempts
            
            if active_subscription:
                exam_attempt = db.query(ExamAttempt).filter(
                    ExamAttempt.user_subscription_id == active_subscription.id,
                    ExamAttempt.exam_id == exam_id
                ).first()
                
                if exam_attempt:
                    attempts_remaining = exam_attempt.remaining_attempts
            
            # Calculate statistics
            total_attempts = len(results)
            scores = [float(r.score_percentage or 0) for r in results]
            avg_score = sum(scores) / total_attempts if total_attempts > 0 else 0
            best_score = max(scores) if scores else 0
            
            # Calculate improvement percentage (if multiple attempts)
            improvement_percentage = None
            if total_attempts >= 2:
                first_score = scores[0]
                last_score = scores[-1]
                if first_score > 0:  # Avoid division by zero
                    improvement_percentage = ((last_score - first_score) / first_score) * 100
            
            # Create attempt details
            attempt_details = []
            for result in results:
                student_exam = next((se for se in exams if se.id == result.student_exam_id), None)
                attempt_date = student_exam.updated_at if student_exam else result.created_at
                
                attempt_details.append(
                    AttemptDetails(
                        attempt_number=result.attempt_number,
                        score_percentage=float(result.score_percentage or 0),
                        obtained_marks=float(result.obtained_marks or 0),
                        max_marks=float(result.max_marks or 0),
                        total_questions=result.total_questions or 0,
                        correct_answers=result.correct_answers or 0,
                        passed=bool(result.passed_status),
                        attempt_date=attempt_date
                    )
                )
            
            # Sort by attempt number
            attempt_details.sort(key=lambda x: x.attempt_number)
            
            # Create report
            report = AttemptReport(
                exam_id=exam_id,
                exam_title=exam.title,
                student_id=student_id,
                student_name=student_name,
                total_attempts=total_attempts,
                avg_score=round(avg_score, 2),
                best_score=round(best_score, 2),
                attempts_remaining=attempts_remaining,
                max_attempts=max_attempts,
                attempts=attempt_details,
                improvement_percentage=round(improvement_percentage, 2) if improvement_percentage is not None else None
            )
            
            report_results.append(report)
        
        # Sort reports by most recent attempt date
        report_results.sort(
            key=lambda x: max([a.attempt_date for a in x.attempts]) if x.attempts else datetime.min,
            reverse=True
        )
        
        return report_results
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating student attempts report: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Error generating student attempts report: {str(e)}"
        ) 