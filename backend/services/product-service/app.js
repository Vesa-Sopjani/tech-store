const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
require("dotenv").config();

// Import resilience utilities
const {
  DatabaseResilience,
  FallbackStrategies,
  ResilienceWrapper,
} = require("../../shared/resilience/resilience-utils");

const app = express();

// 1. CORS - lejo frontend në portin 5173
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// 2. Database connection - FJALËKALIM BOSH për XAMPP
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "", // BOSH për XAMPP
  database: process.env.DB_NAME || "TechProductDB",
};

console.log("🔧 Database Config:", dbConfig);

// 3. Krijo pool
const pool = mysql.createPool(dbConfig);

// Funksion për të procesuar specifikimet
const processSpecifications = (specs) => {
  console.log("🔄 Procesoj specifikimet:", specs);

  if (!specs) {
    return {};
  }

  try {
    // Nëse është objekt, ktheje direkt
    if (typeof specs === "object" && specs !== null) {
      return specs;
    }

    // Nëse është string JSON
    if (typeof specs === "string") {
      // Provo si JSON
      if (specs.trim().startsWith("{")) {
        return JSON.parse(specs);
      }

      // Provo si text format (key: value)
      const lines = specs.split("\n").filter((line) => line.trim() !== "");
      const result = {};

      lines.forEach((line) => {
        const parts = line.split(":").map((part) => part.trim());
        if (parts.length >= 2) {
          const key = parts[0];
          const value = parts.slice(1).join(":").trim();
          if (key && value) {
            result[key] = value;
          }
        }
      });

      return result;
    }
  } catch (error) {
    console.error("❌ Gabim në procesimin e specifikimeve:", error);
    return {};
  }

  return {};
};

