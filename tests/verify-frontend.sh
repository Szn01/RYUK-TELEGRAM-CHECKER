#!/bin/bash
# TDD Verification Script for Frontend

set -e

IMAGE_NAME="ryuk-frontend-test"
CONTAINER_NAME="ryuk-frontend-test-run"
PORT=8080

echo "Phase: RED - Checking if container is already running"
docker ps -q --filter "name=$CONTAINER_NAME" | xargs -r docker stop
docker ps -aq --filter "name=$CONTAINER_NAME" | xargs -r docker rm

echo "Phase: GREEN - Building Frontend Image"
docker build -t $IMAGE_NAME ./frontend

echo "Starting Frontend Container on port $PORT..."
docker run -d --name $CONTAINER_NAME -p $PORT:80 $IMAGE_NAME

# Wait for it to start
sleep 5

echo "Testing Frontend response..."
RESPONSE=$(curl -sI http://localhost:$PORT | head -n 1)

if [[ "$RESPONSE" == *"200"* ]] || [[ "$RESPONSE" == *"304"* ]]; then
    echo "SUCCESS: Frontend is serving files!"
    echo "Response: $RESPONSE"
else
    echo "ERROR: Frontend check failed."
    echo "Response: $RESPONSE"
    docker logs $CONTAINER_NAME
    docker stop $CONTAINER_NAME
    docker rm $CONTAINER_NAME
    exit 1
fi

echo "Cleaning up..."
docker stop $CONTAINER_NAME
docker rm $CONTAINER_NAME
echo "Frontend Verification Complete!"
