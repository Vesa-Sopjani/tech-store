#!/bin/bash

# Script për aplikimin e të gjitha konfigurimeve të Istio
# Kjo skript aplikon traffic management, security, dhe observability configs

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔧 Duke aplikuar konfigurimet e Istio Service Mesh..."

# Krijo namespace nëse nuk ekziston
echo -e "${YELLOW}1. Duke krijuar namespace techstore...${NC}"
kubectl create namespace techstore --dry-run=client -o yaml | kubectl apply -f -
kubectl label namespace techstore istio-injection=enabled --overwrite

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ISTIO_DIR="$(dirname "$SCRIPT_DIR")"

# Apliko Traffic Management konfigurimet
echo -e "${YELLOW}2. Duke aplikuar Traffic Management konfigurimet...${NC}"
kubectl apply -f ${ISTIO_DIR}/traffic-management/ -n techstore

# Apliko Security konfigurimet
echo -e "${YELLOW}3. Duke aplikuar Security konfigurimet (mTLS, Authorization)...${NC}"
kubectl apply -f ${ISTIO_DIR}/security/ -n techstore

# Apliko Gateway konfigurimet
echo -e "${YELLOW}4. Duke aplikuar Gateway konfigurimet...${NC}"
kubectl apply -f ${ISTIO_DIR}/gateway/ -n techstore

# Apliko Observability konfigurimet
echo -e "${YELLOW}5. Duke aplikuar Observability konfigurimet...${NC}"
kubectl apply -f ${ISTIO_DIR}/observability/ -n istio-system
kubectl apply -f ${ISTIO_DIR}/observability/telemetry.yaml -n techstore

# Verifiko konfigurimet
echo -e "${YELLOW}6. Duke verifikuar konfigurimet...${NC}"

echo ""
echo -e "${GREEN}✅ Të gjitha konfigurimet u aplikuan me sukses!${NC}"
echo ""
echo "📋 Konfigurimet e aplikuara:"
echo ""
echo "Traffic Management:"
kubectl get virtualservice -n techstore
echo ""
kubectl get destinationrule -n techstore
echo ""
echo "Security:"
kubectl get peerauthentication -n techstore
echo ""
kubectl get authorizationpolicy -n techstore
echo ""
echo "Gateway:"
kubectl get gateway -n techstore
echo ""
echo "Observability:"
kubectl get telemetry -n techstore
echo ""
echo "🔍 Për të parë detaje:"
echo "  kubectl describe virtualservice -n techstore"
echo "  kubectl describe destinationrule -n techstore"
echo "  kubectl describe peerauthentication -n techstore"
echo ""
