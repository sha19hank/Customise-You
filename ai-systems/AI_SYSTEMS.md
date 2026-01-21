# AI/ML Systems Architecture

CustomiseYou leverages AI to power personalization, recommendations, fraud detection, and smart operations.

---

## 🤖 AI Systems Overview

```
┌────────────────────────────────────────────────────────────┐
│                  AI/ML MICROSERVICES                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────┐      ┌──────────────────┐           │
│  │ Recommendation   │      │  Chatbot         │           │
│  │ Engine           │      │  Assistant       │           │
│  └──────────────────┘      └──────────────────┘           │
│                                                            │
│  ┌──────────────────┐      ┌──────────────────┐           │
│  │  Fraud           │      │  Product         │           │
│  │  Detection       │      │  Tagging         │           │
│  └──────────────────┘      └──────────────────┘           │
│                                                            │
│  ┌──────────────────┐      ┌──────────────────┐           │
│  │  Seller          │      │  Search          │           │
│  │  Analytics       │      │  Optimization    │           │
│  └──────────────────┘      └──────────────────┘           │
│                                                            │
└────────────────────────────────────────────────────────────┘
                           ↓
                  ┌─────────────────┐
                  │  Model Registry │
                  │  & Versioning   │
                  └─────────────────┘
                           ↓
                  ┌─────────────────┐
                  │  Feature Store  │
                  │  (Redis/Cache)  │
                  └─────────────────┘
```

---

## 1️⃣ Recommendation Engine

### Algorithm: Collaborative + Content-Based Hybrid

