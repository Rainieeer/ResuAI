import os
import json
import logging
import numpy as np
from typing import Dict, List, Tuple, Optional, Union
import pickle
from datetime import datetime
import hashlib

try:
    from sentence_transformers import SentenceTransformer
    import faiss
    SEMANTIC_DEPENDENCIES_AVAILABLE = True
except ImportError as e:
    SEMANTIC_DEPENDENCIES_AVAILABLE = False
    print(f"⚠️  Semantic dependencies not available: {e}")

logger = logging.getLogger(__name__)

class UniversitySemanticEngine:    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2", cache_dir: str = "semantic_cache", 
                 strict_requirements: bool = False):
        """
        Initialize semantic engine with balanced model selection
        
        Args:
            model_name: Primary model for embedding generation
            cache_dir: Directory for caching embeddings and models
            strict_requirements: Enable strict requirement checking (NEW)
        """
        self.model_name = model_name
        self.fallback_model = "all-mpnet-base-v2"  # Higher accuracy fallback
        self.cache_dir = cache_dir
        self.model = None
        self.faiss_index = None
        self.job_embeddings_cache = {}
        self.candidate_embeddings_cache = {}
        
        # Performance settings
        self.max_sequence_length = 512
        self.batch_size = 32
        self.similarity_threshold = 0.3
        self.offline_mode = False  # Flag for offline mode when model can't load
        
        # NEW: Requirement awareness settings
        self.strict_requirements = strict_requirements
        self.requirement_threshold = 0.85  # Threshold for requirement compliance
        
        # Create cache directory
        os.makedirs(cache_dir, exist_ok=True)
        
        # Initialize model
        self._initialize_model()
        
    def _initialize_model(self):
        """Initialize sentence transformer model with fallback"""
        if not SEMANTIC_DEPENDENCIES_AVAILABLE:
            logger.error("Semantic dependencies not available. Install sentence-transformers and faiss-cpu.")
            self.model = None
            return False
            
        try:
            logger.info(f"Loading semantic model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            logger.info(f"✅ Semantic model loaded successfully: {self.model_name}")
            return True
            
        except Exception as e:
            logger.warning(f"Failed to load primary model {self.model_name}: {e}")
            
            # Try fallback model
            try:
                logger.info(f"Attempting fallback model: {self.fallback_model}")
                self.model = SentenceTransformer(self.fallback_model)
                self.model_name = self.fallback_model
                logger.info(f"✅ Fallback model loaded: {self.fallback_model}")
                return True
            except Exception as e2:
                logger.warning(f"Failed to load fallback model: {e2}")
                
                # Enable offline mode for testing
                logger.warning("⚠️ Running in OFFLINE MODE - semantic analysis will return mock data")
                self.model = None
                self.offline_mode = True
                return True
    
    def is_available(self) -> bool:
        """Check if semantic engine is available and ready"""
        return SEMANTIC_DEPENDENCIES_AVAILABLE or self.offline_mode  # Can work with or without model
    
    def _generate_cache_key(self, text: str, context: str = "") -> str:
        """Generate cache key for embeddings"""
        combined = f"{text}_{context}_{self.model_name}"
        return hashlib.md5(combined.encode()).hexdigest()
    
    def _save_embedding_cache(self, cache_type: str = "both"):
        """Save embedding cache to disk"""
        try:
            if cache_type in ["job", "both"] and self.job_embeddings_cache:
                cache_file = os.path.join(self.cache_dir, "job_embeddings.pkl")
                with open(cache_file, 'wb') as f:
                    pickle.dump(self.job_embeddings_cache, f)
                    
            if cache_type in ["candidate", "both"] and self.candidate_embeddings_cache:
                cache_file = os.path.join(self.cache_dir, "candidate_embeddings.pkl")
                with open(cache_file, 'wb') as f:
                    pickle.dump(self.candidate_embeddings_cache, f)
                    
        except Exception as e:
            logger.warning(f"Failed to save embedding cache: {e}")
    
    def _load_embedding_cache(self):
        """Load embedding cache from disk"""
        try:
            job_cache_file = os.path.join(self.cache_dir, "job_embeddings.pkl")
            if os.path.exists(job_cache_file):
                with open(job_cache_file, 'rb') as f:
                    self.job_embeddings_cache = pickle.load(f)
                    
            candidate_cache_file = os.path.join(self.cache_dir, "candidate_embeddings.pkl")
            if os.path.exists(candidate_cache_file):
                with open(candidate_cache_file, 'rb') as f:
                    self.candidate_embeddings_cache = pickle.load(f)
                    
            logger.info(f"Loaded {len(self.job_embeddings_cache)} job and {len(self.candidate_embeddings_cache)} candidate embeddings from cache")
            
        except Exception as e:
            logger.warning(f"Failed to load embedding cache: {e}")
    
    def encode_text(self, text: str, context: str = "", use_cache: bool = True) -> Optional[np.ndarray]:
        """
        Encode text to embedding vector with caching
        
        Args:
            text: Text to encode
            context: Additional context for caching
            use_cache: Whether to use/update cache
            
        Returns:
            Embedding vector or None if failed
        """
        if not self.is_available():
            # Return a simple hash-based vector when model not available
            import hashlib
            hash_obj = hashlib.md5(text.encode())
            hash_bytes = hash_obj.digest()
            # Convert to 384-dimensional vector (same as all-MiniLM-L6-v2)
            vector = np.frombuffer(hash_bytes, dtype=np.uint8).astype(np.float32)
            # Pad or truncate to 384 dimensions
            if len(vector) < 384:
                vector = np.pad(vector, (0, 384 - len(vector)), 'constant')
            else:
                vector = vector[:384]
            # Normalize
            norm = np.linalg.norm(vector)
            if norm > 0:
                vector = vector / norm
            return vector
            
        # Check cache first
        if use_cache:
            cache_key = self._generate_cache_key(text, context)
            if cache_key in self.candidate_embeddings_cache:
                return self.candidate_embeddings_cache[cache_key]
        
        try:
            # Truncate text if too long
            if len(text) > self.max_sequence_length:
                text = text[:self.max_sequence_length]
            
            # Generate embedding
            embedding = self.model.encode(text, normalize_embeddings=True)
            
            # Cache result
            if use_cache:
                self.candidate_embeddings_cache[cache_key] = embedding
            
            return embedding
            
        except Exception as e:
            logger.error(f"Failed to encode text: {e}")
            return None
    
    def encode_job_requirements(self, job_data: Dict) -> Optional[np.ndarray]:
        """
        Encode job requirements into embedding vector
        
        Args:
            job_data: Dictionary containing job information
            
        Returns:
            Job embedding vector or None if failed
        """
        if not self.is_available():
            return None
            
        try:
            # Extract job information
            job_id = job_data.get('id', 'unknown')
            title = job_data.get('title', '')
            description = job_data.get('description', '')
            requirements = job_data.get('requirements', '')
            department = job_data.get('department', '')
            experience_level = job_data.get('experience_level', '')
            
            # Create comprehensive job text
            job_text_parts = []
            if title:
                job_text_parts.append(f"Job Title: {title}")
            if department:
                job_text_parts.append(f"Department: {department}")
            if experience_level:
                job_text_parts.append(f"Experience Level: {experience_level}")
            if description:
                job_text_parts.append(f"Description: {description}")
            if requirements:
                job_text_parts.append(f"Requirements: {requirements}")
            
            job_text = " | ".join(job_text_parts)
            
            # Check cache
            cache_key = self._generate_cache_key(job_text, f"job_{job_id}")
            if cache_key in self.job_embeddings_cache:
                return self.job_embeddings_cache[cache_key]
            
            # Generate embedding
            embedding = self.encode_text(job_text, f"job_{job_id}", use_cache=False)
            
            # Cache job embedding
            if embedding is not None:
                self.job_embeddings_cache[cache_key] = embedding
                self._save_embedding_cache("job")
            
            return embedding
            
        except Exception as e:
            logger.error(f"Failed to encode job requirements: {e}")
            return None
    
    def encode_candidate_profile(self, candidate_data: Dict) -> Optional[np.ndarray]:
        """
        Encode candidate profile into embedding vector using actual PDS structure
        
        Args:
            candidate_data: Dictionary containing candidate information with PDS data
            
        Returns:
            Candidate embedding vector or None if failed
        """
        if not self.is_available():
            return None
            
        try:
            candidate_id = candidate_data.get('id', 'unknown')
            
            # Extract candidate information using PDS structure
            profile_parts = []
            
            # Educational Background (from PDS structure)
            educational_background = candidate_data.get('educational_background', [])
            if not educational_background:
                # Fallback to converted format
                education = candidate_data.get('education', [])
                if education and isinstance(education, list):
                    for edu in education[:4]:  # Top 4 education entries
                        if isinstance(edu, dict):
                            degree = edu.get('degree', '')
                            school = edu.get('school', '')
                            level = edu.get('level', '')
                            if degree or school:
                                profile_parts.append(f"Education: {level} {degree} from {school}")
            else:
                # Use direct PDS structure
                if isinstance(educational_background, list):
                    for edu in educational_background[:4]:  # Include more education entries
                        if isinstance(edu, dict):
                            level = edu.get('level', '')
                            degree_course = edu.get('degree_course', edu.get('degree', ''))  # Support both field names
                            school = edu.get('school', '')
                            honors = edu.get('honors', '')
                            if degree_course or school:
                                edu_text = f"Education: {level} {degree_course} from {school}"
                                if honors and honors != 'N/a':
                                    edu_text += f" with {honors}"
                                profile_parts.append(edu_text)
            
            # Work Experience (from PDS structure)
            work_experience = candidate_data.get('work_experience', [])
            if not work_experience:
                # Fallback to converted format
                experience = candidate_data.get('experience', [])
                if experience and isinstance(experience, list):
                    for exp in experience[:4]:  # Top 4 work experiences
                        if isinstance(exp, dict):
                            position = exp.get('position', '')
                            company = exp.get('company', '')
                            description = exp.get('description', '')
                            if position or company:
                                exp_text = f"Experience: {position} at {company}"
                                if description:
                                    exp_text += f" - {description[:100]}"
                                profile_parts.append(exp_text)
            else:
                # Use direct PDS structure
                if isinstance(work_experience, list):
                    for exp in work_experience[:4]:  # Include more experience entries
                        if isinstance(exp, dict):
                            position = exp.get('position', '')
                            company = exp.get('company', '')
                            salary = exp.get('salary', '')
                            grade = exp.get('grade', '')
                            if position or company:
                                exp_text = f"Experience: {position} at {company}"
                                if grade and grade != 'N/A':
                                    exp_text += f" ({grade})"
                                profile_parts.append(exp_text)
            
            # Learning and Development (Training from PDS)
            learning_development = candidate_data.get('learning_development', [])
            if not learning_development:
                # Fallback to converted format
                training = candidate_data.get('training', [])
                if training and isinstance(training, list):
                    for cert in training[:3]:  # Top 3 trainings
                        if isinstance(cert, dict):
                            title = cert.get('title', '')
                            if title:
                                profile_parts.append(f"Training: {title}")
            else:
                # Use direct PDS structure
                for train in learning_development[:3]:  # Top 3 training entries
                    if isinstance(train, dict):
                        title = train.get('title', '')
                        type_info = train.get('type', '')
                        hours = train.get('hours', '')
                        if title:
                            train_text = f"Training: {title}"
                            if type_info and type_info != 'N/a':
                                train_text += f" ({type_info})"
                            if hours:
                                train_text += f" - {hours} hours"
                            profile_parts.append(train_text)
            
            # Civil Service Eligibility (unique to PDS)
            civil_service = candidate_data.get('civil_service_eligibility', [])
            if civil_service and isinstance(civil_service, list):
                for elig in civil_service[:2]:  # Top 2 eligibilities
                    if isinstance(elig, dict):
                        eligibility = elig.get('eligibility', '')
                        rating = elig.get('rating', '')
                        if eligibility:
                            elig_text = f"Eligibility: {eligibility}"
                            if rating and rating != '':
                                try:
                                    rating_pct = float(rating) * 100
                                    elig_text += f" (Rating: {rating_pct:.1f}%)"
                                except:
                                    pass
                            profile_parts.append(elig_text)
            
            # PDS Personal Info (relevant details only)
            pds_data = candidate_data.get('pds_data', {})
            if pds_data and isinstance(pds_data, dict):
                personal_info = pds_data.get('personal_info', {})
                if personal_info:
                    # Add citizenship if relevant for government positions
                    citizenship = personal_info.get('citizenship', '')
                    if citizenship and citizenship not in ['N/a', 'please indicate the details.']:
                        profile_parts.append(f"Citizenship: {citizenship}")
            
            # Combine all parts
            candidate_text = " | ".join(profile_parts)
            
            if not candidate_text.strip():
                logger.warning(f"No meaningful text extracted for candidate {candidate_id}")
                return None
            
            # Generate embedding
            embedding = self.encode_text(candidate_text, f"candidate_{candidate_id}")
            
            return embedding
            
        except Exception as e:
            logger.error(f"Failed to encode candidate profile: {e}")
            return None
    
    def calculate_semantic_similarity(self, candidate_embedding: np.ndarray, job_embedding: np.ndarray) -> float:
        """
        Calculate semantic similarity between candidate and job
        
        Args:
            candidate_embedding: Candidate embedding vector
            job_embedding: Job embedding vector
            
        Returns:
            Similarity score between 0.0 and 1.0
        """
        try:
            # Calculate cosine similarity
            similarity = np.dot(candidate_embedding, job_embedding)
            
            # Ensure similarity is between 0 and 1
            similarity = max(0.0, min(1.0, (similarity + 1) / 2))
            
            return float(similarity)
            
        except Exception as e:
            logger.error(f"Failed to calculate similarity: {e}")
            return 0.0
    
    def batch_encode_candidates(self, candidates_data: List[Dict]) -> List[Optional[np.ndarray]]:
        """
        Encode multiple candidates efficiently in batches
        
        Args:
            candidates_data: List of candidate dictionaries
            
        Returns:
            List of embedding vectors (same order as input)
        """
        if not self.is_available():
            return [None] * len(candidates_data)
        
        embeddings = []
        
        try:
            # Process in batches for memory efficiency
            for i in range(0, len(candidates_data), self.batch_size):
                batch = candidates_data[i:i + self.batch_size]
                batch_embeddings = []
                
                for candidate in batch:
                    embedding = self.encode_candidate_profile(candidate)
                    batch_embeddings.append(embedding)
                
                embeddings.extend(batch_embeddings)
                
                # Log progress for large batches
                if len(candidates_data) > 50:
                    progress = min(i + self.batch_size, len(candidates_data))
                    logger.info(f"Processed {progress}/{len(candidates_data)} candidates")
            
            return embeddings
            
        except Exception as e:
            logger.error(f"Failed to batch encode candidates: {e}")
            return [None] * len(candidates_data)
    
    def calculate_fair_semantic_score(self, candidate_data: Dict, job_data: Dict) -> Dict:
        """
        Calculate semantic scores with optional strict requirement checking for fair rankings
        
        This method intelligently determines whether to use strict mode based on job requirements
        and applies appropriate scoring to ensure fair candidate rankings.
        
        Args:
            candidate_data: Candidate information
            job_data: Job information containing requirements
            
        Returns:
            Dictionary with semantic scores (strict mode applied if requirements are detected)
        """
        try:
            # Step 1: Analyze job requirements to determine if strict mode should be applied
            requires_strict_mode = self._should_use_strict_mode(job_data)
            
            if requires_strict_mode and self.strict_requirements:
                # Use strict requirement-aware scoring for fair rankings
                logger.info("📋 Using strict requirement-aware scoring for fair rankings")
                result = self.calculate_requirement_aware_score(candidate_data, job_data)
                result['scoring_mode'] = 'strict_requirement_aware'
                return result
            else:
                # Use regular semantic scoring
                logger.info("🎯 Using regular semantic scoring")
                result = self.calculate_detailed_semantic_score(candidate_data, job_data)
                result['scoring_mode'] = 'regular_semantic'
                return result
                
        except Exception as e:
            logger.error(f"Failed to calculate fair semantic score: {e}")
            # Fallback to regular scoring
            result = self.calculate_detailed_semantic_score(candidate_data, job_data)
            result['scoring_mode'] = 'fallback_regular'
            result['scoring_error'] = str(e)
            return result
    
    def _should_use_strict_mode(self, job_data: Dict) -> bool:
        """
        Determine if strict requirement checking should be used based on job requirements
        
        Args:
            job_data: Job posting data
            
        Returns:
            True if strict mode should be used, False otherwise
        """
        try:
            # Check if job has explicit educational or experience requirements
            requirements_text = ""
            
            # Collect all requirement sources
            for field in ['requirements', 'education_requirements', 'experience_requirements', 'description']:
                if job_data.get(field):
                    requirements_text += " " + str(job_data[field]).lower()
            
            # Keywords that indicate strict requirements exist
            strict_indicators = [
                'required', 'must have', 'mandatory', 'essential', 'prerequisite',
                'minimum requirement', 'shall have', 'bachelor', 'master', 'phd',
                'doctorate', 'degree required', 'years of experience', 'minimum years',
                'licensed', 'certified', 'eligibility required'
            ]
            
            # If job has strict requirement language, use strict mode
            has_strict_requirements = any(indicator in requirements_text for indicator in strict_indicators)
            
            # Also check for specific degree or experience mentions
            has_degree_requirements = any(degree in requirements_text for degree in [
                'bachelor', 'master', 'phd', 'doctorate', 'degree in', 'graduate'
            ])
            
            has_experience_requirements = any(exp in requirements_text for exp in [
                'years experience', 'years of experience', 'minimum experience', 'years in'
            ])
            
            use_strict = has_strict_requirements or has_degree_requirements or has_experience_requirements
            
            if use_strict:
                logger.info(f"🎯 Strict mode enabled for job: detected requirements indicators")
                logger.info(f"   - Strict language: {has_strict_requirements}")
                logger.info(f"   - Degree requirements: {has_degree_requirements}")
                logger.info(f"   - Experience requirements: {has_experience_requirements}")
            else:
                logger.info(f"📝 Regular mode for job: no strict requirements detected")
            
            return use_strict
            
        except Exception as e:
            logger.error(f"Failed to analyze strict mode requirement: {e}")
            return False  # Default to regular mode on error
    
    def calculate_detailed_semantic_score(self, candidate_data: Dict, job_data: Dict) -> Dict:
        """
        Calculate detailed semantic relevance breakdown
        
        Args:
            candidate_data: Candidate information
            job_data: Job information
            
        Returns:
            Dictionary with detailed semantic scores
        """
        if not self.is_available():
            # Return mock scores in offline mode for testing
            if getattr(self, 'offline_mode', False):
                logger.info("🔧 OFFLINE MODE: Returning mock semantic scores for testing")
                return {
                    'overall_score': 0.65,  # Mock overall relevance
                    'education_relevance': 0.75,  # Mock education relevance for testing
                    'experience_relevance': 0.60,  # Mock experience relevance
                    'training_relevance': 0.55,   # Mock training relevance
                    'insights': ['Mock semantic analysis - offline mode'],
                    'education_insights': 'Educational background shows strong alignment with requirements (offline mode)',
                    'experience_insights': 'Work experience demonstrates relevant skills (offline mode)',
                    'skills_insights': 'Training and development support job requirements (offline mode)',
                    'offline_mode': True
                }
            return {
                'overall_score': 0.0,
                'education_relevance': 0.0,
                'experience_relevance': 0.0,
                'training_relevance': 0.0,
                'error': 'Semantic engine not available'
            }
        
        try:
            # Get overall embeddings
            candidate_embedding = self.encode_candidate_profile(candidate_data)
            job_embedding = self.encode_job_requirements(job_data)
            
            if candidate_embedding is None or job_embedding is None:
                return {
                    'overall_score': 0.0,
                    'education_relevance': 0.0,
                    'experience_relevance': 0.0,
                    'training_relevance': 0.0,
                    'error': 'Failed to generate embeddings'
                }
            
            # Calculate overall similarity
            overall_score = self.calculate_semantic_similarity(candidate_embedding, job_embedding)
            
            # Calculate component-specific scores
            education_score = self._calculate_education_relevance(candidate_data, job_data)
            experience_score = self._calculate_experience_relevance(candidate_data, job_data)
            training_score = self._calculate_training_relevance(candidate_data, job_data)
            
            return {
                'overall_score': round(overall_score, 3),
                'education_relevance': round(education_score, 3),
                'experience_relevance': round(experience_score, 3),
                'training_relevance': round(training_score, 3),
                'similarity_threshold': self.similarity_threshold,
                'model_used': self.model_name
            }
            
        except Exception as e:
            logger.error(f"Failed to calculate detailed semantic score: {e}")
            return {
                'overall_score': 0.0,
                'education_relevance': 0.0,
                'experience_relevance': 0.0,
                'training_relevance': 0.0,
                'error': str(e)
            }
    
    def calculate_requirement_aware_score(self, candidate_data: Dict, job_data: Dict) -> Dict:
        """
        Calculate semantic scores with strict requirement compliance checking
        
        Args:
            candidate_data: Candidate information
            job_data: Job information containing requirements
            
        Returns:
            Dictionary with semantic scores and requirement compliance info
        """
        try:
            # Step 1: Get base semantic scores (existing functionality)
            base_scores = self.calculate_detailed_semantic_score(candidate_data, job_data)
            
            # Step 2: Parse job requirements for strict checking
            job_requirements = self._parse_strict_requirements(job_data)
            
            # Step 3: Check candidate compliance with requirements
            compliance = self._check_requirement_compliance(candidate_data, job_requirements)
            
            # Step 4: Apply fair penalties for non-compliance that maintain ranking integrity
            modified_scores = base_scores.copy()
            penalties_applied = []
            
            # Education requirement penalty - progressive penalty system
            if not compliance['education_meets_requirement']:
                original_edu_score = modified_scores.get('education_relevance', 0.0)
                penalty_factor = 0.2 if job_requirements.get('education_required', {}).get('is_strict') else 0.5
                modified_scores['education_relevance'] = original_edu_score * penalty_factor
                # Reduced overall penalty to maintain some ranking differentiation
                overall_penalty = 0.4 if job_requirements.get('education_required', {}).get('is_strict') else 0.7
                modified_scores['overall_score'] = modified_scores.get('overall_score', 0.0) * overall_penalty
                penalties_applied.append(f"Education requirement penalty: {original_edu_score:.3f} → {modified_scores['education_relevance']:.3f}")
                logger.info(f"📉 Applied education requirement penalty (factor={penalty_factor}): {original_edu_score:.3f} → {modified_scores['education_relevance']:.3f}")
            
            # Experience requirement penalty - more lenient for flexibility
            if not compliance['experience_meets_requirement']:
                original_exp_score = modified_scores.get('experience_relevance', 0.0)
                penalty_factor = 0.6  # Less harsh than education to maintain ranking diversity
                modified_scores['experience_relevance'] = original_exp_score * penalty_factor
                modified_scores['overall_score'] = modified_scores.get('overall_score', 0.0) * 0.8  # Moderate overall penalty
                penalties_applied.append(f"Experience requirement penalty: {original_exp_score:.3f} → {modified_scores['experience_relevance']:.3f}")
                logger.info(f"📉 Applied experience requirement penalty: {original_exp_score:.3f} → {modified_scores['experience_relevance']:.3f}")
            
            # Step 5: Add requirement compliance information and insights
            insights = base_scores.get('insights', [])
            
            # Add compliance insights
            if compliance['education_meets_requirement'] and compliance['experience_meets_requirement']:
                insights.append("✅ Candidate meets all strict job requirements")
            else:
                if not compliance['education_meets_requirement']:
                    edu_details = compliance.get('education_details', {})
                    required = edu_details.get('required', {})
                    candidate = edu_details.get('candidate_highest', 'Not specified')
                    insights.append(f"⚠️ Education gap: Job requires {required.get('level', 'specific degree')}, candidate has {candidate}")
                
                if not compliance['experience_meets_requirement']:
                    exp_details = compliance.get('experience_details', {})
                    required_years = exp_details.get('required', {}).get('years', 0)
                    candidate_years = exp_details.get('candidate_years', 0)
                    insights.append(f"⚠️ Experience gap: Job requires {required_years} years, candidate has {candidate_years} years")
            
            # Add penalty information for transparency
            if penalties_applied:
                insights.extend([f"📊 Fair ranking adjustment applied: {penalty}" for penalty in penalties_applied])
                insights.append("🎯 Strict requirements mode ensures fair candidate comparison")
            
            modified_scores.update({
                'insights': insights,
                'requirement_compliance': compliance,
                'job_requirements_parsed': job_requirements,
                'strict_mode_enabled': True,
                'penalties_applied': not (compliance['education_meets_requirement'] and compliance['experience_meets_requirement']),
                'requirement_threshold': self.requirement_threshold,
                'similarity_threshold': self.similarity_threshold,
                'model_used': self.model_name,
                # Add detailed insights for frontend compatibility
                'education_insights': self._generate_education_insights(compliance, job_requirements),
                'experience_insights': self._generate_experience_insights(compliance, job_requirements),
                'skills_insights': f"Training relevance: {round(modified_scores.get('training_relevance', 0) * 100, 1)}% with requirement-aware adjustments"
            })
            
            return modified_scores
            
        except Exception as e:
            logger.error(f"Failed to calculate requirement-aware score: {e}")
            # Fallback to regular semantic scoring
            base_scores = self.calculate_detailed_semantic_score(candidate_data, job_data)
            base_scores['requirement_error'] = str(e)
            return base_scores
    
    def _parse_strict_requirements(self, job_data: Dict) -> Dict:
        """
        Parse job requirements to identify strict (required) vs preferred qualifications
        
        Args:
            job_data: Job posting data
            
        Returns:
            Dictionary with parsed requirements
        """
        requirements = {
            'education_required': None,
            'education_preferred': None,
            'experience_required': None,
            'experience_preferred': None,
            'strict_keywords': [],
            'flexible_keywords': []
        }
        
        try:
            # Get all requirement text sources
            requirement_sources = []
            
            if job_data.get('requirements'):
                requirement_sources.append(job_data['requirements'])
            if job_data.get('education_requirements'):
                requirement_sources.append(job_data['education_requirements'])
            if job_data.get('experience_requirements'):
                requirement_sources.append(job_data['experience_requirements'])
            
            # Combine all requirement text
            all_requirements = " ".join(requirement_sources).lower()
            
            # Keywords that indicate strict requirements
            strict_keywords = [
                'required', 'must have', 'mandatory', 'essential', 'prerequisite',
                'minimum requirement', 'shall have', 'needs to have', 'necessary'
            ]
            
            # Keywords that indicate flexible requirements
            flexible_keywords = [
                'preferred', 'desired', 'advantage', 'plus', 'beneficial',
                'nice to have', 'would be good', 'ideal', 'welcome'
            ]
            
            # Identify strict vs flexible requirements
            has_strict_language = any(keyword in all_requirements for keyword in strict_keywords)
            has_flexible_language = any(keyword in all_requirements for keyword in flexible_keywords)
            
            requirements['strict_keywords'] = [kw for kw in strict_keywords if kw in all_requirements]
            requirements['flexible_keywords'] = [kw for kw in flexible_keywords if kw in all_requirements]
            
            # Parse education requirements
            education_req = job_data.get('education_requirements', '') or job_data.get('requirements', '')
            if education_req:
                requirements['education_required'] = self._extract_education_requirement(education_req, has_strict_language)
            
            # Parse experience requirements
            experience_req = job_data.get('experience_requirements', '') or job_data.get('requirements', '')
            if experience_req:
                requirements['experience_required'] = self._extract_experience_requirement(experience_req, has_strict_language)
            
            logger.info(f"Parsed requirements: {requirements}")
            return requirements
            
        except Exception as e:
            logger.error(f"Failed to parse requirements: {e}")
            return requirements
    
    def _extract_education_requirement(self, requirement_text: str, has_strict_language: bool) -> Optional[Dict]:
        """Extract education requirements from text"""
        req_lower = requirement_text.lower()
        
        education_req = {
            'level': None,
            'field': None,
            'is_strict': has_strict_language or any(word in req_lower for word in ['required', 'must', 'mandatory'])
        }
        
        # Detect degree level
        if any(word in req_lower for word in ['phd', 'ph.d', 'doctorate', 'doctoral']):
            education_req['level'] = 'doctorate'
        elif any(word in req_lower for word in ['master', 'masters', 'graduate', 'postgraduate']):
            education_req['level'] = 'master'
        elif any(word in req_lower for word in ['bachelor', 'bachelors', 'undergraduate', 'college degree']):
            education_req['level'] = 'bachelor'
        elif any(word in req_lower for word in ['associate', 'diploma']):
            education_req['level'] = 'associate'
        
        # Detect field requirements
        fields = ['computer science', 'information technology', 'engineering', 'business', 
                 'education', 'accounting', 'nursing', 'mathematics', 'science']
        
        for field in fields:
            if field in req_lower:
                education_req['field'] = field
                break
        
        return education_req if education_req['level'] else None
    
    def _extract_experience_requirement(self, requirement_text: str, has_strict_language: bool) -> Optional[Dict]:
        """Extract experience requirements from text"""
        import re
        req_lower = requirement_text.lower()
        
        experience_req = {
            'years': 0,
            'type': None,
            'is_strict': has_strict_language or any(word in req_lower for word in ['required', 'must', 'mandatory'])
        }
        
        # Extract years of experience
        year_patterns = [
            r'(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)',
            r'(?:minimum|at least)\s*(\d+)\s*(?:years?|yrs?)',
            r'(\d+)(?:\+|\s*or more)\s*(?:years?|yrs?)'
        ]
        
        for pattern in year_patterns:
            match = re.search(pattern, req_lower)
            if match:
                experience_req['years'] = int(match.group(1))
                break
        
        # Detect experience type
        if any(word in req_lower for word in ['teaching', 'academic', 'education']):
            experience_req['type'] = 'teaching'
        elif any(word in req_lower for word in ['industry', 'professional', 'work']):
            experience_req['type'] = 'professional'
        elif any(word in req_lower for word in ['government', 'public sector']):
            experience_req['type'] = 'government'
        
        return experience_req if experience_req['years'] > 0 or experience_req['type'] else None
    
    def _check_requirement_compliance(self, candidate_data: Dict, job_requirements: Dict) -> Dict:
        """
        Check if candidate meets strict job requirements
        
        Args:
            candidate_data: Candidate profile data
            job_requirements: Parsed job requirements
            
        Returns:
            Dictionary with compliance status
        """
        compliance = {
            'education_meets_requirement': True,
            'experience_meets_requirement': True,
            'education_details': {},
            'experience_details': {},
            'compliance_score': 1.0
        }
        
        try:
            # Check education requirement compliance
            if job_requirements.get('education_required'):
                compliance['education_meets_requirement'] = self._check_education_compliance(
                    candidate_data, job_requirements['education_required']
                )
                compliance['education_details'] = {
                    'required': job_requirements['education_required'],
                    'candidate_highest': self._get_candidate_highest_education(candidate_data),
                    'meets_requirement': compliance['education_meets_requirement']
                }
            
            # Check experience requirement compliance
            if job_requirements.get('experience_required'):
                compliance['experience_meets_requirement'] = self._check_experience_compliance(
                    candidate_data, job_requirements['experience_required']
                )
                compliance['experience_details'] = {
                    'required': job_requirements['experience_required'],
                    'candidate_years': self._get_candidate_experience_years(candidate_data),
                    'meets_requirement': compliance['experience_meets_requirement']
                }
            
            # Calculate overall compliance score
            compliance_factors = []
            if job_requirements.get('education_required'):
                compliance_factors.append(compliance['education_meets_requirement'])
            if job_requirements.get('experience_required'):
                compliance_factors.append(compliance['experience_meets_requirement'])
            
            if compliance_factors:
                compliance['compliance_score'] = sum(compliance_factors) / len(compliance_factors)
            
            return compliance
            
        except Exception as e:
            logger.error(f"Failed to check requirement compliance: {e}")
            return compliance
    
    def _check_education_compliance(self, candidate_data: Dict, education_requirement: Dict) -> bool:
        """Check if candidate meets education requirement"""
        try:
            required_level = education_requirement.get('level', '').lower()
            candidate_education = self._get_candidate_highest_education(candidate_data)
            
            if not required_level or not candidate_education:
                return True  # Can't verify, assume compliant
            
            # Map education levels to hierarchy
            level_hierarchy = {
                'high school': 1, 'secondary': 1,
                'certificate': 2, 'diploma': 3,
                'associate': 4,
                'bachelor': 5, 'bachelors': 5, 'undergraduate': 5,
                'master': 6, 'masters': 6, 'graduate': 6,
                'doctorate': 7, 'doctoral': 7, 'phd': 7, 'ph.d': 7
            }
            
            required_level_num = level_hierarchy.get(required_level, 0)
            candidate_level_num = 0
            
            # Find candidate's highest education level
            candidate_lower = candidate_education.lower()
            for level, num in level_hierarchy.items():
                if level in candidate_lower:
                    candidate_level_num = max(candidate_level_num, num)
            
            # Also check for field relevance if specified
            field_match = True
            if education_requirement.get('field'):
                required_field = education_requirement['field'].lower()
                field_match = required_field in candidate_lower or self._check_field_similarity(candidate_lower, required_field)
            
            meets_level = candidate_level_num >= required_level_num
            result = meets_level and field_match
            
            logger.info(f"Education compliance check: Required={required_level}({required_level_num}), "
                       f"Candidate={candidate_education}({candidate_level_num}), "
                       f"Field match={field_match}, Result={result}")
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to check education compliance: {e}")
            return True  # Default to compliant on error
    
    def _check_experience_compliance(self, candidate_data: Dict, experience_requirement: Dict) -> bool:
        """Check if candidate meets experience requirement"""
        try:
            required_years = experience_requirement.get('years', 0)
            candidate_years = self._get_candidate_experience_years(candidate_data)
            
            if required_years == 0:
                return True  # No specific requirement
            
            meets_years = candidate_years >= required_years
            
            logger.info(f"Experience compliance check: Required={required_years} years, "
                       f"Candidate={candidate_years} years, Result={meets_years}")
            
            return meets_years
            
        except Exception as e:
            logger.error(f"Failed to check experience compliance: {e}")
            return True  # Default to compliant on error
    
    def _get_candidate_highest_education(self, candidate_data: Dict) -> str:
        """Get candidate's highest education level as a string"""
        try:
            educational_background = candidate_data.get('educational_background', [])
            education = candidate_data.get('education', [])
            
            all_education = []
            
            # Collect from PDS structure
            if educational_background and isinstance(educational_background, list):
                for edu in educational_background:
                    if isinstance(edu, dict):
                        level = edu.get('level', '')
                        degree = edu.get('degree_course', edu.get('degree', ''))
                        if level or degree:
                            # Create education entry with level priority
                            edu_entry = {
                                'text': f"{level} {degree}".strip(),
                                'level': level.lower(),
                                'degree': degree
                            }
                            all_education.append(edu_entry)
            
            # Collect from fallback structure
            elif education and isinstance(education, list):
                for edu in education:
                    if isinstance(edu, dict):
                        level = edu.get('level', '')
                        degree = edu.get('degree', '')
                        if level or degree:
                            edu_entry = {
                                'text': f"{level} {degree}".strip(),
                                'level': level.lower(),
                                'degree': degree
                            }
                            all_education.append(edu_entry)
            
            logger.info(f"🎓 All education found: {[edu['text'] for edu in all_education]}")
            
            # Return the highest degree found - prioritize by education level
            if all_education:
                # Priority: PhD > Doctorate > Master's > Bachelor's > Associate > Others
                degree_priorities = {
                    'phd': 10, 'doctorate': 10, 'doctoral': 10, 'graduate': 8,  # Graduate includes masters/phd
                    'master': 6, 'masters': 6, "master's": 6,
                    'bachelor': 5, 'bachelors': 5, "bachelor's": 5, 'college': 5,
                    'associate': 3, 'associates': 3,
                    'vocational': 2, 'diploma': 2, 'certificate': 1,
                    'secondary': 0.5, 'elementary': 0.1
                }
                
                def get_education_priority(edu_entry: dict) -> int:
                    # Check level first
                    level_lower = edu_entry['level'].lower()
                    for keyword, priority in degree_priorities.items():
                        if keyword in level_lower:
                            return priority
                    
                    # Check degree text as fallback
                    degree_lower = edu_entry.get('degree', '').lower()
                    for keyword, priority in degree_priorities.items():
                        if keyword in degree_lower:
                            return priority
                    
                    return 0
                
                # Get highest priority degree
                highest_education_entry = max(all_education, key=get_education_priority)
                highest_education = highest_education_entry['text']
                logger.info(f"🏆 Highest education selected: {highest_education} (level: {highest_education_entry['level']})")
                return highest_education
            
            return ""
            
        except Exception as e:
            logger.error(f"Failed to get candidate education: {e}")
            return ""
    
    def _get_candidate_experience_years(self, candidate_data: Dict) -> float:
        """Calculate candidate's total years of experience"""
        try:
            work_experience = candidate_data.get('work_experience', [])
            experience = candidate_data.get('experience', [])
            
            total_months = 0
            
            # Process PDS work experience
            if work_experience and isinstance(work_experience, list):
                for exp in work_experience:
                    if isinstance(exp, dict):
                        months = self._calculate_experience_months_simple(
                            exp.get('date_from', ''), exp.get('date_to', 'present')
                        )
                        total_months += months
            
            # Process fallback experience format
            elif experience and isinstance(experience, list):
                for exp in experience:
                    if isinstance(exp, dict):
                        months = self._calculate_experience_months_simple(
                            exp.get('from_date', ''), exp.get('to_date', 'present')
                        )
                        total_months += months
            
            return round(total_months / 12.0, 1)
            
        except Exception as e:
            logger.error(f"Failed to calculate experience years: {e}")
            return 0.0
    
    def _calculate_experience_months_simple(self, from_date: str, to_date: str) -> int:
        """Simple calculation of experience months"""
        try:
            from datetime import datetime
            import re
            
            # Simple year extraction
            from_year = None
            to_year = None
            
            if from_date:
                year_match = re.search(r'\b(\d{4})\b', str(from_date))
                if year_match:
                    from_year = int(year_match.group(1))
            
            if to_date and to_date.lower() != 'present':
                year_match = re.search(r'\b(\d{4})\b', str(to_date))
                if year_match:
                    to_year = int(year_match.group(1))
            else:
                to_year = datetime.now().year
            
            if from_year and to_year:
                return max(0, (to_year - from_year) * 12)
            
            return 12  # Default to 1 year if can't calculate
            
        except Exception as e:
            logger.error(f"Failed to calculate experience months: {e}")
            return 12  # Default to 1 year
    
    def _check_field_similarity(self, candidate_field: str, required_field: str) -> bool:
        """Check if candidate's field is similar to required field using semantic similarity"""
        try:
            if not self.is_available():
                return False
            
            # Use semantic similarity to check field relevance
            candidate_embedding = self.encode_text(candidate_field, "field_check")
            required_embedding = self.encode_text(required_field, "field_check")
            
            if candidate_embedding is not None and required_embedding is not None:
                similarity = self.calculate_semantic_similarity(candidate_embedding, required_embedding)
                return similarity >= 0.7  # 70% similarity threshold for field matching
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to check field similarity: {e}")
            return False
    
    def _calculate_education_relevance(self, candidate_data: Dict, job_data: Dict) -> float:
        """Calculate education-specific relevance using PDS structure"""
        try:
            # Extract education from PDS structure
            educational_background = candidate_data.get('educational_background', [])
            education = candidate_data.get('education', [])  # Fallback to converted format
            
            education_texts = []
            
            # Use PDS educational_background first
            if educational_background and isinstance(educational_background, list):
                for edu in educational_background[:4]:  # Include more education entries
                    if isinstance(edu, dict):
                        level = edu.get('level', '')
                        degree_course = edu.get('degree_course', edu.get('degree', ''))  # Support both field names
                        school = edu.get('school', '')
                        honors = edu.get('honors', '')
                        year_graduated = edu.get('year_graduated', '')
                        
                        if degree_course or school:
                            edu_text = f"{level} {degree_course} from {school}"
                            if honors and honors not in ['N/a', '']:
                                edu_text += f" with {honors}"
                            if year_graduated:
                                edu_text += f" (graduated {year_graduated})"
                            education_texts.append(edu_text)
            
            # Fallback to converted education format
            elif education:
                for edu in education[:4]:
                    if isinstance(edu, dict):
                        degree = edu.get('degree', '')
                        school = edu.get('school', '')
                        level = edu.get('level', '')
                        if degree or school:
                            edu_text = f"{level} {degree} from {school}".strip()
                            education_texts.append(edu_text)
            
            if not education_texts:
                return 0.0
            
            # Job requirements - focus on educational requirements
            job_text = f"{job_data.get('title', '')} {job_data.get('requirements', '')}"
            
            # Calculate similarity
            candidate_edu_text = " | ".join(education_texts)
            edu_embedding = self.encode_text(candidate_edu_text, "education")
            job_embedding = self.encode_text(job_text, "job_edu_comparison")
            
            if edu_embedding is None or job_embedding is None:
                return 0.0
            
            return self.calculate_semantic_similarity(edu_embedding, job_embedding)
            
        except Exception as e:
            logger.error(f"Failed to calculate education relevance: {e}")
            return 0.0
    
    def _calculate_experience_relevance(self, candidate_data: Dict, job_data: Dict) -> float:
        """Calculate experience-specific relevance using PDS structure"""
        try:
            # Extract experience from PDS structure
            work_experience = candidate_data.get('work_experience', [])
            experience = candidate_data.get('experience', [])  # Fallback to converted format
            
            experience_texts = []
            
            # Use PDS work_experience first
            if work_experience and isinstance(work_experience, list):
                for exp in work_experience[:4]:  # Top 4 experiences
                    if isinstance(exp, dict):
                        position = exp.get('position', '')
                        company = exp.get('company', '')
                        grade = exp.get('grade', '')
                        date_from = exp.get('date_from', '')
                        date_to = exp.get('date_to', '')
                        
                        if position or company:
                            exp_text = f"{position} at {company}"
                            if grade and grade != 'N/A':
                                exp_text += f" (Grade: {grade})"
                            # Add date range for recency context
                            if date_from or date_to:
                                exp_text += f" ({date_from} to {date_to})"
                            experience_texts.append(exp_text)
            
            # Fallback to converted experience format
            elif experience:
                for exp in experience[:4]:
                    if isinstance(exp, dict):
                        position = exp.get('position', '')
                        company = exp.get('company', '')
                        description = exp.get('description', '')
                        if position or description:
                            exp_text = f"{position} - {description[:100]}".strip()
                            experience_texts.append(exp_text)
            
            if not experience_texts:
                return 0.0
            
            # Job requirements - focus on experience requirements
            job_text = f"{job_data.get('title', '')} {job_data.get('description', '')} {job_data.get('requirements', '')}"
            
            # Calculate similarity
            candidate_exp_text = " | ".join(experience_texts)
            exp_embedding = self.encode_text(candidate_exp_text, "experience")
            job_embedding = self.encode_text(job_text, "job_exp_comparison")
            
            if exp_embedding is None or job_embedding is None:
                return 0.0
            
            return self.calculate_semantic_similarity(exp_embedding, job_embedding)
            
        except Exception as e:
            logger.error(f"Failed to calculate experience relevance: {e}")
            return 0.0
    
    def _calculate_training_relevance(self, candidate_data: Dict, job_data: Dict) -> float:
        """Calculate training and development relevance using PDS structure"""
        try:
            # Extract training/learning development from PDS structure
            learning_development = candidate_data.get('learning_development', [])
            training_programs = candidate_data.get('training_programs', [])  # PDS structure field
            training = candidate_data.get('training', [])  # Fallback to converted format
            
            training_texts = []
            
            # Use PDS learning_development first
            if learning_development:
                for train in learning_development[:5]:  # Top 5 trainings
                    if isinstance(train, dict):
                        title = train.get('title', '')
                        type_info = train.get('type', '')
                        conductor = train.get('conductor', '')
                        hours = train.get('hours', '')
                        
                        if title:
                            train_text = title
                            if type_info and type_info != 'N/a':
                                train_text += f" ({type_info})"
                            if conductor:
                                train_text += f" by {conductor}"
                            if hours:
                                train_text += f" - {hours} hours"
                            training_texts.append(train_text)
            
            # Use PDS training_programs structure (primary PDS field)
            elif training_programs:
                for train in training_programs[:5]:  # Top 5 trainings
                    if isinstance(train, dict):
                        title = train.get('title', '')
                        type_info = train.get('type_of_ld', train.get('type', ''))  # Support both field names
                        conductor = train.get('conducted_by', train.get('conductor', ''))
                        hours = train.get('number_of_hours', train.get('hours', ''))
                        
                        if title:
                            train_text = title
                            if type_info and type_info not in ['N/a', '']:
                                train_text += f" ({type_info})"
                            if conductor:
                                train_text += f" by {conductor}"
                            if hours:
                                train_text += f" - {hours} hours"
                            training_texts.append(train_text)
            
            # Fallback to converted training format
            elif training:
                for train in training[:5]:
                    if isinstance(train, dict):
                        title = train.get('title', '')
                        type_info = train.get('type', '')
                        if title:
                            train_text = title
                            if type_info:
                                train_text += f" ({type_info})"
                            training_texts.append(train_text)
            
            if not training_texts:
                return 0.0
            
            # Job requirements - focus on training/development needs
            job_text = f"{job_data.get('title', '')} {job_data.get('description', '')} {job_data.get('requirements', '')}"
            
            # Calculate similarity
            candidate_training_text = " | ".join(training_texts)
            training_embedding = self.encode_text(candidate_training_text, "training")
            job_embedding = self.encode_text(job_text, "job_training_comparison")
            
            if training_embedding is None or job_embedding is None:
                return 0.0
            
            return self.calculate_semantic_similarity(training_embedding, job_embedding)
            
        except Exception as e:
            logger.error(f"Failed to calculate training relevance: {e}")
            return 0.0
    
    def _generate_education_insights(self, compliance: Dict, job_requirements: Dict) -> str:
        """Generate detailed education insights for the frontend"""
        try:
            edu_details = compliance.get('education_details', {})
            required = edu_details.get('required', {})
            candidate_edu = edu_details.get('candidate_highest', '')
            
            if compliance['education_meets_requirement']:
                if required.get('level'):
                    return f"✅ Education requirement satisfied: Candidate has {candidate_edu} meeting {required['level']} requirement"
                else:
                    return f"✅ Educational background aligns well with job requirements"
            else:
                if required.get('level') and candidate_edu:
                    return f"⚠️ Education gap: Job requires {required['level']}, candidate has {candidate_edu}. Strict penalty applied for fair ranking."
                else:
                    return f"⚠️ Educational requirements not fully met. Ranking adjusted accordingly."
                    
        except Exception as e:
            logger.error(f"Failed to generate education insights: {e}")
            return "Educational background assessed with requirement-aware scoring"
    
    def _generate_experience_insights(self, compliance: Dict, job_requirements: Dict) -> str:
        """Generate detailed experience insights for the frontend"""
        try:
            exp_details = compliance.get('experience_details', {})
            required = exp_details.get('required', {})
            candidate_years = exp_details.get('candidate_years', 0)
            
            if compliance['experience_meets_requirement']:
                required_years = required.get('years', 0)
                if required_years > 0:
                    return f"✅ Experience requirement satisfied: Candidate has {candidate_years} years meeting {required_years} years requirement"
                else:
                    return f"✅ Work experience aligns well with job requirements"
            else:
                required_years = required.get('years', 0)
                if required_years > 0:
                    return f"⚠️ Experience gap: Job requires {required_years} years, candidate has {candidate_years} years. Moderate penalty applied."
                else:
                    return f"⚠️ Experience requirements not fully met. Ranking adjusted for fair comparison."
                    
        except Exception as e:
            logger.error(f"Failed to generate experience insights: {e}")
            return "Work experience assessed with requirement-aware scoring"
    
    def cleanup_cache(self, max_age_days: int = 30):
        """Clean up old cache entries"""
        try:
            # Save current cache before cleanup
            self._save_embedding_cache()
            logger.info(f"Semantic cache cleanup completed. Kept recent embeddings.")
            
        except Exception as e:
            logger.error(f"Failed to cleanup cache: {e}")

# Global semantic engine instance
_semantic_engine = None

def get_semantic_engine() -> UniversitySemanticEngine:
    """Get global semantic engine instance"""
    global _semantic_engine
    if _semantic_engine is None:
        _semantic_engine = UniversitySemanticEngine()
        _semantic_engine._load_embedding_cache()
    return _semantic_engine

def test_semantic_engine():
    """Test semantic engine functionality"""
    print("🧪 Testing Semantic Engine...")
    
    engine = get_semantic_engine()
    
    if not engine.is_available():
        print("❌ Semantic engine not available")
        return False
    
    # Test job encoding
    test_job = {
        'id': 1,
        'title': 'Software Engineering Professor',
        'description': 'Teaching software engineering and computer science courses',
        'requirements': 'PhD in Computer Science, programming experience, research background'
    }
    
    job_embedding = engine.encode_job_requirements(test_job)
    print(f"✅ Job embedding shape: {job_embedding.shape if job_embedding is not None else 'None'}")
    
    # Test candidate encoding
    test_candidate = {
        'id': 1,
        'education': [{'degree': 'PhD Computer Science', 'school': 'MIT'}],
        'experience': [{'position': 'Software Engineer', 'company': 'Google', 'description': 'Developed algorithms'}],
        'skills': ['Python', 'Machine Learning', 'Teaching']
    }
    
    candidate_embedding = engine.encode_candidate_profile(test_candidate)
    print(f"✅ Candidate embedding shape: {candidate_embedding.shape if candidate_embedding is not None else 'None'}")
    
    # Test similarity calculation
    if job_embedding is not None and candidate_embedding is not None:
        similarity = engine.calculate_semantic_similarity(candidate_embedding, job_embedding)
        print(f"✅ Semantic similarity: {similarity:.3f}")
        
        # Test detailed scoring
        detailed_score = engine.calculate_detailed_semantic_score(test_candidate, test_job)
        print(f"✅ Detailed semantic score: {detailed_score}")
    
    return True

if __name__ == "__main__":
    test_semantic_engine()