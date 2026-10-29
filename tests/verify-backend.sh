#!/bin/bash
# TDD Verification Script for Backend with Volume Persistence Check

set -e

IMAGE_NAME="ryuk-backend-test"
CONTAINER_NAME="ryuk-backend-test-run"
VOLUME_NAME="ryuk_test_data"
PORT=3005

echo "Phase: Cleanup old test containers and volume"
docker ps -q --filter "name=$CONTAINER_NAME" | xargs -r docker stop
docker ps -aq --filter "name=$CONTAINER_NAME" | xargs -r docker rm
docker volume rm -f $VOLUME_NAME 2>/dev/null || true

echo "Phase: Building Backend Image"
docker build -t $IMAGE_NAME ./backend

echo "Starting Backend Container with persistent volume on port $PORT..."
docker run -d --name $CONTAINER_NAME -p $PORT:3000 -v $VOLUME_NAME:/app/data -e ADMIN_SECRET=testsecret123 $IMAGE_NAME

sleep 4

echo "Testing /health endpoint..."
RESPONSE=$(curl -s http://localhost:$PORT/health || echo "FAILED")

if [[ "$RESPONSE" == *"OK"* ]] || [[ "$RESPONSE" == *"status"* ]]; then
    echo "SUCCESS: Backend is healthy!"
else
    echo "ERROR: Backend health check failed: $RESPONSE"
    docker logs $CONTAINER_NAME
    docker stop $CONTAINER_NAME
    docker rm $CONTAINER_NAME
    exit 1
fi

echo "Creating an API Key to test persistence..."
CREATE_KEY_RES=$(curl -s -X POST http://localhost:$PORT/admin/keys \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: testsecret123" \
  -d '{"name":"Persistent Test Key"}')

KEY_ID=$(echo "$CREATE_KEY_RES" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "Created Key ID: $KEY_ID"

echo "Simulating server update/restart: Stopping and removing container..."
docker stop $CONTAINER_NAME
docker rm $CONTAINER_NAME

echo "Spawning a NEW container using the SAME volume..."
docker run -d --name $CONTAINER_NAME -p $PORT:3000 -v $VOLUME_NAME:/app/data -e ADMIN_SECRET=testsecret123 $IMAGE_NAME
sleep 4

echo "Checking if API Key persisted..."
LIST_RES=$(curl -s -H "x-admin-secret: testsecret123" http://localhost:$PORT/admin/keys)

if [[ "$LIST_RES" == *"$KEY_ID"* ]]; then
    echo "SUCCESS: API Key persisted across container recreation!"
else
    echo "ERROR: Key was lost on container recreation!"
    echo "Response: $LIST_RES"
    docker stop $CONTAINER_NAME
    docker rm $CONTAINER_NAME
    docker volume rm -f $VOLUME_NAME
    exit 1
fi

echo "Cleaning up..."
docker stop $CONTAINER_NAME
docker rm $CONTAINER_NAME
docker volume rm -f $VOLUME_NAME
echo "Backend Persistence Verification Complete!"