```python
# ai-systems/recommendation/recommendation_engine.py

import numpy as np
from sklearn.decomposition import TruncatedSVD
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict
import redis
import json

class RecommendationEngine:
    """
    Hybrid recommendation system combining:
    - Collaborative filtering (user-to-user similarity)
    - Content-based filtering (product attributes)
    - Popular products (trending)
    - Personalization (user history)
    """
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.embedding_dim = 128
        
    def get_recommendations(self, user_id: str, limit: int = 20) -> List[Dict]:
        """
        Get personalized product recommendations for a user
        """
        try:
            # Check cache first
            cache_key = f"recommendations:{user_id}"
            cached = self.redis.get(cache_key)
            if cached:
                return json.loads(cached)
            
            # Get user history
            user_history = self._get_user_history(user_id)
            
            # Get user embedding
            user_embedding = self._get_user_embedding(user_history)
            
            # Collaborative filtering recommendations
            collab_scores = self._collaborative_filtering(user_id, user_embedding)
            
            # Content-based recommendations
            content_scores = self._content_based_filtering(user_history)
            
            # Trending products
            trending_scores = self._trending_products()
            
            # Combine scores (weighted average)
            combined_scores = {}
            weights = {
                'collaborative': 0.4,
                'content': 0.35,
                'trending': 0.25
            }
            
            for product_id in set(
                list(collab_scores.keys()) + 
                list(content_scores.keys()) + 
                list(trending_scores.keys())
            ):
                score = (
                    collab_scores.get(product_id, 0) * weights['collaborative'] +
                    content_scores.get(product_id, 0) * weights['content'] +
                    trending_scores.get(product_id, 0) * weights['trending']
                )
                
                # Filter out products user already bought
                if product_id not in user_history['purchased']:
                    combined_scores[product_id] = score
            
            # Get top N recommendations
            top_products = sorted(
                combined_scores.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:limit]
            
            recommendations = [
                {
                    'product_id': pid,
                    'score': float(score),
                    'reason': self._get_reason(pid, user_history)
                }
                for pid, score in top_products
            ]
            
            # Cache for 1 hour
            self.redis.setex(cache_key, 3600, json.dumps(recommendations))
            
            return recommendations
            
        except Exception as e:
            print(f"Error generating recommendations: {e}")
            return []
    
    def _get_user_history(self, user_id: str) -> Dict:
        """Get user's purchase and browsing history"""
        # Query from database
        return {
            'viewed': [],  # Product IDs viewed
            'purchased': [],  # Product IDs purchased
            'wishlist': [],  # Wishlist items
            'categories': {},  # Category preference scores
            'price_range': (0, 100),  # User's typical price range
            'customization_preferences': {}  # Customization choices
        }
    
    def _get_user_embedding(self, user_history: Dict) -> np.ndarray:
        """Create user embedding from history"""
        embedding = np.zeros(self.embedding_dim)
        
        # Weight recent products higher
        for product_id in user_history['viewed'][-10:]:
            product_embedding = self._get_product_embedding(product_id)
            embedding += product_embedding * 0.5
        
        for product_id in user_history['purchased']:
            product_embedding = self._get_product_embedding(product_id)
            embedding += product_embedding * 1.0
        
        # Normalize
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        
        return embedding
    
    def _collaborative_filtering(self, user_id: str, user_embedding: np.ndarray) -> Dict[str, float]:
        """Find similar users and recommend their products"""
        scores = {}
        
        # Find similar users
        similar_users = self._find_similar_users(user_id, user_embedding, top_k=10)
        
        # Get products purchased by similar users
        for similar_user_id, similarity_score in similar_users:
            similar_user_products = self._get_user_purchases(similar_user_id)
            
            for product_id, rating in similar_user_products.items():
                if product_id not in scores:
                    scores[product_id] = 0
                
                scores[product_id] += similarity_score * rating / 5.0
        
        return scores
    
    def _content_based_filtering(self, user_history: Dict) -> Dict[str, float]:
        """Recommend products similar to user's past purchases"""
        scores = {}
        
        # Get products similar to user's purchase history
        for product_id in user_history['purchased'][-5:]:  # Last 5 products
            similar_products = self._find_similar_products(product_id, top_k=10)
            
            for similar_product_id, similarity in similar_products:
                if similar_product_id not in scores:
                    scores[similar_product_id] = 0
                
                scores[similar_product_id] += similarity
        
        return scores
    
    def _trending_products(self) -> Dict[str, float]:
        """Get trending products based on views and sales"""
        # Query from database
        trending = self.redis.zrange('trending_products', 0, -1, withscores=True)
        
        return {pid.decode(): score for pid, score in trending}
    
    def _get_product_embedding(self, product_id: str) -> np.ndarray:
        """Get pre-computed product embedding"""
        cached = self.redis.get(f"product_embedding:{product_id}")
        if cached:
            return np.array(json.loads(cached))
        
        # Compute embedding from product attributes
        # (In production, use pre-trained embeddings)
        return np.random.randn(self.embedding_dim)
    
    def _find_similar_users(self, user_id: str, embedding: np.ndarray, top_k: int = 10) -> List[tuple]:
        """Find k most similar users"""
        # Query all user embeddings and compute similarity
        similar_users = []
        # Implementation details...
        return similar_users
    
    def _find_similar_products(self, product_id: str, top_k: int = 10) -> List[tuple]:
        """Find k most similar products"""
        similar_products = []
        # Implementation details...
        return similar_products
    
    def _get_user_purchases(self, user_id: str) -> Dict[str, float]:
        """Get user's purchases with ratings"""
        purchases = {}
        # Query from database
        return purchases
    
    def _get_reason(self, product_id: str, user_history: Dict) -> str:
        """Generate explanation for recommendation"""
        return "Based on your interests"
```

---

## 2️⃣ AI Chatbot Assistant

### Multi-Intent NLU + FAQ-Based Response Generation

