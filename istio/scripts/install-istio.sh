#!/bin/bash

# Script për instalimin e Istio Service Mesh
# Kjo skript instalon Istio dhe konfiguron të gjitha komponentet e nevojshme

set -e

echo "🚀 Duke filluar instalimin e Istio Service Mesh..."

# Ngjyrat për output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Kontrollo nëse kubectl është i instaluar
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl nuk është i instaluar. Ju lutem instaloni kubectl fillimisht.${NC}"
    exit 1
fi

# Kontrollo nëse clusteri Kubernetes është aktiv
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}❌ Nuk mund të lidhem me Kubernetes cluster. Ju lutem kontrolloni konfigurimin.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Kubernetes cluster është i disponueshëm${NC}"

# Versioni i Istio që do të instalohet
ISTIO_VERSION=${ISTIO_VERSION:-"1.19.0"}

echo -e "${YELLOW}📦 Duke instaluar Istio version ${ISTIO_VERSION}...${NC}"

# Shkarko Istio (nëse nuk ekziston)
if [ ! -d "istio-${ISTIO_VERSION}" ]; then
    echo "Duke shkarkuar Istio..."
    curl -L https://istio.io/downloadIstio | ISTIO_VERSION=${ISTIO_VERSION} TARGET_ARCH=x86_64 sh -
fi

cd istio-${ISTIO_VERSION}

# Instalo Istio me profile demo (për development) ose default (për production)
PROFILE=${ISTIO_PROFILE:-"default"}

echo -e "${YELLOW}Duke instaluar Istio me profile: ${PROFILE}...${NC}"

# Instalo Istio
./bin/istioctl install --set profile=${PROFILE} -y

# Verifiko instalimin
echo -e "${YELLOW}Duke verifikuar instalimin...${NC}"
./bin/istioctl verify-install

# Aktivizo sidecar injection për namespace techstore
echo -e "${YELLOW}Duke aktivizuar sidecar injection...${NC}"
kubectl label namespace techstore istio-injection=enabled --overwrite || echo "Namespace techstore nuk ekziston ende, do të krijohet më vonë"

# Instalo addons (Kiali, Jaeger, Prometheus, Grafana)
echo -e "${YELLOW}Duke instaluar addons (Kiali, Jaeger, Prometheus)...${NC}"
kubectl apply -f samples/addons/prometheus.yaml || true
kubectl apply -f samples/addons/grafana.yaml || true
kubectl apply -f samples/addons/kiali.yaml || true
kubectl apply -f samples/addons/jaeger.yaml || true

cd ..

echo -e "${GREEN}✅ Istio u instalua me sukses!${NC}"
echo ""
echo "📊 Komponentet e instaluara:"
echo "  - Istiod (Control Plane)"
echo "  - Istio Ingress Gateway"
echo "  - Prometheus (Metrics)"
echo "  - Grafana (Dashboards)"
echo "  - Kiali (Service Mesh Visualization)"
echo "  - Jaeger (Distributed Tracing)"
echo ""
echo "🔍 Për të kontrolluar statusin:"
echo "  kubectl get pods -n istio-system"
echo ""
echo "🌐 Për të hapur Kiali:"
echo "  istioctl dashboard kiali"
echo ""
echo "📈 Për të hapur Grafana:"
echo "  istioctl dashboard grafana"
echo ""
echo "🔍 Për të hapur Jaeger:"
echo "  istioctl dashboard jaeger"
echo ""
