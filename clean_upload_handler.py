import os
import json
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import current_app
import logging

logger = logging.getLogger(__name__)

class CleanUploadHandler:
    
    def __init__(self, upload_folder='uploads', temp_folder='temp_uploads'):
        self.upload_folder = upload_folder
        self.temp_folder = temp_folder
        self.allowed_extensions = {'.xlsx', '.xls'}
        self.max_file_size = 16 * 1024 * 1024  # 16MB per file
        self.max_files = 20  # Maximum files per batch
        
        # Ensure directories exist with proper error handling
        try:
            os.makedirs(self.upload_folder, exist_ok=True)
            os.makedirs(self.temp_folder, exist_ok=True)
            logger.info(f"✅ Upload directories created: {self.upload_folder}, {self.temp_folder}")
        except Exception as e:
            logger.error(f"❌ Failed to create upload directories: {e}")
            raise Exception(f"Upload system initialization failed: {e}")
        
        # Verify write permissions
        try:
            test_file = os.path.join(self.temp_folder, 'test_write.tmp')
            with open(test_file, 'w') as f:
                f.write('test')
            os.remove(test_file)
            logger.info("✅ Upload directory permissions verified")
        except Exception as e:
            logger.error(f"❌ Upload directory not writable: {e}")
            raise Exception(f"Upload directory not writable: {e}")
    
    def validate_file(self, file):
        """
        Validate uploaded file for type and size
        Returns: (is_valid, error_message, file_info)
        """
        if not file or not file.filename:
            return False, "No file provided", None
        
        filename = secure_filename(file.filename)
        if not filename:
            return False, "Invalid filename", None
        
        # Check file extension
        file_ext = os.path.splitext(filename)[1].lower()
        if file_ext not in self.allowed_extensions:
            return False, f"File type {file_ext} not supported. Only Excel files (.xlsx, .xls) are allowed.", None
        
        # Check file size (if available)
        try:
            file.seek(0, 2)  # Seek to end
            file_size = file.tell()
            file.seek(0)  # Reset to beginning
            
            if file_size > self.max_file_size:
                return False, f"File too large. Maximum size is {self.max_file_size // (1024*1024)}MB.", None
        except Exception as e:
            logger.warning(f"Could not check file size: {e}")
        
        file_info = {
            'original_name': file.filename,
            'secure_name': filename,
            'extension': file_ext,
            'size': file_size if 'file_size' in locals() else None,
            'type': 'excel'
        }
        
        return True, None, file_info
    
    def save_temp_file(self, file, file_info):
        """
        Save file to temporary storage with unique ID
        Returns: (success, temp_file_path, file_id)
        """
        try:
            file_id = str(uuid.uuid4())
            temp_filename = f"{file_id}_{file_info['secure_name']}"
            temp_path = os.path.join(self.temp_folder, temp_filename)
            
            # Ensure we start at the beginning of the file
            file.seek(0)
            file.save(temp_path)
            
            # Verify file was saved correctly
            if not os.path.exists(temp_path):
                raise Exception(f"File was not saved to {temp_path}")
            
            saved_size = os.path.getsize(temp_path)
            if saved_size == 0:
                raise Exception("Saved file is empty")
            
            logger.info(f"✅ File saved: {temp_filename} ({saved_size} bytes)")
            return True, temp_path, file_id
        except Exception as e:
            logger.error(f"❌ Error saving temporary file {file_info.get('original_name', 'unknown')}: {e}")
            return False, None, None
    
    def generate_file_preview(self, temp_path, file_info):
        """
        Generate preview information for uploaded file
        Returns: preview_data dict
        """
        preview_data = {
            'name': file_info['original_name'],
            'type': file_info['type'],
            'size': file_info.get('size'),
            'extension': file_info['extension'],
            'uploaded_at': datetime.now().isoformat(),
            'status': 'ready'
        }
        
        # Add file-specific preview info
        if file_info['type'] == 'excel':
            preview_data.update({
                'icon': 'fas fa-file-excel',
                'color': 'text-success', 
                'description': 'Excel Spreadsheet (PDS Data)'
            })
        
        return preview_data
    
    def process_upload_batch(self, files):
        """
        Process multiple uploaded files
        Returns: (success, results, errors)
        """
        if len(files) > self.max_files:
            return False, None, f"Too many files. Maximum {self.max_files} files allowed per batch."
        
        results = []
        errors = []
        
        for file in files:
            # Validate file
            is_valid, error_msg, file_info = self.validate_file(file)
            if not is_valid:
                errors.append({
                    'filename': file.filename if file else 'unknown',
                    'error': error_msg
                })
                continue
            
            # Save to temp storage
            success, temp_path, file_id = self.save_temp_file(file, file_info)
            if not success:
                errors.append({
                    'filename': file_info['original_name'],
                    'error': 'Failed to save file'
                })
                continue
            
            # Generate preview
            preview_data = self.generate_file_preview(temp_path, file_info)
            
            # Add to results
            results.append({
                'file_id': file_id,
                'temp_path': temp_path,
                'preview': preview_data,
                'file_info': file_info
            })
        
        success = len(results) > 0
        return success, results, errors
    
    def get_upload_session_data(self, file_ids):
        """
        Get data for files in current upload session
        Returns: session data dict
        """
        session_data = {
            'session_id': str(uuid.uuid4()),
            'created_at': datetime.now().isoformat(),
            'file_count': len(file_ids),
            'files': file_ids,
            'status': 'ready_for_analysis'
        }
        
        return session_data
    
    def cleanup_temp_files(self, file_ids):
        """
        Clean up temporary files after processing
        """
        for file_id in file_ids:
            try:
                # Find temp files with this ID
                for filename in os.listdir(self.temp_folder):
                    if filename.startswith(file_id):
                        temp_path = os.path.join(self.temp_folder, filename)
                        os.remove(temp_path)
                        logger.info(f"Cleaned up temp file: {filename}")
            except Exception as e:
                logger.warning(f"Error cleaning up temp file {file_id}: {e}")