#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Tech Store Microservices Platform...${NC}"

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker is not installed${NC}"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}Docker Compose is not installed${NC}"
        exit 1
    fi
    
    # Check kubectl if K8s is enabled
    if [ "$1" = "k8s" ]; then
        if ! command -v kubectl &> /dev/null; then
            echo -e "${RED}kubectl is not installed${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✓ All prerequisites satisfied${NC}"
}

# Start infrastructure
start_infrastructure() {
    echo "Starting infrastructure services..."
    
    # Start databases
    docker-compose -f docker-compose.yml up -d postgres redis kafka zookeeper
    
    # Wait for services
    echo "Waiting for services to be ready..."
    sleep 30
    
    # Start Vault
    docker-compose -f security/docker-compose.vault.yml up -d
    
    # Initialize Vault
    ./security/vault/init.sh
    
    echo -e "${GREEN}✓ Infrastructure services started${NC}"
}

# Start monitoring
start_monitoring() {
    echo "Starting monitoring stack..."
    
    docker-compose -f monitoring/docker-compose.monitoring.yml up -d
    
    echo -e "${GREEN}✓ Monitoring stack started${NC}"
    echo "Grafana: http://localhost:3000"
    echo "Prometheus: http://localhost:9090"
}

# Start data pipeline
start_data_pipeline() {
    echo "Starting data pipeline..."
    
    docker-compose -f data-pipeline/docker-compose.data.yml up -d
    
    echo -e "${GREEN}✓ Data pipeline started${NC}"
}

# Start ML Ops
start_mlops() {
    echo "Starting ML Ops stack..."
    
    docker-compose -f mlops/docker-compose.mlops.yml up -d
    
    echo -e "${GREEN}✓ ML Ops stack started${NC}"
    echo "MLflow: http://localhost:5000"
}

# Start microservices
start_microservices() {
    echo "Starting microservices..."
    
    # Build and start all services
    for service in order-service product-service user-service analytics-service notification-service api-gateway; do
        echo "Starting $service..."
        cd backend/services/$service
        npm run docker:build
        npm run docker:start
        cd ../../..
    done
    
    echo -e "${GREEN}✓ All microservices started${NC}"
}

# Deploy to Kubernetes
deploy_k8s() {
    echo "Deploying to Kubernetes..."
    
    # Apply namespaces
    kubectl apply -f infrastructure/kubernetes/namespaces/
    
    # Apply config maps and secrets
    kubectl apply -f infrastructure/kubernetes/config/
    
    # Apply deployments
    kubectl apply -f infrastructure/kubernetes/deployments/
    
    # Apply services
    kubectl apply -f infrastructure/kubernetes/services/
    
    # Apply Istio config
    kubectl apply -f infrastructure/istio/
    
    # Apply HPA
    kubectl apply -f infrastructure/kubernetes/hpa/
    
    echo -e "${GREEN}✓ Deployed to Kubernetes${NC}"
}

# Main menu
main() {
    echo "Select deployment mode:"
    echo "1) Docker Compose (Development)"
    echo "2) Kubernetes (Production)"
    echo "3) All-in-One (Complete Platform)"
    read -p "Enter choice [1-3]: " choice
    
    check_prerequisites
    
    case $choice in
        1)
            echo "Starting Docker Compose deployment..."
            start_infrastructure
            start_microservices
            ;;
        2)
            echo "Starting Kubernetes deployment..."
            check_prerequisites k8s
            deploy_k8s
            ;;
        3)
            echo "Starting complete platform..."
            start_infrastructure
            start_monitoring
            start_data_pipeline
            start_mlops
            deploy_k8s
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}✅ Tech Store Platform started successfully!${NC}"
    
    # Show status
    echo ""
    echo "=== Platform Status ==="
    echo "API Gateway: http://localhost:8080"
    echo "Frontend: http://localhost:3000"
    echo "Grafana: http://localhost:3001"
    echo "Kibana: http://localhost:5601"
    echo "Jaeger: http://localhost:16686"
    echo "MLflow: http://localhost:5000"
    echo "========================="
}

# Run main function
main "$@"