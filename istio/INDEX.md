# Istio Service Mesh - Index i Files

Ky dokument tregon strukturën e plotë të konfigurimeve të Istio dhe çfarë bën çdo file.

## 📁 Struktura e Direktorisë

```
istio/
├── gateway/                          # Ingress Gateway konfigurime
│   ├── ingress-gateway.yaml         # Gateway për trafikun nga jashtë (HTTP/HTTPS)
│   └── virtual-service-ingress.yaml # Routing për ingress traffic
│
├── observability/                    # Observability dhe monitoring
│   ├── telemetry.yaml               # Konfigurim për tracing, logging, metrics
│   ├── prometheus-config.yaml       # Prometheus configuration për Istio metrics
│   ├── kiali-config.yaml            # Kiali configuration
│   ├── kiali-service.yaml           # Kiali service dhe ingress
│   └── jaeger-config.yaml           # Jaeger tracing configuration
│
├── security/                         # Security konfigurime
│   ├── peer-authentication.yaml     # mTLS configuration (STRICT mode)
│   └── authorization-policy.yaml    # Authorization policies për çdo shërbim
│
├── traffic-management/               # Traffic management konfigurime
│   ├── virtual-service-*.yaml       # VirtualServices për routing
│   │   ├── api-gateway-vs.yaml
│   │   ├── product-service-vs.yaml
│   │   ├── user-service-vs.yaml
│   │   ├── order-service-vs.yaml
│   │   ├── category-service-vs.yaml
│   │   ├── analytics-service-vs.yaml
│   │   ├── notification-service-vs.yaml
│   │   └── admin-service-vs.yaml
│   │
│   └── destination-rule-*.yaml      # DestinationRules për policies
│       ├── api-gateway-dr.yaml
│       ├── product-service-dr.yaml
│       ├── user-service-dr.yaml
│       ├── order-service-dr.yaml
│       ├── category-service-dr.yaml
│       ├── analytics-service-dr.yaml
│       ├── notification-service-dr.yaml
│       └── admin-service-dr.yaml
│
├── scripts/                          # Installation dhe management scripts
│   ├── install-istio.sh             # Instalim i Istio dhe addons
│   ├── apply-istio-config.sh        # Aplikim i të gjitha konfigurimeve
│   ├── verify-mtls.sh               # Verifikim i mTLS encryption
│   └── uninstall-istio.sh           # Heqje e Istio (me konfirmim)
│
└── Documentation/
    ├── README.md                    # Dokumentacion i plotë (Anglisht)
    ├── QUICKSTART.md                # Quick start guide
    ├── SUMMARY_AL.md                # Përmbledhje në Shqip
    └── INDEX.md                     # Ky file
```

## 📋 Përshkrimi i Files

### Gateway Files

#### `gateway/ingress-gateway.yaml`
- **Qëllimi**: Konfiguron Gateway për trafikun që vjen nga jashtë
- **Ports**: HTTP (80) dhe HTTPS (443)
- **Hosts**: techstore.local, api.techstore.local
- **TLS**: SIMPLE mode me certifikatë SSL

#### `gateway/virtual-service-ingress.yaml`
- **Qëllimi**: Route trafikun nga ingress gateway te shërbimet
- **Routes**:
  - `/api/*` → api-gateway
  - `/` → frontend
- **Features**: CORS policies, retries, timeouts

### Observability Files

#### `observability/telemetry.yaml`
- **Qëllimi**: Konfiguron mbledhjen e telemetrisë
- **Components**:
  - Access logging (Envoy)
  - Distributed tracing (Jaeger, 100% sampling)
  - Metrics (Prometheus)
- **Namespace**: istio-system dhe techstore

#### `observability/prometheus-config.yaml`
- **Qëllimi**: Prometheus scrape configuration
- **Targets**:
  - Istio components (istiod, ingressgateway)
  - Envoy proxies (sidecars)
  - Application metrics

#### `observability/kiali-config.yaml`
- **Qëllimi**: Kiali service mesh visualization configuration
- **Features**: Authentication, external services integration, UI defaults

#### `observability/jaeger-config.yaml`
- **Qëllimi**: Jaeger distributed tracing setup
- **Storage**: Memory (për development), mund të ndryshohet në Elasticsearch për production

### Security Files

#### `security/peer-authentication.yaml`
- **Qëllimi**: Aktivizon mTLS midis shërbimeve
- **Mode**: STRICT (të gjitha komunikimet janë të enkriptuara)
- **Exception**: MySQL, Redis, Kafka kanë PERMISSIVE (për migrim)

#### `security/authorization-policy.yaml`
- **Qëllimi**: Kontrollon kush mund të komunikojë me çfarë shërbimi
- **Policies**: Një për çdo shërbim me rules specifike
- **Principals**: Service accounts që lejohen

### Traffic Management Files