```python
# ai-systems/chatbot/chatbot.py

import json
from typing import Dict, List, Tuple
import numpy as np
from difflib import SequenceMatcher
import redis

class AIAssistant:
    """
    Multi-turn conversational AI for customer support
    - Intent classification
    - Entity extraction
    - FAQ matching
    - Context awareness
    """
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.intent_confidence_threshold = 0.7
        self.similarity_threshold = 0.6
        self.faq_data = self._load_faq_database()
    
    def get_response(self, user_message: str, user_id: str, session_id: str) -> Dict:
        """Get chatbot response to user message"""
        
        # Get conversation context
        context = self._get_conversation_context(session_id)
        
        # Intent classification
        intent, confidence, entities = self._classify_intent(user_message)
        
        if intent == 'faq':
            # Match FAQ
            response = self._match_faq(user_message)
        elif intent == 'order_status':
            # Get order status
            response = self._handle_order_query(user_id, entities)
        elif intent == 'product_info':
            # Product information
            response = self._handle_product_query(entities)
        elif intent == 'custom_request':
            # Customization help
            response = self._handle_custom_request(entities)
        elif intent == 'escalate':
            # Escalate to human agent
            response = self._escalate_to_agent(user_id, session_id, user_message)
        else:
            # General conversation
            response = self._generate_response(user_message, context)
        
        # Store conversation turn
        self._store_conversation(session_id, user_message, response)
        
        return response
    
    def _classify_intent(self, message: str) -> Tuple[str, float, Dict]:
        """Classify user intent"""
        intents = {
            'faq': ['how', 'what', 'why', 'help', 'guide'],
            'order_status': ['track', 'status', 'delivery', 'where is', 'when will'],
            'product_info': ['price', 'size', 'color', 'material', 'specifications'],
            'custom_request': ['customize', 'personalize', 'engrave', 'design'],
            'complaint': ['issue', 'problem', 'wrong', 'damaged', 'refund'],
            'escalate': ['speak to', 'agent', 'human', 'representative']
        }
        
        best_intent = 'general'
        best_score = 0
        entities = {}
        
        message_lower = message.lower()
        
        for intent, keywords in intents.items():
            score = 0
            for keyword in keywords:
                if keyword in message_lower:
                    score += 1
            
            if score > best_score:
                best_score = score
                best_intent = intent
        
        confidence = min(best_score / 3, 1.0)  # Normalize to 0-1
        
        # Extract entities
        entities = self._extract_entities(message, best_intent)
        
        return best_intent, confidence, entities
    
    def _extract_entities(self, message: str, intent: str) -> Dict:
        """Extract relevant entities from message"""
        entities = {}
        
        if intent == 'order_status':
            # Extract order number
            import re
            order_match = re.search(r'ORD-\d+', message, re.IGNORECASE)
            if order_match:
                entities['order_id'] = order_match.group(0)
        
        if intent in ['product_info', 'custom_request']:
            # Extract product references
            product_words = ['mug', 'shirt', 't-shirt', 'cup', 'bottle', 'phone case']
            for word in product_words:
                if word in message.lower():
                    entities['product_type'] = word
                    break
        
        return entities
    
    def _match_faq(self, user_question: str) -> Dict:
        """Match user question to FAQ entries"""
        best_match = None
        best_score = 0
        
        for faq_item in self.faq_data:
            question_text = faq_item['question']
            similarity = SequenceMatcher(None, 
                                       user_question.lower(), 
                                       question_text.lower()).ratio()
            
            if similarity > best_score:
                best_score = similarity
                best_match = faq_item
        
        if best_score > self.similarity_threshold:
            return {
                'type': 'faq',
                'message': best_match['answer'],
                'sources': [best_match.get('source_url', '')],
                'confidence': best_score
            }
        
        return None
    
    def _handle_order_query(self, user_id: str, entities: Dict) -> Dict:
        """Handle order status queries"""
        order_id = entities.get('order_id')
        
        if not order_id:
            return {
                'type': 'question',
                'message': 'Could you please provide your order number? It starts with ORD-'
            }
        
        # Query order status from database
        order_data = self._get_order_data(order_id, user_id)
        
        if not order_data:
            return {
                'type': 'error',
                'message': 'Order not found. Could you please verify the order number?'
            }
        
        return {
            'type': 'order_status',
            'message': f"Your order {order_data['order_number']} is currently {order_data['status']}",
            'data': order_data,
            'actions': ['Track Delivery', 'Contact Seller']
        }
    
    def _handle_product_query(self, entities: Dict) -> Dict:
        """Handle product information queries"""
        product_type = entities.get('product_type')
        
        if not product_type:
            return {
                'type': 'question',
                'message': 'Which product would you like to know more about?'
            }
        
        # Query product information
        products = self._search_products(product_type)
        
        return {
            'type': 'product_info',
            'message': f"I found {len(products)} products. Here are the most popular:",
            'products': products[:5],
            'actions': ['View Details', 'Add to Cart']
        }
    
    def _handle_custom_request(self, entities: Dict) -> Dict:
        """Handle customization requests"""
        return {
            'type': 'customization_guide',
            'message': 'I\'d love to help you customize your product! You can:',
            'options': [
                'Add text or engraving',
                'Choose colors and materials',
                'Upload your own design',
                'View customization examples'
            ]
        }
    
    def _escalate_to_agent(self, user_id: str, session_id: str, context: str) -> Dict:
        """Escalate to human agent"""
        return {
            'type': 'escalation',
            'message': 'I\'m connecting you to a human agent who can better assist you.',
            'wait_time': 'Usually responds within 2 minutes',
            'actions': ['Wait for Agent', 'Leave Message']
        }
    
    def _generate_response(self, message: str, context: Dict) -> Dict:
        """Generate general conversation response"""
        return {
            'type': 'message',
            'message': f"That\'s interesting! Let me help you further. Could you tell me more about what you need?",
            'suggestions': ['Browse Products', 'Track Order', 'Contact Support']
        }
    
    def _get_conversation_context(self, session_id: str) -> Dict:
        """Get conversation history and context"""
        history = self.redis.lrange(f"chat_session:{session_id}", 0, -1)
        return {
            'history': [json.loads(h) for h in history],
            'length': len(history)
        }
    
    def _store_conversation(self, session_id: str, user_msg: str, bot_resp: Dict):
        """Store conversation turn"""
        self.redis.lpush(f"chat_session:{session_id}", 
                        json.dumps({'user': user_msg}))
        self.redis.lpush(f"chat_session:{session_id}", 
                        json.dumps({'bot': bot_resp['message']}))
        
        # Expire after 24 hours
        self.redis.expire(f"chat_session:{session_id}", 86400)
    
    def _load_faq_database(self) -> List[Dict]:
        """Load FAQ database"""
        faq_db = [
            {
                'question': 'How long does customization take?',
                'answer': 'Customization typically takes 3-5 business days after order confirmation.'
            },
            {
                'question': 'Can I modify my order?',
                'answer': 'Orders can be modified within 2 hours of placement. Please contact the seller.'
            },
            {
                'question': 'What is your return policy?',
                'answer': 'We offer 30-day returns for non-customized products. Customized items cannot be returned.'
            },
            # More FAQs...
        ]
        return faq_db
    
    def _get_order_data(self, order_id: str, user_id: str) -> Dict:
        """Query order data from database"""
        # Database query
        return {}
    
    def _search_products(self, product_type: str) -> List[Dict]:
        """Search products by type"""
        # Database search
        return []
```

