# Database secrets policy
path "database/creds/orders-ro" {
  capabilities = ["read"]
}

path "secret/data/services/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# JWT signing key policy
path "transit/keys/jwt-signing-key" {
  capabilities = ["read", "update"]
}

path "transit/sign/jwt-signing-key" {
  capabilities = ["create", "update"]
}