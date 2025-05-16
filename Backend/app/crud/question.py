from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from app.models.models import Question, Answer, Topic, Chapter, Subject, Course, User
from app.schemas.schemas import QuestionCreate, QuestionUpdate, AnswerCreate

def get_question(db: Session, question_id: int):
    return (
        db.query(Question)
        .options(
            joinedload(Question.answers),
            joinedload(Question.creator),
            joinedload(Question.topic),
            joinedload(Question.chapter),
            joinedload(Question.subject),
            joinedload(Question.course)
        )
        .filter(Question.id == question_id)
        .first()
    )

def get_questions(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(Question)
        .options(
            joinedload(Question.answers),
            joinedload(Question.creator),
            joinedload(Question.topic),
            joinedload(Question.chapter),
            joinedload(Question.subject),
            joinedload(Question.course)
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_questions_by_course(db: Session, course_id: int, skip: int = 0, limit: int = 100):
    """Get questions directly associated with a course"""
    return (
        db.query(Question)
        .options(
            joinedload(Question.answers),
            joinedload(Question.creator),
            joinedload(Question.topic),
            joinedload(Question.chapter),
            joinedload(Question.subject),
            joinedload(Question.course)
        )
        .filter(Question.course_id == course_id)
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_questions_by_subject(db: Session, subject_id: int, skip: int = 0, limit: int = 100):
    """Get questions for a subject, its chapters, topics, and associated courses"""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        return []

    # Get all chapter IDs for this subject
    chapter_ids = [chapter.id for chapter in subject.chapters]
    
    # Get all topic IDs for these chapters
    topic_ids = []
    for chapter in subject.chapters:
        topic_ids.extend([topic.id for topic in chapter.topics])

    return (
        db.query(Question)
        .options(
            joinedload(Question.answers),
            joinedload(Question.creator),
            joinedload(Question.topic),
            joinedload(Question.chapter),
            joinedload(Question.subject),
            joinedload(Question.course)
        )
        .filter(
            (Question.subject_id == subject_id) |
            (Question.chapter_id.in_(chapter_ids)) |
            (Question.topic_id.in_(topic_ids)) |
            (Question.course_id.in_(
                db.query(Course.id).filter(
                    (Course.subject_id == subject_id) |
                    (Course.chapter_id.in_(chapter_ids)) |
                    (Course.topic_id.in_(topic_ids))
                )
            ))
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_questions_by_chapter(db: Session, chapter_id: int, skip: int = 0, limit: int = 100):
    """Get questions for a chapter, its topics, and associated courses"""
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        return []

    topic_ids = [topic.id for topic in chapter.topics]
    
    return (
        db.query(Question)
        .options(
            joinedload(Question.answers),
            joinedload(Question.creator),
            joinedload(Question.topic),
            joinedload(Question.chapter),
            joinedload(Question.subject),
            joinedload(Question.course)
        )
        .filter(
            (Question.chapter_id == chapter_id) |
            (Question.topic_id.in_(topic_ids)) |
            (Question.course_id.in_(
                db.query(Course.id).filter(
                    (Course.chapter_id == chapter_id) |
                    (Course.topic_id.in_(topic_ids))
                )
            ))
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_questions_by_topic(db: Session, topic_id: int, skip: int = 0, limit: int = 100):
    """Get questions for a topic and its associated course"""
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        return []

    return (
        db.query(Question)
        .options(
            joinedload(Question.answers),
            joinedload(Question.creator),
            joinedload(Question.topic),
            joinedload(Question.chapter),
            joinedload(Question.subject),
            joinedload(Question.course)
        )
        .filter(
            (Question.topic_id == topic_id) |
            (Question.course_id.in_(
                db.query(Course.id).filter(Course.topic_id == topic_id)
            ))
        )
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_questions_by_difficulty(db: Session, difficulty_level: str, skip: int = 0, limit: int = 100):
    return (
        db.query(Question)
        .options(
            joinedload(Question.answers),
            joinedload(Question.creator),
            joinedload(Question.topic),
            joinedload(Question.chapter),
            joinedload(Question.subject),
            joinedload(Question.course)
        )
        .filter(Question.difficulty_level == difficulty_level)
        .offset(skip)
        .limit(limit)
        .all()
    )

def create_question(db: Session, question: QuestionCreate, created_by: int):
    # Convert 0 values to None for foreign keys to avoid FK constraint violations
    topic_id = None if question.topic_id == 0 else question.topic_id
    chapter_id = None if question.chapter_id == 0 else question.chapter_id
    subject_id = None if question.subject_id == 0 else question.subject_id
    course_id = None if question.course_id == 0 else question.course_id
    
    db_question = Question(
        content=question.content,
        image_url=question.image_url,
        difficulty_level=question.difficulty_level,
        topic_id=topic_id,
        chapter_id=chapter_id,
        subject_id=subject_id,
        course_id=course_id,
        created_by=created_by
    )
    db.add(db_question)
    db.commit()
    db.refresh(db_question)

    # Create answers for the question
    for answer in question.answers:
        db_answer = Answer(
            content=answer.content,
            image_url=answer.image_url,
            is_correct=answer.is_correct,
            question_id=db_question.id
        )
        db.add(db_answer)
    db.commit()

    # Reload question with all relationships
    return (
        db.query(Question)
        .options(
            joinedload(Question.answers),
            joinedload(Question.creator),
            joinedload(Question.topic),
            joinedload(Question.chapter),
            joinedload(Question.subject),
            joinedload(Question.course)
        )
        .filter(Question.id == db_question.id)
        .first()
    )

def update_question(db: Session, question_id: int, question: QuestionUpdate):
    db_question = db.query(Question).filter(Question.id == question_id).first()
    if not db_question:
        return None

    # Convert 0 values to None for foreign keys to avoid FK constraint violations
    update_data = {}
    for var, value in vars(question).items():
        if value is not None:
            # Check if this is a hierarchy ID and if the value is 0
            if var in ['topic_id', 'chapter_id', 'subject_id', 'course_id'] and value == 0:
                update_data[var] = None
            else:
                update_data[var] = value
    
    # Update question fields
    for var, value in update_data.items():
        setattr(db_question, var, value)

    db.commit()
    db.refresh(db_question)

    # Reload question with all relationships
    return (
        db.query(Question)
        .options(
            joinedload(Question.answers),
            joinedload(Question.creator),
            joinedload(Question.topic),
            joinedload(Question.chapter),
            joinedload(Question.subject),
            joinedload(Question.course)
        )
        .filter(Question.id == question_id)
        .first()
    )

def delete_question(db: Session, question_id: int):
    db_question = get_question(db, question_id)
    if not db_question:
        return None
    
    # Delete associated answers first
    db.query(Answer).filter(Answer.question_id == question_id).delete()
    
    db.delete(db_question)
    db.commit()
    return db_question

# Answer CRUD operations
def get_answer(db: Session, answer_id: int):
    return db.query(Answer).filter(Answer.id == answer_id).first()

def get_answers_by_question(db: Session, question_id: int):
    return db.query(Answer).filter(Answer.question_id == question_id).all()

def create_answer(db: Session, answer: AnswerCreate, question_id: int):
    db_answer = Answer(
        question_id=question_id,
        content=answer.content,
        is_correct=answer.is_correct
    )
    db.add(db_answer)
    db.commit()
    db.refresh(db_answer)
    return db_answer

def update_answer(db: Session, answer_id: int, content: str, is_correct: bool):
    db_answer = get_answer(db, answer_id)
    if not db_answer:
        return None
    
    db_answer.content = content
    db_answer.is_correct = is_correct
    
    db.commit()
    db.refresh(db_answer)
    return db_answer

def delete_answer(db: Session, answer_id: int):
    db_answer = get_answer(db, answer_id)
    if not db_answer:
        return None
    
    db.delete(db_answer)
    db.commit()
    return db_answer

def update_question_with_answers(db: Session, question_id: int, question: QuestionUpdate, answer_contents: list, answer_is_corrects: list, answer_ids: list = None, answer_image_urls: list = None):
    """
    Update a question and its answers in a single operation.
    
    Args:
        db (Session): Database session
        question_id (int): ID of the question to update
        question (QuestionUpdate): Question update data
        answer_contents (list): List of answer contents
        answer_is_corrects (list): List of boolean flags indicating if answers are correct
        answer_ids (list, optional): List of answer IDs (if updating existing answers)
        answer_image_urls (list, optional): List of image URLs for answers
        
    Returns:
        Question: Updated question with answers
    """
    # First update the question
    db_question = update_question(db, question_id, question)
    if not db_question:
        return None
    
    # If answer_ids is provided, update existing answers
    if answer_ids:
        # Delete answers that are not in the updated list
        existing_answer_ids = [answer.id for answer in get_answers_by_question(db, question_id)]
        for existing_id in existing_answer_ids:
            if existing_id not in answer_ids:
                delete_answer(db, existing_id)
        
        # Update existing answers and create new ones
        for i in range(len(answer_contents)):
            answer_id = answer_ids[i] if i < len(answer_ids) else None
            is_correct = answer_is_corrects[i]
            content = answer_contents[i]
            image_url = answer_image_urls[i] if answer_image_urls and i < len(answer_image_urls) else None
            
            if answer_id and answer_id in existing_answer_ids:
                # Update existing answer
                db_answer = get_answer(db, answer_id)
                if db_answer:
                    db_answer.content = content
                    db_answer.is_correct = is_correct
                    if image_url:
                        db_answer.image_url = image_url
            else:
                # Create new answer
                db_answer = Answer(
                    question_id=question_id,
                    content=content,
                    is_correct=is_correct,
                    image_url=image_url
                )
                db.add(db_answer)
    else:
        # If no answer_ids provided, replace all answers
        # Delete existing answers
        db.query(Answer).filter(Answer.question_id == question_id).delete()
        
        # Create new answers
        for i in range(len(answer_contents)):
            content = answer_contents[i]
            is_correct = answer_is_corrects[i]
            image_url = answer_image_urls[i] if answer_image_urls and i < len(answer_image_urls) else None
            
            db_answer = Answer(
                question_id=question_id,
                content=content,
                is_correct=is_correct,
                image_url=image_url
            )
            db.add(db_answer)
    
    db.commit()
    
    # Reload question with all relationships
    return get_question(db, question_id)
