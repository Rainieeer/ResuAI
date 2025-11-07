import json
import re
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class UniversityAssessmentEngine:
    
    def __init__(self, db_manager):
        """Initialize assessment engine with database manager"""
        self.db = db_manager
        
        # Standard degree mappings for education assessment
        self.degree_levels = {
            'PhD': 7, 'Ph.D': 7, 'Doctorate': 7, 'Doctoral': 7, 'Ed.D': 7, 'Sc.D': 7,
            'Master': 6, 'Masters': 6, 'MS': 6, 'MA': 6, 'MBA': 6, 'MEd': 6, 'MSc': 6,
            'Bachelor': 5, 'Bachelors': 5, 'BS': 5, 'BA': 5, 'AB': 5, 'BSc': 5,
            'Associate': 4, 'Associates': 4, 'AS': 4, 'AA': 4,
            'Diploma': 3, 'Certificate': 2, 'High School': 1, 'Secondary': 1
        }
        
        # Professional certifications that qualify for eligibility points
        self.professional_certifications = [
            'RA 1080', 'CSC', 'Civil Service', 'BAR', 'Board', 'CPA', 'RN', 'MD',
            'Licensure', 'Professional License', 'Board Exam', 'Bar Exam'
        ]
        
    def parse_lspu_job_requirements(self, lspu_job: Dict) -> Dict[str, Any]:
        requirements = {
            'minimum_education': 'Bachelor',
            'required_experience': 0,
            'subject_area': '',
            'preferred_qualifications': '',
            'required_certifications': [],
            'required_skills': [],
            'position_level': 'entry'
        }
        
        # Parse education requirements
        education_req = lspu_job.get('education_requirements', '') or ''
        education_req = education_req.strip() if education_req else ''
        if education_req:
            education_lower = education_req.lower()
            if any(word in education_lower for word in ['doctoral', 'phd', 'ph.d', 'doctorate']):
                requirements['minimum_education'] = 'Doctorate'
            elif any(word in education_lower for word in ['master', 'graduate', 'post-graduate']):
                requirements['minimum_education'] = 'Master'
            elif any(word in education_lower for word in ['bachelor', 'college', 'degree']):
                requirements['minimum_education'] = 'Bachelor'
            elif any(word in education_lower for word in ['associate', 'diploma']):
                requirements['minimum_education'] = 'Associate'
            
            # Extract subject area from education requirements
            for subject in ['accounting', 'engineering', 'education', 'business', 'computer', 'nursing', 'medicine']:
                if subject in education_lower:
                    requirements['subject_area'] = subject.title()
                    break
        
        # Parse experience requirements
        experience_req = lspu_job.get('experience_requirements', '') or ''
        experience_req = experience_req.strip() if experience_req else ''
        if experience_req:
            # Look for year patterns in experience requirements
            import re
            year_match = re.search(r'(\d+)\s*(?:years?|yrs?)', experience_req.lower())
            if year_match:
                requirements['required_experience'] = int(year_match.group(1))
            elif 'no experience' in experience_req.lower() or 'fresh graduate' in experience_req.lower():
                requirements['required_experience'] = 0
            else:
                # Default to 1 year if experience mentioned but no specific number
                requirements['required_experience'] = 1
        
        # Parse eligibility requirements for certifications
        eligibility_req = lspu_job.get('eligibility_requirements', '') or ''
        eligibility_req = eligibility_req.strip() if eligibility_req else ''
        if eligibility_req:
            eligibility_lower = eligibility_req.lower()
            for cert in self.professional_certifications:
                if cert.lower() in eligibility_lower:
                    requirements['required_certifications'].append(cert)
        
        # Parse training requirements
        training_req = lspu_job.get('training_requirements', '') or ''
        training_req = training_req.strip() if training_req else ''
        if training_req:
            requirements['preferred_qualifications'] += f" Training: {training_req}"
        
        # Parse special requirements
        special_req = lspu_job.get('special_requirements', '') or ''
        special_req = special_req.strip() if special_req else ''
        if special_req:
            requirements['preferred_qualifications'] += f" Special: {special_req}"
        
        # Determine position level based on salary grade
        salary_grade = lspu_job.get('salary_grade', 0)
        if isinstance(salary_grade, (int, float)):
            if salary_grade >= 24:
                requirements['position_level'] = 'senior'
            elif salary_grade >= 15:
                requirements['position_level'] = 'mid'
            else:
                requirements['position_level'] = 'entry'
        
        # Extract job title for subject area if not found in education
        if not requirements['subject_area']:
            position_title = lspu_job.get('position_title', '').lower()
            for subject in ['instructor', 'professor', 'teacher', 'analyst', 'engineer', 'nurse', 'accountant']:
                if subject in position_title:
                    requirements['subject_area'] = subject.title()
                    break
        
        return requirements
        
    def assess_candidate_for_lspu_job(self, candidate_data: Dict, lspu_job: Dict, position_type_id: int = None) -> Dict[str, Any]:
        try:
            logger.info(f"🎯 Starting LSPU assessment for job: {lspu_job.get('position_title', 'Unknown')}")
            
            # Parse LSPU job requirements into structured format
            job_requirements = self.parse_lspu_job_requirements(lspu_job)
            logger.info(f"📋 Parsed job requirements: {job_requirements}")
            
            # NEW: Add requirement-aware semantic analysis
            semantic_scores, requirement_penalties = self._perform_semantic_analysis_with_requirements(
                candidate_data, lspu_job
            )
            logger.info(f"🧠 Semantic analysis completed. Penalties applied: {requirement_penalties}")
            
            # Get assessment templates (use default if position_type_id not provided)
            templates = {}
            if position_type_id:
                try:
                    templates = self.db.get_assessment_templates_by_category(position_type_id)
                    logger.info(f"📝 Using database templates for position type {position_type_id}")
                except Exception as e:
                    logger.warning(f"Could not get templates for position type {position_type_id}: {e}")
            
            # Use default templates if none found
            if not templates:
                templates = self._get_default_assessment_templates()
                logger.info(f"📝 Using default assessment templates")
            
            logger.info(f"👤 Candidate data keys: {list(candidate_data.keys())}")
            
            # Perform category assessments with LSPU requirements
            assessment_results = {}
            total_automated_score = 0
            
            # Education Assessment (40%) - Apply Master's degree requirement for specific positions only
            education_score, education_details = self._assess_education(
                candidate_data, templates.get('education', []), job_requirements
            )
            
            # NEW: Apply Master's degree requirement ONLY for Instructor 1 and Part-time instructor positions
            if requirement_penalties.get('requires_masters_strict', False) and requirement_penalties.get('education_penalty_applied'):
                original_education_score = education_score
                
                # Set education score to 0 for positions requiring Master's degree
                education_score = 0.0
                position_type = "Instructor 1" if requirement_penalties.get('is_instructor_1', False) else "Part-time instructor"
                
                education_details['masters_degree_requirement_applied'] = {
                    'original_score': original_education_score,
                    'penalty_type': 'zero_score_masters_required',
                    'final_score': education_score,
                    'position_type': position_type,
                    'reason': f'{position_type} position requires Master\'s degree - candidate does not meet this requirement'
                }
                logger.warning(f"🎯 {position_type.upper()} PENALTY: Education score set to 0 (was {original_education_score:.1f}) - Master's degree required")
            
            assessment_results['education'] = {
                'score': education_score,
                'details': education_details,
                'category_weight': 40,
                'max_possible': 40
            }
            total_automated_score += education_score
            
            # Experience Assessment (20%) - No penalties applied, standard scoring only
            experience_score, experience_details = self._assess_experience(
                candidate_data, templates.get('experience', []), job_requirements
            )
            
            # NOTE: Experience penalties removed - all candidates assessed on standard criteria only
            
            assessment_results['experience'] = {
                'score': experience_score,
                'details': experience_details,
                'category_weight': 20,
                'max_possible': 20
            }
            total_automated_score += experience_score
            
            # Training Assessment (10%)
            training_score, training_details = self._assess_training(
                candidate_data, templates.get('training', [])
            )
            assessment_results['training'] = {
                'score': training_score,
                'details': training_details,
                'category_weight': 10,
                'max_possible': 10
            }
            total_automated_score += training_score
            
            # Eligibility Assessment (10%)
            eligibility_score, eligibility_details = self._assess_eligibility(
                candidate_data, templates.get('eligibility', [])
            )
            assessment_results['eligibility'] = {
                'score': eligibility_score,
                'details': eligibility_details,
                'category_weight': 10,
                'max_possible': 10
            }
            total_automated_score += eligibility_score
            
            # Accomplishments Assessment (5%)
            accomplishments_score, accomplishments_details = self._assess_accomplishments(
                candidate_data, templates.get('accomplishments', [])
            )
            assessment_results['accomplishments'] = {
                'score': accomplishments_score,
                'details': accomplishments_details,
                'category_weight': 5,
                'max_possible': 5
            }
            total_automated_score += accomplishments_score
            
            # NEW: Apply overall penalty if in strict mode and requirements not met
            original_total_score = total_automated_score
            if requirement_penalties.get('strict_mode_used'):
                compliance_details = requirement_penalties.get('compliance_details', {})
                education_compliant = compliance_details.get('education_meets_requirement', True)
                experience_compliant = compliance_details.get('experience_meets_requirement', True)
                
                # Apply 70% overall penalty if education requirements not met
                if not education_compliant:
                    total_automated_score = total_automated_score * 0.3  # 70% penalty
                    logger.info(f"Applied overall penalty for education non-compliance: {original_total_score:.1f} → {total_automated_score:.1f}")
                
                # Additional penalty if both education and experience not met
                elif not experience_compliant:
                    total_automated_score = total_automated_score * 0.7  # 30% penalty
                    logger.info(f"Applied overall penalty for experience non-compliance: {original_total_score:.1f} → {total_automated_score:.1f}")
            
            # Generate recommendation based on automated score
            recommendation = self._generate_recommendation(total_automated_score, assessment_results)
            
            # Calculate percentage score  
            max_possible_score = 85  # Total automated: 40+20+10+10+5 (Potential 15% is manual)
            percentage_score = (total_automated_score / max_possible_score) * 100 if max_possible_score > 0 else 0
            
            return {
                'lspu_job_id': lspu_job.get('id'),
                'job_title': lspu_job.get('position_title', 'Unknown Position'),
                'automated_score': round(total_automated_score, 2),
                'percentage_score': round(percentage_score, 2),
                'max_possible_score': max_possible_score,
                'assessment_results': assessment_results,
                'job_requirements_used': job_requirements,
                'recommendation': recommendation,
                'assessment_date': datetime.now().isoformat(),
                'needs_manual_review': percentage_score < 70 or percentage_score > 95,
                'assessment_engine': 'LSPU_University_Standards',
                'potential_score': 0,  # Manual entry for interview (10%) + aptitude test (5%)
                'total_possible_with_potential': 100,
                # NEW: Add semantic analysis results for debugging
                'semantic_analysis': {
                    'scores': semantic_scores,
                    'requirement_penalties': requirement_penalties,
                    'strict_mode_used': requirement_penalties.get('strict_mode_used', False)
                },
                # NOTE: Penalty information updated to reflect new selective system
                'penalties_applied': {
                    'strict_mode_used': requirement_penalties.get('strict_mode_used', False),
                    'masters_degree_requirement_applied': (requirement_penalties.get('requires_masters_strict', False) and requirement_penalties.get('education_penalty_applied', False)),
                    'is_instructor_1': requirement_penalties.get('is_instructor_1', False),
                    'is_part_time_instructor': requirement_penalties.get('is_part_time_instructor', False),
                    'requires_masters_strict': requirement_penalties.get('requires_masters_strict', False),
                    'original_total_score': original_total_score if requirement_penalties.get('requires_masters_strict', False) else total_automated_score,
                    'final_total_score': total_automated_score,
                    'score_reduction': round(original_total_score - total_automated_score, 2) if requirement_penalties.get('requires_masters_strict', False) else 0,
                    'penalty_system': 'masters_degree_only'  # Indicates new selective system
                }
            }
            
        except Exception as e:
            logger.error(f"LSPU assessment failed: {str(e)}")
            return {
                'error': str(e),
                'automated_score': 0,
                'percentage_score': 0,
                'assessment_results': {},
                'recommendation': 'error'
            }
    
    def _get_default_assessment_templates(self) -> Dict[str, List[Dict]]:
        """Get default assessment templates when database templates are not available"""
        return {
            'education': [{
                'criteria_name': 'Relevance and Appropriateness',
                'max_points': 32,
                'scoring_rules': {'relevance_weight': 0.8}
            }, {
                'criteria_name': 'Basic Minimum Requirement',
                'max_points': 28,
                'scoring_rules': {}
            }, {
                'criteria_name': 'Doctoral Progress Bonus',
                'max_points': 4,
                'scoring_rules': {}
            }],
            'experience': [{
                'criteria_name': 'Professional Experience',
                'max_points': 20,
                'scoring_rules': {
                    'baseline_years': 3,
                    'points_per_year': 2
                }
            }],
            'training': [{
                'criteria_name': 'Professional Training',
                'max_points': 10,
                'scoring_rules': {
                    'baseline_hours': 40,
                    'baseline_points': 5,
                    'additional_per_8_hours': 1
                }
            }],
            'eligibility': [{
                'criteria_name': 'Professional Eligibility',
                'max_points': 10,
                'scoring_rules': {}
            }],
            'accomplishments': [{
                'criteria_name': 'Awards and Recognition',
                'max_points': 5,
                'scoring_rules': {'points_per_accomplishment': 1}
            }]
        }
        
    def assess_candidate(self, candidate_id: int, job_id: int, position_type_id: int) -> Dict[str, Any]:
        """
        Complete automated assessment of a candidate for a specific job
        Returns detailed scoring breakdown and recommendations
        """
        try:
            # Get candidate data from main candidates table
            candidate = self.db.get_candidate(candidate_id)
            if not candidate:
                raise ValueError(f"Candidate {candidate_id} not found")
            
            # Get PDS data for more detailed assessment
            pds_data = None
            try:
                with self.db.get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        SELECT * FROM pds_candidates 
                        WHERE email = %s OR name ILIKE %s
                        ORDER BY created_at DESC
                        LIMIT 1
                    """, (candidate.get('email', ''), f"%{candidate.get('name', '')}%"))
                    pds_row = cursor.fetchone()
                    if pds_row:
                        pds_data = dict(pds_row)
            except Exception as e:
                print(f"Warning: Could not retrieve PDS data: {e}")
            
            # Combine candidate data with PDS data for comprehensive assessment
            if pds_data:
                # Debug: Check what's in PDS data
                print(f"🔍 DEBUG PDS data keys: {list(pds_data.keys())}")
                print(f"🔍 DEBUG educational_background: {pds_data.get('educational_background', 'NOT FOUND')}")
                
                # Map PDS JSONB fields to assessment engine expected format
                candidate.update({
                    'education_data': pds_data.get('educational_background', []),
                    'experience_data': pds_data.get('work_experience', []),
                    'training_data': pds_data.get('learning_development', []),
                    'eligibility_data': pds_data.get('civil_service_eligibility', []),
                    'accomplishments_data': pds_data.get('other_information', {}),
                    'personal_info': pds_data.get('personal_info', {}),
                    'years_of_experience': pds_data.get('years_of_experience', candidate.get('years_of_experience', 0)),
                    'civil_service_eligible': pds_data.get('civil_service_eligible', False),
                    'highest_education': pds_data.get('highest_education', 'Not Specified')
                })
                print(f"✅ Enhanced candidate data with PDS information")
            else:
                print(f"⚠️  No PDS data found, using basic candidate information")
            
            # Get job and position requirements
            job = self.db.get_job(job_id)
            position_requirements = self.db.get_position_requirements(job_id)
            
            # Get assessment templates for the position type
            templates = self.db.get_assessment_templates_by_category(position_type_id)
            
            # Extract PDS data
            pds_data = candidate.get('pds_data', {})
            if isinstance(pds_data, str):
                try:
                    pds_data = json.loads(pds_data)
                except json.JSONDecodeError:
                    pds_data = {}
            
            # Perform category assessments
            assessment_results = {}
            total_automated_score = 0
            
            # Education Assessment (40%)
            if 'education' in templates:
                education_score, education_details = self._assess_education(
                    candidate, templates['education'], position_requirements
                )
                assessment_results['education'] = {
                    'score': education_score,
                    'details': education_details,
                    'category_weight': 40
                }
                total_automated_score += education_score
            
            # Experience Assessment (20%)
            if 'experience' in templates:
                experience_score, experience_details = self._assess_experience(
                    candidate, templates['experience'], position_requirements
                )
                assessment_results['experience'] = {
                    'score': experience_score,
                    'details': experience_details,
                    'category_weight': 20
                }
                total_automated_score += experience_score
            
            # Training Assessment (10%)
            if 'training' in templates:
                training_score, training_details = self._assess_training(
                    candidate, templates['training']
                )
                assessment_results['training'] = {
                    'score': training_score,
                    'details': training_details,
                    'category_weight': 10
                }
                total_automated_score += training_score
            
            # Eligibility Assessment (10%)
            if 'eligibility' in templates:
                eligibility_score, eligibility_details = self._assess_eligibility(
                    candidate, templates['eligibility']
                )
                assessment_results['eligibility'] = {
                    'score': eligibility_score,
                    'details': eligibility_details,
                    'category_weight': 10
                }
                total_automated_score += eligibility_score
            
            # Accomplishments Assessment (5%)
            if 'accomplishments' in templates:
                accomplishments_score, accomplishments_details = self._assess_accomplishments(
                    candidate, templates['accomplishments']
                )
                assessment_results['accomplishments'] = {
                    'score': accomplishments_score,
                    'details': accomplishments_details,
                    'category_weight': 5
                }
                total_automated_score += accomplishments_score
            
            # Generate recommendation based on automated score
            recommendation = self._generate_recommendation(total_automated_score, assessment_results)
            
            return {
                'candidate_id': candidate_id,
                'job_id': job_id,
                'position_type_id': position_type_id,
                'automated_score': round(total_automated_score, 2),
                'assessment_results': assessment_results,
                'recommendation': recommendation,
                'assessment_date': datetime.now().isoformat(),
                'needs_manual_review': total_automated_score < 70 or total_automated_score > 95
            }
            
        except Exception as e:
            logger.error(f"Assessment failed for candidate {candidate_id}, job {job_id}: {str(e)}")
            raise
    
    def _assess_education(self, pds_data: Dict, templates: List[Dict], 
                         position_requirements: Dict = None) -> Tuple[float, Dict]:
        """
        Assess education category based on university criteria:
        - Basic Minimum Requirement (35 points for Masteral)
        - Additional points for Doctoral progress (1-5 points)
        Total possible: 40 points
        """
        details = {
            'basic_minimum_score': 0,
            'doctoral_bonus': 0,
            'degrees_found': [],
            'highest_degree': 'None',
            'doctoral_progress': 'None',
            'issues': []
        }
        
        total_score = 0
        
        # Extract education data from PDS - fix key mismatch
        education_data = (pds_data.get('educational_background') or 
                         pds_data.get('education_data') or 
                         pds_data.get('education', []))
        
        logger.debug(f"🔍 Education data extraction: {education_data}")
        
        # Handle string format
        if isinstance(education_data, str):
            try:
                education_data = json.loads(education_data)
            except:
                education_data = []
        
        # Collect all degrees
        all_degrees = []
        if isinstance(education_data, list):
            all_degrees = education_data
        elif isinstance(education_data, dict):
            for level in ['college', 'graduate', 'post_graduate']:
                level_data = education_data.get(level, [])
                if isinstance(level_data, list):
                    all_degrees.extend(level_data)
                elif isinstance(level_data, dict):
                    all_degrees.append(level_data)
        
        if not all_degrees:
            details['issues'].append("No education data found in PDS")
            return 0.0, details
        
        # Find highest degree and doctoral progress
        highest_degree_level = 0
        has_doctoral = False
        doctoral_units_completed = 0
        
        for degree in all_degrees:
            if isinstance(degree, dict):
                degree_name = (degree.get('degree_course') or degree.get('degree') or '').strip()
                school = (degree.get('school') or degree.get('institution') or '').strip()  # Added institution fallback
                level = degree.get('level', '').strip()
                
                logger.debug(f"🔍 Processing degree: name='{degree_name}', school='{school}', level='{level}'")
                
                if degree_name and school:
                    details['degrees_found'].append(f"{degree_name} - {school}")
                    
                    # Determine degree level
                    degree_level = self._get_degree_level_enhanced(degree_name, level)
                    highest_degree_level = max(highest_degree_level, degree_level)
                    
                    # Check for doctoral progress
                    degree_lower = (degree_name + ' ' + level).lower()
                    if any(term in degree_lower for term in ['phd', 'ph.d', 'doctorate', 'doctoral']):
                        has_doctoral = True
                        # Estimate completion based on keywords
                        if 'completed' in degree_lower or 'graduate' in degree_lower:
                            doctoral_units_completed = 100
                        elif 'units' in degree_lower:
                            # Try to extract unit completion percentage
                            if '75%' in degree_lower or 'dissertation' in degree_lower:
                                doctoral_units_completed = 75
                            elif '50%' in degree_lower or 'comprehensive' in degree_lower:
                                doctoral_units_completed = 50
                            elif '25%' in degree_lower:
                                doctoral_units_completed = 25
                            else:
                                doctoral_units_completed = 25  # Default for "with units"
        
        # Update details
        degree_names = {1: 'High School', 2: 'Certificate', 3: 'Diploma', 4: 'Associate', 
                       5: 'Bachelor', 6: 'Master', 7: 'Doctorate'}
        details['highest_degree'] = degree_names.get(highest_degree_level, 'Unknown')
        
        # Score Basic Minimum Requirement (35 points for Masteral, 30 points for Bachelor's)
        if highest_degree_level >= 6:  # Master's degree or higher
            details['basic_minimum_score'] = 35
            total_score += 35
        elif highest_degree_level >= 5:  # Bachelor's degree - UPDATED: increased from 25 to 30
            details['basic_minimum_score'] = 30  # Updated minimum requirement
            total_score += 30
        else:
            details['basic_minimum_score'] = 0
        
        # Score Doctoral Progress (Additional 1-5 points)
        if has_doctoral:
            if doctoral_units_completed >= 100:
                details['doctoral_bonus'] = 5  # Completed 100%
                details['doctoral_progress'] = 'Completed 100%'
            elif doctoral_units_completed >= 75:
                details['doctoral_bonus'] = 4  # Completed CAR
                details['doctoral_progress'] = 'Completed CAR (75%)'
            elif doctoral_units_completed >= 50:
                details['doctoral_bonus'] = 3  # Completed 75%
                details['doctoral_progress'] = 'Completed 75%'
            elif doctoral_units_completed >= 25:
                details['doctoral_bonus'] = 2  # Completed 50%
                details['doctoral_progress'] = 'Completed 50%'
            else:
                details['doctoral_bonus'] = 1  # Completed 25%
                details['doctoral_progress'] = 'Completed 25%'
            
            total_score += details['doctoral_bonus']
        
        return min(40.0, total_score), details

    def _assess_experience(self, pds_data: Dict, templates: List[Dict], 
                          position_requirements: Dict = None) -> Tuple[float, Dict]:
        """
        Assess work experience based on university criteria:
        - 5-10 yrs: 15 points
        - 3-4 yrs: 10 points  
        - 1-2 yrs: 5 points
        - Additional 1 point for every year over 10 years
        Total possible: 20 points
        """
        details = {
            'total_years': 0,
            'relevant_years': 0,
            'experience_entries': [],
            'score_breakdown': {},
            'scoring_tier': 'None',
            'issues': []
        }
        
        # Extract work experience from PDS
        experience_data = pds_data.get('experience_data', pds_data.get('work_experience', []))
        
        if isinstance(experience_data, str):
            try:
                experience_data = json.loads(experience_data)
            except:
                experience_data = []
        
        if not isinstance(experience_data, list):
            experience_data = []
        
        total_months = 0
        relevant_months = 0
        
        for exp in experience_data:
            if isinstance(exp, dict):
                position = (exp.get('position') or '').strip() if exp.get('position') else ''
                company = (exp.get('company') or '').strip() if exp.get('company') else ''
                from_date = exp.get('from_date', exp.get('date_from', '')) or ''
                to_date = exp.get('to_date', exp.get('date_to', '')) or 'present'
                
                if position and company:
                    # Calculate duration
                    months = self._calculate_experience_months(from_date, to_date)
                    total_months += months
                    
                    # Check relevance
                    is_relevant = self._is_experience_relevant(position, company, position_requirements)
                    if is_relevant:
                        relevant_months += months
                    
                    details['experience_entries'].append({
                        'position': position,
                        'company': company,
                        'duration_months': months,
                        'is_relevant': is_relevant
                    })
        
        details['total_years'] = round(total_months / 12, 1)
        details['relevant_years'] = round(relevant_months / 12, 1)
        
        # Use relevant years for scoring, fall back to total if no relevant experience
        years_to_score = details['relevant_years'] if details['relevant_years'] > 0 else details['total_years']
        
        # Score based on university criteria
        score = 0
        if years_to_score >= 10:
            # 15 points base + 1 point for each additional year over 10
            additional_years = int(years_to_score - 10)
            score = 15 + additional_years
            details['scoring_tier'] = f"10+ years ({years_to_score:.1f} years) - 15 + {additional_years} bonus"
        elif years_to_score >= 5:
            score = 15
            details['scoring_tier'] = f"5-10 years ({years_to_score:.1f} years)"
        elif years_to_score >= 3:
            score = 10
            details['scoring_tier'] = f"3-4 years ({years_to_score:.1f} years)"
        elif years_to_score >= 1:
            score = 5
            details['scoring_tier'] = f"1-2 years ({years_to_score:.1f} years)"
        else:
            score = 0
            details['scoring_tier'] = f"Less than 1 year ({years_to_score:.1f} years)"
        
        # Cap at 20 points maximum
        score = min(score, 20)
        
        details['score_breakdown'] = {
            'base_score': score,
            'years_scored': years_to_score,
            'criteria_used': 'University Experience Standards'
        }
        
        return float(score), details
        
        # Apply relevance multiplier if using total years instead of relevant
        if details['relevant_years'] == 0 and details['total_years'] > 0:
            score *= 0.7  # Reduce score if no clearly relevant experience
            details['issues'].append("No clearly relevant experience found")
        
        details['score_breakdown'] = {
            'base_score': score,
            'years_considered': years_to_score,
            'relevance_applied': details['relevant_years'] > 0
        }
        
        return round(score, 2), details
    
    def _assess_training(self, pds_data: Dict, templates: List[Dict]) -> Tuple[float, Dict]:
        """
        Assess professional training based on university criteria:
        - 40 hours relevance and appropriateness: 5 points
        - Additional 1 point for every 8 hours of additional training
        Total possible: 10 points
        """
        details = {
            'total_hours': 0,
            'training_entries': [],
            'relevant_training': [],
            'base_score': 0,
            'bonus_score': 0,
            'scoring_breakdown': '',
            'issues': []
        }
        
        # Extract training data - fix key mismatch
        training_data = (pds_data.get('training_programs') or 
                        pds_data.get('training') or 
                        pds_data.get('learning_development', []))
        
        if isinstance(training_data, str):
            try:
                training_data = json.loads(training_data)
            except:
                training_data = []
        
        if not isinstance(training_data, list):
            training_data = []
        
        total_hours = 0
        
        for training in training_data:
            if isinstance(training, dict):
                title = (training.get('title') or training.get('program') or training.get('training_program') or '').strip()
                
                # Extract hours from various formats
                hours = training.get('hours', training.get('training_hours', training.get('duration_hours', 0)))
                
                if isinstance(hours, str):
                    hours_match = re.search(r'(\d+)\s*(hrs?|hours?)', hours.lower())
                    if hours_match:
                        hours = int(hours_match.group(1))
                    else:
                        hours_match = re.search(r'(\d+)', hours)
                        hours = int(hours_match.group(1)) if hours_match else 0
                elif not isinstance(hours, (int, float)):
                    hours = 0
                
                # Default to 8 hours if training exists but no hours specified
                if title and hours == 0:
                    hours = 8
                
                if title and hours > 0:
                    total_hours += hours
                    is_relevant = self._is_training_relevant(title)
                    
                    entry = {
                        'title': title,
                        'hours': hours,
                        'is_relevant': is_relevant
                    }
                    
                    details['training_entries'].append(entry)
                    if is_relevant:
                        details['relevant_training'].append(entry)
        
        details['total_hours'] = total_hours
        
        # Score based on university criteria
        score = 0
        
        # Base score: 5 points for 40 hours of relevant training
        if total_hours >= 40:
            details['base_score'] = 5
            score += 5
            
            # Bonus score: 1 point for every additional 8 hours
            additional_hours = total_hours - 40
            bonus_points = int(additional_hours / 8)
            details['bonus_score'] = min(bonus_points, 5)  # Cap bonus at 5 points
            score += details['bonus_score']
            
            details['scoring_breakdown'] = f"Base 40hrs: 5pts + {additional_hours}hrs bonus: {details['bonus_score']}pts"
        elif total_hours >= 20:
            # Partial credit for significant training
            details['base_score'] = 3
            score += 3
            details['scoring_breakdown'] = f"Partial credit for {total_hours}hrs: 3pts"
        elif total_hours >= 8:
            # Minimal credit for some training
            details['base_score'] = 1
            score += 1
            details['scoring_breakdown'] = f"Minimal training {total_hours}hrs: 1pt"
        else:
            details['scoring_breakdown'] = f"Insufficient training hours: {total_hours}hrs"
        
        # Cap at 10 points maximum
        score = min(score, 10)
        
        return float(score), details
        
        # Scoring based on Excel analysis: 40 hours baseline = 5 points, +1 per additional 8 hours
        baseline_hours = scoring_rules.get('baseline_hours', 40)
        baseline_points = scoring_rules.get('baseline_points', 5)
        additional_per_hours = scoring_rules.get('additional_per_8_hours', 1)
        
        if total_hours >= baseline_hours:
            score = baseline_points
            additional_hours = total_hours - baseline_hours
            additional_points = (additional_hours // 8) * additional_per_hours
            score += additional_points
        else:
            # Partial credit for less than baseline
            score = (total_hours / baseline_hours) * baseline_points
        
        # Cap at maximum points
        score = min(score, max_points)
        
        # Apply relevance bonus if most training is relevant
        relevant_hours = sum(t['hours'] for t in details['relevant_training'])
        if relevant_hours / total_hours > 0.7 if total_hours > 0 else False:
            score *= 1.1  # 10% bonus for highly relevant training
        
        return round(score, 2), details
    
    def _assess_eligibility(self, pds_data: Dict, templates: List[Dict]) -> Tuple[float, Dict]:
        """
        Assess professional eligibility based on university criteria:
        - RA 1080, CSC Exam, BAR/BOARD Exam: 10 points
        Total possible: 10 points
        """
        details = {
            'certifications_found': [],
            'qualifying_certifications': [],
            'eligibility_type': 'None',
            'meets_requirements': False,
            'issues': []
        }
        
        # Extract eligibility data
        eligibility_data = pds_data.get('eligibility', pds_data.get('civil_service_eligibility', []))
        
        if isinstance(eligibility_data, str):
            try:
                eligibility_data = json.loads(eligibility_data)
            except:
                eligibility_data = []
        
        # Also check certifications field
        certifications_data = pds_data.get('certifications', [])
        if isinstance(certifications_data, str):
            try:
                certifications_data = json.loads(certifications_data)
            except:
                certifications_data = []
        
        # Combine all certification sources
        all_certs = []
        
        # From eligibility section
        if isinstance(eligibility_data, list):
            for item in eligibility_data:
                if isinstance(item, dict):
                    cert_name = (item.get('eligibility') or 
                               item.get('title') or 
                               item.get('name') or 
                               item.get('certification') or '').strip()
                    if cert_name and cert_name.lower() not in ['no', 'none', 'n/a']:
                        all_certs.append(cert_name)
        elif isinstance(eligibility_data, dict):
            for key, value in eligibility_data.items():
                if value and isinstance(value, str) and value.lower() not in ['no', 'none', 'n/a']:
                    all_certs.append(f"{key}: {value}")
        
        # From certifications section
        if isinstance(certifications_data, list):
            for cert in certifications_data:
                if isinstance(cert, dict):
                    name = cert.get('name', '').strip()
                    if name:
                        all_certs.append(name)
                elif isinstance(cert, str) and cert.strip():
                    all_certs.append(cert.strip())
        
        details['certifications_found'] = all_certs
        
        # Check for university-required eligibility types
        qualifying_eligibility = []
        eligibility_keywords = {
            'RA 1080': ['ra 1080', 'ra1080', 'republic act 1080'],
            'CSC Exam': ['csc', 'civil service', 'career service', 'civil service commission'],
            'BAR Exam': ['bar', 'bar exam', 'bar examination'],
            'BOARD Exam': ['board', 'board exam', 'board examination', 'licensure', 'professional license']
        }
        
        for cert in all_certs:
            cert_lower = cert.lower()
            for eligibility_type, keywords in eligibility_keywords.items():
                if any(keyword in cert_lower for keyword in keywords):
                    qualifying_eligibility.append({
                        'type': eligibility_type,
                        'certification': cert
                    })
                    break
        
        details['qualifying_certifications'] = qualifying_eligibility
        
        # Score based on university criteria
        score = 0
        if qualifying_eligibility:
            score = 10  # Full 10 points for any qualifying eligibility
            details['meets_requirements'] = True
            details['eligibility_type'] = ', '.join([q['type'] for q in qualifying_eligibility])
        else:
            details['meets_requirements'] = False
            details['eligibility_type'] = 'No qualifying eligibility found'
        
        return float(score), details
        
        # Score based on eligibility template
        eligibility_template = templates[0] if templates else None
        if not eligibility_template:
            return 0.0, details
        
        max_points = eligibility_template['max_points']
        scoring_rules = eligibility_template.get('scoring_rules', {})
        
        # Full points if any qualifying certification found
        if qualifying_certs:
            score = max_points
        else:
            score = 0
            details['issues'].append("No qualifying professional certifications found")
        
        return round(score, 2), details
    
    def _assess_accomplishments(self, pds_data: Dict, templates: List[Dict]) -> Tuple[float, Dict]:
        """
        Assess outstanding accomplishments based on university criteria:
        - Citations, Recognitions, Honor Graduates, Board/Bar Topnotcher, CSC Topnotcher: 5 points
        Total possible: 5 points
        """
        details = {
            'accomplishments_found': [],
            'qualifying_accomplishments': [],
            'accomplishment_types': [],
            'meets_requirements': False,
            'issues': []
        }
        
        # Extract accomplishments data from multiple sources
        awards_data = pds_data.get('awards', [])
        voluntary_work = pds_data.get('voluntary_work', [])
        other_info = pds_data.get('other_information', [])
        education_data = pds_data.get('education', [])
        
        # Combine all accomplishment sources
        all_accomplishments = []
        
        # Process awards
        if isinstance(awards_data, str):
            try:
                awards_data = json.loads(awards_data)
            except:
                awards_data = []
        if isinstance(awards_data, list):
            all_accomplishments.extend([{'text': str(item), 'source': 'awards'} for item in awards_data])
            
        # Process voluntary work  
        if isinstance(voluntary_work, str):
            try:
                voluntary_work = json.loads(voluntary_work)
            except:
                voluntary_work = []
        if isinstance(voluntary_work, list):
            all_accomplishments.extend([{'text': str(item), 'source': 'voluntary'} for item in voluntary_work])
            
        # Process other information
        if isinstance(other_info, str):
            try:
                other_info = json.loads(other_info)
            except:
                other_info = []
        if isinstance(other_info, list):
            all_accomplishments.extend([{'text': str(item), 'source': 'other'} for item in other_info])
            
        # Check educational background for honors
        if isinstance(education_data, list):
            for edu in education_data:
                if isinstance(edu, dict):
                    honors = edu.get('honors', '').strip()
                    if honors and honors.lower() not in ['no', 'none', 'n/a', '', 'null']:
                        all_accomplishments.append({'text': f"Academic Honor: {honors}", 'source': 'education'})
        
        details['accomplishments_found'] = [item['text'] for item in all_accomplishments]
        
        # University criteria for outstanding accomplishments
        outstanding_keywords = {
            'Citations': ['citation', 'cited', 'research citation'],
            'Recognitions': ['recognition', 'award', 'achievement', 'outstanding'],
            'Honor Graduates': ['summa cum laude', 'magna cum laude', 'cum laude', 'dean', 'honor', 'valedictorian', 'salutatorian'],
            'Board/Bar Topnotcher': ['topnotcher', 'board exam', 'board topnotcher', 'bar topnotcher', 'licensure topnotcher'],
            'CSC Topnotcher': ['csc topnotcher', 'civil service topnotcher', 'career service topnotcher']
        }
        
        qualifying_accomplishments = []
        accomplishment_types = set()
        
        for item in all_accomplishments:
            text_lower = item['text'].lower()
            for category, keywords in outstanding_keywords.items():
                if any(keyword in text_lower for keyword in keywords):
                    qualifying_accomplishments.append({
                        'text': item['text'],
                        'category': category,
                        'source': item['source']
                    })
                    accomplishment_types.add(category)
                    break
        
        details['qualifying_accomplishments'] = qualifying_accomplishments
        details['accomplishment_types'] = list(accomplishment_types)
        
        # Score based on university criteria
        score = 0
        if qualifying_accomplishments:
            score = 5  # Full 5 points for any qualifying outstanding accomplishment
            details['meets_requirements'] = True
        else:
            details['meets_requirements'] = False
        
        return float(score), details
    
    def _get_degree_level(self, degree_name: str) -> int:
        """Get numeric level for degree"""
        degree_upper = degree_name.upper()
        for degree, level in self.degree_levels.items():
            if degree.upper() in degree_upper:
                return level
        return 0
    
    def _get_degree_level_enhanced(self, degree_name: str, level: str) -> int:
        """Enhanced degree level determination using both degree name and level field"""
        degree_lower = degree_name.lower()
        level_lower = level.lower() if level else ''
        
        # PhD/Doctorate level
        if any(word in degree_lower for word in ['phd', 'ph.d', 'doctorate', 'doctoral']) or 'doctoral' in level_lower:
            return 10
        
        # Master's level
        if any(word in degree_lower for word in ['master', 'mba', 'ms', 'm.s', 'ma', 'm.a']) or 'graduate' in level_lower:
            return 8
        
        # Bachelor's level
        if any(word in degree_lower for word in ['bachelor', 'bs', 'b.s', 'ba', 'b.a', 'bsc', 'b.sc']) or 'college' in level_lower:
            return 6
        
        # Vocational/Technical
        if 'vocational' in level_lower or any(word in degree_lower for word in ['certificate', 'diploma', 'technical']):
            return 4
        
        # Secondary
        if 'secondary' in level_lower or any(word in degree_lower for word in ['high school', 'secondary']):
            return 2
        
        # Elementary
        if 'elementary' in level_lower:
            return 1
        
        # Default for unknown
        return 3
    
    def _calculate_experience_months(self, from_date: str, to_date: str) -> int:
        """Calculate experience duration in months"""
        try:
            # Parse dates (handle various formats)
            from_dt = self._parse_date(from_date)
            to_dt = self._parse_date(to_date) if to_date.lower() != 'present' else datetime.now()
            
            if from_dt and to_dt:
                return max(0, (to_dt.year - from_dt.year) * 12 + (to_dt.month - from_dt.month))
        except:
            pass
        
        return 0
    
    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Parse date string in various formats"""
        if not date_str:
            return None
        
        # Clean the string first
        date_str = str(date_str).strip()
        
        # Common date formats
        formats = [
            '%Y-%m-%d %H:%M:%S',  # 2022-05-01 00:00:00
            '%Y-%m-%d',           # 2022-05-01
            '%m/%d/%Y',           # 09/15/2025
            '%d/%m/%Y',           # 15/09/2025
            '%Y-%m',              # 2022-05
            '%m/%Y',              # 09/2025
            '%B %Y',              # September 2025
            '%b %Y',              # Sep 2025
            '%Y'                  # 2025
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        
        # Try to extract just the year
        import re
        year_match = re.search(r'\b(\d{4})\b', date_str)
        if year_match:
            try:
                return datetime(int(year_match.group(1)), 1, 1)
            except:
                pass
        
        return None
    
    def _is_experience_relevant(self, position: str, company: str, 
                               position_requirements: Dict = None) -> bool:
        """Check if work experience is relevant to the position"""
        if not position_requirements:
            return True  # Default to relevant if no requirements specified
        
        subject_area = position_requirements.get('subject_area', '').lower()
        if not subject_area:
            return True
        
        # Simple keyword matching (in practice, would be more sophisticated)
        text_to_check = f"{position} {company}".lower()
        return subject_area in text_to_check or any(
            keyword in text_to_check for keyword in ['teacher', 'instructor', 'professor', 'education']
        )
    
    def _is_training_relevant(self, title: str) -> bool:
        """Check if training is relevant to professional development"""
        relevant_keywords = [
            'professional', 'development', 'education', 'teaching', 'leadership',
            'management', 'communication', 'research', 'technology', 'certification'
        ]
        
        title_lower = title.lower()
        return any(keyword in title_lower for keyword in relevant_keywords)
    
    def _perform_semantic_analysis_with_requirements(self, candidate_data: Dict, lspu_job: Dict) -> Tuple[Dict, Dict]:
        """
        Perform semantic analysis with requirement-aware penalties
        
        Args:
            candidate_data: Candidate information
            lspu_job: LSPU job posting data
            
        Returns:
            Tuple of (semantic_scores, requirement_penalties)
        """
        try:
            # Import semantic engine
            from semantic_engine import get_semantic_engine
            semantic_engine = get_semantic_engine()
            
            # Prepare job data for semantic analysis
            job_data = {
                'id': lspu_job.get('id'),
                'title': lspu_job.get('position_title', ''),
                'education_requirements': lspu_job.get('education_requirements', ''),
                'experience_requirements': lspu_job.get('experience_requirements', ''),
                'training_requirements': lspu_job.get('training_requirements', ''),
                'eligibility_requirements': lspu_job.get('eligibility_requirements', ''),
                'requirements': f"{lspu_job.get('education_requirements', '')} {lspu_job.get('experience_requirements', '')} {lspu_job.get('eligibility_requirements', '')}".strip()
            }
            
            # Check for positions requiring strict Master's degree checking
            is_instructor_1 = self._is_instructor_1_position(lspu_job)
            is_part_time_instructor = self._is_part_time_instructor_position(lspu_job)
            requires_masters_strict = self._requires_masters_degree_strict_check(lspu_job)
            
            # Check if this job requires strict requirement checking (for semantic analysis)
            requires_strict = self._should_use_strict_mode(lspu_job)
            
            if requires_strict:
                logger.info(f"🎯 Using STRICT requirement-aware scoring for {lspu_job.get('position_title')}")
                # Use requirement-aware scoring
                semantic_scores = semantic_engine.calculate_requirement_aware_score(candidate_data, job_data)
                
                # Extract penalty information
                compliance = semantic_scores.get('requirement_compliance', {})
                penalties = {
                    'education_penalty_applied': not compliance.get('education_meets_requirement', True),
                    'experience_penalty_applied': not compliance.get('experience_meets_requirement', True),
                    'compliance_details': compliance,
                    'strict_mode_used': True,
                    'is_instructor_1': is_instructor_1,
                    'is_part_time_instructor': is_part_time_instructor,
                    'requires_masters_strict': requires_masters_strict
                }
                
                logger.info(f"🔍 Requirement compliance: Education={compliance.get('education_meets_requirement', True)}, Experience={compliance.get('experience_meets_requirement', True)}")
                
                # Special logging for positions requiring strict Master's degree
                if requires_masters_strict and not compliance.get('education_meets_requirement', True):
                    position_type = "Instructor 1" if is_instructor_1 else "Part-time instructor"
                    logger.warning(f"⚠️  {position_type} position: Candidate does not meet Master's degree requirement - Education score will be set to 0")
                
            else:
                logger.info(f"🔍 Using REGULAR semantic scoring for {lspu_job.get('position_title')}")
                # Use regular semantic scoring
                semantic_scores = semantic_engine.calculate_detailed_semantic_score(candidate_data, job_data)
                penalties = {
                    'education_penalty_applied': False,
                    'experience_penalty_applied': False,
                    'strict_mode_used': False,
                    'is_instructor_1': is_instructor_1,
                    'is_part_time_instructor': is_part_time_instructor,
                    'requires_masters_strict': requires_masters_strict
                }
            
            return semantic_scores, penalties
            
        except Exception as e:
            logger.error(f"Failed to perform semantic analysis: {e}")
            # Return empty scores and no penalties on error
            return {
                'overall_score': 0.0,
                'education_relevance': 0.0,
                'experience_relevance': 0.0,
                'training_relevance': 0.0,
                'error': str(e)
            }, {
                'education_penalty_applied': False,
                'experience_penalty_applied': False,
                'strict_mode_used': False,
                'is_instructor_1': False,
                'is_part_time_instructor': False,
                'requires_masters_strict': False,
                'error': str(e)
            }
    
    def _should_use_strict_mode(self, lspu_job: Dict) -> bool:
        """
        Determine if a job should use strict requirement checking
        
        Args:
            lspu_job: LSPU job posting data
            
        Returns:
            True if strict mode should be used
        """
        try:
            # Get job requirements
            position_title = lspu_job.get('position_title', '').lower()
            education_req = lspu_job.get('education_requirements', '').lower()
            
            # Check position titles that typically require strict checking
            strict_position_types = [
                'instructor', 'professor', 'assistant professor', 'associate professor',
                'lecturer', 'faculty', 'academic', 'researcher'
            ]
            
            position_requires_strict = any(pos_type in position_title for pos_type in strict_position_types)
            
            # Check for strict requirement language
            strict_keywords = ['required', 'must have', 'mandatory', 'essential', 'prerequisite']
            has_strict_language = any(keyword in education_req for keyword in strict_keywords)
            
            # Check for specific degree requirements (Master's or higher)
            advanced_degree_requirements = ['master', 'masters', 'doctorate', 'doctoral', 'phd', 'ph.d']
            has_advanced_degree_requirement = any(degree in education_req for degree in advanced_degree_requirements)
            
            # REFINED LOGIC:
            # Use strict mode ONLY for:
            # 1. Positions that explicitly use strict language ("must have", "required", etc.)
            # 2. Academic positions (instructor/professor) that require Master's degree or higher
            should_be_strict = (
                has_strict_language or 
                (position_requires_strict and has_advanced_degree_requirement)
            )
            
            logger.info(f"Strict mode decision for {lspu_job.get('position_title')}: "
                       f"Position={position_requires_strict}, Advanced Degree={has_advanced_degree_requirement}, "
                       f"Strict language={has_strict_language}, Result={should_be_strict}")
            
            return should_be_strict
            
        except Exception as e:
            logger.error(f"Failed to determine strict mode: {e}")
            return False  # Default to regular mode on error
    
    def _is_instructor_1_position(self, lspu_job: Dict) -> bool:
        """
        Determine if this is an Instructor 1 position that requires special handling
        
        Args:
            lspu_job: LSPU job posting data
            
        Returns:
            True if this is an Instructor 1 position requiring Master's degree
        """
        try:
            position_title = lspu_job.get('position_title', '').lower()
            education_req = lspu_job.get('education_requirements', '').lower()
            
            # Check if this is specifically an Instructor 1 position
            is_instructor_1 = (
                'instructor 1' in position_title or
                'instructor i' in position_title or
                (('instructor' in position_title) and ('1' in position_title))
            )
            
            # Check if it requires Master's degree
            requires_masters = any(degree in education_req for degree in ['master', 'masters', 'masteral'])
            
            result = is_instructor_1 and requires_masters
            
            if result:
                logger.info(f"🎯 Instructor 1 position detected: '{lspu_job.get('position_title')}' - Special Master's degree rule will apply")
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to check Instructor 1 position: {e}")
            return False

    def _is_part_time_instructor_position(self, lspu_job: Dict) -> bool:
        """
        Determine if this is a Part-time instructor position that requires special handling
        
        Args:
            lspu_job: LSPU job posting data
            
        Returns:
            True if this is a Part-time instructor position requiring Master's degree
        """
        try:
            position_title = lspu_job.get('position_title', '').lower()
            education_req = lspu_job.get('education_requirements', '').lower()
            
            # Check if this is specifically a Part-time instructor position
            is_part_time_instructor = (
                'part-time instructor' in position_title or
                'part time instructor' in position_title or
                ('part' in position_title and 'time' in position_title and 'instructor' in position_title) or
                'adjunct instructor' in position_title or
                'visiting instructor' in position_title
            )
            
            # Check if it requires Master's degree
            requires_masters = any(degree in education_req for degree in ['master', 'masters', 'masteral'])
            
            result = is_part_time_instructor and requires_masters
            
            if result:
                logger.info(f"🎯 Part-time instructor position detected: '{lspu_job.get('position_title')}' - Special Master's degree rule will apply")
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to check Part-time instructor position: {e}")
            return False

    def _requires_masters_degree_strict_check(self, lspu_job: Dict) -> bool:
        """
        Determine if this position requires strict Master's degree checking (education score = 0 if not met)
        
        Only applies to:
        1. Instructor 1 positions
        2. Part-time instructor positions
        
        Args:
            lspu_job: LSPU job posting data
            
        Returns:
            True if position requires strict Master's degree checking
        """
        return (
            self._is_instructor_1_position(lspu_job) or 
            self._is_part_time_instructor_position(lspu_job)
        )
    
    def _generate_recommendation(self, total_score: float, assessment_results: Dict) -> str:
        """Generate recommendation based on total automated score and category performance"""
        if total_score >= 90:
            return 'highly_recommended'
        elif total_score >= 75:
            return 'recommended'
        elif total_score >= 60:
            return 'conditional'  # Shortened from 'conditionally_recommended' to fit VARCHAR(20)
        else:
            return 'not_recommended'