---

## 3️⃣ Fraud Detection System

### Anomaly Detection + Pattern Analysis

```python
# ai-systems/fraud_detection/fraud_detector.py

import numpy as np
from sklearn.ensemble import IsolationForest
from typing import Dict, Tuple
import json
import redis

class FraudDetectionSystem:
    """
    Real-time fraud detection using:
    - Anomaly detection (Isolation Forest)
    - Pattern analysis (velocity checks)
    - Device fingerprinting
    - Geolocation analysis
    """
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.isolation_forest = IsolationForest(contamination=0.1)
        self.fraud_threshold = 0.7
        
    def check_transaction(self, transaction: Dict, user_id: str) -> Tuple[bool, float, List[str]]:
        """
        Check if transaction is fraudulent
        Returns: (is_fraud, fraud_score, reasons)
        """
        
        fraud_score = 0
        fraud_reasons = []
        
        # 1. Velocity check
        velocity_score, velocity_reasons = self._check_velocity(user_id, transaction)
        fraud_score += velocity_score * 0.25
        fraud_reasons.extend(velocity_reasons)
        
        # 2. Amount anomaly
        amount_score, amount_reasons = self._check_amount_anomaly(user_id, transaction['amount'])
        fraud_score += amount_score * 0.2
        fraud_reasons.extend(amount_reasons)
        
        # 3. Location anomaly
        location_score, location_reasons = self._check_location_anomaly(user_id, transaction['ip_address'])
        fraud_score += location_score * 0.2
        fraud_reasons.extend(location_reasons)
        
        # 4. Device fingerprint
        device_score, device_reasons = self._check_device_fingerprint(user_id, transaction['device_id'])
        fraud_score += device_score * 0.15
        fraud_reasons.extend(device_reasons)
        
        # 5. Product risk
        product_score, product_reasons = self._check_product_risk(transaction['product_id'])
        fraud_score += product_score * 0.1
        fraud_reasons.extend(product_reasons)
        
        # 6. Account age
        account_score, account_reasons = self._check_account_age(user_id)
        fraud_score += account_score * 0.1
        fraud_reasons.extend(account_reasons)
        
        is_fraud = fraud_score > self.fraud_threshold
        
        # Store transaction for model retraining
        self._store_transaction(user_id, transaction, is_fraud, fraud_score)
        
        return is_fraud, min(fraud_score, 1.0), fraud_reasons
    
    def _check_velocity(self, user_id: str, transaction: Dict) -> Tuple[float, List[str]]:
        """Check if transaction velocity is abnormal"""
        score = 0
        reasons = []
        
        # Get recent transactions
        recent_transactions_key = f"user_transactions:{user_id}:24h"
        recent_count = self.redis.llen(recent_transactions_key)
        
        # Check if too many transactions in short time
        if recent_count > 10:  # More than 10 in 24h
            score += 0.3
            reasons.append(f"High transaction velocity: {recent_count} transactions in 24h")
        
        # Check if transaction amount is increasing rapidly
        if recent_count > 0:
            recent_amounts = [float(x) for x in self.redis.lrange(recent_transactions_key, 0, 4)]
            if recent_amounts and transaction['amount'] > max(recent_amounts) * 2:
                score += 0.2
                reasons.append("Transaction amount significantly higher than usual")
        
        return min(score, 1.0), reasons
    
    def _check_amount_anomaly(self, user_id: str, amount: float) -> Tuple[float, List[str]]:
        """Check if transaction amount is anomalous"""
        score = 0
        reasons = []
        
        # Get user's transaction history
        history_key = f"user_transaction_amounts:{user_id}"
        historical_amounts = self.redis.lrange(history_key, 0, 99)
        
        if historical_amounts:
            amounts = np.array([float(x) for x in historical_amounts])
            mean_amount = np.mean(amounts)
            std_amount = np.std(amounts)
            
            # Z-score analysis
            z_score = abs((amount - mean_amount) / (std_amount + 1))
            
            if z_score > 3:  # 3 standard deviations
                score += 0.4
                reasons.append(f"Amount anomaly: Z-score {z_score:.2f}")
            elif z_score > 2:
                score += 0.2
                reasons.append(f"Unusual amount: {z_score:.2f} standard deviations from average")
        
        return min(score, 1.0), reasons
    
    def _check_location_anomaly(self, user_id: str, ip_address: str) -> Tuple[float, List[str]]:
        """Check if login location is anomalous"""
        score = 0
        reasons = []
        
        # Get user's typical locations
        locations_key = f"user_locations:{user_id}"
        typical_locations = self.redis.lrange(locations_key, 0, 9)
        
        if typical_locations:
            # Get current location from IP
            current_location = self._get_location_from_ip(ip_address)
            
            # Check if location is new
            is_new_location = True
            for stored_location in typical_locations:
                stored_data = json.loads(stored_location)
                if stored_data['country'] == current_location['country']:
                    is_new_location = False
                    break
            
            if is_new_location:
                score += 0.3
                reasons.append(f"New location detected: {current_location['country']}, {current_location['city']}")
        
        return min(score, 1.0), reasons
    
    def _check_device_fingerprint(self, user_id: str, device_id: str) -> Tuple[float, List[str]]:
        """Check if device is new or suspicious"""
        score = 0
        reasons = []
        
        # Get user's known devices
        known_devices_key = f"user_devices:{user_id}"
        known_devices = self.redis.smembers(known_devices_key)
        
        if device_id not in known_devices:
            score += 0.2
            reasons.append("New device detected")
        
        return min(score, 1.0), reasons
    
    def _check_product_risk(self, product_id: str) -> Tuple[float, List[str]]:
        """Check if product has high fraud risk"""
        score = 0
        reasons = []
        
        # Get product fraud rate from cache
        fraud_rate_key = f"product_fraud_rate:{product_id}"
        fraud_rate = float(self.redis.get(fraud_rate_key) or 0)
        
        if fraud_rate > 0.2:  # 20% fraud rate
            score += fraud_rate * 0.5
            reasons.append(f"High-risk product category: {fraud_rate*100:.1f}% fraud rate")
        
        return min(score, 1.0), reasons
    
    def _check_account_age(self, user_id: str) -> Tuple[float, List[str]]:
        """Check account age"""
        score = 0
        reasons = []
        
        account_age_key = f"user_created_at:{user_id}"
        created_at = self.redis.get(account_age_key)
        
        if created_at:
            import datetime
            created_date = datetime.datetime.fromisoformat(created_at.decode())
            days_old = (datetime.datetime.now() - created_date).days
            
            if days_old < 7:
                score += 0.3
                reasons.append("Very new account (< 7 days old)")
            elif days_old < 30:
                score += 0.15
                reasons.append("New account (< 30 days old)")
        
        return min(score, 1.0), reasons
    
    def _get_location_from_ip(self, ip_address: str) -> Dict:
        """Get location information from IP address"""
        # Use external IP geolocation service
        return {
            'country': 'US',
            'city': 'New York',
            'latitude': 40.7128,
            'longitude': -74.0060
        }
    
    def _store_transaction(self, user_id: str, transaction: Dict, is_fraud: bool, score: float):
        """Store transaction for model training"""
        # Store in Redis and prepare for batch model retraining
        pass
```

