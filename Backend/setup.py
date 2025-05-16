from setuptools import setup, find_packages

setup(
    name="backend-lms",
    version="0.1",
    packages=find_packages(),
    install_requires=[
        "fastapi==0.109.2",
        "uvicorn==0.27.1",
        "sqlalchemy==2.0.27",
        "pydantic==2.6.1",
        "python-jose[cryptography]==3.3.0",
        "passlib[bcrypt]==1.7.4",
        "python-multipart==0.0.9",
        "email-validator==2.1.0.post1"
    ],
) 