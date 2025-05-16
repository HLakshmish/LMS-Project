import os
import shutil
from fastapi import UploadFile, HTTPException
from datetime import datetime
from typing import Optional
import aiofiles
from pathlib import Path

# Configure upload directory
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)  # Ensure upload directory exists

# Default maximum file size: 10MB
DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes

# Maximum file size for content uploads: 100MB
CONTENT_MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB in bytes

def get_file_extension(filename: str) -> str:
    """Get the file extension from the filename."""
    return os.path.splitext(filename)[1].lower()

def generate_unique_filename(original_filename: str, content_type: str) -> str:
    """Generate a unique filename based on timestamp and original filename."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    extension = get_file_extension(original_filename)
    base_name = os.path.splitext(os.path.basename(original_filename))[0]
    sanitized_name = "".join(c for c in base_name if c.isalnum() or c in ('-', '_'))
    return f"{sanitized_name}_{timestamp}{extension}"

async def save_upload_file(upload_file: UploadFile, content_type: str, max_file_size: int = DEFAULT_MAX_FILE_SIZE) -> str:
    """
    Save an uploaded file and return its relative path.
    
    Args:
        upload_file (UploadFile): The uploaded file
        content_type (str): Type of content (video, pdf, document, questions, answers)
        max_file_size (int): Maximum allowed file size in bytes (default: 10MB; 
                            content uploads use 100MB by default)
        
    Returns:
        str: Relative path to the saved file
        
    Raises:
        HTTPException: If file size exceeds the maximum allowed size
    """
    try:
        # Check if upload_file is valid
        if not upload_file or not hasattr(upload_file, 'filename') or not upload_file.filename:
            return None

        # Check file size
        file_size = upload_file.size if hasattr(upload_file, "size") else 0
        
        # If size isn't directly available, read the file to determine size
        if file_size == 0:
            contents = await upload_file.read()
            file_size = len(contents)
            # Reset file position after reading
            await upload_file.seek(0)
            
        if file_size > max_file_size:
            size_in_mb = file_size / (1024 * 1024)
            max_size_mb = max_file_size / (1024 * 1024)
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds maximum allowed size of {max_size_mb}MB. Your file is {size_in_mb:.2f}MB"
            )
        
        # Create content type directory if it doesn't exist
        content_dir = os.path.join(UPLOAD_DIR, content_type)
        os.makedirs(content_dir, exist_ok=True)
        
        # Generate unique filename
        filename = generate_unique_filename(upload_file.filename, content_type)
        file_path = os.path.join(content_dir, filename)
        
        # Save the file
        async with aiofiles.open(file_path, 'wb') as out_file:
            # If we've already read the content for size checking, use it
            if file_size > 0 and 'contents' in locals():
                await out_file.write(contents)
            else:
                # Otherwise read it now
                content = await upload_file.read()
                await out_file.write(content)
        
        # Generate public URL - use relative path for storage
        relative_path = f"{content_type}/{filename}"
        return relative_path
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log the error in production
        print(f"Error saving file: {str(e)}")
        raise Exception(f"Failed to save file: {str(e)}") 