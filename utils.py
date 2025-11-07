import re
import os
import json
import spacy
import nltk
import pandas as pd
from typing import List, Dict, Optional, Any, Tuple
from pathlib import Path
from datetime import datetime
from sklearn.metrics.pairwise import cosine_similarity
import logging
import numpy as np
import torch
from transformers import AutoTokenizer, AutoModel, DistilBertTokenizer, DistilBertModel
from sentence_transformers import SentenceTransformer
import faiss

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
try:
    nltk.data.find('averaged_perceptron_tagger')
except LookupError:
    nltk.download('averaged_perceptron_tagger')
try:
    nltk.data.find('maxent_ne_chunker')
except LookupError:
    nltk.download('maxent_ne_chunker')
try:
    nltk.data.find('words')
except LookupError:
    nltk.download('words')

# Load spaCy model
try:
    nlp = spacy.load('en_core_web_sm')
except OSError:
    spacy.cli.download('en_core_web_sm')
    nlp = spacy.load('en_core_web_sm')

class SemanticAnalyzer:
    """
    Advanced semantic analysis using BERT/DistilBERT for better understanding
    of resume content and job requirements matching.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Initialize models
        try:
            # Use sentence-transformers for better semantic similarity
            # Temporarily disabled to avoid network issues during testing
            # self.sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
            self.sentence_model = None  # Temporary disable
            
            # DistilBERT for specific NLP tasks
            # self.tokenizer = DistilBertTokenizer.from_pretrained('distilbert-base-uncased')
            self.bert_model = DistilBertModel.from_pretrained('distilbert-base-uncased')
            
            self.logger.info("Semantic models loaded successfully")
        except Exception as e:
            self.logger.error(f"Error loading semantic models: {str(e)}")
            # Fallback to None - will use traditional methods
            self.sentence_model = None
            self.tokenizer = None
            self.bert_model = None
            
        # Skills synonyms for semantic matching
        self.skill_synonyms = {
            'javascript': ['js', 'ecmascript', 'node.js', 'nodejs'],
            'python': ['py', 'python3', 'django', 'flask'],
            'machine learning': ['ml', 'artificial intelligence', 'ai', 'deep learning'],
            'database': ['db', 'sql', 'mysql', 'postgresql', 'mongodb'],
            'web development': ['frontend', 'backend', 'full-stack', 'web dev'],
            'project management': ['pm', 'scrum master', 'agile', 'team lead'],
            'data analysis': ['analytics', 'data science', 'statistics', 'reporting'],
            'cloud computing': ['aws', 'azure', 'gcp', 'cloud services'],
            'devops': ['ci/cd', 'deployment', 'infrastructure', 'automation'],
            'leadership': ['team lead', 'management', 'supervision', 'mentoring']
        }
        
    def get_semantic_embeddings(self, texts: List[str]) -> np.ndarray:
        """Get semantic embeddings for a list of texts using sentence transformers."""
        if self.sentence_model is None:
            return None
            
        try:
            embeddings = self.sentence_model.encode(texts)
            return embeddings
        except Exception as e:
            self.logger.error(f"Error getting embeddings: {str(e)}")
            return None
    
    def semantic_similarity(self, text1: str, text2: str) -> float:
        """Calculate semantic similarity between two texts."""
        if self.sentence_model is None:
            return 0.0
            
        try:
            embeddings = self.sentence_model.encode([text1, text2])
            similarity = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
            return float(similarity)
        except Exception as e:
            self.logger.error(f"Error calculating semantic similarity: {str(e)}")
            return 0.0
    
  
class PersonalDataSheetProcessor:
    """
    Specialized processor for Personal Data Sheets (PDS) with different scoring criteria
    and evaluation methods compared to traditional resumes.
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Initialize semantic analyzer
        self.semantic_analyzer = SemanticAnalyzer()
        
        self.pds_scoring_criteria = {
            'education': {
                'weight': 0.25,
                'subcriteria': {
                    'relevance': 0.4,
                    'level': 0.3,
                    'institution': 0.2,
                    'grades': 0.1
                }
            },
            'experience': {
                'weight': 0.30,
                'subcriteria': {
                    'relevance': 0.5,
                    'duration': 0.3,
                    'responsibilities': 0.2
                }
            },
            'skills': {
                'weight': 0.20,
                'subcriteria': {
                    'technical_match': 0.6,
                    'certifications': 0.4
                }
            },
            'personal_attributes': {
                'weight': 0.15,
                'subcriteria': {
                    'eligibility': 0.5,
                    'awards': 0.3,
                    'training': 0.2
                }
            },
            'additional_qualifications': {
                'weight': 0.10,
                'subcriteria': {
                    'languages': 0.4,
                    'licenses': 0.3,
                    'volunteer_work': 0.3
                }
            }
        }
    
    
    def extract_pds_data(self, file_path):
        """Extract PDS data using ImprovedPDSExtractor - main extraction method"""
        try:
            logger = self.logger
            logger.info(f"🔍 Extracting PDS data using ImprovedPDSExtractor: {file_path}")
            
            # Use the advanced ImprovedPDSExtractor
            from improved_pds_extractor import ImprovedPDSExtractor
            extractor = ImprovedPDSExtractor()
            
            # Extract structured data
            extracted_data = extractor.extract_pds_data(file_path)
            
            if extracted_data and len(extracted_data) > 0:
                logger.info(f"✅ PDS extraction completed successfully using ImprovedPDSExtractor")
                logger.info(f"📊 Sections extracted: {list(extracted_data.keys())}")
                
                # Log extraction quality
                if extractor.errors:
                    logger.warning(f"⚠️ Extraction errors: {len(extractor.errors)}")
                    for error in extractor.errors:
                        logger.warning(f"   - {error}")
                        
                if extractor.warnings:
                    logger.info(f"ℹ️ Extraction warnings: {len(extractor.warnings)}")
                    
                return extracted_data
            else:
                logger.error("❌ ImprovedPDSExtractor returned empty data")
                return {}
            
        except Exception as e:
            logger.error(f"Error extracting PDS data with ImprovedPDSExtractor: {str(e)}")
            import traceback
            traceback.print_exc()
            return {}

    def _extract_education_from_excel(self, df):
        """Extract educational background from Excel DataFrame"""
        education_data = []
        try:
            # Look for education section markers
            for idx, row in df.iterrows():
                row_str = ' '.join([str(cell) for cell in row if pd.notna(cell)]).upper()
                
                if any(marker in row_str for marker in ['EDUCATIONAL BACKGROUND', 'EDUCATION', 'TERTIARY', 'SECONDARY', 'PRIMARY']):
                    # Found education section, extract data from following rows
                    for i in range(idx + 1, min(idx + 10, len(df))):
                        edu_row = df.iloc[i]
                        edu_values = [str(cell) for cell in edu_row if pd.notna(cell) and str(cell).strip() != '']
                        
                        if len(edu_values) >= 3:
                            education_data.append({
                                'level': edu_values[0] if len(edu_values) > 0 else 'N/A',
                                'school': edu_values[1] if len(edu_values) > 1 else 'N/A',
                                'degree_course': edu_values[2] if len(edu_values) > 2 else 'N/A',
                                'year_graduated': edu_values[3] if len(edu_values) > 3 else 'N/A',
                                'honors': edu_values[4] if len(edu_values) > 4 else 'N/A'
                            })
                    break
        except Exception as e:
            self.logger.warning(f"Error extracting education: {e}")
        
        return education_data

    def _extract_work_experience_from_excel(self, df):
        """Extract work experience from Excel DataFrame"""
        experience_data = []
        try:
            # Look for work experience section
            for idx, row in df.iterrows():
                row_str = ' '.join([str(cell) for cell in row if pd.notna(cell)]).upper()
                
                if any(marker in row_str for marker in ['WORK EXPERIENCE', 'EMPLOYMENT', 'POSITION', 'COMPANY']):
                    # Extract work experience data
                    for i in range(idx + 1, min(idx + 15, len(df))):
                        exp_row = df.iloc[i]
                        exp_values = [str(cell) for cell in exp_row if pd.notna(cell) and str(cell).strip() != '']
                        
                        if len(exp_values) >= 3:
                            experience_data.append({
                                'position': exp_values[0] if len(exp_values) > 0 else 'N/A',
                                'company': exp_values[1] if len(exp_values) > 1 else 'N/A',
                                'date_from': exp_values[2] if len(exp_values) > 2 else 'N/A',
                                'date_to': exp_values[3] if len(exp_values) > 3 else 'N/A',
                                'salary': exp_values[4] if len(exp_values) > 4 else 'N/A',
                                'grade': exp_values[5] if len(exp_values) > 5 else 'N/A'
                            })
                    break
        except Exception as e:
            self.logger.warning(f"Error extracting work experience: {e}")
        
        return experience_data

    def _extract_training_from_excel(self, df):
        """Extract training and development from Excel DataFrame"""
        training_data = []
        try:
            # Look for training/learning development section
            for idx, row in df.iterrows():
                row_str = ' '.join([str(cell) for cell in row if pd.notna(cell)]).upper()
                
                if any(marker in row_str for marker in ['LEARNING AND DEVELOPMENT', 'TRAINING', 'SEMINAR', 'WORKSHOP']):
                    # Extract training data
                    for i in range(idx + 1, min(idx + 20, len(df))):
                        train_row = df.iloc[i]
                        train_values = [str(cell) for cell in train_row if pd.notna(cell) and str(cell).strip() != '']
                        
                        if len(train_values) >= 2:
                            hours = 0
                            try:
                                hours = float(train_values[2]) if len(train_values) > 2 else 0
                            except:
                                hours = 0
                            
                            training_data.append({
                                'title': train_values[0] if len(train_values) > 0 else 'N/A',
                                'conductor': train_values[1] if len(train_values) > 1 else 'N/A',
                                'hours': hours,
                                'type': train_values[3] if len(train_values) > 3 else 'N/A'
                            })
                    break
        except Exception as e:
            self.logger.warning(f"Error extracting training: {e}")
        
        return training_data

    def _extract_eligibility_from_excel(self, df):
        """Extract civil service eligibility from Excel DataFrame"""
        eligibility_data = []
        try:
            # Look for eligibility section
            for idx, row in df.iterrows():
                row_str = ' '.join([str(cell) for cell in row if pd.notna(cell)]).upper()
                
                if any(marker in row_str for marker in ['CIVIL SERVICE ELIGIBILITY', 'ELIGIBILITY', 'CAREER SERVICE']):
                    # Extract eligibility data
                    for i in range(idx + 1, min(idx + 10, len(df))):
                        elig_row = df.iloc[i]
                        elig_values = [str(cell) for cell in elig_row if pd.notna(cell) and str(cell).strip() != '']
                        
                        if len(elig_values) >= 2:
                            eligibility_data.append({
                                'eligibility': elig_values[0] if len(elig_values) > 0 else 'N/A',
                                'rating': elig_values[1] if len(elig_values) > 1 else 'N/A',
                                'date_exam': elig_values[2] if len(elig_values) > 2 else 'N/A',
                                'place_exam': elig_values[3] if len(elig_values) > 3 else 'N/A'
                            })
                    break
        except Exception as e:
            self.logger.warning(f"Error extracting eligibility: {e}")
        
        return eligibility_data

    def process_excel_pds_file(self, file_path, filename, job=None):
        """Process Excel PDS file using ImprovedPDSExtractor and return formatted candidate data"""
        try:
            # Extract PDS data using ImprovedPDSExtractor
            extracted_data = self.extract_pds_data(file_path)
            
            if extracted_data:
                # Convert to assessment format using the improved converter
                from improved_pds_converter import convert_improved_pds_to_assessment_format
                converted_data = convert_improved_pds_to_assessment_format(extracted_data)
                
                # Get basic info
                basic_info = converted_data.get('basic_info', {})
                
                # Return properly formatted candidate data that matches what create_candidate expects
                # Note: scores will be calculated by assessment engines in app.py
                return {
                    'name': basic_info.get('name', 'Unknown Candidate'),
                    'email': basic_info.get('email', ''),
                    'phone': basic_info.get('phone', ''),
                    'category': 'PDS',
                    'skills': [],
                    'education': converted_data.get('education', []),
                    'experience': converted_data.get('experience', []),
                    'status': 'new',
                    'score': 0,  # Will be calculated by assessment engines
                    'processing_type': 'pds',
                    'job_id': job.get('id') if job else None,
                    # PDS-specific fields - store ALL the structured data
                    'pds_data': converted_data,
                    'eligibility': converted_data.get('eligibility', []),
                    'training': converted_data.get('training', []),
                    'volunteer_work': converted_data.get('volunteer_work', []),
                    'personal_references': extracted_data.get('other_information', {}).get('references', []),
                    'government_ids': basic_info.get('government_ids', {}),
                    'ocr_confidence': None,
                    'pds_extracted_data': extracted_data,  # Store raw extracted data
                    'total_education_entries': len(converted_data.get('education', [])),
                    'total_work_positions': len(converted_data.get('experience', [])),
                    'extraction_status': 'completed',
                    'uploaded_filename': filename,
                    'latest_total_score': 0,  # Will be calculated by assessment engines
                    'latest_percentage_score': 0,  # Will be calculated by assessment engines
                    'latest_recommendation': 'Pending Assessment',
                    'percentage_score': 0  # Will be calculated by assessment engines
                }
            else:
                self.logger.warning(f"No data extracted from Excel file: {filename}")
                return None
                
        except Exception as e:
            self.logger.error(f"Error processing Excel PDS file {filename}: {e}")
            import traceback
            traceback.print_exc()
            return None

    def _extract_voluntary_work_from_excel(self, df):
        """Extract voluntary work from Excel DataFrame"""
        voluntary_data = []
        try:
            # Look for voluntary work section
            for idx, row in df.iterrows():
                row_str = ' '.join([str(cell) for cell in row if pd.notna(cell)]).upper()
                
                if any(marker in row_str for marker in ['VOLUNTARY WORK', 'VOLUNTEER', 'COMMUNITY SERVICE']):
                    # Extract voluntary work data
                    for i in range(idx + 1, min(idx + 10, len(df))):
                        vol_row = df.iloc[i]
                        vol_values = [str(cell) for cell in vol_row if pd.notna(cell) and str(cell).strip() != '']
                        
                        if len(vol_values) >= 2:
                            hours = 0
                            try:
                                hours = float(vol_values[2]) if len(vol_values) > 2 else 0
                            except:
                                hours = 0
                            
                            voluntary_data.append({
                                'organization': vol_values[0] if len(vol_values) > 0 else 'N/A',
                                'position': vol_values[1] if len(vol_values) > 1 else 'N/A',
                                'hours': hours
                            })
                    break
        except Exception as e:
            self.logger.warning(f"Error extracting voluntary work: {e}")
        
        return voluntary_data

    def process_pds_candidate(self, content):
        """Process PDS candidate and extract relevant information."""
        try:
            # Extract basic information
            candidate_info = self.extract_basic_info(content)
            
            # Extract education with structured format
            education = self.extract_education_pds(content)
            
            # Extract work experience
            experience = self.extract_experience_pds(content)
            
            # Extract skills and competencies
            skills = self.extract_skills_pds(content)
            
            return {
                'basic_info': candidate_info,
                'education': education,
                'experience': experience,
                'skills': skills,
                'raw_content': content
            }
            
        except Exception as e:
            self.logger.error(f"Error processing PDS candidate: {str(e)}")
            return {}
    
    def convert_pds_to_candidate_format(self, pds_data):
        """Convert PDS data to standardized candidate format."""
        try:
            basic_info = pds_data.get('basic_info', {})
            education = pds_data.get('education', [])
            experience = pds_data.get('experience', [])
            skills = pds_data.get('skills', [])
            
            # Format education for display
            education_text = ""
            if education:
                for edu in education:
                    if isinstance(edu, dict):
                        degree = edu.get('degree', '')
                        school = edu.get('school', '')
                        year = edu.get('year', '')
                        education_text += f"{degree} from {school} ({year})\n"
                    else:
                        education_text += f"{edu}\n"
            
            # Format experience for display
            experience_text = ""
            if experience:
                for exp in experience:
                    if isinstance(exp, dict):
                        position = exp.get('position', '')
                        company = exp.get('company', '')
                        duration = exp.get('duration', '')
                        experience_text += f"{position} at {company} ({duration})\n"
                    else:
                        experience_text += f"{exp}\n"
            
            # Format skills
            skills_text = ", ".join(skills) if isinstance(skills, list) else str(skills)
            
            return {
                'name': basic_info.get('name', 'N/A'),
                'email': basic_info.get('email', 'N/A'),
                'phone': basic_info.get('phone', 'N/A'),
                'education': education_text.strip(),
                'experience': experience_text.strip(),
                'skills': skills_text,
                'additional_info': basic_info
            }
            
        except Exception as e:
            self.logger.error(f"Error converting PDS to candidate format: {str(e)}")
            return {}
    
    def preprocess_text(self, text):
        """Preprocess text for analysis."""
        if not text:
            return ""
        
        # Convert to lowercase and remove extra whitespace
        text = re.sub(r'\s+', ' ', text.lower().strip())
        
        # Remove special characters but keep important punctuation
        text = re.sub(r'[^\w\s\-\+\#\.\@\%]', ' ', text)
        
        return text

    
    def extract_pds_information(self, text: str, filename: str = "") -> Dict[str, Any]:
        """Extract comprehensive information from a Personal Data Sheet."""
        try:
            # Check if this is a Philippine Civil Service Commission format
            is_csc_format = self._is_csc_format(text)
            
            # Basic information
            basic_info = self.extract_basic_info(text)
            
            # Enhanced PDS-specific extraction
            pds_data = {
                'filename': filename,
                'is_csc_format': is_csc_format,
                'basic_info': basic_info,
                'personal_information': self.extract_personal_information_pds(text),
                'family_background': self.extract_family_background(text),
                'education': self.extract_education_detailed(text),
                'experience': self.extract_experience_detailed(text),
                'skills': self.extract_skills_categorized(text),
                'certifications': self.extract_certifications(text),
                'training': self.extract_training_seminars(text),
                'awards': self.extract_awards_recognition(text),
                'eligibility': self.extract_civil_service_eligibility(text),
                'languages': self.extract_language_proficiency(text),
                'licenses': self.extract_licenses(text),
                'volunteer_work': self.extract_volunteer_work(text),
                'personal_references': self.extract_references(text),
                'government_id': self.extract_government_ids(text),
                'other_information': self.extract_other_information(text)
            }
            
            # Apply CSC-specific parsing if detected
            if is_csc_format:
                pds_data = self._enhance_csc_parsing(pds_data, text)
            
            return pds_data
            
        except Exception as e:
            self.logger.error(f"Error extracting PDS information: {str(e)}")
            return {'error': str(e)}
    
    def extract_skills_categorized(self, text: str) -> Dict[str, List[str]]:
        """Extract skills and categorize them for PDS analysis."""
        # Use the parent class's extract_skills method
        all_skills = self.extract_skills(text)
        
        # Categorize skills
        categorized = {
            'technical': [],
            'soft': [],
            'language': [],
            'certifications': []
        }
        
        # Technical skills keywords
        technical_keywords = ['python', 'java', 'javascript', 'sql', 'html', 'css', 'react', 'angular', 'vue', 
                            'node.js', 'django', 'flask', 'spring', 'docker', 'kubernetes', 'aws', 'azure', 
                            'git', 'linux', 'windows', 'mysql', 'postgresql', 'mongodb', 'excel', 'powerpoint',
                            'photoshop', 'autocad', 'microsoft office', 'data analysis', 'machine learning']
        
        # Soft skills keywords
        soft_keywords = ['leadership', 'communication', 'teamwork', 'problem solving', 'time management',
                        'project management', 'analytical', 'creative', 'adaptable', 'organized']
        
        # Language keywords
        language_keywords = ['english', 'filipino', 'tagalog', 'spanish', 'chinese', 'japanese', 'korean']
        
        for skill in all_skills:
            skill_lower = skill.lower()
            
            # Check if it's a technical skill
            if any(tech in skill_lower for tech in technical_keywords):
                categorized['technical'].append(skill)
            # Check if it's a soft skill
            elif any(soft in skill_lower for soft in soft_keywords):
                categorized['soft'].append(skill)
            # Check if it's a language skill
            elif any(lang in skill_lower for lang in language_keywords):
                categorized['language'].append(skill)
            else:
                # Default to technical if uncertain
                categorized['technical'].append(skill)
        
        return categorized
    
    def _is_csc_format(self, text: str) -> bool:
        """Detect if the PDS follows Philippine Civil Service Commission format."""
        csc_indicators = [
            'CS Form No. 212',
            'Personal Data Sheet',
            'Civil Service Commission',
            'Republic of the Philippines',
            'PERSONAL INFORMATION',
            'FAMILY BACKGROUND',
            'EDUCATIONAL BACKGROUND',
            'CIVIL SERVICE ELIGIBILITY',
            'WORK EXPERIENCE',
            'VOLUNTARY WORK',
            'LEARNING AND DEVELOPMENT',
            'OTHER INFORMATION'
        ]
        
        matches = sum(1 for indicator in csc_indicators if indicator.lower() in text.lower())
        return matches >= 3  # If at least 3 indicators are found
    
    
    def extract_education_detailed(self, text: str) -> List[Dict[str, Any]]:
        """Extract detailed education information specific to PDS format."""
        education_list = []
        
        # Enhanced patterns for PDS education format
        education_patterns = [
            # Standard format: Degree, Institution, Year, GPA/Honors
            r'(?:Bachelor|Master|PhD|Doctorate|BS|BA|MS|MA|BSc|MSc|BSIT|BSCS|MIT|MBA)\s+(?:of|in|degree in)?\s*([^,\n]+),?\s*([^,\n]+),?\s*(\d{4})\s*(?:GPA[:\s]*([0-9.]+)|([^,\n]*honors?))?',
            
            # Alternative format with dates
            r'([^,\n]+)\s*-\s*([^,\n]+)\s*\((\d{4})\s*-?\s*(\d{4})?\)',
            
            # Simple format
            r'Education[:\s]*([^,\n]+),?\s*([^,\n]+),?\s*(\d{4})'
        ]
        
        for pattern in education_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
            for match in matches:
                if len(match) >= 3:
                    education_entry = {
                        'degree': match[0].strip(),
                        'institution': match[1].strip(),
                        'year': match[2],
                        'gpa': match[3] if len(match) > 3 and match[3] else None,
                        'honors': match[4] if len(match) > 4 and match[4] else None
                    }
                    education_list.append(education_entry)
        
        return education_list
    
    def extract_experience_detailed(self, text: str) -> List[Dict[str, Any]]:
        """Extract detailed work experience information from PDS."""
        experience_list = []
        
        # Enhanced patterns for work experience
        experience_patterns = [
            # Standard format: Position, Company, Start-End dates
            r'(?:Position|Job Title|Work)\s*:?\s*([^,\n]+),?\s*([^,\n]+),?\s*(\d{4})\s*-\s*(\d{4}|present|current)',
            
            # Alternative format
            r'([^,\n]+)\s*-\s*([^,\n]+)\s*\((\d{4})\s*-\s*(\d{4}|present|current)\)',
            
            # Simple format with company
            r'([A-Za-z\s]+),\s*([A-Za-z\s&.,]+),?\s*(\d{4})\s*-?\s*(\d{4}|present|current)?'
        ]
        
        for pattern in experience_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
            for match in matches:
                if len(match) >= 3:
                    start_year = int(match[2]) if match[2].isdigit() else None
                    end_year = datetime.now().year if match[3].lower() in ['present', 'current'] else (int(match[3]) if match[3].isdigit() else None)
                    
                    experience_entry = {
                        'position': match[0].strip(),
                        'company': match[1].strip(),
                        'start_year': start_year,
                        'end_year': end_year,
                        'duration_years': (end_year - start_year) if start_year and end_year else None,
                        'description': ''  # Could be enhanced to extract job descriptions
                    }
                    experience_list.append(experience_entry)
        
        return experience_list
    
    def extract_certifications(self, text: str) -> List[Dict[str, Any]]:
        """Extract certifications and professional licenses."""
        certifications = []
        
        # Patterns for certifications
        cert_patterns = [
            r'(?:Certification|Certificate|Certified|License)\s*:?\s*([^,\n]+)(?:,\s*(\d{4}|\w+\s+\d{4}))?',
            r'([A-Z]{2,})\s+(?:Certification|Certificate|Certified)(?:\s*-\s*(\d{4}))?',
            r'Professional\s+License\s*:?\s*([^,\n]+)'
        ]
        
        for pattern in cert_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                cert_name = match[0] if isinstance(match, tuple) else match
                issue_date = match[1] if isinstance(match, tuple) and len(match) > 1 else None
                
                certifications.append({
                    'name': cert_name.strip(),
                    'issue_date': issue_date,
                    'type': 'certification'
                })
        
        return certifications
    
    def extract_civil_service_eligibility(self, text: str) -> List[Dict[str, Any]]:
        """Extract civil service eligibility information."""
        eligibility_list = []
        
        eligibility_patterns = [
            r'(?:Civil\s+Service|CSE|Career\s+Service)\s+(?:Eligibility|Examination|Exam)\s*:?\s*([^,\n]+)(?:,\s*(\d{4}))?',
            r'Eligibility\s*:?\s*([^,\n]*(?:Professional|Sub-professional|Career\s+Service)[^,\n]*)',
            r'(?:Professional|Sub-professional)\s+(?:Board|Examination|Exam)\s*:?\s*([^,\n]+)'
        ]
        
        for pattern in eligibility_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                eligibility_name = match[0] if isinstance(match, tuple) else match
                exam_date = match[1] if isinstance(match, tuple) and len(match) > 1 else None
                
                eligibility_list.append({
                    'type': eligibility_name.strip(),
                    'date_taken': exam_date,
                    'status': 'passed'  # Assuming passed if listed
                })
        
        return eligibility_list
    
    def extract_training_seminars(self, text: str) -> List[Dict[str, Any]]:
        """Extract training programs and seminars attended."""
        training_list = []
        
        training_patterns = [
            r'(?:Training|Seminar|Workshop|Course)\s*:?\s*([^,\n]+)(?:,\s*([^,\n]+))(?:,\s*(\d{4}|\w+\s+\d{4}))?',
            r'([^,\n]+)\s+(?:Training|Seminar|Workshop)\s*(?:-\s*([^,\n]+))?(?:,\s*(\d{4}))?'
        ]
        
        for pattern in training_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                training_name = match[0].strip()
                provider = match[1].strip() if len(match) > 1 and match[1] else None
                date = match[2] if len(match) > 2 and match[2] else None
                
                training_list.append({
                    'name': training_name,
                    'provider': provider,
                    'date': date,
                    'type': 'training'
                })
        
        return training_list
    
    def extract_awards_recognition(self, text: str) -> List[Dict[str, Any]]:
        """Extract awards and recognition."""
        awards_list = []
        
        award_patterns = [
            r'(?:Award|Recognition|Honor|Achievement)\s*:?\s*([^,\n]+)(?:,\s*(\d{4}|\w+\s+\d{4}))?',
            r'([^,\n]*(?:Award|Prize|Medal|Honor)[^,\n]*)(?:,\s*(\d{4}))?'
        ]
        
        for pattern in award_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                award_name = match[0] if isinstance(match, tuple) else match
                year = match[1] if isinstance(match, tuple) and len(match) > 1 else None
                
                awards_list.append({
                    'name': award_name.strip(),
                    'year': year,
                    'type': 'award'
                })
        
        return awards_list
    
    def extract_language_proficiency(self, text: str) -> List[Dict[str, Any]]:
        """Extract language proficiency information."""
        languages = []
        
        # Common languages and proficiency levels
        common_languages = ['English', 'Filipino', 'Tagalog', 'Spanish', 'Chinese', 'Japanese', 'Korean', 'French', 'German']
        proficiency_levels = ['Native', 'Fluent', 'Proficient', 'Intermediate', 'Basic', 'Conversational']
        
        language_patterns = [
            r'(?:Language|Languages)\s*:?\s*([^,\n]+)',
            r'([A-Za-z]+)\s*[-:]\s*(Native|Fluent|Proficient|Intermediate|Basic|Conversational)',
            r'(English|Filipino|Tagalog|Spanish|Chinese|Japanese|Korean|French|German)\s*[-:]?\s*(Native|Fluent|Proficient|Intermediate|Basic|Conversational)?'
        ]
        
        for pattern in language_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    language = match[0].strip()
                    proficiency = match[1].strip() if len(match) > 1 and match[1] else 'Proficient'
                else:
                    language = match.strip()
                    proficiency = 'Proficient'
                
                if language in common_languages:
                    languages.append({
                        'language': language,
                        'proficiency': proficiency
                    })
        
        return languages
    
    def extract_licenses(self, text: str) -> List[Dict[str, Any]]:
        """Extract professional licenses."""
        licenses = []
        
        license_patterns = [
            r'(?:License|Licensed)\s*:?\s*([^,\n]+)(?:,?\s*License\s*No\.?\s*([A-Z0-9\-]+))?(?:,?\s*(\d{4}))?',
            r'([A-Z]{2,})\s+License(?:\s*No\.?\s*([A-Z0-9\-]+))?(?:,?\s*(\d{4}))?'
        ]
        
        for pattern in license_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                license_type = match[0].strip()
                license_number = match[1] if len(match) > 1 and match[1] else None
                issue_year = match[2] if len(match) > 2 and match[2] else None
                
                licenses.append({
                    'type': license_type,
                    'number': license_number,
                    'issue_year': issue_year
                })
        
        return licenses
    
    def extract_volunteer_work(self, text: str) -> List[Dict[str, Any]]:
        """Extract volunteer work and community service."""
        volunteer_work = []
        
        volunteer_patterns = [
            r'(?:Volunteer|Community\s+Service|Civic\s+Activities)\s*:?\s*([^,\n]+)(?:,\s*([^,\n]+))?(?:,\s*(\d{4}))?',
            r'([^,\n]+)\s*-\s*Volunteer(?:\s*at\s*([^,\n]+))?(?:,\s*(\d{4}))?'
        ]
        
        for pattern in volunteer_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                activity = match[0].strip()
                organization = match[1].strip() if len(match) > 1 and match[1] else None
                year = match[2] if len(match) > 2 and match[2] else None
                
                volunteer_work.append({
                    'activity': activity,
                    'organization': organization,
                    'year': year
                })
        
        return volunteer_work
    
    def extract_references(self, text: str) -> List[Dict[str, Any]]:
        """Extract personal references."""
        references = []
        
        # Look for reference section
        reference_section = re.search(r'(?:References?|Character\s+References?)\s*:?\s*(.*?)(?:\n\n|\Z)', text, re.IGNORECASE | re.DOTALL)
        
        if reference_section:
            ref_text = reference_section.group(1)
            
            # Pattern for name, position, contact
            ref_patterns = [
                r'([A-Za-z\s\.]+),?\s*([^,\n]+),?\s*([0-9\-\+\(\)\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})',
                r'([A-Za-z\s\.]+)\s*-\s*([^,\n]+)'
            ]
            
            for pattern in ref_patterns:
                matches = re.findall(pattern, ref_text, re.IGNORECASE)
                for match in matches:
                    name = match[0].strip()
                    position = match[1].strip() if len(match) > 1 else None
                    contact = match[2].strip() if len(match) > 2 else None
                    
                    # Validate the reference data
                    if self._is_valid_reference_name_text(name):
                        if position and self._is_valid_reference_data_text(position):
                            references.append({
                                'name': name,
                                'position': position,
                                'contact': contact
                            })
                        else:
                            # Skip if position contains government ID info
                            continue
        
        return references
    
    def _is_valid_reference_name_text(self, name: str) -> bool:
        """Check if text is a valid reference name (text extraction version)"""
        if not name or len(name.strip()) < 3:
            return False
            
        name = name.strip()
        
        # Check for valid name patterns
        valid_patterns = [
            r'^(Prof\.|Dr\.|Mr\.|Mrs\.|Ms\.)?\s*[A-Z][a-z]+\s+[A-Z][a-z]+',
            r'^[A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+',
            r'^[A-Z][A-Z\s]+$'
        ]
        
        for pattern in valid_patterns:
            if re.match(pattern, name):
                return True
        
        return False
    
    def _is_valid_reference_data_text(self, text: str) -> bool:
        """Check if text is valid reference data (not government ID info)"""
        if not text:
            return True
            
        text_lower = text.lower()
        
        # Reject government ID patterns
        reject_patterns = [
            r'government\s+issued\s+id',
            r'sss\s*:?\s*\d*',
            r'tin\s*:?\s*\d*',
            r'philhealth\s*:?\s*\d*',
            r'pag-?ibig\s*:?\s*\d*',
            r'id\s*:?\s*(sss|tin|philhealth)'
        ]
        
        for pattern in reject_patterns:
            if re.search(pattern, text_lower):
                return False
        
        return True
    
    def extract_government_ids(self, text: str) -> Dict[str, str]:
        """Extract government ID numbers."""
        gov_ids = {}
        
        id_patterns = {
            'sss': r'(?:SSS|Social\s+Security)\s*(?:No\.?|Number)\s*:?\s*([0-9\-]+)',
            'tin': r'(?:TIN|Tax\s+Identification)\s*(?:No\.?|Number)\s*:?\s*([0-9\-]+)',
            'philhealth': r'(?:PhilHealth|Phil\s*Health)\s*(?:No\.?|Number)\s*:?\s*([0-9\-]+)',
            'pagibig': r'(?:Pag-IBIG|HDMF)\s*(?:No\.?|Number)\s*:?\s*([0-9\-]+)',
            'passport': r'(?:Passport)\s*(?:No\.?|Number)\s*:?\s*([A-Z0-9]+)',
            'drivers_license': r'(?:Driver\'?s?\s+License|DL)\s*(?:No\.?|Number)\s*:?\s*([A-Z0-9\-]+)'
        }
        
        for id_type, pattern in id_patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                gov_ids[id_type] = match.group(1).strip()
        
        return gov_ids
    
    def score_pds_against_job(self, pds_data: Dict[str, Any], job_requirements: Dict[str, Any]) -> Dict[str, Any]:
        """Score a Personal Data Sheet against job requirements using configurable criteria."""
        try:
            scores = {}
            total_score = 0
            
            # Education scoring
            education_score = self._score_education(pds_data.get('education', []), job_requirements)
            scores['education'] = education_score
            total_score += education_score * self.pds_scoring_criteria['education']['weight']
            
            # Experience scoring
            experience_score = self._score_experience(pds_data.get('experience', []), job_requirements)
            scores['experience'] = experience_score
            total_score += experience_score * self.pds_scoring_criteria['experience']['weight']
            
            # Skills scoring
            skills_score = self._score_skills_pds(pds_data.get('skills', {}), job_requirements)
            scores['skills'] = skills_score
            total_score += skills_score * self.pds_scoring_criteria['skills']['weight']
            
            # Personal attributes scoring
            personal_score = self._score_personal_attributes(pds_data, job_requirements)
            scores['personal_attributes'] = personal_score
            total_score += personal_score * self.pds_scoring_criteria['personal_attributes']['weight']
            
            # Additional qualifications scoring
            additional_score = self._score_additional_qualifications(pds_data, job_requirements)
            scores['additional_qualifications'] = additional_score
            total_score += additional_score * self.pds_scoring_criteria['additional_qualifications']['weight']
            
            return {
                'total_score': round(total_score, 2),
                'category_scores': scores,
                'scoring_breakdown': self._generate_scoring_breakdown(scores, pds_data, job_requirements)
            }
            
        except Exception as e:
            self.logger.error(f"Error scoring PDS: {str(e)}")
            return {'total_score': 0, 'error': str(e)}
    
    def _score_education(self, education_list: List[Dict], job_requirements: Dict) -> float:
        """Score education based on relevance, level, and institution."""
        if not education_list:
            return 0
        
        required_education = job_requirements.get('education_level', '').lower()
        preferred_field = job_requirements.get('preferred_field', '').lower()
        
        max_score = 0
        for edu in education_list:
            score = 0
            degree = edu.get('degree', '').lower()
            
            # Education level scoring
            if 'phd' in degree or 'doctorate' in degree:
                level_score = 100
            elif 'master' in degree or 'ms' in degree or 'ma' in degree:
                level_score = 85
            elif 'bachelor' in degree or 'bs' in degree or 'ba' in degree:
                level_score = 70
            else:
                level_score = 50
            
            # Field relevance scoring
            relevance_score = 70  # Base score
            if preferred_field and preferred_field in degree:
                relevance_score = 100
            
            # Institution scoring (simplified)
            institution_score = 75  # Base score for any accredited institution
            
            # Grades scoring
            grades_score = 75  # Base score
            if edu.get('honors'):
                grades_score = 90
            if edu.get('gpa') and float(edu.get('gpa', 0)) >= 3.5:
                grades_score = max(grades_score, 85)
            
            # Weighted calculation
            weighted_score = (
                relevance_score * 0.4 +
                level_score * 0.3 +
                institution_score * 0.2 +
                grades_score * 0.1
            )
            
            max_score = max(max_score, weighted_score)
        
        return max_score
    
    def _score_experience(self, experience_list: List[Dict], job_requirements: Dict) -> float:
        """Score work experience based on relevance and duration."""
        if not experience_list:
            return 0
        
        required_years = job_requirements.get('experience_years', 0)
        relevant_keywords = job_requirements.get('relevant_experience', [])
        
        total_years = 0
        relevance_score = 0
        
        for exp in experience_list:
            # Calculate years of experience
            start_year = exp.get('start_year', 0)
            end_year = exp.get('end_year', datetime.now().year)
            if start_year:
                years = end_year - start_year
                total_years += years
            
            # Check relevance
            job_title = exp.get('position', '').lower()
            company = exp.get('company', '').lower()
            description = exp.get('description', '').lower()
            
            exp_text = f"{job_title} {company} {description}"
            keyword_matches = sum(1 for keyword in relevant_keywords if keyword.lower() in exp_text)
            
            if keyword_matches > 0:
                relevance_score = max(relevance_score, min(100, keyword_matches * 25))
        
        # Duration scoring
        duration_score = min(100, (total_years / max(required_years, 1)) * 100)
        
        # Responsibilities scoring (simplified)
        responsibilities_score = 75  # Base score
        
        return (
            relevance_score * 0.5 +
            duration_score * 0.3 +
            responsibilities_score * 0.2
        )
    
   
    
    