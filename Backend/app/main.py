from fastapi import FastAPI, Depends, HTTPException, status, Request, Response, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.openapi.models import SecuritySchemeType, SecurityScheme
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import List, Dict, Any, Optional
import time
import logging
import traceback
from contextlib import asynccontextmanager
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
import os
import json
import hashlib
from datetime import datetime, timedelta
import sys

from app.core.database import get_db, engine, Base
from app.core.auth import get_current_user
from app.routes import (
    auth,
    users,
    courses,
    subjects,
    chapters,
    topics,
    questions,
    exams,
    student_exams,
    subscriptions,
    content,
    streams,
    class_,
    packages,
    subscription_package,
    student_reports,
    exam_attempts,
    subscription_reports
)
from app.models.models import User
from app.schemas.schemas import UserCreate
from app.core.init_db import init_db
from app.core.scheduler import start_scheduler

# Simple in-memory cache for reducing database load
class SimpleCache:
    def __init__(self, max_size=1000, ttl=300):  # 5 minutes TTL by default
        self.cache = {}
        self.max_size = max_size
        self.ttl = ttl
    
    def _gen_key(self, path, params):
        """Generate a cache key from path and parameters"""
        params_str = json.dumps(params, sort_keys=True) if params else ""
        key = f"{path}:{params_str}"
        return hashlib.md5(key.encode()).hexdigest()
    
    def get(self, path, params=None):
        """Get a value from cache"""
        key = self._gen_key(path, params)
        if key in self.cache:
            data, timestamp = self.cache[key]
            if time.time() - timestamp < self.ttl:
                return data
            # Expired, remove from cache
            del self.cache[key]
        return None
    
    def set(self, path, params, data):
        """Store a value in cache"""
        key = self._gen_key(path, params)
        self.cache[key] = (data, time.time())
        
        # If cache exceeds max size, remove oldest entries
        if len(self.cache) > self.max_size:
            items = list(self.cache.items())
            # Sort by timestamp (second element of the value tuple)
            items.sort(key=lambda x: x[1][1])
            # Remove oldest 10% of entries
            for i in range(int(self.max_size * 0.1)):
                if i < len(items):
                    del self.cache[items[i][0]]
    
    def clear(self):
        """Clear the entire cache"""
        self.cache = {}

# Create uploads directory if it doesn't exist
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Configure logging with more focused format
logging.basicConfig(
    level=logging.INFO,  # Set to INFO level
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',  # More detailed format
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger("app")

# Set specific loggers to appropriate levels
logging.getLogger("app.routes.auth").setLevel(logging.INFO)
logging.getLogger("app.crud.user").setLevel(logging.INFO)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logging.getLogger("passlib").setLevel(logging.WARNING)

# Create database tables on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        # Create tables if they don't exist
        Base.metadata.create_all(bind=engine)
        # Initialize database with default data
        init_db()
        logger.info("Database tables created and initialized")
        yield
    except Exception as e:
        logger.error(f"Startup error: {str(e)}")
        logger.error(traceback.format_exc())
        raise
    finally:
        # Cleanup on shutdown
        logger.info("Application shutting down")

# Initialize FastAPI app
app = FastAPI(
    title="Learning and Assessment Management System API",
    description="API for managing courses, exams, and student assessments",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None,  # We're using a custom docs route
    redoc_url="/redoc",  # Explicitly set the redoc URL
    openapi_url="/openapi.json",  # Explicitly set the OpenAPI schema URL
    swagger_ui_oauth2_redirect_url="/docs/oauth2-redirect",  # Set OAuth2 redirect URL
    swagger_ui_parameters={
        "persistAuthorization": True,
        "displayRequestDuration": True,
        "tryItOutEnabled": True,
        "defaultModelsExpandDepth": 2,
        "docExpansion": "list",
        "syntaxHighlight.theme": "monokai"
    }
)

# Override the default security scheme with a simpler one
app.openapi_schema = None  # Reset the schema to allow for modification

# Define custom security scheme for OpenAPI
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    
    # Remove the default OAuth2 security scheme
    if "components" in openapi_schema and "securitySchemes" in openapi_schema["components"]:
        security_schemes = openapi_schema["components"]["securitySchemes"]
        if "OAuth2PasswordBearer" in security_schemes:
            del security_schemes["OAuth2PasswordBearer"]
    
    # Add the simplified Bearer token scheme
    openapi_schema["components"] = openapi_schema.get("components", {})
    openapi_schema["components"]["securitySchemes"] = openapi_schema["components"].get("securitySchemes", {})
    
    openapi_schema["components"]["securitySchemes"]["bearerAuth"] = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "Enter JWT token with 'Bearer ' prefix"
    }
    
    # Apply security globally
    openapi_schema["security"] = [{"bearerAuth": []}]
    
    # Force apply security to all paths directly
    for path in openapi_schema["paths"]:
        # Skip health check
        if path == "/api/health" or path == "/":
            continue
            
        for method in openapi_schema["paths"][path]:
            if method.lower() not in ["options", "head"]:
                openapi_schema["paths"][path][method]["security"] = [{"bearerAuth": []}]
                
                # Ensure responses include 401 and 403
                if "responses" not in openapi_schema["paths"][path][method]:
                    openapi_schema["paths"][path][method]["responses"] = {}
                    
                openapi_schema["paths"][path][method]["responses"]["401"] = {
                    "description": "Unauthorized - Authentication required"
                }
                openapi_schema["paths"][path][method]["responses"]["403"] = {
                    "description": "Forbidden - Insufficient permissions"
                }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With", "X-CSRF-Token"],
    expose_headers=["X-Process-Time", "X-API-Key"],
    max_age=600,  # Cache preflight requests for 10 minutes
)

