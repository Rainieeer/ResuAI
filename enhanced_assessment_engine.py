import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import json

# Import existing assessment engine
from assessment_engine import UniversityAssessmentEngine
from semantic_engine import get_semantic_engine

logger = logging.getLogger(__name__)

class EnhancedUniversityAssessmentEngine(UniversityAssessmentEngine):

    def __init__(self, db_manager=None):
        if db_manager is None:
            from schemafiles.database import DatabaseManager
            db_manager = DatabaseManager()
        
        super().__init__(db_manager)
        try:
            self.semantic_engine = get_semantic_engine()
            self.semantic_available = True
        except Exception as e:
            logger.warning(f"⚠️ Semantic engine initialization failed in enhanced assessment: {e}")
            self.semantic_engine = None
            self.semantic_available = False
        
        self.semantic_weights = {
            'education_relevance': 0.35,    # Matches university education emphasis
            'experience_relevance': 0.45,   # Strong weight for experience relevance  
            'training_relevance': 0.15,     # Replaces skills - uses learning_development
            'overall_quality_bonus': 0.05   # Small bonus for overall job fit
        }
        
        self.university_weights = {
            'potential': 0.10,      # Interview + Written Exam (manually entered)
            'education': 0.30,      # Education background
            'experience': 0.05,     # Experience/Outstanding Accomplishment  
            'training': 0.05,       # Training programs
            'eligibility': 0.10,    # Civil Service Eligibility
            'performance': 0.40     # Performance ratings (manually entered)
        }
        
        # Performance tracking
        self.assessment_stats = {
            'total_assessments': 0,
            'semantic_assessments': 0,
            'traditional_assessments': 0,
            'fallback_to_traditional': 0
        }
    
    def assess_candidate_enhanced(self, candidate_data: Dict, job_data: Dict, 
                                 include_semantic: bool = True, 
                                 include_traditional: bool = True,
                                 manual_scores: Dict = None,
                                 criterion_overrides: Dict = None) -> Dict:
        assessment_start = datetime.now()
        
        # Initialize result structure
        result = {
            'candidate_id': candidate_data.get('id'),
            'job_id': job_data.get('id'),
            'assessment_timestamp': assessment_start.isoformat(),
            'semantic_score': None,
            'traditional_score': None,
            'recommended_score': None,  # The score to use for ranking
            'assessment_method': 'hybrid',
            'semantic_breakdown': {},
            'traditional_breakdown': {},
            'performance_metrics': {},
            'errors': []
        }
        
        # Calculate semantic scores (default method)
        if include_semantic and self.semantic_available and self.semantic_engine and self.semantic_engine.is_available():
            try:
                semantic_result = self._calculate_semantic_assessment(candidate_data, job_data)
                result['semantic_score'] = semantic_result['final_score']
                result['semantic_breakdown'] = semantic_result['breakdown']
                result['recommended_score'] = semantic_result['final_score']
                result['assessment_method'] = 'semantic'
                
                self.assessment_stats['semantic_assessments'] += 1
                
            except Exception as e:
                error_msg = f"Semantic assessment failed: {str(e)}"
                result['errors'].append(error_msg)
                logger.error(error_msg)
                
                # Fallback to traditional if semantic fails
                if include_traditional:
                    include_traditional = True
                    result['assessment_method'] = 'traditional_fallback'
                    self.assessment_stats['fallback_to_traditional'] += 1
        
        if include_traditional:
            try:
                mapped_candidate_data = self._map_pds_fields_for_traditional_assessment(candidate_data)             
                if manual_scores:
                    mapped_candidate_data.update({
                        'potential_score': manual_scores.get('potential', 0),
                        'performance_score': manual_scores.get('performance', 0)
                    })
                
                traditional_result = self.assess_candidate_for_lspu_job(mapped_candidate_data, job_data)
                
                automated_score = traditional_result.get('automated_score', 0)
                
                manual_potential = manual_scores.get('potential', 0) if manual_scores else 0
                manual_performance = manual_scores.get('performance', 0) if manual_scores else 0
                traditional_score = automated_score + manual_potential + manual_performance
                
                result['traditional_score'] = traditional_score
                
                # Extract detailed scores from nested structure
                assessment_results = traditional_result.get('assessment_results', {})
                result['traditional_breakdown'] = {
                    'education': assessment_results.get('education', {}).get('score', 0),
                    'experience': assessment_results.get('experience', {}).get('score', 0), 
                    'training': assessment_results.get('training', {}).get('score', 0),
                    'eligibility': assessment_results.get('eligibility', {}).get('score', 0),
                    'performance': manual_scores.get('performance', 0) if manual_scores else 0,
                    'potential': manual_scores.get('potential', 0) if manual_scores else 0
                }
                
                # Apply criterion overrides if provided
                if criterion_overrides:
                    logger.info(f"🎛️ Applying criterion overrides: {criterion_overrides}")
                    original_breakdown = result['traditional_breakdown'].copy()
                    
                    for criterion, override_score in criterion_overrides.items():
                        if override_score is not None and criterion in result['traditional_breakdown']:
                            logger.info(f"   Override {criterion}: {original_breakdown[criterion]} → {override_score}")
                            result['traditional_breakdown'][criterion] = override_score
                    
                    # Recalculate traditional total score with overrides
                    traditional_score = sum([
                        result['traditional_breakdown'].get('education', 0),
                        result['traditional_breakdown'].get('experience', 0),
                        result['traditional_breakdown'].get('training', 0),
                        result['traditional_breakdown'].get('eligibility', 0),
                        result['traditional_breakdown'].get('performance', 0),
                        result['traditional_breakdown'].get('potential', 0)
                    ])
                    
                    result['traditional_score'] = traditional_score
                    result['has_overrides'] = True
                    result['overrides_applied'] = criterion_overrides
                    
                    logger.info(f"✅ Traditional score recalculated with overrides: {traditional_score}")
                
                # Use traditional as recommended if semantic not available
                if result['recommended_score'] is None:
                    result['recommended_score'] = result['traditional_score']  # Use potentially overridden score
                    result['assessment_method'] = 'traditional'
                
                self.assessment_stats['traditional_assessments'] += 1
                
            except Exception as e:
                error_msg = f"Traditional assessment failed: {str(e)}"
                result['errors'].append(error_msg)
                logger.error(error_msg)
        
        # Calculate performance metrics
        assessment_end = datetime.now()
        assessment_time = (assessment_end - assessment_start).total_seconds()
        
        result['performance_metrics'] = {
            'assessment_time_seconds': round(assessment_time, 3),
            'semantic_available': self.semantic_available and self.semantic_engine and self.semantic_engine.is_available(),
            'model_used': getattr(self.semantic_engine, 'model_name', 'N/A')
        }
        
        # Ensure we have a recommended score
        if result['recommended_score'] is None:
            result['recommended_score'] = 0
            result['assessment_method'] = 'failed'
            result['errors'].append("No assessment method succeeded")
        
        self.assessment_stats['total_assessments'] += 1
        
        return result
    
    def _calculate_semantic_assessment(self, candidate_data: Dict, job_data: Dict) -> Dict:
        if self.semantic_available and self.semantic_engine:
            semantic_details = self.semantic_engine.calculate_detailed_semantic_score(
                candidate_data, job_data)
        else:
            # Fallback when semantic engine is not available
            semantic_details = {
                'education_relevance': 0.0,
                'experience_relevance': 0.0,
                'training_relevance': 0.0,
                'overall_score': 0.0
            }
        
        if 'error' in semantic_details:
            raise Exception(semantic_details['error'])
        
        # Extract component scores
        education_relevance = semantic_details.get('education_relevance', 0.0)
        experience_relevance = semantic_details.get('experience_relevance', 0.0)
        training_relevance = semantic_details.get('training_relevance', 0.0)
        overall_score = semantic_details.get('overall_score', 0.0)
        
        # Calculate weighted semantic score
        weighted_score = (
            education_relevance * self.semantic_weights['education_relevance'] +
            experience_relevance * self.semantic_weights['experience_relevance'] +
            training_relevance * self.semantic_weights['training_relevance']
        )
        
        # Apply overall quality bonus
        quality_bonus = overall_score * self.semantic_weights['overall_quality_bonus']
        
        # Final semantic score (scale to 0-100)
        final_semantic_score = (weighted_score + quality_bonus) * 100
        final_semantic_score = max(0, min(100, final_semantic_score))  # Clamp to 0-100
        
        # Create detailed breakdown
        breakdown = {
            'education_relevance': round(education_relevance, 3),
            'experience_relevance': round(experience_relevance, 3),
            'training_relevance': round(training_relevance, 3),
            'overall_similarity': round(overall_score, 3),
            'weighted_components': {
                'education_weighted': round(education_relevance * self.semantic_weights['education_relevance'], 3),
                'experience_weighted': round(experience_relevance * self.semantic_weights['experience_relevance'], 3),
                'training_weighted': round(training_relevance * self.semantic_weights['training_relevance'], 3),
                'quality_bonus': round(quality_bonus, 3)
            },
            'final_calculation': {
                'base_weighted_score': round(weighted_score, 3),
                'quality_bonus': round(quality_bonus, 3),
                'final_score_0_1': round((weighted_score + quality_bonus), 3),
                'final_score_0_100': round(final_semantic_score, 1)
            },
            'weights_used': self.semantic_weights.copy(),
            'model_info': {
                'model_name': semantic_details.get('model_used', 'unknown'),
                'similarity_threshold': semantic_details.get('similarity_threshold', 0.3)
            }
        }
        
        return {
            'final_score': round(final_semantic_score, 1),
            'breakdown': breakdown
        }
    
    def batch_assess_candidates(self, candidates_data: List[Dict], job_data: Dict, 
                              include_semantic: bool = True) -> List[Dict]:
        logger.info(f"Starting batch assessment of {len(candidates_data)} candidates")
        
        results = []
        
        # Pre-compute job embedding for efficiency
        if include_semantic and self.semantic_available and self.semantic_engine and self.semantic_engine.is_available():
            try:
                job_embedding = self.semantic_engine.encode_job_requirements(job_data)
                logger.info("Job embedding pre-computed for batch processing")
            except Exception as e:
                logger.warning(f"Failed to pre-compute job embedding: {e}")
                job_embedding = None
        else:
            job_embedding = None
        
        # Process candidates
        for i, candidate_data in enumerate(candidates_data):
            try:
                assessment = self.assess_candidate_enhanced(
                    candidate_data, job_data, 
                    include_semantic=include_semantic,
                    include_traditional=True
                )
                results.append(assessment)
                
                # Log progress for large batches
                if len(candidates_data) > 20 and (i + 1) % 10 == 0:
                    logger.info(f"Assessed {i + 1}/{len(candidates_data)} candidates")
                    
            except Exception as e:
                error_result = {
                    'candidate_id': candidate_data.get('id', f'unknown_{i}'),
                    'job_id': job_data.get('id'),
                    'recommended_score': 0,
                    'assessment_method': 'failed',
                    'errors': [f"Assessment failed: {str(e)}"]
                }
                results.append(error_result)
                logger.error(f"Failed to assess candidate {candidate_data.get('id', i)}: {e}")
        
        logger.info(f"Batch assessment completed: {len(results)} results")
        return results
    
    def get_assessment_statistics(self) -> Dict:
        """Get assessment engine performance statistics"""
        return {
            'assessment_stats': self.assessment_stats.copy(),
            'semantic_engine_available': self.semantic_available and self.semantic_engine and self.semantic_engine.is_available(),
            'semantic_model': getattr(self.semantic_engine, 'model_name', 'N/A'),
            'semantic_weights': self.semantic_weights.copy()
        }
    
    def update_semantic_weights(self, new_weights: Dict):
        required_keys = ['education_relevance', 'experience_relevance', 'skills_relevance', 'overall_quality_bonus']
        
        for key in required_keys:
            if key not in new_weights:
                raise ValueError(f"Missing required weight: {key}")
        
        # Check if weights sum to reasonable total (allowing for bonus)
        total_weight = sum(new_weights[key] for key in required_keys[:3])  # Exclude bonus
        if total_weight < 0.8 or total_weight > 1.2:
            logger.warning(f"Semantic weights sum to {total_weight}, expected ~1.0")
        
        self.semantic_weights.update(new_weights)
        logger.info(f"Updated semantic weights: {self.semantic_weights}")
    
    def _map_pds_fields_for_traditional_assessment(self, pds_data: Dict) -> Dict:
        mapped_data = pds_data.copy()
        
        # Map PDS JSONB fields to assessment engine expected format  
        mapped_data.update({
            'education_data': pds_data.get('educational_background', []),
            'experience_data': pds_data.get('work_experience', []),
            'training_data': pds_data.get('training_programs', []),  # Fixed: was learning_development
            'eligibility_data': pds_data.get('civil_service_eligibility', []),
            'accomplishments_data': pds_data.get('other_information', {}),
            'personal_info': pds_data.get('personal_info', {}),
            'years_of_experience': pds_data.get('years_of_experience', 0),
            'civil_service_eligible': pds_data.get('civil_service_eligible', False),
            'highest_education': pds_data.get('highest_education', 'Not Specified')
        })
        
        return mapped_data
    
    def compare_scoring_methods(self, candidate_data: Dict, job_data: Dict) -> Dict:
        assessment = self.assess_candidate_enhanced(
            candidate_data, job_data,
            include_semantic=True,
            include_traditional=True
        )
        
        semantic_score = assessment.get('semantic_score', 0)
        traditional_score = assessment.get('traditional_score', 0)
        
        # Calculate comparison metrics
        score_difference = semantic_score - traditional_score
        relative_difference = (score_difference / max(traditional_score, 1)) * 100
        
        # Categorize the difference
        if abs(score_difference) < 5:
            difference_category = "similar"
        elif score_difference > 10:
            difference_category = "semantic_higher"
        elif score_difference < -10:
            difference_category = "traditional_higher"
        else:
            difference_category = "moderate_difference"
        
        return {
            'candidate_id': candidate_data.get('id'),
            'job_id': job_data.get('id'),
            'semantic_score': semantic_score,
            'traditional_score': traditional_score,
            'score_difference': round(score_difference, 1),
            'relative_difference_percent': round(relative_difference, 1),
            'difference_category': difference_category,
            'semantic_breakdown': assessment.get('semantic_breakdown', {}),
            'traditional_breakdown': assessment.get('traditional_breakdown', {}),
            'assessment_time': assessment.get('performance_metrics', {}).get('assessment_time_seconds', 0)
        }
    
    def _calculate_university_criteria_score(self, candidate_data: Dict, job_data: Dict, manual_scores: Dict = None) -> Dict:
        if manual_scores is None:
            manual_scores = {}
        
        # Initialize scores
        scores = {
            'potential': manual_scores.get('potential', 0),      # 10% - Manual entry
            'education': 0,                                      # 30% - Calculated from PDS
            'experience': 0,                                     # 5% - Calculated from PDS  
            'training': 0,                                       # 5% - Calculated from PDS
            'eligibility': 0,                                    # 10% - Calculated from PDS
            'performance': manual_scores.get('performance', 0)   # 40% - Manual entry
        }
        
        # Calculate Education Score (30 points max)
        education_score = self._calculate_university_education_score(candidate_data)
        scores['education'] = min(30, education_score)
        
        # Calculate Experience Score (5 points max) 
        experience_score = self._calculate_university_experience_score(candidate_data)
        scores['experience'] = min(5, experience_score)
        
        # Calculate Training Score (5 points max)
        training_score = self._calculate_university_training_score(candidate_data)
        scores['training'] = min(5, training_score)
        
        # Calculate Eligibility Score (10 points max)
        eligibility_score = self._calculate_university_eligibility_score(candidate_data)
        scores['eligibility'] = min(10, eligibility_score)
        
        # Calculate total
        total_score = sum(scores.values())
        
        return {
            'total_score': round(total_score, 2),
            'component_scores': scores,
            'percentages': {
                'potential': round((scores['potential'] / 10) * 100, 1) if scores['potential'] > 0 else 0,
                'education': round((scores['education'] / 30) * 100, 1),
                'experience': round((scores['experience'] / 5) * 100, 1),
                'training': round((scores['training'] / 5) * 100, 1), 
                'eligibility': round((scores['eligibility'] / 10) * 100, 1),
                'performance': round((scores['performance'] / 40) * 100, 1) if scores['performance'] > 0 else 0
            },
            'max_possible': 100,
            'manual_entries_required': ['potential', 'performance']
        }
        
    def _calculate_university_education_score(self, candidate_data: Dict) -> float:
        """Calculate education score based on university criteria"""
        educational_background = candidate_data.get('educational_background', [])
        if not educational_background:
            return 0
        
        # Find highest education level - updated to match PDS data format
        education_levels = {
            'elementary': 5,
            'secondary': 10,
            'high school': 10,  # Alternative for secondary
            'vocational': 15,
            'college': 25,
            'graduate': 30,
            'graduate studies': 30,  # Match PDS format
            'master': 30,
            'masters': 30,
            'doctorate': 35,
            'doctoral': 35,
            'phd': 35
        }
        
        max_score = 0
        degree_relevance_bonus = 0
        
        for edu in educational_background:
            level = edu.get('level', '').lower()
            degree_course = edu.get('degree_course', edu.get('degree', '')).lower()  # Support both field names
            honors = edu.get('honors', '')
            
            # Base score by level
            base_score = education_levels.get(level, 0)
            
            # Degree relevance bonus (simplified - would need job matching)
            if 'education' in degree_course or 'teaching' in degree_course:
                degree_relevance_bonus = max(degree_relevance_bonus, 3)
            elif 'computer' in degree_course or 'science' in degree_course:
                degree_relevance_bonus = max(degree_relevance_bonus, 2)
            
            # Honors bonus
            honors_bonus = 0
            if honors and honors not in ['N/a', '']:
                if 'magna' in honors.lower() or 'summa' in honors.lower():
                    honors_bonus = 3
                elif 'cum laude' in honors.lower() or 'honor' in honors.lower():
                    honors_bonus = 2
                else:
                    honors_bonus = 1
            
            total_edu_score = base_score + degree_relevance_bonus + honors_bonus
            max_score = max(max_score, total_edu_score)
        
        return min(30, max_score)
    
    def _calculate_university_experience_score(self, candidate_data: Dict) -> float:
        """Calculate experience score based on university criteria"""
        work_experience = candidate_data.get('work_experience', [])
        if not work_experience:
            return 0
        
        # Count years of experience and relevance
        total_years = 0
        teaching_experience = 0
        government_experience = 0
        
        for exp in work_experience:
            position = exp.get('position', '').lower()
            company = exp.get('company', '').lower()
            
            # Estimate years (simplified - would need date parsing)
            years = 1  # Default 1 year per position
            
            total_years += years
            
            # Teaching experience bonus
            if any(keyword in position for keyword in ['teacher', 'professor', 'instructor', 'education']):
                teaching_experience += years
            
            # Government experience bonus  
            if any(keyword in company for keyword in ['department', 'commission', 'government', 'university', 'state']):
                government_experience += years
        
        # Base score by years
        if total_years >= 10:
            base_score = 4
        elif total_years >= 5:
            base_score = 3
        elif total_years >= 2:
            base_score = 2
        else:
            base_score = 1
        
        # Add bonuses
        teaching_bonus = min(1, teaching_experience * 0.5)
        government_bonus = min(1, government_experience * 0.3)
        
        return min(5, base_score + teaching_bonus + government_bonus)
    
    def _calculate_university_training_score(self, candidate_data: Dict) -> float:
        """Calculate training score based on university criteria"""
        learning_development = candidate_data.get('learning_development', candidate_data.get('training_programs', []))
        if not learning_development:
            return 3  # Minimum requirement met
        
        total_hours = 0
        relevant_training = 0
        
        for training in learning_development:
            hours = training.get('hours', '')
            title = training.get('title', '').lower()
            training_type = training.get('type', '').lower()
            
            # Count hours
            try:
                hours_num = float(hours) if hours else 8  # Default 8 hours
                total_hours += hours_num
            except:
                total_hours += 8
            
            # Relevant training bonus
            if any(keyword in title for keyword in ['education', 'teaching', 'curriculum', 'leadership', 'management']):
                relevant_training += 1
        
        # Base score by training quantity and quality
        base_score = 3  # Minimum requirement
        
        if total_hours >= 80:
            base_score = 4
        if total_hours >= 120:
            base_score = 5
        
        # Relevance bonus
        relevance_bonus = min(1, relevant_training * 0.3)
        
        return min(5, base_score + relevance_bonus)
    
    def _calculate_university_eligibility_score(self, candidate_data: Dict) -> float:
        """Calculate eligibility score based on civil service qualifications"""
        civil_service = candidate_data.get('civil_service_eligibility', [])
        if not civil_service:
            return 0
        
        max_score = 0
        
        for eligibility in civil_service:
            elig_name = eligibility.get('eligibility', '').lower()
            rating = eligibility.get('rating', '')
            
            # Base score by eligibility type
            if 'professional' in elig_name:
                base_score = 8
            elif 'subprofessional' in elig_name:
                base_score = 6
            elif 'ces' in elig_name or 'executive' in elig_name:
                base_score = 10
            else:
                base_score = 5
            
            # Rating bonus
            rating_bonus = 0
            if rating:
                try:
                    rating_value = float(rating)
                    if rating_value >= 0.85:
                        rating_bonus = 2
                    elif rating_value >= 0.80:
                        rating_bonus = 1
                except:
                    pass
            
            total_score = base_score + rating_bonus
            max_score = max(max_score, total_score)
        
        return min(10, max_score)

