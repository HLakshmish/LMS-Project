# Learning Management System (LMS) Backend

This is the backend service for the Learning Management System, built with FastAPI and PostgreSQL.

## Project Structure

```
backend/
├── app/                    # Main application package
│   ├── core/              # Core functionality
│   │   ├── auth.py        # Authentication & authorization
│   │   ├── config.py      # Configuration settings
│   │   └── database.py    # Database connection & settings
│   ├── crud/              # CRUD operations
│   │   ├── user.py        # User operations
│   │   ├── course.py      # Course operations
│   │   └── ...           # Other CRUD modules
│   ├── models/            # SQLAlchemy models
│   │   └── models.py      # Database models
│   ├── routes/            # API endpoints
│   │   ├── auth.py        # Authentication routes
│   │   ├── courses.py     # Course management routes
│   │   └── ...           # Other route modules
│   ├── schemas/           # Pydantic schemas
│   │   └── schemas.py     # Data validation schemas
│   └── main.py           # FastAPI application creation and configuration
├── tests/                 # Test files
├── alembic.ini           # Alembic configuration
├── create_tables.py      # Database tables creation script
├── requirements.txt      # Python dependencies
└── .env                  # Environment variables
```

## Key Components

1. **Core (`app/core/`):**
   - `database.py`: Database connection management and session handling
   - `auth.py`: Authentication logic and JWT handling
   - `config.py`: Application configuration and settings

2. **Models (`app/models/`):**
   - SQLAlchemy ORM models defining database structure
   - Includes relationships between different entities
   - Handles data persistence

3. **Schemas (`app/schemas/`):**
   - Pydantic models for request/response validation
   - Data serialization and deserialization
   - API documentation

4. **Routes (`app/routes/`):**
   - API endpoints organized by feature
   - Request handling and response formatting
   - Business logic implementation

5. **CRUD (`app/crud/`):**
   - Database operations
   - Reusable database queries
   - Data manipulation logic

## Setup and Installation

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Update the values in `.env` with your configuration

4. Initialize the database:
   ```bash
   python create_tables.py
   ```

5. Start the server:
   ```bash
   uvicorn app.main:app --reload
   ```

## API Documentation

Once the server is running, you can access:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Database Management

- The application uses PostgreSQL as the primary database
- Alembic is used for database migrations
- `create_tables.py` handles initial table creation and default data

## Authentication

- JWT-based authentication
- Token endpoints: `/api/auth/token` and `/api/auth/login`
- Protected routes require valid JWT token
- User registration: `/api/auth/register`

## Error Handling

- Consistent error responses across the application
- Detailed logging for debugging
- Custom exception handlers for common scenarios

## Development Guidelines

1. **Code Organization:**
   - Keep related functionality together
   - Use appropriate modules for different features
   - Follow FastAPI best practices

2. **Database Operations:**
   - Use SQLAlchemy for database operations
   - Implement proper transaction handling
   - Follow database best practices

3. **Security:**
   - Validate all input data
   - Use proper authentication
   - Follow security best practices

4. **Testing:**
   - Write unit tests for new features
   - Test API endpoints
   - Ensure proper error handling

## Working with Question Images

### Uploading Images for Questions

The backend provides several ways to work with question images:

1. **Upload an image separately**

   ```
   POST /api/questions/upload-image
   ```

   This endpoint allows you to upload an image file and get back a URL that you can use when creating or updating a question.

   **Request:**
   - Content-Type: `multipart/form-data`
   - Required fields:
     - `file`: The image file to upload

   **Response:**
   ```json
   {
     "url": "http://localhost:8000/static/questions/image_20230514_123045.jpg",
     "filename": "original_filename.jpg"
   }
   ```

2. **Create a question with an image in one request**

   ```
   POST /api/questions/with-image
   ```

   This endpoint allows you to create a new question and upload an image for it in a single request.

   **Request:**
   - Content-Type: `multipart/form-data`
   - Required fields:
     - `content`: The question text
     - `difficulty_level`: The difficulty level (easy, medium, hard)
   - Optional fields:
     - `image`: The image file to upload
     - `topic_id`, `chapter_id`, `subject_id`, `course_id`: At least one of these must be provided

   **Response:** The created question object with the image URL included.

3. **Update a question with a new image**

   ```
   PUT /api/questions/{question_id}/with-image
   ```

   This endpoint allows you to update an existing question and optionally upload a new image.

   **Request:**
   - Content-Type: `multipart/form-data`
   - Optional fields:
     - `content`: The updated question text
     - `difficulty_level`: The updated difficulty level
     - `image`: A new image file to upload (replaces the existing one)
     - `topic_id`, `chapter_id`, `subject_id`, `course_id`: Updated associations

   **Response:** The updated question object with the new image URL. 