// 4. ROUTE: Merr të gjitha produktet
app.get("/api/products", async (req, res) => {
  console.log("📦 GET /api/products");

  let connection;
  try {
    connection = await pool.getConnection();

    const [products] = await connection.execute(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.category_id,
        p.stock_quantity,
        p.image_url,
        p.specifications,
        c.name as category_name
      FROM Products p
      LEFT JOIN Categories c ON p.category_id = c.id
      ORDER BY p.id DESC
    `);

    console.log(`✅ Gjeta ${products.length} produkte`);

    // Proceso specifikimet për çdo produkt
    const processedProducts = products.map((product) => {
      let specs = {};
      try {
        if (product.specifications) {
          if (typeof product.specifications === "string") {
            specs = JSON.parse(product.specifications);
          } else {
            specs = product.specifications;
          }
        }
      } catch (error) {
        console.error(
          `Gabim në specifikimet për produktin ${product.id}:`,
          error
        );
        specs = {};
      }

      return {
        ...product,
        specifications: specs,
      };
    });

    res.json({
      success: true,
      data: processedProducts,
      total: processedProducts.length,
    });
  } catch (error) {
    console.error("❌ Gabim në marrjen e produkteve:", error);
    res.status(500).json({
      success: false,
      message: "Gabim në server",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// 5. ROUTE: Krijo produkt të ri - VERSIONI I RREGULLTUAR
app.post("/api/products", async (req, res) => {
  console.log("\n➕ POST /api/products");
  console.log("Body:", JSON.stringify(req.body, null, 2));

  let connection;
  try {
    const {
      name,
      description,
      price,
      category_id,
      stock_quantity,
      image_url,
      specifications,
    } = req.body;

    // Validim
    if (!name || !description || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Emri, përshkrimi dhe çmimi janë të detyrueshëm",
      });
    }

    connection = await pool.getConnection();

    // Proceso specifikimet
    const specsToSave = processSpecifications(specifications);

    const [result] = await connection.execute(
      `INSERT INTO Products (name, description, price, category_id, stock_quantity, image_url, specifications)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        description.trim(),
        parseFloat(price) || 0,
        category_id ? parseInt(category_id) : null,
        parseInt(stock_quantity) || 0,
        image_url || null,
        JSON.stringify(specsToSave),
      ]
    );

    console.log("✅ Produkti u krijua me ID:", result.insertId);

    // Merr produktin e sapo krijuar
    const [rows] = await connection.execute(
      `
      SELECT 
        p.*, 
        c.name as category_name 
      FROM Products p 
      LEFT JOIN Categories c ON p.category_id = c.id 
      WHERE p.id = ?
    `,
      [result.insertId]
    );

    // Proceso specifikimet për përgjigje
    let productData = rows[0];
    if (
      productData.specifications &&
      typeof productData.specifications === "string"
    ) {
      try {
        productData.specifications = JSON.parse(productData.specifications);
      } catch (error) {
        productData.specifications = {};
      }
    }

    res.status(201).json({
      success: true,
      data: productData,
      message: "Produkti u krijua me sukses",
    });
  } catch (error) {
    console.error("❌ Gabim në krijimin e produktit:", error);
    res.status(500).json({
      success: false,
      message: "Gabim në krijimin e produktit",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

// 6. ROUTE: Përditëso produkt - VERSIONI I RREGULLTUAR
app.put("/api/products/:id", async (req, res) => {
  console.log(`\n✏️ PUT /api/products/${req.params.id}`);

  let connection;
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      category_id,
      stock_quantity,
      image_url,
      specifications,
    } = req.body;

    // Validim
    if (!name || !description || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Emri, përshkrimi dhe çmimi janë të detyrueshëm",
      });
    }

    connection = await pool.getConnection();

    // Proceso specifikimet
    const specsToSave = processSpecifications(specifications);

    const [result] = await connection.execute(
      `UPDATE Products 
       SET name = ?, description = ?, price = ?, category_id = ?, 
           stock_quantity = ?, image_url = ?, specifications = ?
       WHERE id = ?`,
      [
        name.trim(),
        description.trim(),
        parseFloat(price) || 0,
        category_id ? parseInt(category_id) : null,
        parseInt(stock_quantity) || 0,
        image_url || null,
        JSON.stringify(specsToSave),
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Produkti nuk u gjet",
      });
    }

    // Merr produktin e përditësuar
    const [rows] = await connection.execute(
      `
      SELECT 
        p.*, 
        c.name as category_name 
      FROM Products p 
      LEFT JOIN Categories c ON p.category_id = c.id 
      WHERE p.id = ?
    `,
      [id]
    );

    // Proceso specifikimet për përgjigje
    let productData = rows[0];
    if (
      productData.specifications &&
      typeof productData.specifications === "string"
    ) {
      try {
        productData.specifications = JSON.parse(productData.specifications);
      } catch (error) {
        productData.specifications = {};
      }
    }

    res.json({
      success: true,
      data: productData,
      message: "Produkti u përditësua me sukses",
    });
  } catch (error) {
    console.error("❌ Gabim në përditësimin e produktit:", error);
    res.status(500).json({
      success: false,
      message: "Gabim në përditësimin e produktit",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

// 7. ROUTE: Fshi produkt
app.delete("/api/products/:id", async (req, res) => {
  console.log(`\n🗑️ DELETE /api/products/${req.params.id}`);

  let connection;
  try {
    const { id } = req.params;

    connection = await pool.getConnection();

    // Merr emrin e produktit
    const [productRows] = await connection.execute(
      "SELECT name FROM Products WHERE id = ?",
      [id]
    );

    if (productRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Produkti nuk u gjet",
      });
    }

    const productName = productRows[0].name;

    // Fshi produktin
    await connection.execute("DELETE FROM Products WHERE id = ?", [id]);

    console.log(`✅ Produkti "${productName}" u fshi`);

    res.json({
      success: true,
      message: `Produkti "${productName}" u fshi me sukses`,
    });
  } catch (error) {
    console.error("❌ Gabim në fshirjen e produktit:", error);
    res.status(500).json({
      success: false,
      message: "Gabim në fshirjen e produktit",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

// 8. ROUTE: Merr kategoritë
app.get("/api/categories", async (req, res) => {
  console.log("📂 GET /api/categories");

  let connection;
  try {
    connection = await pool.getConnection();

    const [categories] = await connection.execute(
      "SELECT * FROM Categories ORDER BY name"
    );

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("❌ Gabim në marrjen e kategorive:", error);
    res.status(500).json({
      success: false,
      message: "Gabim në marrjen e kategorive",
    });
  } finally {
    if (connection) connection.release();
  }
});

// 9. ROUTE: Krijo kategori
app.post("/api/categories", async (req, res) => {
  console.log("\n📂 POST /api/categories");

  let connection;
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Emri i kategorisë është i detyrueshëm",
      });
    }

    connection = await pool.getConnection();

    const [result] = await connection.execute(
      "INSERT INTO Categories (name, description) VALUES (?, ?)",
      [name, description || null]
    );

    const [rows] = await connection.execute(
      "SELECT * FROM Categories WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      data: rows[0],
      message: "Kategoria u krijua me sukses",
    });
  } catch (error) {
    console.error("❌ Gabim në krijimin e kategorisë:", error);
    res.status(500).json({
      success: false,
      message: "Gabim në krijimin e kategorisë",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

// 10. ROUTE: Health check
app.get("/health", (req, res) => {
  res.json({
    status: "UP",
    service: "product-service",
    timestamp: new Date().toISOString(),
  });
});

// 11. ROUTE: Home
app.get("/", (req, res) => {
  res.json({
    message: "Product Service API",
    version: "1.0.0",
    endpoints: {
      products: "GET /api/products",
      categories: "GET /api/categories",
      health: "GET /health",
    },
  });
});

// 12. Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`
🚀 ====================================
🚀 PRODUCT SERVICE API
🚀 ====================================
📍 Port: ${PORT}
📍 URL: http://localhost:${PORT}
📍 API: http://localhost:${PORT}/api/products
📍 Health: http://localhost:${PORT}/health
📊 Database: ${dbConfig.database}
✅ Server is running...
====================================
  `);
});