---

## 4️⃣ Smart Product Tagging

```python
# ai-systems/product_tagging/tagger.py

from typing import List, Dict
import json
import redis

class ProductTagger:
    """
    Automatically tag products using:
    - Text classification
    - Image analysis
    - Category inference
    """
    
    def tag_product(self, product_data: Dict) -> Dict[str, List[str]]:
        """Generate tags for a product"""
        
        tags = {
            'categories': self._classify_category(product_data),
            'attributes': self._extract_attributes(product_data),
            'occasions': self._infer_occasions(product_data),
            'materials': self._identify_materials(product_data),
            'colors': self._extract_colors(product_data)
        }
        
        return tags
    
    def _classify_category(self, product_data: Dict) -> List[str]:
        """Classify product into categories"""
        # Multi-label classification
        return ['Gifts', 'Personalized', 'Home Decor']
    
    def _extract_attributes(self, product_data: Dict) -> List[str]:
        """Extract product attributes"""
        return ['Customizable', 'Eco-friendly', 'Handmade']
    
    def _infer_occasions(self, product_data: Dict) -> List[str]:
        """Infer suitable occasions"""
        return ['Birthday', 'Wedding', 'Anniversary']
    
    def _identify_materials(self, product_data: Dict) -> List[str]:
        """Identify product materials"""
        return ['Ceramic', 'Cotton', 'Wood']
    
    def _extract_colors(self, product_data: Dict) -> List[str]:
        """Extract available colors"""
        return ['White', 'Black', 'Navy', 'Red']
```

