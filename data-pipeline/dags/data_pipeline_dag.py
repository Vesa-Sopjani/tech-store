from datetime import datetime, timedelta
from airflow import DAG
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator
from airflow.providers.postgres.operators.postgres import PostgresOperator
from airflow.operators.python import PythonOperator
from airflow.providers.apache.kafka.operators.kafka import KafkaProducerOperator
from great_expectations_provider.operators.great_expectations import GreatExpectationsOperator

default_args = {
    'owner': 'data_team',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email_on_failure': True,
    'email_on_retry': False,
    'retries': 3,
    'retry_delay': timedelta(minutes=5)
}

dag = DAG(
    'data_processing_pipeline',
    default_args=default_args,
    description='ETL Pipeline for Order Analytics',
    schedule_interval='@daily',
    catchup=False
)

# 1. Data Extraction
extract_data = PostgresOperator(
    task_id='extract_order_data',
    postgres_conn_id='postgres_default',
    sql='SELECT * FROM orders WHERE order_date = CURRENT_DATE - 1',
    dag=dag
)

# 2. Data Validation
validate_data = GreatExpectationsOperator(
    task_id='validate_order_data',
    checkpoint_name='orders_checkpoint',
    data_context_root_dir='great_expectations/',
    dag=dag
)

# 3. Spark Processing
spark_processing = SparkSubmitOperator(
    task_id='spark_processing',
    application='/opt/airflow/spark_jobs/order_analytics.py',
    conn_id='spark_default',
    application_args=['{{ ds }}'],
    dag=dag
)

# 4. Load to Data Warehouse
load_to_dw = PostgresOperator(
    task_id='load_to_data_warehouse',
    postgres_conn_id='data_warehouse',
    sql='''
        INSERT INTO analytics.orders_daily
        SELECT * FROM staging.orders
        WHERE processing_date = '{{ ds }}'
    ''',
    dag=dag
)

# 5. Send Kafka Event
send_kafka_event = KafkaProducerOperator(
    task_id='send_processing_complete_event',
    kafka_config_id='kafka_default',
    topic='data-processing-events',
    value='{"event": "pipeline_complete", "date": "{{ ds }}", "status": "success"}',
    dag=dag
)

extract_data >> validate_data >> spark_processing >> load_to_dw >> send_kafka_event