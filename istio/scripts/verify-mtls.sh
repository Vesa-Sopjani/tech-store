#!/bin/bash

# Script për verifikimin e mTLS midis shërbimeve

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔒 Duke verifikuar mTLS encryption midis shërbimeve..."

NAMESPACE=${NAMESPACE:-"techstore"}

# Kontrollo PeerAuthentication
echo -e "${YELLOW}Duke kontrolluar PeerAuthentication policies...${NC}"
kubectl get peerauthentication -n ${NAMESPACE}

# Kontrollo DestinationRules për TLS mode
echo -e "${YELLOW}Duke kontrolluar DestinationRules për TLS mode...${NC}"
kubectl get destinationrule -n ${NAMESPACE} -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.trafficPolicy.tls.mode}{"\n"}{end}'

# Test komunikimin midis shërbimeve
echo -e "${YELLOW}Duke testuar komunikimin midis shërbimeve...${NC}"

# Test nga api-gateway në product-service
POD_NAME=$(kubectl get pods -n ${NAMESPACE} -l app=api-gateway -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

if [ -z "$POD_NAME" ]; then
    echo -e "${RED}❌ Nuk u gjet pod për api-gateway${NC}"
else
    echo -e "${GREEN}✓ U gjet pod: ${POD_NAME}${NC}"
    echo "Duke testuar komunikimin me product-service..."
    
    # Test HTTP request dhe kontrollo nëse përdoret mTLS
    kubectl exec -n ${NAMESPACE} ${POD_NAME} -c istio-proxy -- \
        curl -s -o /dev/null -w "%{http_code}" \
        http://product-service.techstore.svc.cluster.local:5001/health || true
    
    echo ""
    echo "Duke kontrolluar Envoy stats për TLS..."
    kubectl exec -n ${NAMESPACE} ${POD_NAME} -c istio-proxy -- \
        curl -s http://localhost:15000/stats | grep "tls" | head -10 || true
fi

echo ""
echo -e "${GREEN}✅ Verifikimi i mTLS u kompletuar${NC}"
echo ""
echo "💡 Për të parë më shumë detaje:"
echo "  kubectl exec -n ${NAMESPACE} <pod-name> -c istio-proxy -- curl http://localhost:15000/stats | grep tls"
echo "  istioctl authn tls-check <pod-name> ${NAMESPACE}"
echo ""
