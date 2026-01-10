/**
 * Resilience Utilities - Uniform implementation për retry, circuit breaker, dhe fallback
 * Kjo utility përdoret në të gjitha mikroserviset për resilience patterns
 */

// ==================== RETRY UTILITY ====================
class RetryUtils {
  /**
   * Retry një operacion me exponential backoff
   * @param {Function} operation - Operacioni që do të retry
   * @param {Object} options - Konfigurimi i retry
   * @returns {Promise} Rezultati i operacionit
   */
  static async withRetry(operation, options = {}) {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2,
      retryableErrors = [],
      onRetry = null
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Kontrollo nëse error është retryable
        if (retryableErrors.length > 0) {
          const isRetryable = retryableErrors.some(pattern => {
            if (typeof pattern === 'string') {
              return error.message.includes(pattern) || error.code === pattern;
            }
            if (pattern instanceof RegExp) {
              return pattern.test(error.message);
            }
            return false;
          });

          if (!isRetryable && attempt < maxRetries) {
            throw error; // Nëse nuk është retryable, mos retry
          }
        }

        // Nëse kemi përfunduar retries, kthe error
        if (attempt >= maxRetries) {
          break;
        }

        // Callback për retry
        if (onRetry) {
          onRetry(attempt + 1, maxRetries, error, delay);
        }

        // Wait para se të retry
        await new Promise(resolve => setTimeout(resolve, delay));

        // Exponential backoff
        delay = Math.min(delay * backoffFactor, maxDelay);
      }
    }

    throw lastError;
  }
}

// ==================== CIRCUIT BREAKER ====================
class CircuitBreaker {
  constructor(options = {}) {
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    
    // Configuration
    this.timeout = options.timeout || 10000;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.successThreshold = options.successThreshold || 2;
    this.name = options.name || 'CircuitBreaker';
    
    // Metrics
    this.totalRequests = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
  }

