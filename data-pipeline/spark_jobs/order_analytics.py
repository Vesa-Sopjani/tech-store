from pyspark.sql import SparkSession
from pyspark.sql.functions import col, sum, avg, count, window
from pyspark.sql.types import StructType, StructField, StringType, DoubleType, TimestampType
import sys
from delta.tables import *

# Initialize Spark with Delta Lake
spark = SparkSession.builder \
    .appName("OrderAnalytics") \
    .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension") \
    .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog") \
    .getOrCreate()

def process_orders(processing_date):
    # Read from Delta Lake
    orders_df = spark.read \
        .format("delta") \
        .load("/data-lake/orders")
    
    # Perform analytics
    daily_metrics = orders_df \
        .filter(col("order_date") == processing_date) \
        .groupBy("product_id", "category") \
        .agg(
            sum("quantity").alias("total_quantity"),
            sum("amount").alias("total_revenue"),
            avg("amount").alias("avg_order_value"),
            count("*").alias("order_count")
        )
    
    # Write to Delta Lake (merge/upsert)
    delta_table = DeltaTable.forPath(spark, "/data-lake/daily_metrics")
    
    delta_table.alias("target").merge(
        daily_metrics.alias("source"),
        "target.product_id = source.product_id AND target.date = source.date"
    ).whenMatchedUpdateAll() \
     .whenNotMatchedInsertAll() \
     .execute()
    
    # Create materialized view for fast queries
    daily_metrics.createOrReplaceTempView("daily_metrics_view")
    
    spark.sql("""
        CREATE OR REPLACE VIEW gold_layer.top_selling_products AS
        SELECT product_id, total_revenue, total_quantity
        FROM daily_metrics_view
        ORDER BY total_revenue DESC
        LIMIT 100
    """)
    
    # Write to Parquet for data warehouse
    daily_metrics.write \
        .mode("overwrite") \
        .parquet(f"/data-warehouse/daily_metrics/{processing_date}")

if __name__ == "__main__":
    processing_date = sys.argv[1]
    process_orders(processing_date)