CREATE TABLE IF NOT EXISTS job_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT NOT NULL,
    experience_level VARCHAR(20) NOT NULL DEFAULT 'mid',
    category_id INTEGER REFERENCES job_categories(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    username VARCHAR(50), -- Added for compatibility
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- CANDIDATES TABLE (Enhanced with all PDS fields)
-- =============================================================================

-- Main candidates table with all PDS and resume fields
CREATE TABLE IF NOT EXISTS candidates (
    id SERIAL PRIMARY KEY,
    
    -- Basic Information
    name VARCHAR(100),
    email VARCHAR(120),
    phone VARCHAR(20),
    linkedin VARCHAR(200),
    github VARCHAR(200),
    
    -- Job and Status
    job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
    score FLOAT DEFAULT 0.0,
    status VARCHAR(20) DEFAULT 'new',
    category VARCHAR(50),
    notes TEXT,
    
    -- Structured Data (JSONB for flexibility)
    education JSONB DEFAULT '[]'::jsonb,
    experience JSONB DEFAULT '[]'::jsonb,
    
    -- PDS-specific fields
    pds_data JSONB, -- Store comprehensive PDS information
    pds_extracted_data JSONB, -- Alternative field name used in some files
    certifications JSONB DEFAULT '[]'::jsonb,
    training JSONB DEFAULT '[]'::jsonb,
    awards JSONB DEFAULT '[]'::jsonb,
    eligibility JSONB DEFAULT '[]'::jsonb,
    languages JSONB DEFAULT '[]'::jsonb,
    licenses JSONB DEFAULT '[]'::jsonb,
    volunteer_work JSONB DEFAULT '[]'::jsonb,
    personal_references JSONB DEFAULT '[]'::jsonb,
    government_ids JSONB DEFAULT '{}'::jsonb,
    
    -- Scoring and Assessment
    scoring_breakdown JSONB,
    matched_qualifications JSONB,
    areas_for_improvement JSONB,
    
    -- Processing metadata
    processing_type VARCHAR(20) DEFAULT 'resume', -- 'resume', 'pds', 'ocr'
    extraction_status VARCHAR(50) DEFAULT 'pending',
    extraction_success BOOLEAN DEFAULT TRUE,
    extraction_errors JSONB,
    processing_notes TEXT,
    uploaded_filename VARCHAR(255),
    ocr_confidence FLOAT,
    
    -- Enhanced Assessment Fields
    total_education_entries INTEGER DEFAULT 0,
    total_work_positions INTEGER DEFAULT 0,
    total_training_hours DECIMAL(10,2) DEFAULT 0,
    years_total_experience DECIMAL(5,2) DEFAULT 0,
    years_of_experience INTEGER DEFAULT 0,
    government_service_years INTEGER DEFAULT 0,
    civil_service_eligible BOOLEAN DEFAULT FALSE,
    highest_education VARCHAR(100),
    
    -- Latest Assessment Results
    latest_assessment_id INTEGER,
    latest_total_score DECIMAL(5,2),
    latest_percentage_score DECIMAL(5,2),
    latest_recommendation VARCHAR(50),
    assessment_date TIMESTAMP,
    
    -- Category Breakdown Scores
    education_score DECIMAL(5,2) DEFAULT 0,
    experience_score DECIMAL(5,2) DEFAULT 0,
    training_score DECIMAL(5,2) DEFAULT 0,
    eligibility_score DECIMAL(5,2) DEFAULT 0,
    accomplishments_score DECIMAL(5,2) DEFAULT 0,
    potential_score FLOAT DEFAULT 0, -- For manual interview scores
    
    -- Batch processing
    upload_batch_id VARCHAR(100),
    
    -- Error handling
    extraction_error TEXT,
    assessment_error TEXT,
    
    -- Manual overrides
    manual_overrides JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- ASSESSMENT SYSTEM TABLES
-- =============================================================================
CREATE TABLE IF NOT EXISTS position_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assessment criteria templates for each position type
CREATE TABLE IF NOT EXISTS assessment_templates (
    id SERIAL PRIMARY KEY,
    position_type_id INTEGER REFERENCES position_types(id) ON DELETE CASCADE,
    criteria_category VARCHAR(50) NOT NULL,
    criteria_name VARCHAR(100) NOT NULL,
    max_points FLOAT NOT NULL,
    weight_percentage FLOAT NOT NULL,
    scoring_rules JSONB,
    is_automated BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(position_type_id, criteria_category, criteria_name)
);

-- Position requirements and qualifications
CREATE TABLE IF NOT EXISTS position_requirements (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    position_type_id INTEGER REFERENCES position_types(id) ON DELETE RESTRICT,
    minimum_education VARCHAR(100),
    required_experience INTEGER DEFAULT 0,
    required_certifications JSONB DEFAULT '[]'::jsonb,
    preferred_qualifications TEXT,
    subject_area VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual candidate assessments
CREATE TABLE IF NOT EXISTS candidate_assessments (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    position_type_id INTEGER REFERENCES position_types(id) ON DELETE RESTRICT,
    
    -- Automated scores (70% of total)
    education_score FLOAT DEFAULT 0,
    experience_score FLOAT DEFAULT 0,
    training_score FLOAT DEFAULT 0,
    eligibility_score FLOAT DEFAULT 0,
    accomplishments_score FLOAT DEFAULT 0,
    automated_total FLOAT DEFAULT 0,
    
    -- Manual scores (30% of total)
    interview_score FLOAT DEFAULT NULL,
    aptitude_score FLOAT DEFAULT NULL,
    manual_total FLOAT DEFAULT 0,
    
    -- Final assessment
    final_score FLOAT DEFAULT 0,
    rank_position INTEGER DEFAULT NULL,
    assessment_status VARCHAR(20) DEFAULT 'incomplete',
    recommendation VARCHAR(20) DEFAULT 'pending',
    
    -- Metadata
    assessed_by INTEGER REFERENCES users(id),
    assessment_notes TEXT,
    score_breakdown JSONB,
    assessment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_date TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(candidate_id, job_id)
);

-- Manual assessment scores (interview components, aptitude test)
CREATE TABLE IF NOT EXISTS manual_assessment_scores (
    id SERIAL PRIMARY KEY,
    candidate_assessment_id INTEGER REFERENCES candidate_assessments(id) ON DELETE CASCADE,
    score_type VARCHAR(20) NOT NULL,
    component_name VARCHAR(100) NOT NULL,
    rating INTEGER,
    score FLOAT,
    max_possible FLOAT,
    notes TEXT,
    entered_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assessment comparison results
CREATE TABLE IF NOT EXISTS assessment_comparisons (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    comparison_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    candidate_rankings JSONB NOT NULL,
    assessment_summary JSONB,
    generated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- LSPU JOB POSTING SYSTEM TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS university_config (
    id SERIAL PRIMARY KEY,
    university_name VARCHAR(200) DEFAULT 'Laguna State Polytechnic University',
    university_logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#1e3a8a',
    secondary_color VARCHAR(7) DEFAULT '#10b981',
    contact_person_name VARCHAR(100) DEFAULT 'MARIO R. BRIONES, EdD',
    contact_person_title VARCHAR(100) DEFAULT 'University President',
    university_website VARCHAR(100) DEFAULT 'lspu.edu.ph',
    facebook_page VARCHAR(200) DEFAULT 'facebook.com/LSPUOfficial',
    hr_email VARCHAR(100) DEFAULT 'information.office@lspu.edu.ph',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LSPU job postings
CREATE TABLE IF NOT EXISTS lspu_job_postings (
    id SERIAL PRIMARY KEY,
    
    -- Basic Information
    job_reference_number VARCHAR(50) UNIQUE,
    position_title VARCHAR(200) NOT NULL,
    specific_role VARCHAR(200),
    quantity_needed INTEGER DEFAULT 1,
    
    -- Position Classification
    position_type_id INTEGER NOT NULL REFERENCES position_types(id),
    position_category VARCHAR(50),
    department_office VARCHAR(200),
    
    -- Administrative Details
    plantilla_item_no VARCHAR(50),
    salary_grade INTEGER,
    salary_amount DECIMAL(12,2),
    employment_period VARCHAR(100),
    
    -- Qualifications
    education_requirements TEXT NOT NULL,
    training_requirements TEXT,
    experience_requirements TEXT,
    eligibility_requirements TEXT,
    special_requirements TEXT,
    
    -- Application Details
    application_deadline DATE,
    application_instructions TEXT,
    required_documents JSONB DEFAULT '[]'::jsonb,
    contact_email VARCHAR(100),
    contact_address TEXT,
    
    -- Template and Design
    color_scheme VARCHAR(20) DEFAULT 'blue',
    banner_text VARCHAR(50) DEFAULT 'WE ARE HIRING',
    
    -- Status and Metadata
    status VARCHAR(20) DEFAULT 'draft',
    created_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    published_at TIMESTAMP NULL,
    closes_at TIMESTAMP NULL,
    
    -- Tracking
    view_count INTEGER DEFAULT 0,
    application_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Required documents template
CREATE TABLE IF NOT EXISTS required_documents_template (
    id SERIAL PRIMARY KEY,
    document_name VARCHAR(200) NOT NULL,
    document_description TEXT,
    is_mandatory BOOLEAN DEFAULT TRUE,
    position_type_id INTEGER REFERENCES position_types(id),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job applications (links candidates to job postings)
CREATE TABLE IF NOT EXISTS job_applications (
    id SERIAL PRIMARY KEY,
    job_posting_id INTEGER NOT NULL REFERENCES lspu_job_postings(id),
    candidate_id INTEGER NOT NULL REFERENCES candidates(id),
    application_status VARCHAR(20) DEFAULT 'submitted',
    assessment_score DECIMAL(5,2),
    assessment_breakdown TEXT,
    hr_notes TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    
    UNIQUE(job_posting_id, candidate_id)
);

-- Job assessment criteria mapping
CREATE TABLE IF NOT EXISTS job_assessment_criteria (
    id SERIAL PRIMARY KEY,
    job_posting_id INTEGER NOT NULL REFERENCES lspu_job_postings(id),
    criteria_name VARCHAR(100) NOT NULL,
    criteria_weight DECIMAL(4,3),
    min_score INTEGER DEFAULT 0,
    max_score INTEGER DEFAULT 100,
    description TEXT
);

-- =============================================================================
-- UPLOAD SESSION MANAGEMENT
-- =============================================================================

-- Upload sessions for batch processing
CREATE TABLE IF NOT EXISTS upload_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    job_id INTEGER NOT NULL REFERENCES jobs(id),
    status VARCHAR(20) DEFAULT 'pending',
    file_count INTEGER DEFAULT 0,
    processed_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    error_message TEXT
);

-- Upload files tracking
CREATE TABLE IF NOT EXISTS upload_files (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL REFERENCES upload_sessions(session_id),
    filename VARCHAR(255) NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'uploaded',
    candidate_id INTEGER REFERENCES candidates(id),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- =============================================================================
-- SYSTEM CONFIGURATION
-- =============================================================================

CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(50) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics table
CREATE TABLE IF NOT EXISTS analytics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    total_resumes INTEGER DEFAULT 0,
    processed_resumes INTEGER DEFAULT 0,
    shortlisted INTEGER DEFAULT 0,
    rejected INTEGER DEFAULT 0,
    avg_processing_time FLOAT DEFAULT 0.0,
    job_category_stats JSONB DEFAULT '{}'::jsonb
);

-- Scoring criteria configuration
CREATE TABLE IF NOT EXISTS scoring_criteria (
    id SERIAL PRIMARY KEY,
    criteria_name VARCHAR(50) NOT NULL,
    criteria_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_candidates_job_id ON candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_score ON candidates(score);
CREATE INDEX IF NOT EXISTS idx_candidates_processing_type ON candidates(processing_type);
CREATE INDEX IF NOT EXISTS idx_candidates_upload_batch ON candidates(upload_batch_id);
CREATE INDEX IF NOT EXISTS idx_candidates_extraction_status ON candidates(extraction_status);

-- Job indexes
CREATE INDEX IF NOT EXISTS idx_jobs_category_id ON jobs(category_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- Assessment indexes
CREATE INDEX IF NOT EXISTS idx_assessment_templates_position_type ON assessment_templates(position_type_id);
CREATE INDEX IF NOT EXISTS idx_position_requirements_job_id ON position_requirements(job_id);
CREATE INDEX IF NOT EXISTS idx_candidate_assessments_candidate_id ON candidate_assessments(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_assessments_job_id ON candidate_assessments(job_id);
CREATE INDEX IF NOT EXISTS idx_candidate_assessments_status ON candidate_assessments(assessment_status);
CREATE INDEX IF NOT EXISTS idx_candidate_assessments_score ON candidate_assessments(final_score);
CREATE INDEX IF NOT EXISTS idx_manual_scores_assessment_id ON manual_assessment_scores(candidate_assessment_id);

-- LSPU job posting indexes
CREATE INDEX IF NOT EXISTS idx_lspu_job_postings_status ON lspu_job_postings(status);
CREATE INDEX IF NOT EXISTS idx_lspu_job_postings_position_type ON lspu_job_postings(position_type_id);
CREATE INDEX IF NOT EXISTS idx_lspu_job_postings_deadline ON lspu_job_postings(application_deadline);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(application_status);
CREATE INDEX IF NOT EXISTS idx_job_applications_score ON job_applications(assessment_score);

-- Upload session indexes
CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON upload_sessions(status);
CREATE INDEX IF NOT EXISTS idx_upload_files_session ON upload_files(session_id);
CREATE INDEX IF NOT EXISTS idx_upload_files_status ON upload_files(status);

-- Other indexes
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(date);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_scoring_criteria_active ON scoring_criteria(is_active);

-- =============================================================================
-- DEFAULT DATA INSERTION
-- =============================================================================

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password_hash, first_name, last_name, username, is_admin)
VALUES ('admin@resumeai.com', '$2b$12$P9/d224UJ3fGh3rbTjRiWeIkehLv3QvNn5vweGK6SThKoOSfi9E7C', 'Admin', 'User', 'admin', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Insert default job categories
INSERT INTO job_categories (name, description) VALUES
('Software Development', 'Software development and engineering roles'),
('Education', 'Teaching and academic positions'),
('Administration', 'Administrative and support roles'),
('Research', 'Research and development positions'),
('Healthcare', 'Medical and healthcare positions')
ON CONFLICT (name) DO NOTHING;

-- Insert default position types
INSERT INTO position_types (name, description) VALUES
('Part-time Teaching', 'Part-time instructional positions'),
('Regular Faculty', 'Full-time faculty positions with tenure track'),
('Non-Teaching Personnel', 'Administrative and support staff positions'),
('Job Order', 'Contractual and temporary positions')
ON CONFLICT (name) DO NOTHING;

-- Insert default job if none exists
INSERT INTO jobs (title, department, description, requirements, category_id)
SELECT 
    'Software Developer',
    'Engineering',
    'We are looking for a skilled software developer to join our team.',
    'Python, JavaScript, React, Node.js, SQL, Git',
    (SELECT id FROM job_categories WHERE name = 'Software Development')
WHERE NOT EXISTS (SELECT 1 FROM jobs);

-- Insert common required documents
INSERT INTO required_documents_template (document_name, document_description, display_order, is_mandatory) VALUES 
('Personal Data Sheet (PDS)', 'Fully accomplished Personal Data Sheet (PDS) with recent passport-sized picture (CSC Form No. 212, Rev. 2025); digitally signed or electronically signed', 1, TRUE),
('Performance Rating', 'Performance rating in the last rating period (if applicable)', 2, FALSE),
('Curriculum Vitae', 'Current curriculum vitae', 3, TRUE),
('Certificate of Eligibility/Rating/License', 'Photocopy of certificate of eligibility/rating/license', 4, TRUE),
('Transcript of Records', 'Photocopy of transcript of records', 5, TRUE),
('Application Letter', 'Application letter addressed to the University President', 6, TRUE)
ON CONFLICT (document_name) DO NOTHING;

-- Insert default university configuration
INSERT INTO university_config (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Insert default scoring criteria
INSERT INTO scoring_criteria (criteria_name, criteria_config, is_active) VALUES (
    'default_pds_scoring',
    '{"education": {"weight": 0.25, "subcriteria": {"relevance": 0.4, "level": 0.3, "institution": 0.2, "grades": 0.1}}, "experience": {"weight": 0.30, "subcriteria": {"relevance": 0.5, "duration": 0.3, "responsibilities": 0.2}}, "skills": {"weight": 0.20, "subcriteria": {"technical_match": 0.6, "certifications": 0.4}}, "personal_attributes": {"weight": 0.15, "subcriteria": {"eligibility": 0.5, "awards": 0.3, "training": 0.2}}, "additional_qualifications": {"weight": 0.10, "subcriteria": {"languages": 0.4, "licenses": 0.3, "volunteer_work": 0.3}}}',
    TRUE
) ON CONFLICT (criteria_name) DO NOTHING;


-- Insert assessment templates for Part-time Teaching position
DO $$
DECLARE
    pt_id INTEGER;
BEGIN
    SELECT id INTO pt_id FROM position_types WHERE name = 'Part-time Teaching' LIMIT 1;
    
    IF pt_id IS NOT NULL THEN
        INSERT INTO assessment_templates (position_type_id, criteria_category, criteria_name, max_points, weight_percentage, scoring_rules, is_automated, display_order, description) VALUES
        (pt_id, 'potential', 'Interview Score', 70, 10, '{"components": ["personality", "communication", "analytical", "achievement", "leadership", "relationship", "job_fit"], "scoring_scale": "1-10"}', FALSE, 1, 'Interview assessment with 7 components'),
        (pt_id, 'potential', 'Aptitude Test', 5, 5, '{"scale": "1-5", "levels": {"5": "Superior", "4": "Above Average", "3": "Average", "2": "Below Average", "1": "Lowest"}}', FALSE, 2, 'Aptitude test assessment'),
        (pt_id, 'education', 'Relevance and Appropriateness', 40, 32, '{"assessment_method": "degree_matching", "subject_relevance": true, "institution_quality": true}', TRUE, 3, 'Relevance and appropriateness of educational background'),
        (pt_id, 'education', 'Basic Minimum Requirement', 35, 28, '{"minimum_degree": "Master", "required": true}', TRUE, 4, 'Basic minimum educational requirement (Master''s degree)'),
        (pt_id, 'education', 'Doctoral Progress Bonus', 5, 4, '{"25_percent": 1, "50_percent": 2, "75_percent": 3, "CAR_complete": 4, "PhD_complete": 5}', TRUE, 5, 'Additional points for doctoral degree progress'),
        (pt_id, 'experience', 'Years of Experience', 20, 20, '{"tiers": {"1-2_years": 5, "3-4_years": 10, "5-10_years": 15}, "bonus_per_year_over_10": 1, "relevance_multiplier": true}', TRUE, 6, 'Years of relevant professional experience'),
        (pt_id, 'training', 'Professional Training', 10, 10, '{"baseline_hours": 40, "baseline_points": 5, "additional_per_8_hours": 1, "relevance_assessment": true}', TRUE, 7, 'Professional training and development hours'),
        (pt_id, 'eligibility', 'Professional Eligibility', 10, 10, '{"certifications": ["RA 1080", "CSC Exam", "BAR/BOARD Exam"], "full_points_any": true}', TRUE, 8, 'Professional licenses and eligibility certifications'),
        (pt_id, 'accomplishments', 'Outstanding Accomplishments', 5, 5, '{"types": ["citations", "recognitions", "honor_graduate", "board_topnotcher", "csc_topnotcher"], "points_per_accomplishment": 1}', TRUE, 9, 'Awards, recognitions, and outstanding accomplishments')
        ON CONFLICT (position_type_id, criteria_category, criteria_name) DO NOTHING;
    END IF;
END $$;