  /**
   * Ekzekuton një operacion përmes circuit breaker
   * @param {Function} operation - Operacioni që do të ekzekutojë
   * @param {Object} fallback - Fallback function ose value
   * @returns {Promise} Rezultati i operacionit ose fallback
   */
  async exec(operation, fallback = null) {
    this.totalRequests++;

    // Nëse circuit është OPEN, kontrollo nëse mund të provojmë përsëri
    if (this.state === 'OPEN') {
      if (Date.now() >= this.nextAttempt) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        console.log(`[${this.name}] Circuit breaker: OPEN -> HALF_OPEN`);
      } else {
        // Kthe fallback nëse ekziston
        if (fallback) {
          return typeof fallback === 'function' ? await fallback() : fallback;
        }
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
    }

    try {
      // Ekzekuto operacionin me timeout
      const result = await Promise.race([
        operation(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Operation timeout after ${this.timeout}ms`)), this.timeout)
        )
      ]);

      // Sukses
      this.onSuccess();
      return result;
    } catch (error) {
      // Dështim
      this.onFailure();

      // Nëse circuit është OPEN pas dështimit dhe kemi fallback
      if (this.state === 'OPEN' && fallback) {
        console.log(`[${this.name}] Using fallback due to circuit breaker OPEN`);
        return typeof fallback === 'function' ? await fallback() : fallback;
      }

      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.totalSuccesses++;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        console.log(`[${this.name}] Circuit breaker: HALF_OPEN -> CLOSED`);
      }
    } else {
      this.state = 'CLOSED';
    }
  }

  onFailure() {
    this.failureCount++;
    this.totalFailures++;

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      console.log(`[${this.name}] Circuit breaker: CLOSED -> OPEN (failures: ${this.failureCount})`);
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      nextAttempt: this.nextAttempt
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
  }
}

// ==================== FALLBACK STRATEGIES ====================
class FallbackStrategies {
  /**
   * Cached fallback - kthen cached data nëse ekziston
   */
  static cachedData(cache, key) {
    return async () => {
      if (cache && typeof cache.get === 'function') {
        const cached = await cache.get(key);
        if (cached) {
          console.log(`[Fallback] Returning cached data for key: ${key}`);
          return {
            ...cached,
            source: 'cache',
            cached: true
          };
        }
      }
      throw new Error('No cached data available');
    };
  }

  /**
   * Default value fallback - kthen një default value
   */
  static defaultValue(defaultValue) {
    return async () => {
      console.log('[Fallback] Returning default value');
      return {
        data: defaultValue,
        source: 'fallback',
        fallback: true
      };
    };
  }

  /**
   * Empty response fallback - kthen empty array ose object
   */
  static emptyResponse(type = 'array') {
    return async () => {
      console.log(`[Fallback] Returning empty ${type}`);
      return {
        data: type === 'array' ? [] : {},
        source: 'fallback',
        empty: true
      };
    };
  }

  /**
   * Error response fallback - kthen error response të strukturuar
   */
  static errorResponse(message, statusCode = 503) {
    return async () => {
      console.log(`[Fallback] Returning error response: ${message}`);
      return {
        success: false,
        error: message,
        source: 'fallback',
        statusCode
      };
    };
  }
}

// ==================== RESILIENCE WRAPPER ====================
class ResilienceWrapper {
  /**
   * Wrapper i plotë që kombinon retry, circuit breaker, dhe fallback
   * @param {Object} options - Konfigurimi i plotë
   * @returns {Function} Wrapper function
   */
  static create(options = {}) {
    const {
      name = 'ResilienceWrapper',
      retry = { enabled: true, maxRetries: 3 },
      circuitBreaker = { enabled: true },
      fallback = null,
      timeout = 10000
    } = options;

    const breaker = circuitBreaker.enabled
      ? new CircuitBreaker({ ...circuitBreaker, name: `${name}-CB` })
      : null;

    return async (operation) => {
      // Nëse kemi circuit breaker
      if (breaker) {
        return breaker.exec(async () => {
          // Nëse kemi retry, përdor retry brenda circuit breaker
          if (retry.enabled) {
            return RetryUtils.withRetry(operation, {
              ...retry,
              onRetry: (attempt, max, error, delay) => {
                console.log(`[${name}] Retry ${attempt}/${max} after ${delay}ms: ${error.message}`);
              }
            });
          }
          return operation();
        }, fallback);
      }

      // Nëse nuk kemi circuit breaker, përdor vetëm retry
      if (retry.enabled) {
        try {
          return await RetryUtils.withRetry(operation, retry);
        } catch (error) {
          if (fallback) {
            return typeof fallback === 'function' ? await fallback() : fallback;
          }
          throw error;
        }
      }

      // Nëse nuk kemi asnjë, ekzekuto direkt
      return operation();
    };
  }
}

// ==================== DATABASE RESILIENCE ====================
class DatabaseResilience {
  /**
   * Wrapper për database operations me resilience
   */
  static create(pool, options = {}) {
    const {
      serviceName = 'Service',
      enableCache = true,
      cacheTTL = 3600
    } = options;

    const breaker = new CircuitBreaker({
      name: `${serviceName}-DB`,
      timeout: options.timeout || 10000,
      failureThreshold: options.failureThreshold || 5,
      resetTimeout: options.resetTimeout || 60000
    });

    return {
      /**
       * Execute query me resilience
       */
      async execute(query, params = [], fallback = null) {
        return breaker.exec(async () => {
          const connection = await pool.getConnection();
          try {
            const [results] = await connection.execute(query, params);
            return results;
          } finally {
            connection.release();
          }
        }, fallback);
      },

      /**
       * Get connection me resilience
       */
      async getConnection(fallback = null) {
        return breaker.exec(async () => {
          return await pool.getConnection();
        }, fallback);
      },

      /**
       * Transaction me resilience
       */
      async transaction(callback, fallback = null) {
        return breaker.exec(async () => {
          const connection = await pool.getConnection();
          try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
          } catch (error) {
            await connection.rollback();
            throw error;
          } finally {
            connection.release();
          }
        }, fallback);
      },

      /**
       * Get circuit breaker stats
       */
      getStats: () => breaker.getState()
    };
  }
}

// ==================== HTTP CLIENT RESILIENCE ====================
class HttpClientResilience {
  /**
   * HTTP request me resilience (retry + circuit breaker)
   */
  static async request(url, options = {}, resilienceOptions = {}) {
    const {
      method = 'GET',
      headers = {},
      body = null,
      timeout = 10000
    } = options;

    const {
      serviceName = 'HTTPClient',
      retry = { enabled: true, maxRetries: 3 },
      circuitBreaker = { enabled: true },
      fallback = null
    } = resilienceOptions;

    const breaker = circuitBreaker.enabled
      ? new CircuitBreaker({ ...circuitBreaker, name: `${serviceName}-HTTP` })
      : null;

    const operation = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    if (breaker) {
      return breaker.exec(async () => {
        if (retry.enabled) {
          return RetryUtils.withRetry(operation, {
            ...retry,
            retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', 'timeout', /^HTTP 5\d{2}/]
          });
        }
        return operation();
      }, fallback);
    }

    if (retry.enabled) {
      return RetryUtils.withRetry(operation, {
        ...retry,
        retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', 'timeout', /^HTTP 5\d{2}/]
      });
    }

    return operation();
  }
}

module.exports = {
  RetryUtils,
  CircuitBreaker,
  FallbackStrategies,
  ResilienceWrapper,
  DatabaseResilience,
  HttpClientResilience
};
