#!/bin/bash

# Initialize Vault
vault operator init -key-shares=1 -key-threshold=1

# Unseal Vault
vault operator unseal

# Enable KV secrets engine
vault secrets enable -version=2 kv

# Create policies
vault policy write tech-store-policy - <<EOF
path "kv/data/tech-store/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "kv/metadata/tech-store/*" {
  capabilities = ["list"]
}
EOF

# Create secrets for each service
vault kv put kv/tech-store/auth-service \
  jwt_secret="your-jwt-secret-here" \
  db_password="auth-db-password" \
  redis_password="redis-pass"

vault kv put kv/tech-store/product-service \
  db_connection="mongodb://user:pass@mongodb:27017" \
  api_key="product-api-key"

vault kv put kv/tech-store/database \
  root_password="secure-root-password" \
  techstore_user="appuser" \
  techstore_password="apppassword"