/* Job Export and Print Utilities */

const JobExportUtils = {
    // Initialize PDF library (jsPDF will be loaded externally)
    init() {
        // Load jsPDF if not already loaded
        if (typeof window.jsPDF === 'undefined') {
            this.loadJsPDF();
        }
    },

    // Load jsPDF library dynamically
    async loadJsPDF() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => {
                console.log('jsPDF loaded successfully');
                resolve();
            };
            script.onerror = () => {
                console.error('Failed to load jsPDF');
                reject(new Error('Failed to load PDF library'));
            };
            document.head.appendChild(script);
        });
    },

    // Generate PDF for job posting
    async generateJobPostingPDF(job) {
        try {
            // Ensure jsPDF is loaded
            if (typeof window.jsPDF === 'undefined') {
                await this.loadJsPDF();
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            
            // Page setup
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            const contentWidth = pageWidth - (margin * 2);
            let yPosition = margin;

            // Modern company header with gradient effect
            doc.setFillColor(37, 99, 235); // Primary blue
            doc.rect(0, 0, pageWidth, 35, 'F');
            doc.setFillColor(59, 130, 246); // Lighter blue for gradient effect
            doc.rect(0, 30, pageWidth, 5, 'F');
            
            // Company logo placeholder (circle)
            doc.setFillColor(255, 255, 255);
            doc.circle(margin + 8, 18, 8, 'F');
            doc.setFillColor(37, 99, 235);
            doc.circle(margin + 8, 18, 6, 'F');
            
            // Company name and tagline
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.setFont(undefined, 'bold');
            doc.text('Cabael Corporations', margin + 25, 20);
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text('Building Tomorrow\'s Technology Today', margin + 25, 28);
            
            // Document type
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('CAREER OPPORTUNITY', pageWidth - margin - 55, 20);

            yPosition = 50;

            // Job title with modern styling
            doc.setTextColor(37, 99, 235);
            doc.setFontSize(26);
            doc.setFont(undefined, 'bold');
            doc.text(job.title, margin, yPosition);
            yPosition += 12;

            // Subtitle bar with key info
            doc.setFillColor(248, 250, 252); // Light gray background
            doc.rect(margin, yPosition, contentWidth, 20, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.rect(margin, yPosition, contentWidth, 20, 'S');
            
            // Key details in styled boxes
            doc.setTextColor(71, 85, 105);
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            
            // Department
            doc.text('DEPARTMENT', margin + 5, yPosition + 8);
            doc.setFont(undefined, 'normal');
            doc.text(job.department, margin + 5, yPosition + 15);
            
            // Category
            doc.setFont(undefined, 'bold');
            doc.text('CATEGORY', margin + 60, yPosition + 8);
            doc.setFont(undefined, 'normal');
            doc.text(job.category, margin + 60, yPosition + 15);
            
            // Experience Level
            doc.setFont(undefined, 'bold');
            doc.text('EXPERIENCE', margin + 110, yPosition + 8);
            doc.setFont(undefined, 'normal');
            doc.text(this.formatExperienceLevel(job.experience_level), margin + 110, yPosition + 15);
            
            // Posted Date
            doc.setFont(undefined, 'bold');
            doc.text('POSTED', pageWidth - margin - 35, yPosition + 8);
            doc.setFont(undefined, 'normal');
            doc.text(new Date().toLocaleDateString(), pageWidth - margin - 35, yPosition + 15);
            
            yPosition += 35;

            // Modern section divider
            doc.setDrawColor(37, 99, 235);
            doc.setLineWidth(1);
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 15;

            // Job description section with icon
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            
            // Section icon (document icon)
            doc.setFillColor(37, 99, 235);
            doc.rect(margin, yPosition - 5, 3, 12, 'F');
            
            doc.text('Job Overview', margin + 8, yPosition + 5);
            yPosition += 15;

            // Description with better formatting
            doc.setFontSize(11);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(71, 85, 105);
            const descriptionLines = doc.splitTextToSize(job.description, contentWidth - 10);
            doc.text(descriptionLines, margin + 5, yPosition);
            yPosition += (descriptionLines.length * 5) + 20;

            // Required skills section with modern styling
            if (yPosition > pageHeight - 80) {
                doc.addPage();
                yPosition = margin;
            }

            // Skills section header
            doc.setTextColor(30, 41, 59);
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            
            // Section icon (checkmark icon)
            doc.setFillColor(37, 99, 235);
            doc.rect(margin, yPosition - 5, 3, 12, 'F');
            
            doc.text('Required Skills & Qualifications', margin + 8, yPosition + 5);
            yPosition += 15;

            const skills = job.requirements.split(',').map(s => s.trim()).filter(Boolean);
            
            // Skills in a more visual format
            doc.setFontSize(11);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(71, 85, 105);

            skills.forEach((skill, index) => {
                if (yPosition > pageHeight - 40) {
                    doc.addPage();
                    yPosition = margin;
                }
                
                // Bullet point with custom styling
                doc.setFillColor(37, 99, 235);
                doc.circle(margin + 8, yPosition - 1, 1.5, 'F');
                
                // Skill text
                doc.text(skill, margin + 15, yPosition);
                yPosition += 7;
            });

            yPosition += 20;

            // Application instructions with call-to-action styling
            if (yPosition > pageHeight - 60) {
                doc.addPage();
                yPosition = margin;
            }

            // Call-to-action box
            doc.setFillColor(240, 249, 255); // Light blue background
            doc.rect(margin, yPosition, contentWidth, 35, 'F');
            doc.setDrawColor(37, 99, 235);
            doc.setLineWidth(1);
            doc.rect(margin, yPosition, contentWidth, 35, 'S');

            // Header
            doc.setTextColor(37, 99, 235);
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text('Ready to Join Our Team?', margin + 10, yPosition + 12);

            // Instructions
            doc.setFontSize(11);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(71, 85, 105);
            const applicationText = 'Submit your application through our careers portal at careers.techcorp.com or email hr@techcorp.com with your resume and cover letter. We are an equal opportunity employer committed to diversity and inclusion.';
            const applicationLines = doc.splitTextToSize(applicationText, contentWidth - 20);
            doc.text(applicationLines, margin + 10, yPosition + 22);
            
            yPosition += 50;

            // Modern footer with company info
            const footerY = pageHeight - 25;
            
            // Footer background
            doc.setFillColor(248, 250, 252);
            doc.rect(0, footerY - 5, pageWidth, 30, 'F');
            
            // Footer line
            doc.setDrawColor(37, 99, 235);
            doc.setLineWidth(1);
            doc.line(margin, footerY, pageWidth - margin, footerY);
            
            // Company info
            doc.setTextColor(71, 85, 105);
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.text('TechCorp Solutions | careers.techcorp.com | Equal Opportunity Employer', margin, footerY + 8);
            
            // Generation info
            doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth - margin - 60, footerY + 8);

            return doc;

        } catch (error) {
            console.error('Error generating PDF:', error);
            throw new Error('Failed to generate PDF');
        }
    },

    // Format experience level for display
    formatExperienceLevel(level) {
        const levels = {
            'entry': 'Entry Level (0-2 years)',
            'mid': 'Mid Level (2-5 years)',
            'senior': 'Senior Level (5+ years)',
            'lead': 'Lead/Manager (7+ years)'
        };
        return levels[level] || level;
    },

    // Export job as PDF
    async exportJobAsPDF(job) {
        try {
            const doc = await this.generateJobPostingPDF(job);
            const fileName = `${job.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_job_posting.pdf`;
            doc.save(fileName);
            
            ToastUtils.showSuccess('Job posting PDF downloaded successfully');
        } catch (error) {
            console.error('Error exporting PDF:', error);
            ToastUtils.showError('Failed to export PDF: ' + error.message);
        }
    },

    // Print job posting
    async printJobPosting(job) {
        try {
            const doc = await this.generateJobPostingPDF(job);
            
            // Open PDF in new window for printing
            const pdfBlob = doc.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            
            const printWindow = window.open(url, '_blank');
            printWindow.onload = () => {
                printWindow.print();
                // Clean up the URL after a delay
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                }, 1000);
            };
            
            ToastUtils.showSuccess('Opening print dialog...');
        } catch (error) {
            console.error('Error printing job posting:', error);
            ToastUtils.showError('Failed to print job posting: ' + error.message);
        }
    },

    // Generate enhanced HTML preview with professional company theme
    generateHTMLPreview(job) {
        return `
            <div style="font-family: 'Inter', 'Segoe UI', Arial, sans-serif; max-width: 900px; margin: 0 auto; background: #fff; color: #1e293b; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border-radius: 12px; overflow: hidden;">
                <!-- Modern Company Header -->
                <div style="background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; padding: 40px; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
                    <div style="position: relative; z-index: 1;">
                        <div style="display: flex; align-items: center; margin-bottom: 20px;">
                            <div style="width: 50px; height: 50px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 20px;">
                                <div style="width: 35px; height: 35px; background: #2563eb; border-radius: 50%;"></div>
                            </div>
                            <div>
                                <h1 style="margin: 0; font-size: 24px; font-weight: 700;">TechCorp Solutions</h1>
                                <p style="margin: 0; font-size: 14px; opacity: 0.9;">Building Tomorrow's Technology Today</p>
                            </div>
                            <div style="margin-left: auto; text-align: right;">
                                <span style="background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 1px;">CAREER OPPORTUNITY</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Job Title Section -->
                <div style="padding: 40px 40px 20px;">
                    <h1 style="margin: 0 0 20px 0; font-size: 32px; font-weight: 700; color: #2563eb; line-height: 1.2;">${job.title}</h1>
                    
                    <!-- Info Cards Grid -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; background: #f8fafc; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0;">
                        <div style="text-align: center;">
                            <div style="font-size: 10px; font-weight: 700; color: #64748b; letter-spacing: 1px; margin-bottom: 5px;">DEPARTMENT</div>
                            <div style="font-size: 14px; font-weight: 600; color: #334155;">${job.department}</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 10px; font-weight: 700; color: #64748b; letter-spacing: 1px; margin-bottom: 5px;">CATEGORY</div>
                            <div style="font-size: 14px; font-weight: 600; color: #334155;">${job.category}</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 10px; font-weight: 700; color: #64748b; letter-spacing: 1px; margin-bottom: 5px;">EXPERIENCE</div>
                            <div style="font-size: 14px; font-weight: 600; color: #334155;">${this.formatExperienceLevel(job.experience_level)}</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 10px; font-weight: 700; color: #64748b; letter-spacing: 1px; margin-bottom: 5px;">POSTED</div>
                            <div style="font-size: 14px; font-weight: 600; color: #334155;">${new Date().toLocaleDateString()}</div>
                        </div>
                    </div>
                </div>

                <!-- Content Sections -->
                <div style="padding: 0 40px 40px;">
                    <!-- Job Overview Section -->
                    <div style="margin-bottom: 35px;">
                        <div style="display: flex; align-items: center; margin-bottom: 20px;">
                            <div style="width: 4px; height: 24px; background: #2563eb; margin-right: 15px; border-radius: 2px;"></div>
                            <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #1e293b;">Job Overview</h2>
                        </div>
                        <div style="background: #f8fafc; padding: 25px; border-radius: 10px; border-left: 4px solid #2563eb;">
                            <p style="line-height: 1.7; color: #475569; font-size: 16px; margin: 0;">${job.description}</p>
                        </div>
                    </div>

                    <!-- Required Skills Section -->
                    <div style="margin-bottom: 35px;">
                        <div style="display: flex; align-items: center; margin-bottom: 20px;">
                            <div style="width: 4px; height: 24px; background: #2563eb; margin-right: 15px; border-radius: 2px;"></div>
                            <h2 style="margin: 0; font-size: 20px; font-weight: 600; color: #1e293b;">Required Skills & Qualifications</h2>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px;">
                            ${job.requirements.split(',').map(skill => 
                                `<div style="display: flex; align-items: center; background: #f1f5f9; padding: 12px 16px; border-radius: 8px; border-left: 3px solid #2563eb;">
                                    <div style="width: 8px; height: 8px; background: #2563eb; border-radius: 50%; margin-right: 12px; flex-shrink: 0;"></div>
                                    <span style="color: #334155; font-weight: 500; font-size: 14px;">${skill.trim()}</span>
                                </div>`
                            ).join('')}
                        </div>
                    </div>

                    <!-- Application Section -->
                    <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 30px; border-radius: 12px; border: 1px solid #0ea5e9; text-align: center;">
                        <h3 style="color: #0369a1; font-size: 22px; font-weight: 700; margin-bottom: 15px;">Ready to Join Our Team?</h3>
                        <p style="color: #475569; line-height: 1.6; margin-bottom: 20px; font-size: 16px;">
                            Submit your application through our careers portal or email us directly. We're looking for passionate individuals who want to make a difference.
                        </p>
                        <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
                            <a href="mailto:hr@techcorp.com" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center;">
                                📧 Email Application
                            </a>
                            <a href="#" style="background: white; color: #2563eb; border: 2px solid #2563eb; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center;">
                                🌐 Careers Portal
                            </a>
                        </div>
                    </div>
                </div>

                <!-- Modern Footer -->
                <div style="background: #f8fafc; padding: 25px 40px; border-top: 1px solid #e2e8f0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
                        <div style="color: #64748b; font-size: 14px;">
                            <strong style="color: #334155;">TechCorp Solutions</strong> | careers.techcorp.com | Equal Opportunity Employer
                        </div>
                        <div style="color: #94a3b8; font-size: 12px;">
                            Generated on ${new Date().toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Show HTML preview in modal
    showJobPreview(job) {
        const previewHTML = this.generateHTMLPreview(job);
        
        // Create preview modal if it doesn't exist
        if (!document.getElementById('jobPreviewModal')) {
            const modalHTML = `
                <div class="modal fade" id="jobPreviewModal" tabindex="-1">
                    <div class="modal-dialog modal-xl">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Job Posting Preview</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                                <div id="jobPreviewContent"></div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-outline-primary" id="printPreviewBtn">
                                    <i class="fas fa-print me-2"></i>Print
                                </button>
                                <button type="button" class="btn btn-primary" id="downloadPreviewBtn">
                                    <i class="fas fa-download me-2"></i>Download PDF
                                </button>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        // Update content and show modal
        document.getElementById('jobPreviewContent').innerHTML = previewHTML;
        
        // Update button event listeners
        document.getElementById('printPreviewBtn').onclick = () => this.printJobPosting(job);
        document.getElementById('downloadPreviewBtn').onclick = () => this.exportJobAsPDF(job);
        
        BootstrapInit.showModal('jobPreviewModal');
    },

    // Export all jobs as a single PDF
    async exportAllJobsAsPDF(jobs) {
        try {
            // Ensure jsPDF is loaded
            if (typeof window.jsPDF === 'undefined') {
                await this.loadJsPDF();
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            
            // Page setup
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            
            // Professional cover page with company branding
            doc.setFillColor(37, 99, 235);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');
            
            // Company logo (large circle)
            doc.setFillColor(255, 255, 255);
            doc.circle(pageWidth / 2, 60, 25, 'F');
            doc.setFillColor(37, 99, 235);
            doc.circle(pageWidth / 2, 60, 20, 'F');
            
            // Main title
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(36);
            doc.setFont(undefined, 'bold');
            doc.text('Career Opportunities', pageWidth / 2, 120, { align: 'center' });
            
            // Company info
            doc.setFontSize(20);
            doc.setFont(undefined, 'normal');
            doc.text('TechCorp Solutions', pageWidth / 2, 140, { align: 'center' });
            
            doc.setFontSize(14);
            doc.text('Building Tomorrow\'s Technology Today', pageWidth / 2, 155, { align: 'center' });
            
            // Job count and date
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text(`${jobs.length} Open Positions`, pageWidth / 2, 180, { align: 'center' });
            
            doc.setFontSize(12);
            doc.setFont(undefined, 'normal');
            doc.text(`Published ${new Date().toLocaleDateString()}`, pageWidth / 2, 195, { align: 'center' });
            
            // Footer tagline
            doc.setFontSize(14);
            doc.setFont(undefined, 'italic');
            doc.text('Join Our Innovation Journey', pageWidth / 2, 230, { align: 'center' });

            // Table of contents
            doc.addPage();
            doc.setTextColor(37, 99, 235);
            doc.setFontSize(20);
            doc.setFont(undefined, 'bold');
            doc.text('Table of Contents', margin, 30);
            
            let tocY = 50;
            doc.setFontSize(12);
            doc.setFont(undefined, 'normal');
            
            jobs.forEach((job, index) => {
                if (tocY > pageHeight - 30) {
                    doc.addPage();
                    tocY = 30;
                }
                doc.text(`${index + 1}. ${job.title}`, margin + 5, tocY);
                doc.text(`${job.department}`, margin + 100, tocY);
                tocY += 8;
            });

            // Add each job on separate pages
            for (let i = 0; i < jobs.length; i++) {
                const job = jobs[i];
                doc.addPage();
                
                // Use the same template as single job export
                const tempDoc = await this.generateJobPostingPDF(job);
                const pages = tempDoc.internal.pages;
                
                // Copy pages (skip the first empty page)
                for (let j = 1; j < pages.length; j++) {
                    if (j > 1) doc.addPage();
                    // Note: This is a simplified approach. In production, you'd want to properly copy page content
                    // For now, we'll generate each job individually
                }
                
                // Generate job content directly
                await this.addJobToDocument(doc, job, i + 1);
            }

            const fileName = `all_job_postings_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
            
            ToastUtils.showSuccess(`${jobs.length} job postings exported successfully`);
        } catch (error) {
            console.error('Error exporting all jobs:', error);
            throw new Error('Failed to export all jobs');
        }
    },

    // Add individual job to document
    async addJobToDocument(doc, job, jobNumber) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        const contentWidth = pageWidth - (margin * 2);
        let yPosition = margin;

        // Professional job header for multi-job document
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, pageWidth, 30, 'F');
        doc.setFillColor(59, 130, 246);
        doc.rect(0, 25, pageWidth, 5, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`Position ${jobNumber}`, margin, 18);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('TechCorp Solutions', pageWidth / 2, 18, { align: 'center' });
        doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - margin - 20, 18);

        yPosition = 45;

        // Job title
        doc.setTextColor(37, 99, 235);
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text(job.title, margin, yPosition);
        yPosition += 12;

        // Basic info
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`${job.department} • ${job.category} • ${this.formatExperienceLevel(job.experience_level)}`, margin, yPosition);
        yPosition += 15;

        // Description
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        const descLines = doc.splitTextToSize(job.description, contentWidth);
        doc.text(descLines, margin, yPosition);
        yPosition += (descLines.length * 4) + 10;

        // Skills
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Required Skills:', margin, yPosition);
        yPosition += 6;
        
        doc.setFont(undefined, 'normal');
        const skills = job.requirements.split(',').map(s => s.trim()).filter(Boolean);
        skills.forEach(skill => {
            doc.text(`• ${skill}`, margin + 5, yPosition);
            yPosition += 5;
        });
    },
};

// Make globally available
window.JobExportUtils = JobExportUtils;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    JobExportUtils.init();
});
