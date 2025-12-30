# backend/kafka/scripts/create-topics.sh
#!/bin/bash

# Wait for Kafka to be ready
echo "⏳ Waiting for Kafka to be ready..."
while ! kafka-topics --bootstrap-server kafka:29092 --list; do
  sleep 5
done

echo "✅ Kafka is ready. Creating topics..."

# Define topics with their configurations
declare -A topics=(
  ["user-events"]="3 1"
  ["order-events"]="3 1"
  ["product-events"]="3 1"
  ["payment-events"]="3 1"
  ["notification-events"]="3 1"
  ["analytics-events"]="3 1"
  ["audit-logs"]="1 1"  # Audit logs (important for security)
  ["dead-letter-queue"]="3 1"  # DLQ for failed events
  ["_schemas"]="1 1"    # Schema Registry topic
)

# Create each topic
for topic in "${!topics[@]}"; do
  partitions="${topics[$topic]% *}"
  replication="${topics[$topic]#* }"
  
  echo "📝 Creating topic: $topic (Partitions: $partitions, Replication: $replication)"
  
  kafka-topics --bootstrap-server kafka:29092 \
    --create \
    --topic "$topic" \
    --partitions "$partitions" \
    --replication-factor "$replication" \
    --config retention.ms=604800000 \
    --config cleanup.policy=delete \
    --if-not-exists
done

# Create compacted topics for state
kafka-topics --bootstrap-server kafka:29092 \
  --create \
  --topic user-state \
  --partitions 3 \
  --replication-factor 1 \
  --config cleanup.policy=compact \
  --config delete.retention.ms=86400000 \
  --if-not-exists

echo "🎉 All topics created successfully!"
echo ""
echo "📊 Topics list:"
kafka-topics --bootstrap-server kafka:29092 --list