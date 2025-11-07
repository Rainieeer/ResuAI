import sqlite3
from typing import Dict, List, Optional
import json
import logging

logger = logging.getLogger(__name__)

class JobPostingAssessmentIntegrator:
    def __init__(self, db_path: str = 'resume_screening.db'):
        self.db_path = db_path
    
    def create_assessment_criteria_from_job_posting(self, job_posting_id: int) -> Dict:
        """Create assessment criteria based on job posting requirements"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get job posting details
            cursor.execute("""
                SELECT jp.*, pt.name as position_type_name
                FROM lspu_job_postings jp
                LEFT JOIN position_types pt ON jp.position_type_id = pt.id
                WHERE jp.id = ?
            """, (job_posting_id,))
            
            job_data = cursor.fetchone()
            if not job_data:
                return {'success': False, 'error': 'Job posting not found'}
            
            # Convert to dict for easier access
            columns = [desc[0] for desc in cursor.description]
            job_dict = dict(zip(columns, job_data))
            
            # Create assessment criteria based on job requirements
            criteria = self._generate_criteria_from_requirements(job_dict)
            
            # Save criteria to database
            self._save_assessment_criteria(job_posting_id, criteria)
            
            conn.close()
            
            return {
                'success': True,
                'job_posting_id': job_posting_id,
                'criteria': criteria,
                'message': 'Assessment criteria created successfully'
            }
            
        except Exception as e:
            logger.error(f"Error creating assessment criteria: {e}")
            return {'success': False, 'error': str(e)}
    
    def _generate_criteria_from_requirements(self, job_data: Dict) -> List[Dict]:
        """Generate assessment criteria based on job posting requirements"""
        criteria = []
        
        # Education criteria
        if job_data.get('education_requirements'):
            criteria.append({
                'name': 'Education',
                'weight': 0.30,
                'description': job_data['education_requirements'],
                'min_score': 0,
                'max_score': 100,
                'type': 'education',
                'evaluation_points': self._parse_education_requirements(job_data['education_requirements'])
            })
        
        # Experience criteria
        if job_data.get('experience_requirements'):
            criteria.append({
                'name': 'Experience',
                'weight': 0.25,
                'description': job_data['experience_requirements'],
                'min_score': 0,
                'max_score': 100,
                'type': 'experience',
                'evaluation_points': self._parse_experience_requirements(job_data['experience_requirements'])
            })
        
        # Training criteria
        if job_data.get('training_requirements'):
            criteria.append({
                'name': 'Training',
                'weight': 0.15,
                'description': job_data['training_requirements'],
                'min_score': 0,
                'max_score': 100,
                'type': 'training',
                'evaluation_points': self._parse_training_requirements(job_data['training_requirements'])
            })
        
        # Eligibility criteria
        if job_data.get('eligibility_requirements'):
            criteria.append({
                'name': 'Eligibility',
                'weight': 0.20,
                'description': job_data['eligibility_requirements'],
                'min_score': 0,
                'max_score': 100,
                'type': 'eligibility',
                'evaluation_points': self._parse_eligibility_requirements(job_data['eligibility_requirements'])
            })
        
        # Additional qualifications
        remaining_weight = 1.0 - sum(c['weight'] for c in criteria)
        if remaining_weight > 0:
            criteria.append({
                'name': 'Additional Qualifications',
                'weight': remaining_weight,
                'description': 'Other relevant qualifications and competencies',
                'min_score': 0,
                'max_score': 100,
                'type': 'additional',
                'evaluation_points': ['Professional licenses', 'Language proficiency', 'Awards and recognition', 'Volunteer work']
            })
        
        return criteria
    
    def _parse_education_requirements(self, education_req: str) -> List[str]:
        """Parse education requirements into evaluation points"""
        points = []
        req_lower = education_req.lower()
        
        if 'bachelor' in req_lower:
            points.append('Bachelor\'s degree in relevant field')
        if 'master' in req_lower:
            points.append('Master\'s degree or units')
        if 'doctorate' in req_lower or 'phd' in req_lower:
            points.append('Doctorate degree')
        if 'license' in req_lower or 'board' in req_lower:
            points.append('Professional license/board certification')
        
        if not points:
            points.append('Minimum educational qualification met')
        
        return points
    
    def _parse_experience_requirements(self, experience_req: str) -> List[str]:
        """Parse experience requirements into evaluation points"""
        points = []
        req_lower = experience_req.lower()
        
        if 'year' in req_lower:
            # Extract years mentioned
            import re
            years = re.findall(r'(\d+)\s*year', req_lower)
            if years:
                points.append(f'Minimum {years[0]} year(s) relevant experience')
        
        if 'teaching' in req_lower:
            points.append('Teaching experience')
        if 'industry' in req_lower or 'professional' in req_lower:
            points.append('Industry/professional experience')
        if 'government' in req_lower or 'public' in req_lower:
            points.append('Government/public sector experience')
        
        if not points:
            points.append('Relevant work experience')
        
        return points
    
    def _parse_training_requirements(self, training_req: str) -> List[str]:
        """Parse training requirements into evaluation points"""
        points = []
        req_lower = training_req.lower()
        
        if 'hour' in req_lower:
            import re
            hours = re.findall(r'(\d+)\s*hour', req_lower)
            if hours:
                points.append(f'Minimum {hours[0]} hours of relevant training')
        
        if 'seminar' in req_lower:
            points.append('Professional seminars attended')
        if 'workshop' in req_lower:
            points.append('Workshops and skill development')
        if 'certification' in req_lower:
            points.append('Professional certifications')
        
        if not points:
            points.append('Professional development activities')
        
        return points
    
    def _parse_eligibility_requirements(self, eligibility_req: str) -> List[str]:
        """Parse eligibility requirements into evaluation points"""
        points = []
        req_lower = eligibility_req.lower()
        
        if 'career service' in req_lower:
            points.append('Career Service Eligibility')
        if 'professional' in req_lower:
            points.append('Professional level eligibility')
        if 'subprofessional' in req_lower:
            points.append('Subprofessional level eligibility')
        if 'first level' in req_lower:
            points.append('First Level Eligibility')
        if 'second level' in req_lower:
            points.append('Second Level Eligibility')
        
        if not points:
            points.append('Civil Service eligibility')
        
        return points
    
    def _save_assessment_criteria(self, job_posting_id: int, criteria: List[Dict]):
        """Save assessment criteria to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Delete existing criteria for this job posting
            cursor.execute("DELETE FROM job_assessment_criteria WHERE job_posting_id = ?", (job_posting_id,))
            
            # Insert new criteria
            for criterion in criteria:
                cursor.execute("""
                    INSERT INTO job_assessment_criteria 
                    (job_posting_id, criteria_name, criteria_weight, min_score, max_score, description)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    job_posting_id,
                    criterion['name'],
                    criterion['weight'],
                    criterion['min_score'],
                    criterion['max_score'],
                    criterion['description']
                ))
            
            conn.commit()
            
        finally:
            conn.close()
    
    def assess_candidate_for_job_posting(self, candidate_id: int, job_posting_id: int) -> Dict:
        """Assess a candidate against a specific job posting"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get candidate data
            cursor.execute("SELECT * FROM candidates WHERE id = ?", (candidate_id,))
            candidate_data = cursor.fetchone()
            if not candidate_data:
                return {'success': False, 'error': 'Candidate not found'}
            
            # Get job posting assessment criteria
            cursor.execute("""
                SELECT * FROM job_assessment_criteria 
                WHERE job_posting_id = ? 
                ORDER BY criteria_name
            """, (job_posting_id,))
            criteria = cursor.fetchall()
            
            if not criteria:
                return {'success': False, 'error': 'No assessment criteria found for this job posting'}
            
            # Convert candidate data to dict
            candidate_columns = [desc[0] for desc in cursor.description if cursor.description]
            cursor.execute("SELECT * FROM candidates WHERE id = ?", (candidate_id,))
            candidate_row = cursor.fetchone()
            candidate_dict = dict(zip(candidate_columns, candidate_row))
            
            # Perform assessment
            assessment_results = self._perform_assessment(candidate_dict, criteria)
            
            # Save assessment results
            self._save_assessment_results(candidate_id, job_posting_id, assessment_results)
            
            conn.close()
            
            return {
                'success': True,
                'candidate_id': candidate_id,
                'job_posting_id': job_posting_id,
                'assessment_results': assessment_results
            }
            
        except Exception as e:
            logger.error(f"Error assessing candidate: {e}")
            return {'success': False, 'error': str(e)}
    
    def _perform_assessment(self, candidate_data: Dict, criteria: List) -> Dict:
        """Perform the actual assessment based on criteria"""
        from assessment_engine import UniversityAssessmentEngine
        
        # Initialize the university assessment engine
        assessment_engine = UniversityAssessmentEngine()
        
        # Get PDS data if available
        pds_data = {}
        if candidate_data.get('pds_data'):
            try:
                pds_data = json.loads(candidate_data['pds_data'])
            except:
                pds_data = {}
        
        # Perform assessment using the existing engine
        assessment_result = assessment_engine.assess_candidate(
            candidate_data['resume_text'] or '',
            pds_data,
            candidate_data.get('processing_type', 'pds')
        )
        
        # Map assessment result to job-specific criteria
        criteria_scores = {}
        total_weighted_score = 0
        
        for criterion_row in criteria:
            criterion_name = criterion_row[2]  # criteria_name
            criterion_weight = criterion_row[3]  # criteria_weight
            
            # Map university assessment components to job criteria
            score = self._map_assessment_to_criterion(
                criterion_name, 
                assessment_result['components'], 
                pds_data
            )
            
            criteria_scores[criterion_name] = {
                'score': score,
                'weight': criterion_weight,
                'weighted_score': score * criterion_weight
            }
            
            total_weighted_score += score * criterion_weight
        
        return {
            'overall_score': round(total_weighted_score, 2),
            'criteria_scores': criteria_scores,
            'assessment_breakdown': assessment_result['components'],
            'recommendation': self._get_recommendation(total_weighted_score),
            'assessment_date': assessment_result.get('assessment_date')
        }
    
    def _map_assessment_to_criterion(self, criterion_name: str, assessment_components: Dict, pds_data: Dict) -> float:
        """Map university assessment components to job-specific criteria"""
        criterion_lower = criterion_name.lower()
        
        if 'education' in criterion_lower:
            return assessment_components.get('education', {}).get('score', 0)
        elif 'experience' in criterion_lower:
            return assessment_components.get('experience', {}).get('score', 0)
        elif 'training' in criterion_lower:
            return assessment_components.get('training', {}).get('score', 0)
        elif 'eligibility' in criterion_lower:
            return assessment_components.get('eligibility', {}).get('score', 0)
        elif 'additional' in criterion_lower or 'qualification' in criterion_lower:
            # Average of remaining components
            other_scores = []
            for key in ['languages', 'awards', 'licenses', 'volunteer_work']:
                if key in assessment_components:
                    other_scores.append(assessment_components[key].get('score', 0))
            return sum(other_scores) / len(other_scores) if other_scores else 50
        else:
            # Default mapping
            return 50
    
    def _get_recommendation(self, score: float) -> str:
        """Get recommendation based on assessment score"""
        if score >= 80:
            return 'Highly Recommended'
        elif score >= 70:
            return 'Recommended'
        elif score >= 60:
            return 'Consider with Reservations'
        else:
            return 'Not Recommended'
    
    def _save_assessment_results(self, candidate_id: int, job_posting_id: int, results: Dict):
        """Save assessment results to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Check if assessment already exists
            cursor.execute("""
                SELECT id FROM job_applications 
                WHERE candidate_id = ? AND job_posting_id = ?
            """, (candidate_id, job_posting_id))
            
            existing = cursor.fetchone()
            
            if existing:
                # Update existing assessment
                cursor.execute("""
                    UPDATE job_applications 
                    SET assessment_score = ?, assessment_breakdown = ?, reviewed_at = CURRENT_TIMESTAMP
                    WHERE candidate_id = ? AND job_posting_id = ?
                """, (
                    results['overall_score'],
                    json.dumps(results),
                    candidate_id,
                    job_posting_id
                ))
            else:
                # Create new application record
                cursor.execute("""
                    INSERT INTO job_applications 
                    (candidate_id, job_posting_id, assessment_score, assessment_breakdown, application_status)
                    VALUES (?, ?, ?, ?, 'assessed')
                """, (
                    candidate_id,
                    job_posting_id,
                    results['overall_score'],
                    json.dumps(results)
                ))
            
            conn.commit()
            
        finally:
            conn.close()
    
    def get_job_posting_applications(self, job_posting_id: int) -> Dict:
        """Get all applications for a specific job posting"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            query = """
                SELECT ja.*, c.name, c.email, c.phone, c.resume_text
                FROM job_applications ja
                JOIN candidates c ON ja.candidate_id = c.id
                WHERE ja.job_posting_id = ?
                ORDER BY ja.assessment_score DESC, ja.applied_at DESC
            """
            
            cursor.execute(query, (job_posting_id,))
            rows = cursor.fetchall()
            
            applications = []
            for row in rows:
                app_data = {
                    'id': row[0],
                    'candidate_id': row[1],
                    'assessment_score': row[3],
                    'status': row[4],
                    'applied_at': row[6],
                    'reviewed_at': row[7],
                    'candidate_name': row[8],
                    'candidate_email': row[9],
                    'candidate_phone': row[10]
                }
                
                # Parse assessment breakdown if available
                if row[5]:  # assessment_breakdown
                    try:
                        app_data['assessment_breakdown'] = json.loads(row[5])
                    except:
                        pass
                
                applications.append(app_data)
            
            conn.close()
            
            return {
                'success': True,
                'job_posting_id': job_posting_id,
                'applications': applications,
                'total_count': len(applications)
            }
            
        except Exception as e:
            logger.error(f"Error getting job applications: {e}")
            return {'success': False, 'error': str(e)}

# Usage example and testing
if __name__ == "__main__":
    integrator = JobPostingAssessmentIntegrator()
    
    # Test creating assessment criteria for a job posting
    result = integrator.create_assessment_criteria_from_job_posting(1)
    print("Assessment criteria creation:", result)
    
    # Test assessing a candidate
    # assessment_result = integrator.assess_candidate_for_job_posting(1, 1)
    # print("Candidate assessment:", assessment_result)