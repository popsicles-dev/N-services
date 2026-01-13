"""
CSV Validation Service
Validates uploaded CSV files for SEO audit compatibility
"""
import csv
import io
from typing import Dict, List, Optional, Tuple


class CSVValidator:
    """Validates CSV files for required columns"""
    
    # Possible column name variations for business names
    BUSINESS_NAME_VARIANTS = [
        'business name', 'business_name', 'name', 'company', 
        'company name', 'company_name', 'business', 'title'
    ]
    
    # Possible column name variations for website URLs
    WEBSITE_VARIANTS = [
        'website', 'website url', 'website_url', 'url', 'link',
        'web', 'site', 'homepage', 'domain', 'web address'
    ]
    
    @staticmethod
    def validate_csv(file_content: bytes) -> Dict:
        """
        Validate CSV file for required columns
        
        Args:
            file_content: Raw bytes of CSV file
            
        Returns:
            Dict with validation result and column mapping
        """
        try:
            # Decode file content
            text_content = file_content.decode('utf-8-sig')  # Handle BOM
            csv_reader = csv.DictReader(io.StringIO(text_content))
            
            # Get headers (lowercase for comparison)
            headers = [h.strip().lower() for h in csv_reader.fieldnames] if csv_reader.fieldnames else []
            
            if not headers:
                return {
                    'valid': False,
                    'error': 'CSV file has no headers',
                    'missing_columns': ['business_name', 'website']
                }
            
            # Find business name column
            business_col = None
            for variant in CSVValidator.BUSINESS_NAME_VARIANTS:
                if variant in headers:
                    business_col = variant
                    break
            
            # Find website column
            website_col = None
            for variant in CSVValidator.WEBSITE_VARIANTS:
                if variant in headers:
                    website_col = variant
                    break
            
            # Check if required columns exist
            missing = []
            if not business_col:
                missing.append('business_name')
            if not website_col:
                missing.append('website')
            
            if missing:
                return {
                    'valid': False,
                    'error': f'Missing required columns: {", ".join(missing)}',
                    'missing_columns': missing,
                    'found_headers': headers,
                    'suggestions': CSVValidator._suggest_columns(headers)
                }
            
            # Count rows
            row_count = sum(1 for _ in csv_reader)
            
            return {
                'valid': True,
                'business_name_column': business_col,
                'website_column': website_col,
                'headers': headers,
                'row_count': row_count,
                'message': f'CSV is valid with {row_count} rows'
            }
            
        except UnicodeDecodeError:
            return {
                'valid': False,
                'error': 'File encoding not supported. Please use UTF-8 encoding.'
            }
        except csv.Error as e:
            return {
                'valid': False,
                'error': f'Invalid CSV format: {str(e)}'
            }
        except Exception as e:
            return {
                'valid': False,
                'error': f'Error reading file: {str(e)}'
            }
    
    @staticmethod
    def _suggest_columns(headers: List[str]) -> Dict[str, List[str]]:
        """Suggest which columns might be business names or websites"""
        suggestions = {
            'possible_business_name': [],
            'possible_website': []
        }
        
        for header in headers:
            # Check for partial matches
            if any(variant in header for variant in ['name', 'business', 'company']):
                suggestions['possible_business_name'].append(header)
            if any(variant in header for variant in ['url', 'web', 'site', 'link']):
                suggestions['possible_website'].append(header)
        
        return suggestions


# Singleton instance
csv_validator = CSVValidator()
