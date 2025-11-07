from flask import Blueprint, request, jsonify, render_template_string, send_file
from lspu_job_template import JobPostingTemplateAPI
import json
import os
from datetime import datetime

# Create Blueprint for job posting routes
job_posting_bp = Blueprint('job_postings', __name__)
template_api = JobPostingTemplateAPI()

@job_posting_bp.route('/api/job-postings', methods=['GET'])
def get_job_postings():
    """Get all job postings with basic info"""
    try:
        import sqlite3
        conn = sqlite3.connect('resume_screening.db')
        cursor = conn.cursor()
        
        query = """
            SELECT jp.id, jp.job_reference_number, jp.position_title, jp.quantity_needed,
                   jp.status, jp.application_deadline, jp.created_at
            FROM lspu_job_postings jp
            ORDER BY jp.created_at DESC
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()
        
        postings = []
        for row in rows:
            postings.append({
                'id': row[0],
                'reference_number': row[1],
                'title': row[2],
                'quantity': row[3],
                'status': row[4],
                'deadline': row[5],
                'created_at': row[6]
            })
        
        conn.close()
        return jsonify({
            'success': True,
            'postings': postings,
            'count': len(postings)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@job_posting_bp.route('/api/job-postings/<int:job_id>', methods=['GET'])
def get_job_posting(job_id):
    """Get detailed job posting data"""
    try:
        job_data = template_api.template_engine.get_job_posting_data(job_id)
        
        if not job_data:
            return jsonify({
                'success': False,
                'error': 'Job posting not found'
            }), 404
        
        return jsonify({
            'success': True,
            'job_posting': job_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@job_posting_bp.route('/api/job-postings/<int:job_id>/preview', methods=['GET'])
def preview_job_posting(job_id):
    """Generate HTML preview of job posting"""
    try:
        html_output = template_api.generate_posting_html(job_id)
        
        if "Job posting not found" in html_output:
            return jsonify({
                'success': False,
                'error': 'Job posting not found'
            }), 404
        
        return jsonify({
            'success': True,
            'html': html_output
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@job_posting_bp.route('/api/job-postings/<int:job_id>/render', methods=['GET'])
def render_job_posting(job_id):
    """Render job posting as HTML page"""
    try:
        html_output = template_api.generate_posting_html(job_id)
        
        if "Job posting not found" in html_output:
            return "Job posting not found", 404
        
        return html_output
        
    except Exception as e:
        return f"Error generating job posting: {str(e)}", 500

@job_posting_bp.route('/api/job-postings/<int:job_id>/export', methods=['GET'])
def export_job_posting(job_id):
    """Export job posting as HTML file"""
    try:
        html_output = template_api.generate_posting_html(job_id)
        
        if "Job posting not found" in html_output:
            return jsonify({
                'success': False,
                'error': 'Job posting not found'
            }), 404
        
        # Save to temp file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'job_posting_{job_id}_{timestamp}.html'
        filepath = os.path.join('temp_uploads', filename)
        
        # Ensure temp directory exists
        os.makedirs('temp_uploads', exist_ok=True)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(html_output)
        
        return send_file(filepath, as_attachment=True, download_name=filename)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@job_posting_bp.route('/api/position-types', methods=['GET'])
def get_position_types():
    """Get available position types"""
    try:
        import sqlite3
        conn = sqlite3.connect('resume_screening.db')
        cursor = conn.cursor()
        
        cursor.execute("SELECT id, name FROM position_types ORDER BY id")
        types = [{'id': row[0], 'name': row[1]} for row in cursor.fetchall()]
        
        conn.close()
        return jsonify({
            'success': True,
            'position_types': types
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Print-optimized template
PRINT_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{job_title}} - LSPU Job Posting</title>
    <style>
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
        
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            background: white;
            color: black;
        }
        
        .posting-container {
            width: 8.5in;
            margin: 0 auto;
            border: 3px solid #1e3a8a;
            border-radius: 20px;
            overflow: hidden;
            page-break-inside: avoid;
        }
        
        .header {
            text-align: center;
            padding: 20px;
            background: linear-gradient(135deg, #e0f2fe 0%, #ffffff 100%);
        }
        
        .logo-circle {
            width: 80px;
            height: 80px;
            margin: 0 auto 15px;
            border-radius: 50%;
            background: #1e3a8a;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 20px;
        }
        
        .hiring-banner {
            background: #1e3a8a;
            color: white;
            padding: 12px 25px;
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 1px;
            margin: 15px 0;
            display: inline-block;
        }
        
        .position-category {
            background: #1e3a8a;
            color: white;
            padding: 8px 20px;
            border-radius: 25px;
            display: inline-block;
            font-weight: bold;
            margin: 10px 0;
        }
        
        .department-office {
            color: #1e3a8a;
            font-size: 22px;
            font-weight: bold;
            margin: 15px 0;
        }
        
        .content {
            padding: 25px;
            line-height: 1.4;
        }
        
        .info-row {
            margin: 12px 0;
            display: flex;
            align-items: flex-start;
        }
        
        .info-label {
            font-weight: bold;
            color: #1e3a8a;
            min-width: 120px;
            margin-right: 10px;
        }
        
        .info-value {
            flex: 1;
        }
        
        .documents-section {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
        }
        
        .documents-list {
            margin: 10px 0;
            padding-left: 20px;
        }
        
        .documents-list li {
            margin: 6px 0;
        }
        
        .footer {
            background: #10b981;
            color: white;
            padding: 20px;
            text-align: center;
        }
        
        .contact-details {
            margin: 10px 0;
            font-weight: bold;
        }
        
        .social-info {
            margin: 15px 0;
            font-size: 14px;
        }
        
        .legal-text {
            font-size: 11px;
            line-height: 1.3;
            margin-top: 15px;
        }
        
        .job-ref {
            text-align: right;
            font-size: 12px;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <!-- Job posting content will be inserted here by the template engine -->
    <div class="posting-container">
        {{content}}
    </div>
</body>
</html>
"""

if __name__ == "__main__":
    # Test the API endpoints
    print("LSPU Job Posting API Blueprint created successfully")
    print("Available endpoints:")
    print("  GET /api/job-postings - List all job postings")
    print("  GET /api/job-postings/<id> - Get job posting details")
    print("  GET /api/job-postings/<id>/preview - Generate HTML preview")
    print("  GET /api/job-postings/<id>/render - Render as HTML page")
    print("  GET /api/job-postings/<id>/export - Export as HTML file")