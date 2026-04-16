#!/bin/bash

# Start the application
echo "Starting the application..."
cd backend
.venv/scripts/activate
uvicorn main:app --host 0.0.0.0 --port 8000 reload

# new terminal
echo "Starting the frontend..."
cd ../web
npm run dev