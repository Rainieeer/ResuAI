"""
LSPU Job Posting Template System
Generates university-style job postings with LSPU branding and formatting
"""

from datetime import datetime, date
import json
import sqlite3
from typing import Dict, List, Optional

class LSPUJobPostingTemplate:
    def __init__(self, db_path: str = 'resume_screening.db'):
        self.db_path = db_path
        
        # Color schemes for different position types
        self.color_schemes = {
            'blue': {
                'primary': '#1e3a8a',
                'secondary': '#3b82f6',
                'banner_bg': '#1e3a8a',
                'banner_text': '#ffffff',
                'footer_bg': '#10b981',
                'footer_text': '#ffffff'
            },
            'teal': {
                'primary': '#0f766e',
                'secondary': '#14b8a6',
                'banner_bg': '#0f766e',
                'banner_text': '#ffffff',
                'footer_bg': '#10b981',
                'footer_text': '#ffffff'
            }
        }
        
    def get_university_config(self) -> Dict:
        """Get university configuration from database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM university_config LIMIT 1")
        config = cursor.fetchone()
        
        if config:
            return {
                'university_name': config[1] or 'Laguna State Polytechnic University',
                'university_logo_url': config[2] or '/static/images/lspu_logo.png',
                'contact_person_name': config[4] or 'MARIO R. BRIONES, EdD',
                'contact_person_title': config[5] or 'University President',
                'university_website': config[6] or 'lspu.edu.ph',
                'facebook_page': config[7] or 'facebook.com/LSPUOfficial',
                'hr_email': config[8] or 'information.office@lspu.edu.ph'
            }
        
        conn.close()
        return {
            'university_name': 'Laguna State Polytechnic University',
            'contact_person_name': 'MARIO R. BRIONES, EdD',
            'contact_person_title': 'University President',
            'university_website': 'lspu.edu.ph',
            'facebook_page': 'facebook.com/LSPUOfficial',
            'hr_email': 'information.office@lspu.edu.ph'
        }
    
    def get_job_posting_data(self, job_id: int) -> Optional[Dict]:
        """Get complete job posting data including requirements"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query = """
            SELECT jp.*
            FROM lspu_job_postings jp
            WHERE jp.id = ?
        """
        
        cursor.execute(query, (job_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return None
            
        # Convert row to dictionary
        columns = [desc[0] for desc in cursor.description]
        job_data = dict(zip(columns, row))
        
        # Get required documents
        cursor.execute("""
            SELECT document_name, document_description
            FROM required_documents_template
            ORDER BY display_order
        """)
        
        documents = []
        for doc_row in cursor.fetchall():
            documents.append({
                'name': doc_row[0],
                'description': doc_row[1]
            })
        
        job_data['required_documents'] = documents
        
        conn.close()
        return job_data
    
    def format_date(self, date_obj) -> str:
        """Format date for display"""
        if isinstance(date_obj, str):
            try:
                date_obj = datetime.strptime(date_obj, '%Y-%m-%d').date()
            except:
                return date_obj
        
        if isinstance(date_obj, (date, datetime)):
            return date_obj.strftime('%B %d, %Y')
        
        return str(date_obj)
    
    def format_salary(self, salary_amount: Optional[float], salary_grade: Optional[int]) -> str:
        """Format salary information"""
        if salary_amount and salary_grade:
            return f"{salary_grade} (₱{salary_amount:,.2f})"
        elif salary_grade:
            return f"{salary_grade}"
        elif salary_amount:
            return f"₱{salary_amount:,.2f}"
        return "To be determined"
    
    def generate_html_template(self, job_id: int) -> str:
        """Generate complete HTML job posting"""
        job_data = self.get_job_posting_data(job_id)
        if not job_data:
            return "<p>Job posting not found.</p>"
            
        config = self.get_university_config()
        colors = self.color_schemes.get(job_data.get('color_scheme', 'blue'), self.color_schemes['blue'])
        
        # Handle deadline formatting
        deadline = self.format_date(job_data.get('application_deadline', ''))
        
        html_template = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{job_data['position_title']} - {config['university_name']}</title>
    <style>
        body {{
            margin: 0;
            padding: 20px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f0f9ff;
            color: #1f2937;
        }}
        
        .job-posting {{
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            border: 3px solid {colors['primary']};
        }}
        
        .header {{
            text-align: center;
            padding: 20px;
            background: linear-gradient(135deg, #e0f2fe 0%, #ffffff 100%);
        }}
        
        .logo {{
            width: 80px;
            height: 80px;
            margin: 0 auto 15px;
            border-radius: 50%;
            background: {colors['primary']};
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 24px;
        }}
        
        .banner {{
            background: {colors['banner_bg']};
            color: {colors['banner_text']};
            padding: 15px 30px;
            text-align: center;
            margin: 20px 0;
        }}
        
        .banner h1 {{
            margin: 0;
            font-size: 28px;
            font-weight: bold;
            letter-spacing: 2px;
        }}
        
        .position-badge {{
            background: {colors['primary']};
            color: white;
            padding: 8px 20px;
            border-radius: 25px;
            display: inline-block;
            font-weight: bold;
            font-size: 14px;
            margin: 10px 0;
        }}
        
        .department-office {{
            color: {colors['primary']};
            font-size: 18px;
            margin: 10px 0;
        }}
        
        .position-title {{
            color: {colors['primary']};
            font-size: 24px;
            font-weight: bold;
            margin: 15px 0;
        }}
        
        .content {{
            padding: 30px;
        }}
        
        .info-section {{
            margin: 20px 0;
        }}
        
        .info-label {{
            font-weight: bold;
            color: {colors['primary']};
            margin-bottom: 5px;
        }}
        
        .info-value {{
            margin-bottom: 15px;
            line-height: 1.5;
        }}
        
        .requirements-list {{
            list-style: none;
            padding: 0;
        }}
        
        .requirements-list li {{
            margin: 8px 0;
            padding-left: 20px;
            position: relative;
        }}
        
        .requirements-list li:before {{
            content: "•";
            color: {colors['primary']};
            font-weight: bold;
            position: absolute;
            left: 0;
        }}
        
        .footer {{
            background: {colors['footer_bg']};
            color: {colors['footer_text']};
            padding: 20px;
            text-align: center;
        }}
        
        .contact-info {{
            margin: 15px 0;
        }}
        
        .social-links {{
            margin-top: 15px;
        }}
        
        .job-reference {{
            text-align: right;
            font-size: 12px;
            color: #666;
            margin-top: 10px;
        }}
        
        .highlight {{
            background: #fef3c7;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            border-left: 4px solid #f59e0b;
        }}
    </style>
</head>
<body>
    <div class="job-posting">
        <div class="header">
            <div class="logo">LSPU</div>
            
            <div class="banner">
                <h1>{job_data.get('banner_text', 'WE ARE HIRING')}</h1>
            </div>
            
            <div class="position-badge">{job_data.get('position_category', 'UNIVERSITY POSITION')}</div>
            <div class="department-office">{job_data.get('department_office', 'LSPU')}</div>
            <div class="position-title">{job_data['position_title']}</div>
        </div>
        
        <div class="content">
            {self._generate_posting_details(job_data)}
            
            <div class="highlight">
                <div class="info-label">How to Apply</div>
                <div class="info-value">
                    Interested and qualified applicants should signify their interest in writing. 
                    Attach the following documents to the application letter and send to the address 
                    below not later than <strong>{deadline}</strong>:
                </div>
                
                <ul class="requirements-list">
                    {self._generate_document_list(job_data.get('required_documents', []))}
                </ul>
                
                <div style="margin-top: 15px;">
                    Qualified applicants are advised to hand in or send through courier/email their application to:
                </div>
            </div>
        </div>
        
        <div class="footer">
            <div class="contact-info">
                <strong>{config['contact_person_name']}</strong><br>
                {config['contact_person_title']}<br>
                {config['university_name']}<br>
                {job_data.get('contact_email', config['hr_email'])}
            </div>
            
            <div class="social-links">
                <span>📘 {config['facebook_page']}</span> | 
                <span>📧 {config['hr_email']}</span> | 
                <span>🌐 {config['university_website']}</span>
            </div>
            
            <div style="margin-top: 15px; font-size: 11px;">
                Note: Applications with incomplete documents shall not be entertained.<br><br>
                {config['university_name']} adheres to the general existing Equal Employment Opportunity 
                Principle (EEOP), as such, there is no discrimination based on gender identity, sexual 
                orientation, disabilities, religion and/or indigenous group membership in the implementation 
                of Human Resource Merit Promotion and Selection. All interested and qualified applicants 
                are encouraged to apply.
            </div>
            
            <div class="job-reference">{job_data.get('job_reference_number', '')}</div>
        </div>
    </div>
</body>
</html>
"""
        return html_template
    
    def _generate_posting_details(self, job_data: Dict) -> str:
        """Generate the main posting details section"""
        details_html = ""
        
        # Add employment period if available
        if job_data.get('employment_period'):
            details_html += f"""
            <div class="info-section">
                <div class="info-label">Period:</div>
                <div class="info-value">{job_data['employment_period']}</div>
            </div>
            """
        
        # Add college/department if available
        if job_data.get('department_office'):
            details_html += f"""
            <div class="info-section">
                <div class="info-label">College(s):</div>
                <div class="info-value">{job_data['department_office']}</div>
            </div>
            """
        
        # Add plantilla info if available
        if job_data.get('plantilla_item_no'):
            details_html += f"""
            <div class="info-section">
                <div class="info-label">Plantilla Item No:</div>
                <div class="info-value">{job_data['plantilla_item_no']}</div>
            </div>
            """
        
        # Add salary grade if available
        if job_data.get('salary_grade') or job_data.get('salary_amount'):
            salary_info = self.format_salary(job_data.get('salary_amount'), job_data.get('salary_grade'))
            details_html += f"""
            <div class="info-section">
                <div class="info-label">Salary Grade:</div>
                <div class="info-value">{salary_info}</div>
            </div>
            """
        
        # Add qualifications
        qualifications = [
            ('Education', job_data.get('education_requirements')),
            ('Training', job_data.get('training_requirements')),
            ('Experience', job_data.get('experience_requirements')),
            ('Eligibility', job_data.get('eligibility_requirements'))
        ]
        
        for label, value in qualifications:
            if value and value.strip():
                details_html += f"""
                <div class="info-section">
                    <div class="info-label">{label}:</div>
                    <div class="info-value">{value}</div>
                </div>
                """
        
        # Add place of assignment if available
        if job_data.get('department_office'):
            details_html += f"""
            <div class="info-section">
                <div class="info-label">Place of Assignment:</div>
                <div class="info-value">{job_data['department_office']}</div>
            </div>
            """
        
        return details_html
    
    def _generate_document_list(self, documents: List[Dict]) -> str:
        """Generate HTML list of required documents"""
        if not documents:
            # Default documents if none specified
            documents = [
                {'name': 'Fully accomplished Personal Data Sheet (PDS)', 'description': 'with recent passport-sized picture'},
                {'name': 'Performance rating', 'description': 'in the last rating period (if applicable)'},
                {'name': 'Photocopy of certificate of eligibility/rating/license', 'description': ''},
                {'name': 'Photocopy of transcript of records', 'description': ''}
            ]
        
        doc_html = ""
        for doc in documents:
            description = f" {doc.get('description', '')}" if doc.get('description') else ""
            doc_html += f"<li>{doc['name']}{description};</li>"
        
        return doc_html

