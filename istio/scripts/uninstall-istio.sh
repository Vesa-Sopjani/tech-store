#!/bin/bash

# Script për heqjen e Istio Service Mesh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}⚠️  DUKE HEQUR ISTIO SERVICE MESH...${NC}"
echo ""
read -p "A jeni të sigurt që dëshironi të heqni Istio? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Operacioni u anulua."
    exit 0
fi

echo -e "${YELLOW}1. Duke hequr konfigurimet e Istio...${NC}"
kubectl delete -f gateway/ -n techstore --ignore-not-found=true
kubectl delete -f traffic-management/ -n techstore --ignore-not-found=true
kubectl delete -f security/ -n techstore --ignore-not-found=true
kubectl delete -f observability/ -n istio-system --ignore-not-found=true

echo -e "${YELLOW}2. Duke hequr addons...${NC}"
kubectl delete -f samples/addons/kiali.yaml --ignore-not-found=true
kubectl delete -f samples/addons/jaeger.yaml --ignore-not-found=true
kubectl delete -f samples/addons/grafana.yaml --ignore-not-found=true
kubectl delete -f samples/addons/prometheus.yaml --ignore-not-found=true

echo -e "${YELLOW}3. Duke hequr Istio...${NC}"
./bin/istioctl uninstall --purge -y || istioctl uninstall --purge -y

echo -e "${YELLOW}4. Duke hequr namespace istio-system...${NC}"
kubectl delete namespace istio-system --ignore-not-found=true

echo -e "${YELLOW}5. Duke hequr label nga namespace techstore...${NC}"
kubectl label namespace techstore istio-injection- || true

echo -e "${GREEN}✅ Istio u hoq me sukses!${NC}"
echo ""
echo "⚠️  Shënim: Pods në namespace techstore ende kanë sidecars."
echo "Për t'i hequr, restart pods ose re-deploy:"
echo "  kubectl rollout restart deployment -n techstore"
echo ""
