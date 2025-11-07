def convert_improved_pds_to_assessment_format(extracted_data):
    converted_data = {
        'basic_info': {},
        'education': [],
        'experience': [],
        'experience_data': [],  # Add for assessment engine compatibility
        'training': [],
        'eligibility': [],
        'certifications': [],
        'awards': [],
        'volunteer_work': []
    }
    
    print(f"🔄 Converting PDS data from ImprovedPDSExtractor...")
    
    if 'personal_info' in extracted_data:
        personal_info = extracted_data['personal_info']
        converted_data['basic_info'] = {
            'name': f"{personal_info.get('first_name', '')} {personal_info.get('middle_name', '')} {personal_info.get('surname', '')}".strip(),
            'email': personal_info.get('email', ''),
            'phone': personal_info.get('mobile_no', personal_info.get('telephone_no', '')),
            'address': personal_info.get('residential_address', {}).get('full_address', '') if isinstance(personal_info.get('residential_address'), dict) else '',
            'citizenship': personal_info.get('citizenship', ''),
            'civil_status': personal_info.get('civil_status', ''),
            'birth_date': personal_info.get('date_of_birth', ''),
            'birth_place': personal_info.get('place_of_birth', ''),
            'sex': personal_info.get('sex', ''),
            'government_ids': {
                'gsis_id': personal_info.get('gsis_id', ''),
                'pagibig_id': personal_info.get('pagibig_id', ''),
                'philhealth_no': personal_info.get('philhealth_no', ''),
                'sss_no': personal_info.get('sss_no', ''),
                'tin_no': personal_info.get('tin_no', '')
            }
        }
    else:
        # Fallback basic info
        converted_data['basic_info'] = {
            'name': 'Unknown Candidate',
            'email': '',
            'phone': '',
            'address': '',
            'citizenship': '',
            'civil_status': '',
            'birth_date': '',
            'birth_place': '',
            'sex': '',
            'government_ids': {}
        }
    
    # Educational background
    if 'educational_background' in extracted_data:
        education = extracted_data['educational_background']
        if isinstance(education, list):
            for edu in education:
                if edu and edu.get('school') and edu.get('school') not in ['N/a', '', 'nan']:
                    converted_data['education'].append({
                        'level': edu.get('level', 'N/A'),
                        'school': edu.get('school', 'N/A'),
                        'degree_course': edu.get('degree_course', 'N/A'),
                        'year_graduated': edu.get('year_graduated', 'N/A'),
                        'honors': edu.get('honors', 'N/A'),
                        'units_earned': edu.get('highest_level_units', 'N/A'),
                        'period_from': edu.get('period_from', 'N/A'),
                        'period_to': edu.get('period_to', 'N/A')
                    })
    
    # Work experience
    if 'work_experience' in extracted_data:
        experience = extracted_data['work_experience']
        if isinstance(experience, list):
            for exp in experience:
                if exp and exp.get('position'):
                    experience_entry = {
                        'position': exp.get('position', 'N/A'),
                        'company': exp.get('company', 'N/A'),
                        'from_date': exp.get('date_from', 'N/A'),
                        'to_date': exp.get('date_to', 'N/A'),
                        'monthly_salary': exp.get('monthly_salary', exp.get('salary', 'N/A')),
                        'salary_grade': exp.get('salary_grade', exp.get('grade', 'N/A')),
                        'govt_service': exp.get('govt_service', 'N'),
                        'status': exp.get('status', 'N/A')
                    }
                    # Add to both fields for compatibility
                    converted_data['experience'].append(experience_entry)
                    converted_data['experience_data'].append(experience_entry)
    
    # Learning and development (training)
    if 'learning_development' in extracted_data:
        training = extracted_data['learning_development']
        if isinstance(training, list):
            for train in training:
                if train and train.get('title'):
                    hours = train.get('hours', 0)
                    try:
                        hours = float(hours) if hours else 0
                    except:
                        hours = 0
                    
                    converted_data['training'].append({
                        'title': train.get('title', 'N/A'),
                        'hours': hours,
                        'type': train.get('type', 'N/A'),
                        'provider': train.get('conductor', 'N/A'),
                        'date_from': train.get('date_from', 'N/A'),
                        'date_to': train.get('date_to', 'N/A')
                    })
    
    # Civil service eligibility
    if 'civil_service_eligibility' in extracted_data:
        eligibility = extracted_data['civil_service_eligibility']
        if isinstance(eligibility, list):
            for elig in eligibility:
                if elig and elig.get('eligibility'):
                    converted_data['eligibility'].append({
                        'eligibility': elig.get('eligibility', 'N/A'),
                        'rating': elig.get('rating', 'N/A'),
                        'date_of_examination': elig.get('date_exam', 'N/A'),
                        'place_of_examination': elig.get('place_exam', 'N/A'),
                        'license_no': elig.get('license_no', 'N/A'),
                        'validity': elig.get('validity', 'N/A')
                    })
    
    # Voluntary work
    if 'voluntary_work' in extracted_data:
        voluntary = extracted_data['voluntary_work']
        if isinstance(voluntary, list):
            for vol in voluntary:
                if vol and vol.get('organization'):
                    hours = vol.get('hours', 0)
                    try:
                        hours = float(hours) if hours else 0
                    except:
                        hours = 0
                        
                    converted_data['volunteer_work'].append({
                        'organization': vol.get('organization', 'N/A'),
                        'position': vol.get('position', 'N/A'),
                        'hours': hours,
                        'date_from': vol.get('date_from', 'N/A'),
                        'date_to': vol.get('date_to', 'N/A')
                    })
    
    # Summary
    total_entries = (len(converted_data['education']) + 
                    len(converted_data['experience']) + 
                    len(converted_data['training']) + 
                    len(converted_data['eligibility']) + 
                    len(converted_data['volunteer_work']))
    
    print(f"✅ ImprovedPDSExtractor conversion complete! Total entries: {total_entries}")
    print(f"   📚 Education: {len(converted_data['education'])}")
    print(f"   💼 Experience: {len(converted_data['experience'])}")
    print(f"   📖 Training: {len(converted_data['training'])}")
    print(f"   ✅ Eligibility: {len(converted_data['eligibility'])}")
    print(f"   🤲 Voluntary: {len(converted_data['volunteer_work'])}")
    
    return converted_data