# Global enhanced assessment engine instance
_enhanced_engine = None

def get_enhanced_assessment_engine() -> EnhancedUniversityAssessmentEngine:
    """Get global enhanced assessment engine instance"""
    global _enhanced_engine
    if _enhanced_engine is None:
        _enhanced_engine = EnhancedUniversityAssessmentEngine()
    return _enhanced_engine

# Convenience functions for compatibility
def assess_candidate_with_semantic(candidate_data: Dict, job_data: Dict) -> Dict:
    """Assess candidate using enhanced engine with semantic scoring"""
    engine = get_enhanced_assessment_engine()
    return engine.assess_candidate_enhanced(candidate_data, job_data)

def assess_candidates_batch(candidates_data: List[Dict], job_data: Dict) -> List[Dict]:
    """Batch assess candidates using enhanced engine"""
    engine = get_enhanced_assessment_engine()
    return engine.batch_assess_candidates(candidates_data, job_data)

if __name__ == "__main__":
    # Test enhanced assessment engine
    print("🧪 Testing Enhanced Assessment Engine...")
    
    engine = get_enhanced_assessment_engine()
    
    # Test data
    test_job = {
        'id': 1,
        'title': 'Assistant Professor - Computer Science',
        'description': 'Teaching undergraduate and graduate courses in computer science',
        'requirements': 'PhD in Computer Science, teaching experience, research publications',
        'department': 'Computer Science',
        'experience_level': 'Entry Level'
    }
    
    test_candidate = {
        'id': 1,
        'education': [
            {
                'degree': 'PhD',
                'major': 'Computer Science',
                'school': 'Stanford University',
                'graduation_year': 2020
            }
        ],
        'experience': [
            {
                'position': 'Teaching Assistant',
                'company': 'Stanford University',
                'description': 'Taught introductory programming courses',
                'years': 2
            }
        ],
        'skills': ['Python', 'Machine Learning', 'Research', 'Teaching'],
        'training': [
            {
                'title': 'Pedagogy Training Certificate',
                'year': 2019
            }
        ]
    }
    
    # Test enhanced assessment
    result = engine.assess_candidate_enhanced(test_candidate, test_job)
    
    print(f"✅ Assessment completed:")
    print(f"   Recommended Score: {result['recommended_score']}")
    print(f"   Assessment Method: {result['assessment_method']}")
    print(f"   Semantic Score: {result['semantic_score']}")
    print(f"   Traditional Score: {result['traditional_score']}")
    print(f"   Assessment Time: {result['performance_metrics']['assessment_time_seconds']}s")
    
    if result['errors']:
        print(f"   Errors: {result['errors']}")
    
    # Test comparison
    comparison = engine.compare_scoring_methods(test_candidate, test_job)
    print(f"\n📊 Scoring Comparison:")
    print(f"   Score Difference: {comparison['score_difference']}")
    print(f"   Difference Category: {comparison['difference_category']}")
    
    # Test statistics
    stats = engine.get_assessment_statistics()
    print(f"\n📈 Engine Statistics: {stats}")
    
    print("\n✅ Enhanced Assessment Engine test completed!")