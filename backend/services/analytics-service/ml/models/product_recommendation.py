import tensorflow as tf
import tensorflow_recommenders as tfrs
import pandas as pd
import mlflow
import mlflow.tensorflow
from datetime import datetime
import numpy as np

class RecommendationModel(tfrs.Model):
    def __init__(self, user_model, product_model, task):
        super().__init__()
        self.user_model = user_model
        self.product_model = product_model
        self.task = task

    def compute_loss(self, features, training=False):
        user_embeddings = self.user_model(features["user_id"])
        product_embeddings = self.product_model(features["product_id"])
        
        return self.task(user_embeddings, product_embeddings)

class ProductRecommender:
    def __init__(self):
        self.model = None
        self.user_ids = None
        self.product_ids = None
        
    def prepare_data(self, orders_df, products_df):
        # Create TensorFlow datasets
        orders = tf.data.Dataset.from_tensor_slices({
            "user_id": orders_df["user_id"].values,
            "product_id": orders_df["product_id"].values,
            "rating": orders_df["rating"].values if "rating" in orders_df.columns else 1.0
        })
        
        # Unique users and products
        self.user_ids = orders_df["user_id"].unique()
        self.product_ids = products_df["product_id"].unique()
        
        return orders
    
    def build_model(self):
        # User embedding model
        user_model = tf.keras.Sequential([
            tf.keras.layers.StringLookup(vocabulary=self.user_ids, mask_token=None),
            tf.keras.layers.Embedding(len(self.user_ids) + 1, 32),
            tf.keras.layers.Dense(32, activation='relu'),
            tf.keras.layers.Dense(16)
        ])
        
        # Product embedding model
        product_model = tf.keras.Sequential([
            tf.keras.layers.StringLookup(vocabulary=self.product_ids, mask_token=None),
            tf.keras.layers.Embedding(len(self.product_ids) + 1, 32),
            tf.keras.layers.Dense(32, activation='relu'),
            tf.keras.layers.Dense(16)
        ])
        
        # Define the task
        task = tfrs.tasks.Retrieval(
            metrics=tfrs.metrics.FactorizedTopK(
                candidates=products_df.batch(128).map(product_model)
            )
        )
        
        self.model = RecommendationModel(user_model, product_model, task)
        self.model.compile(optimizer=tf.keras.optimizers.Adam(0.001))
    
    def train(self, train_data, epochs=10):
        with mlflow.start_run():
            mlflow.tensorflow.autolog()
            
            history = self.model.fit(
                train_data.batch(256),
                epochs=epochs,
                validation_split=0.2,
                callbacks=[
                    tf.keras.callbacks.EarlyStopping(patience=3),
                    tf.keras.callbacks.ModelCheckpoint('models/best_model.keras')
                ]
            )
            
            # Log metrics
            mlflow.log_metric("final_loss", history.history['loss'][-1])
            mlflow.log_metric("final_val_loss", history.history['val_loss'][-1])
            
            # Log model
            mlflow.tensorflow.log_model(self.model, "recommendation_model")
            
            return history
    
    def recommend_products(self, user_id, k=10):
        # Create user embedding
        user_embedding = self.model.user_model(tf.constant([user_id]))
        
        # Get all product embeddings
        product_embeddings = self.model.product_model(
            tf.constant(self.product_ids)
        )
        
        # Calculate similarities
        similarities = tf.matmul(user_embedding, product_embeddings, transpose_b=True)
        
        # Get top-k products
        top_k_indices = tf.argsort(similarities[0], direction='DESCENDING')[:k]
        top_k_products = [self.product_ids[i] for i in top_k_indices.numpy()]
        
        return top_k_products
    
    def batch_predict(self, user_ids, k=5):
        results = {}
        for user_id in user_ids:
            recommendations = self.recommend_products(user_id, k)
            results[user_id] = recommendations
        
        return results

# MLflow Pipeline
def mlflow_pipeline():
    # Initialize MLflow
    mlflow.set_tracking_uri("http://mlflow:5000")
    mlflow.set_experiment("product-recommendations")
    
    # Load data
    orders_df = pd.read_csv("data/orders.csv")
    products_df = pd.read_csv("data/products.csv")
    
    # Initialize and train model
    recommender = ProductRecommender()
    train_data = recommender.prepare_data(orders_df, products_df)
    recommender.build_model()
    
    # Train with MLflow tracking
    history = recommender.train(train_data, epochs=10)
    
    # Register model
    model_uri = "runs:/{}/recommendation_model".format(mlflow.active_run().info.run_id)
    registered_model = mlflow.register_model(model_uri, "ProductRecommender")
    
    # Transition to Production
    client = mlflow.tracking.MlflowClient()
    client.transition_model_version_stage(
        name="ProductRecommender",
        version=registered_model.version,
        stage="Production"
    )