# API URL Path Fix for Exam Endpoints

## Issue Description

There was an issue with the exam API endpoints where clients were using incorrect URL paths with a redundant "exams" segment, such as:

```
http://127.0.0.1:8000/api/exams/exams/my-exams
```

Instead of the correct path:

```
http://127.0.0.1:8000/api/exams/my-exams
```

## Fix Implemented

To maintain backward compatibility and prevent breaking existing client applications, we added legacy route handlers that support the incorrect URL pattern. These handlers simply redirect the requests to the correct handlers.

The following legacy routes were added:

1. GET `/api/exams/exams/my-exams` → routes to `/api/exams/my-exams`
2. GET `/api/exams/exams/{exam_id}` → routes to `/api/exams/{exam_id}`
3. POST `/api/exams/exams/` → routes to `/api/exams/`
4. PUT `/api/exams/exams/{exam_id}` → routes to `/api/exams/{exam_id}`
5. DELETE `/api/exams/exams/{exam_id}` → routes to `/api/exams/{exam_id}`
6. GET `/api/exams/exams/{exam_id}/questions` → routes to `/api/exams/{exam_id}/questions`
7. POST `/api/exams/exams/{exam_id}/questions` → routes to `/api/exams/{exam_id}/questions`

## Best Practice for Clients

While the legacy routes will continue to work, it is recommended that clients update their code to use the correct URL paths without the redundant "exams" segment. This will ensure compatibility with future API versions.

## Implementation Details

The fix was implemented in `app/routes/exams.py` by adding additional route handlers with the redundant path segment and the `include_in_schema=False` parameter to hide them from the API documentation.

Example:

```python
@router.get("/exams/my-exams", response_model=List[Exam], include_in_schema=False)
def read_user_exams_legacy_url(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Legacy endpoint to support the incorrect URL pattern with double 'exams' in the path.
    Calls the main handler directly.
    """
    return read_user_exams(skip=skip, limit=limit, db=db, current_user=current_user)
``` 