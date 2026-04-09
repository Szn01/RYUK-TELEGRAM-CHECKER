#!/bin/bash
# TDD Verification Script for Backend

set -e

IMAGE_NAME="ryuk-backend-test"
CONTAINER_NAME="ryuk-backend-test-run"
PORT=3005

echo "Phase: RED - Checking if container is already running (it shouldn't be)"
docker ps -q --filter "name=$CONTAINER_NAME" | xargs -r docker stop
docker ps -aq --filter "name=$CONTAINER_NAME" | xargs -r docker rm

echo "Phase: GREEN - Building Backend Image"
docker build -t $IMAGE_NAME ./backend

echo "Starting Backend Container on port $PORT..."
docker run -d --name $CONTAINER_NAME -p $PORT:3000 $IMAGE_NAME

# Wait for it to start
sleep 5

echo "Testing /health endpoint..."
RESPONSE=$(curl -s http://localhost:$PORT/health || echo "FAILED")

if [[ "$RESPONSE" == *"OK"* ]] || [[ "$RESPONSE" == *"status"* ]]; then
    echo "SUCCESS: Backend is healthy!"
    echo "Response: $RESPONSE"
else
    echo "ERROR: Backend health check failed."
    echo "Response: $RESPONSE"
    docker logs $CONTAINER_NAME
    docker stop $CONTAINER_NAME
    docker rm $CONTAINER_NAME
    exit 1
fi

echo "Cleaning up..."
docker stop $CONTAINER_NAME
docker rm $CONTAINER_NAME
echo "Backend Verification Complete!"
