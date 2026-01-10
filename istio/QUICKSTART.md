# Istio Service Mesh - Quick Start Guide

## 🚀 Instalim i Shpejtë

### Hapi 1: Instalo Istio

```bash
cd istio/scripts
chmod +x *.sh
./install-istio.sh
```

### Hapi 2: Apliko Konfigurimet

```bash
cd ..
./scripts/apply-istio-config.sh
```

### Hapi 3: Deploy Shërbimet

```bash
# Deploy të gjitha shërbimet me Istio sidecar
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/deployments/
```

### Hapi 4: Verifiko Instalimin

```bash
# Kontrollo pods
kubectl get pods -n techstore
kubectl get pods -n istio-system

# Verifiko mTLS
./scripts/verify-mtls.sh
```

## 🌐 Hap Dashboards

### Kiali (Service Mesh Visualization)

```bash
istioctl dashboard kiali
# Ose
kubectl port-forward -n istio-system svc/kiali 20001:20001
```

**URL**: http://localhost:20001

### Jaeger (Distributed Tracing)

```bash
istioctl dashboard jaeger
# Ose
kubectl port-forward -n istio-system svc/jaeger-query 16686:16686
```

**URL**: http://localhost:16686

### Grafana (Metrics Dashboards)

```bash
istioctl dashboard grafana
# Ose
kubectl port-forward -n istio-system svc/grafana 3000:3000
```

**URL**: http://localhost:3000  
**Default credentials**: admin / admin

### Prometheus (Metrics)

```bash
istioctl dashboard prometheus
# Ose
kubectl port-forward -n istio-system svc/prometheus 9090:9090
```

**URL**: http://localhost:9090

## ✅ Checklist

- [ ] Istio i instaluar (`kubectl get pods -n istio-system`)
- [ ] Namespace techstore me istio-injection enabled
- [ ] Të gjitha konfigurimet e aplikuara (VirtualServices, DestinationRules, etc.)
- [ ] Shërbimet deployed me sidecars
- [ ] mTLS aktiv (STRICT mode)
- [ ] Observability tools funksionojnë

## 📊 Komanda të Dobishme

### Traffic Management

```bash
# Shiko VirtualServices
kubectl get virtualservice -n techstore

# Shiko DestinationRules
kubectl get destinationrule -n techstore

# Test traffic routing
kubectl exec -n techstore <pod-name> -- curl http://product-service:5001/health
```

### Security

```bash
# Kontrollo PeerAuthentication
kubectl get peerauthentication -n techstore

# Verifiko mTLS
istioctl authn tls-check product-service techstore

# Kontrollo AuthorizationPolicy
kubectl get authorizationpolicy -n techstore
```

### Observability

```bash
# Shiko Envoy proxy stats
kubectl exec -n techstore <pod-name> -c istio-proxy -- curl http://localhost:15000/stats

# Shiko Kiali graph
# Hap Kiali dashboard dhe shko te "Graph" view

# Kërko traces në Jaeger
# Hap Jaeger dashboard, zgjidh service, shiko traces
```

## 🔧 Troubleshooting

### Sidecar nuk injektohet

```bash
kubectl label namespace techstore istio-injection=enabled --overwrite
kubectl rollout restart deployment -n techstore
```

### mTLS errors

```bash
# Temporarisht ndrysho në PERMISSIVE
kubectl patch peerauthentication default -n techstore --type=json \
  -p='[{"op": "replace", "path": "/spec/mtls/mode", "value": "PERMISSIVE"}]'
```

### Services nuk komunikojnë

```bash
# Test connectivity
kubectl exec -n techstore <source-pod> -- curl -v <destination-service>:<port>

# Kontrollo Envoy logs
kubectl logs -n techstore <pod-name> -c istio-proxy
```

## 📚 Dokumentacion

Për më shumë informacion, shiko [README.md](./README.md)
