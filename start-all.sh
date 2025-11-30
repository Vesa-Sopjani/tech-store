#!/bin/bash

echo "🚀 Starting all Tech Store services..."

echo "📦 Starting Product Service (Port 5001)..."
cd backend/product-service
npm run dev &

echo "📦 Starting Order Service (Port 5002)..."
cd ../order-service
npm run dev &

echo "📦 Starting User Service (Port 5003)..."
cd ../user-service
npm run dev &

echo "✅ All backend services are starting..."
echo "📍 Product Service: http://localhost:5001"
echo "📍 Order Service: http://localhost:5002"
echo "📍 User Service: http://localhost:5003"
echo ""
echo "🎯 Now start the frontend in a new terminal:"
echo "   cd frontend/tech-store-frontend && npm run dev"