from app.core.database import engine, Base
from app.models.models import *
from app.core.init_db import init_db

print("Dropping all tables...")
Base.metadata.drop_all(bind=engine)
print("Creating all tables...")
Base.metadata.create_all(bind=engine)
print("Initializing database...")
init_db()
print("Database tables recreated and initialized successfully") 