# Template generation API
class JobPostingTemplateAPI:
    def __init__(self, db_path: str = 'resume_screening.db'):
        self.template_engine = LSPUJobPostingTemplate(db_path)
    
    def generate_posting_html(self, job_id: int) -> str:
        """Generate HTML for a job posting"""
        return self.template_engine.generate_html_template(job_id)
    
    def generate_posting_pdf(self, job_id: int, output_path: str = None):
        """Generate PDF from HTML (requires additional libraries)"""
        # This would require pdfkit or weasyprint
        # For now, return HTML that can be printed to PDF
        html = self.generate_posting_html(job_id)
        
        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(html)
            return output_path
        
        return html
    
    def preview_posting(self, job_id: int) -> Dict:
        """Get posting data for preview"""
        job_data = self.template_engine.get_job_posting_data(job_id)
        config = self.template_engine.get_university_config()
        
        return {
            'job_data': job_data,
            'university_config': config,
            'preview_html': self.generate_posting_html(job_id)
        }

if __name__ == "__main__":
    # Test the template system
    api = JobPostingTemplateAPI()
    
    # Generate HTML for the first job posting
    html_output = api.generate_posting_html(1)
    
    # Save to file for testing
    with open('test_job_posting.html', 'w', encoding='utf-8') as f:
        f.write(html_output)
    
    print("✅ Job posting template generated: test_job_posting.html")