/**
 * SHEMBULL: Si të integrosh Resilience Utilities në product-service
 * 
 * Ky file tregon si duhet të përdoret resilience-utils.js për:
 * - Database operations me circuit breaker
 * - Retry me exponential backoff
 * - Fallback strategies
 * 
 * IMPORTANT: Ky është një shembull. Kopjo dhe integro në app.js aktual
 */

const {
  DatabaseResilience,
  HttpClientResilience,
  FallbackStrategies,
  ResilienceWrapper
} = require('../../shared/resilience/resilience-utils');

// ==================== DATABASE RESILIENCE SETUP ====================
// Në fillim të app.js, pasi të krijohet pool:

// const dbResilience = DatabaseResilience.create(pool, {
//   serviceName: 'product-service',
//   timeout: 10000,
//   failureThreshold: 5,
//   resetTimeout: 60000
// });

// ==================== SHEMBULL 1: GET Products me Fallback ====================
/*
app.get('/api/products', async (req, res) => {
  try {
    const products = await dbResilience.execute(
      `SELECT 
        p.id, p.name, p.description, p.price, p.category_id,
        p.stock_quantity, p.image_url, p.specifications,
        c.name as category_name
       FROM Products p
       LEFT JOIN Categories c ON p.category_id = c.id
       ORDER BY p.id DESC`,
      [],
      FallbackStrategies.emptyResponse('array')  // Fallback: kthen []
    );

    // Proceso specifikimet
    const processedProducts = products.map(product => {
      let specs = {};
      try {
        if (product.specifications) {
          specs = typeof product.specifications === 'string' 
            ? JSON.parse(product.specifications) 
            : product.specifications;
        }
      } catch (error) {
        console.error(`Error processing specs for product ${product.id}:`, error);
        specs = {};
      }
      
      return { ...product, specifications: specs };
    });

    res.json({
      success: true,
      data: processedProducts,
      total: processedProducts.length,
      source: products.length > 0 ? 'database' : 'fallback'
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message
    });
  }
});
*/

// ==================== SHEMBULL 2: GET Product by ID me Cached Fallback ====================
/*
// Nëse ke cache (Redis ose memory cache)
const cache = new Map(); // Ose Redis client

app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const cacheKey = `product:${id}`;

  try {
    const product = await dbResilience.execute(
      'SELECT * FROM Products WHERE id = ?',
      [id],
      FallbackStrategies.cachedData(cache, cacheKey)  // Fallback: kthen cached data
    );

    if (!product || product.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Cache result
    cache.set(cacheKey, product[0], 3600); // Cache për 1 orë

    res.json({
      success: true,
      data: product[0],
      source: product[0].source || 'database'
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message
    });
  }
});
*/

// ==================== SHEMBULL 3: POST Product me Retry dhe Transaction ====================
/*
app.post('/api/products', async (req, res) => {
  const { name, description, price, category_id, stock_quantity, image_url, specifications } = req.body;

  // Validim
  if (!name || !description || price === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Name, description, and price are required'
    });
  }

  try {
    const result = await dbResilience.transaction(async (connection) => {
      // Insert product
      const [insertResult] = await connection.execute(
        `INSERT INTO Products (name, description, price, category_id, stock_quantity, image_url, specifications)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          name.trim(),
          description.trim(),
          parseFloat(price) || 0,
          category_id ? parseInt(category_id) : null,
          parseInt(stock_quantity) || 0,
          image_url || null,
          JSON.stringify(specifications || {})
        ]
      );

      // Get created product
      const [rows] = await connection.execute(
        `SELECT p.*, c.name as category_name
         FROM Products p
         LEFT JOIN Categories c ON p.category_id = c.id
         WHERE p.id = ?`,
        [insertResult.insertId]
      );

      return rows[0];
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message
    });
  }
});
*/

// ==================== SHEMBULL 4: Call Category Service me HTTP Resilience ====================
/*
app.get('/api/products/:id/category', async (req, res) => {
  const { id } = req.params;
  const categoryServiceUrl = process.env.CATEGORY_SERVICE_URL || 'http://category-service:5005';

  try {
    // Get product category_id
    const [products] = await dbResilience.execute(
      'SELECT category_id FROM Products WHERE id = ?',
      [id]
    );

    if (!products || products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const categoryId = products[0].category_id;
    if (!categoryId) {
      return res.json({
        success: true,
        data: null,
        message: 'Product has no category'
      });
    }

    // Call category service me resilience
    const category = await HttpClientResilience.request(
      `${categoryServiceUrl}/api/categories/${categoryId}`,
      { method: 'GET' },
      {
        serviceName: 'product-service',
        retry: { enabled: true, maxRetries: 3, initialDelay: 1000 },
        circuitBreaker: { enabled: true, failureThreshold: 5 },
        fallback: FallbackStrategies.defaultValue({ id: categoryId, name: 'Unknown Category' })
      }
    );

    res.json({
      success: true,
      data: category,
      source: category.source || 'category-service'
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching category',
      error: error.message
    });
  }
});
*/

// ==================== SHEMBULL 5: Health Check me Resilience Stats ====================
/*
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: 'unknown',
      memory: 'unknown'
    },
    resilience: {
      circuitBreaker: dbResilience.getStats()
    }
  };

  // Database check
  try {
    await dbResilience.getConnection();
    health.checks.database = 'healthy';
  } catch (error) {
    health.checks.database = 'unhealthy';
    health.status = 'unhealthy';
  }

  // Memory check
  const memUsage = process.memoryUsage();
  const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  health.checks.memory = {
    used: `${Math.round(memPercent)}%`,
    status: memPercent > 90 ? 'warning' : 'healthy'
  };

  if (memPercent > 95) {
    health.status = 'unhealthy';
  }

  // Circuit breaker check
  if (health.resilience.circuitBreaker.state === 'OPEN') {
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});
*/

// ==================== SHEMBULL 6: Metrics Endpoint për Prometheus ====================
/*
app.get('/metrics', async (req, res) => {
  const stats = dbResilience.getStats();
  
  // Prometheus format metrics
  const metrics = [
    `# HELP circuit_breaker_state Circuit breaker state (0=CLOSED, 1=OPEN, 2=HALF_OPEN)`,
    `# TYPE circuit_breaker_state gauge`,
    `circuit_breaker_state{state="${stats.state}"} ${stats.state === 'CLOSED' ? 0 : stats.state === 'OPEN' ? 1 : 2}`,
    `# HELP circuit_breaker_total_requests Total requests through circuit breaker`,
    `# TYPE circuit_breaker_total_requests counter`,
    `circuit_breaker_total_requests ${stats.totalRequests}`,
    `# HELP circuit_breaker_total_failures Total failures`,
    `# TYPE circuit_breaker_total_failures counter`,
    `circuit_breaker_total_failures ${stats.totalFailures}`,
    `# HELP circuit_breaker_total_successes Total successes`,
    `# TYPE circuit_breaker_total_successes counter`,
    `circuit_breaker_total_successes ${stats.totalSuccesses}`
  ].join('\n');

  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});
*/

module.exports = {
  // Export examples për reference
};