#### VirtualServices (`virtual-service-*.yaml`)
- **Qëllimi**: Përcakton routing rules dhe traffic splitting
- **Features**:
  - Route definitions
  - Weight-based splitting (p.sh., 90/10 për canary)
  - Retry policies
  - Timeouts
  - Fault injection (për testing)

#### DestinationRules (`destination-rule-*.yaml`)
- **Qëllimi**: Përcakton policies për trafikun
- **Features**:
  - Load balancing (ROUND_ROBIN, LEAST_CONN)
  - Circuit breaking (outlier detection)
  - Connection pooling
  - mTLS configuration
  - Subsets (v1, v2 për canary)

### Scripts

#### `scripts/install-istio.sh`
- **Qëllimi**: Instalon Istio dhe addons
- **Steps**:
  1. Shkarkon Istio
  2. Instalon me profile default
  3. Verifikon instalimin
  4. Aktivizon sidecar injection
  5. Instalon addons (Prometheus, Grafana, Kiali, Jaeger)

#### `scripts/apply-istio-config.sh`
- **Qëllimi**: Aplikon të gjitha konfigurimet
- **Order**:
  1. Krijon namespace techstore
  2. Aplikon traffic management
  3. Aplikon security
  4. Aplikon gateway
  5. Aplikon observability
  6. Verifikon

#### `scripts/verify-mtls.sh`
- **Qëllimi**: Verifikon që mTLS është aktiv
- **Checks**:
  - PeerAuthentication policies
  - DestinationRules TLS mode
  - Test connectivity
  - Envoy stats

#### `scripts/uninstall-istio.sh`
- **Qëllimi**: Heq Istio (me konfirmim)
- **Steps**:
  1. Heq konfigurimet
  2. Heq addons
  3. Uninstall Istio
  4. Heq namespace istio-system

## 🎯 Workflow i Aplikimit

```
1. Instalo Istio
   └── scripts/install-istio.sh

2. Apliko Konfigurimet
   ├── scripts/apply-istio-config.sh
   │   ├── gateway/
   │   ├── traffic-management/
   │   ├── security/
   │   └── observability/

3. Deploy Shërbimet
   └── k8s/deployments/*.yaml

4. Verifiko
   ├── scripts/verify-mtls.sh
   └── kubectl get virtualservice,destinationrule,peerauthentication
```

## 🔗 Dependencies

### Midis Files

```
peer-authentication.yaml
  └──> destination-rule-*.yaml (tls.mode: ISTIO_MUTUAL)

virtual-service-*.yaml
  └──> destination-rule-*.yaml (subsets)

ingress-gateway.yaml
  └──> virtual-service-ingress.yaml (gateways)

telemetry.yaml
  ├──> prometheus-config.yaml
  ├──> kiali-config.yaml
  └──> jaeger-config.yaml
```

### Midis Komponenteve

```
Istio Control Plane (istiod)
  ├──> Envoy Sidecars (në çdo pod)
  ├──> Ingress Gateway
  └──> Addons (Prometheus, Kiali, Jaeger)
```

## 📊 Metrics dhe Monitoring

### Metrics të Mbledhura

- **Request Rate**: `istio_requests_total`
- **Error Rate**: `istio_requests_total{response_code=~"5.."}`
- **Latency**: `istio_request_duration_milliseconds`
- **Throughput**: Request per second
- **Circuit Breaker**: Pods ejected

### Dashboards

- **Kiali**: Service topology, health, traffic flows
- **Grafana**: Pre-built Istio dashboards
- **Prometheus**: Raw metrics queries
- **Jaeger**: Distributed traces

## 🚨 Troubleshooting Guide

### Nëse VirtualService nuk punon:
1. Kontrollo: `kubectl get virtualservice -n techstore`
2. Shiko logs: `kubectl logs <pod> -c istio-proxy`
3. Test: `kubectl exec <pod> -- curl <service>`

### Nëse mTLS dështon:
1. Kontrollo: `kubectl get peerauthentication -n techstore`
2. Verifiko: `istioctl authn tls-check <service> techstore`
3. Ndrysho temporarisht në PERMISSIVE për debug

### Nëse Observability nuk funksionon:
1. Kontrollo pods: `kubectl get pods -n istio-system`
2. Restart: `kubectl rollout restart deployment/kiali -n istio-system`
3. Shiko logs: `kubectl logs -n istio-system -l app=kiali`

## 📚 Referenca

- [Istio Documentation](https://istio.io/latest/docs/)
- [VirtualService API](https://istio.io/latest/docs/reference/config/networking/virtual-service/)
- [DestinationRule API](https://istio.io/latest/docs/reference/config/networking/destination-rule/)
- [PeerAuthentication API](https://istio.io/latest/docs/reference/config/security/peer_authentication/)
- [AuthorizationPolicy API](https://istio.io/latest/docs/reference/config/security/authorization-policy/)