# Add GZip compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Initialize cache
app.state.cache = SimpleCache(max_size=2000, ttl=300)  # 5 minutes TTL, 2000 items max

# Cache middleware for GET requests
@app.middleware("http")
async def cache_middleware(request: Request, call_next):
    # Only cache GET requests
    if request.method != "GET":
        return await call_next(request)
    
    # Don't cache authenticated requests to avoid security issues
    if "authorization" in request.headers:
        return await call_next(request)
    
    # Check cache
    cache_data = app.state.cache.get(request.url.path, dict(request.query_params))
    if cache_data:
        logger.debug(f"Cache hit for {request.url.path}")
        return JSONResponse(
            content=cache_data,
            status_code=200
        )
    
    # Process request
    response = await call_next(request)
    
    # Only cache successful responses
    if response.status_code == 200:
        try:
            # Need to read and restore response body as it's consumed when read
            body = b""
            async for chunk in response.body_iterator:
                body += chunk
            
            # Re-create response
            response = Response(
                content=body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type
            )
            
            # Cache response
            try:
                body_json = json.loads(body.decode())
                app.state.cache.set(request.url.path, dict(request.query_params), body_json)
            except json.JSONDecodeError:
                # Not a JSON response, don't cache
                pass
        except:
            # Error reading response body, continue without caching
            logger.warning(f"Error caching response for {request.url.path}")
    
    return response

# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    logger.debug(f"Request processed in {process_time:.4f} seconds: {request.method} {request.url.path}")
    return response

# Rate limiting middleware (simple implementation)
@app.middleware("http")
async def rate_limit_middleware(request, call_next):
    # Get client IP
    client_ip = request.client.host
    
    # In a real implementation, you would use Redis or another distributed cache
    # This is a simplified example
    current_time = time.time()
    request_count = getattr(request.app.state, f"rate_limit_{client_ip}", 0)
    last_request_time = getattr(request.app.state, f"rate_limit_time_{client_ip}", 0)
    
    # Reset counter if more than a minute has passed
    if current_time - last_request_time > 60:
        request_count = 0
    
    # Check if rate limit exceeded (500 requests per minute - increased from 100)
    if request_count > 500:
        logger.warning(f"Rate limit exceeded for IP {client_ip}: {request_count} requests in the last minute")
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Rate limit exceeded. Please try again later."}
        )
    
    # Update counters
    setattr(request.app.state, f"rate_limit_{client_ip}", request_count + 1)
    setattr(request.app.state, f"rate_limit_time_{client_ip}", current_time)
    
    # Process the request
    return await call_next(request)

# Exception Handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Validation error",
            "errors": exc.errors(),
            "body": exc.body
        }
    )

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error(f"Database error: {str(exc)}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An error occurred while processing your request"
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unexpected error: {str(exc)}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An unexpected error occurred",
            "type": exc.__class__.__name__
        }
    )

# Database connection middleware
@app.middleware("http")
async def db_session_middleware(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except SQLAlchemyError as e:
        logger.error(f"Database error in middleware: {str(e)}")
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Database connection error"}
        )

