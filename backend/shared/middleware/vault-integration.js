const axios = require('axios');
const NodeCache = require('node-cache');

class VaultClient {
    constructor() {
        this.vaultUrl = process.env.VAULT_ADDR || 'http://vault:8200';
        this.token = process.env.VAULT_TOKEN;
        this.cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache
        this.roleId = process.env.VAULT_ROLE_ID;
        this.secretId = process.env.VAULT_SECRET_ID;
    }

    async authenticate() {
        const response = await axios.post(
            `${this.vaultUrl}/v1/auth/approle/login`,
            { role_id: this.roleId, secret_id: this.secretId }
        );
        this.token = response.data.auth.client_token;
        return this.token;
    }

    async getSecret(secretPath) {
        const cachedSecret = this.cache.get(secretPath);
        if (cachedSecret) return cachedSecret;

        try {
            const response = await axios.get(
                `${this.vaultUrl}/v1/secret/data/${secretPath}`,
                { headers: { 'X-Vault-Token': this.token } }
            );
            
            const secret = response.data.data.data;
            this.cache.set(secretPath, secret);
            return secret;
        } catch (error) {
            if (error.response?.status === 403) {
                await this.authenticate();
                return this.getSecret(secretPath);
            }
            throw error;
        }
    }

    async getDatabaseCredentials(role = 'orders-ro') {
        const response = await axios.get(
            `${this.vaultUrl}/v1/database/creds/${role}`,
            { headers: { 'X-Vault-Token': this.token } }
        );
        return response.data.data;
    }

    async signJWT(payload) {
        const response = await axios.post(
            `${this.vaultUrl}/v1/transit/sign/jwt-signing-key`,
            { input: Buffer.from(JSON.stringify(payload)).toString('base64') }
        );
        return response.data.data.signature;
    }
}

// Zero Trust Middleware
const zeroTrustMiddleware = async (req, res, next) => {
    const vaultClient = new VaultClient();
    
    // 1. Verify JWT token
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        // 2. Get signing key from Vault to verify
        const signingKey = await vaultClient.getSecret('jwt/signing-key');
        
        // 3. Verify token with vault (simplified)
        const isValid = await verifyTokenWithVault(token, signingKey);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // 4. Check device fingerprint
        const deviceFingerprint = req.headers['x-device-fingerprint'];
        if (!deviceFingerprint || !await validateDevice(deviceFingerprint)) {
            return res.status(403).json({ error: 'Device not recognized' });
        }

        // 5. Get user context and apply policies
        const userContext = await getUserContext(req);
        req.userContext = userContext;

        // 6. Check if action is allowed
        const isAllowed = await checkPolicy(userContext, req.path, req.method);
        if (!isAllowed) {
            return res.status(403).json({ error: 'Action not allowed' });
        }

        next();
    } catch (error) {
        console.error('Zero trust middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { VaultClient, zeroTrustMiddleware };