---

## 🚀 Model Deployment & Monitoring

### Model Registry & Versioning

```python
# ai-systems/model_registry.py

class ModelRegistry:
    """
    Centralized model management and versioning
    """
    
    def register_model(self, model_name: str, model_version: str, 
                      model_path: str, metrics: Dict):
        """Register a new model version"""
        pass
    
    def get_latest_model(self, model_name: str):
        """Get latest production model"""
        pass
    
    def promote_model(self, model_name: str, version: str, stage: str):
        """Promote model to different stages (staging, production)"""
        pass
    
    def log_predictions(self, model_name: str, prediction: Dict):
        """Log predictions for monitoring"""
        pass
```

---

## 📊 Model Performance Monitoring

```python
# ai-systems/monitoring.py

class ModelMonitoring:
    """Monitor model performance in production"""
    
    def track_metrics(self, model_name: str, metrics: Dict):
        """Track key metrics"""
        # Accuracy, precision, recall, latency, throughput
        pass
    
    def detect_drift(self, model_name: str):
        """Detect data drift or model performance degradation"""
        pass
    
    def alert_on_degradation(self, model_name: str, threshold: float):
        """Alert when model performance degrades"""
        pass
```

---

## 🔄 Continuous Model Improvement

### Retraining Pipeline

```yaml
# ai-systems/retraining_pipeline.yaml

name: ModelRetrainingPipeline
schedule: "daily"  # Retrain daily

steps:
  - name: FetchLatestData
    type: DataFetch
    params:
      days_back: 7
      min_samples: 10000

  - name: DataValidation
    type: DataValidation
    params:
      check_null_values: true
      check_distributions: true

  - name: FeatureEngineering
    type: FeatureGeneration
    params:
      features: [trending_score, user_engagement, seasonality]

  - name: ModelTraining
    type: ModelTraining
    params:
      algorithm: GradientBoosting
      hyperparameters:
        n_estimators: 100
        learning_rate: 0.1

  - name: ModelEvaluation
    type: ModelEvaluation
    params:
      test_size: 0.2
      metrics: [accuracy, precision, recall, f1]
      threshold: 0.85

  - name: ModelDeployment
    type: Deployment
    condition: "evaluation.accuracy > 0.85"
    params:
      target: "staging"
      canary_percentage: 10
```

---

## 📈 Feature Store

```python
# ai-systems/feature_store.py

class FeatureStore:
    """Centralized feature management for ML models"""
    
    def get_user_features(self, user_id: str) -> Dict:
        """Get user features for recommendations"""
        features = {
            'user_id': user_id,
            'total_purchases': 5,
            'avg_order_value': 50.0,
            'account_age_days': 180,
            'last_purchase_days_ago': 15,
            'favorite_categories': ['Home', 'Gifts'],
            'price_sensitivity': 'medium',
            'customization_preference': 'high'
        }
        return features
    
    def get_product_features(self, product_id: str) -> Dict:
        """Get product features for recommendations"""
        features = {
            'product_id': product_id,
            'category': 'Home',
            'price': 29.99,
            'avg_rating': 4.5,
            'num_reviews': 120,
            'is_customizable': True,
            'days_since_created': 365,
            'views_last_7d': 500,
            'conversions_last_7d': 25
        }
        return features
```

---

**Version**: 1.0.0  
**Last Updated**: January 2026