# Add error logging middleware
@app.middleware("http")
async def error_logging_middleware(request: Request, call_next):
    try:
        response = await call_next(request)
        if response.status_code >= 400:
            logger.error(f"Request failed: {request.method} {request.url.path} - Status: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"Request error: {request.method} {request.url.path}")
        logger.error(traceback.format_exc())
        raise

# Explicitly print router paths for debugging
print("\n=== API Routes ===")

# Mount all API routes
# Add API prefix to all routes
ROUTE_PREFIX = "/api"

# Mount auth routes
app.include_router(
    auth.router, 
    prefix=f"{ROUTE_PREFIX}", 
    tags=["Authentication"]
)

# Mount user routes
app.include_router(
    users.router, 
    prefix=f"{ROUTE_PREFIX}", 
    tags=["Users"]
)

# Mount course routes
app.include_router(courses.router, prefix=f"{ROUTE_PREFIX}/courses", tags=["Courses"])

# Mount subject routes
app.include_router(subjects.router, prefix=f"{ROUTE_PREFIX}/subjects", tags=["Subjects"])

# Mount chapter routes  
app.include_router(chapters.router, prefix=f"{ROUTE_PREFIX}/chapters", tags=["Chapters"])

# Mount topic routes
app.include_router(topics.router, prefix=f"{ROUTE_PREFIX}/topics", tags=["Topics"])

# Mount question routes
app.include_router(questions.router, prefix=f"{ROUTE_PREFIX}/questions", tags=["Questions"])

# Mount exam routes
app.include_router(exams.router, prefix=f"{ROUTE_PREFIX}/exams", tags=["Exams"])

# Mount student exam routes
app.include_router(student_exams.router, prefix=f"{ROUTE_PREFIX}/student-exams", tags=["Student Exams", "Exam Results"])

# Mount subscription routes
app.include_router(subscriptions.router, prefix=f"{ROUTE_PREFIX}/subscriptions", tags=["Subscriptions"])

# Mount content routes
app.include_router(content.router, prefix=f"{ROUTE_PREFIX}/content", tags=["Content"])

# Mount stream routes
app.include_router(streams.router, prefix=f"{ROUTE_PREFIX}/streams", tags=["Streams"])

# Mount class routes
app.include_router(class_.router, prefix=f"{ROUTE_PREFIX}/classes", tags=["Classes"])

# Mount package routes
app.include_router(packages.router, prefix=f"{ROUTE_PREFIX}/packages", tags=["Packages"])

# Mount subscription_package routes
app.include_router(subscription_package.router, prefix=f"{ROUTE_PREFIX}/subscription-packages", tags=["Subscription Packages"])

# Mount subscription_reports routes
app.include_router(subscription_reports.router, prefix=f"{ROUTE_PREFIX}", tags=["Subscription Reports"])

# Mount student_reports routes 
app.include_router(student_reports.router, prefix=f"{ROUTE_PREFIX}", tags=["Student Reports"])

# Mount exam_attempts routes
app.include_router(exam_attempts.router, prefix=f"{ROUTE_PREFIX}/exam-attempts", tags=["Exam Attempts"])

# Print all routes for debugging
print("\nAvailable API Routes:")
for route in app.routes:
    if hasattr(route, "methods"):
        methods = route.methods
        path = route.path
        print(f"Route: {path}, Methods: {methods}")

# Health check endpoint
@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "version": "1.0.0"}

# Root endpoint
@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Welcome to the Learning and Assessment Management System API"}

# Custom Swagger UI with explicit authorization functionality
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} - Swagger UI",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui.css",
        swagger_ui_parameters={
            "persistAuthorization": True,
            "displayRequestDuration": True,
            "tryItOutEnabled": True,
            "docExpansion": "list",
            "defaultModelsExpandDepth": 2,
            "filter": True,
            "syntaxHighlight.theme": "monokai"
        }
    )

# OAuth2 redirect endpoint required for Swagger UI
@app.get("/docs/oauth2-redirect", include_in_schema=False)
async def swagger_ui_redirect():
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>OAuth2 Redirect</title>
        <script>
            'use strict';
            function run() {
                var oauth2 = window.opener.swaggerUIRedirectOauth2;
                var sentState = oauth2.state;
                var redirectUrl = oauth2.redirectUrl;
                var isValid = true;
                
                if (window.location.search) {
                    var qp = new URLSearchParams(window.location.search);
                    
                    if (qp.has('code')) {
                        var authorizationCode = qp.get('code');
                        oauth2.auth.code = authorizationCode;
                        oauth2.callback({auth: oauth2.auth, redirectUrl: redirectUrl});
                    } else {
                        oauth2.callback({auth: {}, redirectUrl: redirectUrl});
                    }
                    
                    window.close();
                }
            }
            window.addEventListener('DOMContentLoaded', run);
        </script>
    </head>
    <body>
        <h2>Authorization Successful</h2>
        <p>Please close this window and return to the Swagger UI.</p>
    </body>
    </html>
    """

# Add static file serving before any routes
app.mount("/static", StaticFiles(directory=UPLOAD_DIR), name="static")

@app.on_event("startup")
async def startup_event():
    """
    Initialize background tasks when the application starts
    """
    background_tasks = BackgroundTasks()
    start_scheduler(background_tasks)
