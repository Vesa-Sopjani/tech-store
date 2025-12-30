# backend/kafka/start-kafka.sh
#!/bin/bash

echo "🚀 Starting Tech Store Kafka Cluster..."
echo "========================================"

# Create necessary directories
mkdir -p scripts schemas

# Make scripts executable
chmod +x scripts/create-topics.sh

# Start Kafka stack
docker-compose up -d

# Wait for services
echo "⏳ Waiting for Kafka to be ready..."
sleep 30

# Check if services are running
echo "🔍 Checking services status..."
docker-compose ps

# Create topics
echo "📝 Creating topics..."
docker exec tech-store-topics-init bash /create-topics.sh

echo ""
echo "✅ Kafka Stack Started Successfully!"
echo ""
echo "🔗 Kafka UI:        http://localhost:8080"
echo "🔗 Schema Registry: http://localhost:8081"
echo "🔗 Kafka Connect:   http://localhost:8083"
echo ""
echo "📊 Kafka Brokers: localhost:9092"
echo "📊 Zookeeper:     localhost:2181"