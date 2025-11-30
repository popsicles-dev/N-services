import requests
import re
import pandas as pd
from bs4 import BeautifulSoup
from typing import List, Dict, Any
from config import settings


class ContactEnricherService:
    """Service for enriching business contacts by scraping websites."""
    
    def __init__(self):
        """Initialize the contact enricher service."""
        self.headers = {
            'User-Agent': settings.USER_AGENT
        }
        self.timeout = settings.REQUEST_TIMEOUT
    
    def extract_from_text(self, text: str) -> Dict[str, List[str]]:
        """Uses Regex to find emails and phone numbers in a block of text.
        
        Args:
            text: Text to search for contact information
            
        Returns:
            Dictionary with emails and phones lists
        """
        # Simple email regex
        emails = set(re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text))
        
        # US-centric phone number regex
        phones = set(re.findall(r'(\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4})', text))
        
        return {
            "emails": list(emails),
            "phones": list(phones)
        }
    
    def find_social_links(self, soup: BeautifulSoup) -> Dict[str, str]:
        """Searches the HTML for common social media domains in anchor tags.
        
        Args:
            soup: BeautifulSoup object of the page
            
        Returns:
            Dictionary of social media platform names to URLs
        """
        social_media = {}
        known_platforms = {
            'facebook.com': 'Facebook',
            'twitter.com': 'Twitter',
            'linkedin.com/company': 'LinkedIn',
            'instagram.com': 'Instagram'
        }
        
        for link in soup.find_all('a', href=True):
            href = link['href'].lower()
            for domain, name in known_platforms.items():
                if domain in href and name not in social_media:
                    social_media[name] = href
        
        return social_media
    
    def scrape_website_for_contacts(self, url: str) -> Dict[str, Any]:
        """Focused crawler to hit the homepage and common contact pages.
        
        Args:
            url: Website URL to scrape
            
        Returns:
            Dictionary with emails, phones, and social media links
        """
        results = {
            "emails": [],
            "phones": [],
            "social_media": {}
        }
        
        # Define priority URLs
        urls_to_check = [url]
        if not url.endswith('/'):
            base_url = url + '/'
        else:
            base_url = url
        
        urls_to_check.extend([
            base_url + "contact",
            base_url + "about-us",
            base_url + "contact-us"
        ])
        
        for target_url in urls_to_check:
            try:
                response = requests.get(
                    target_url,
                    headers=self.headers,
                    timeout=self.timeout,
                    allow_redirects=True
                )
                
                if response.status_code == 200:
                    soup = BeautifulSoup(response.content, 'html.parser')
                    page_text = soup.get_text()
                    
                    # Extract emails and phones
                    contact_info = self.extract_from_text(page_text)
                    results['emails'].extend(contact_info['emails'])
                    results['phones'].extend(contact_info['phones'])
                    
                    # Extract social media links
                    if not results['social_media']:
                        results['social_media'] = self.find_social_links(soup)
                    
                    # Remove duplicates
                    results['emails'] = list(set(results['emails']))
                    results['phones'] = list(set(results['phones']))
                    
                    # Stop if we found contacts
                    if (results['emails'] or results['phones']) and target_url != urls_to_check[0]:
                        break
                        
            except requests.exceptions.RequestException:
                pass
        
        return results
    
    def enrich_contacts(
        self,
        input_filename: str,
        progress_callback=None
    ) -> Dict:
        """Reads input CSV, enriches each URL, and writes to new enriched CSV.
        
        Args:
            input_filename: Name of input CSV file in outputs directory
            progress_callback: Optional callback for progress updates
            
        Returns:
            Dictionary with results and metadata
        """
        input_filepath = f"{settings.OUTPUT_DIR}/{input_filename}"
        output_filename = f"enriched_{input_filename}"
        output_filepath = f"{settings.OUTPUT_DIR}/{output_filename}"
        
        # Load the input CSV
        try:
            df_input = pd.read_csv(input_filepath)
            if 'Website URL' not in df_input.columns:
                raise ValueError("Input file must contain a 'Website URL' column")
        except FileNotFoundError:
            raise FileNotFoundError(f"Input file '{input_filename}' not found")
        
        # Define new columns for enrichment
        df_input['Email'] = 'N/A'
        df_input['Phone Number'] = 'N/A'
        df_input['Facebook'] = 'N/A'
        df_input['Twitter'] = 'N/A'
        df_input['LinkedIn'] = 'N/A'
        df_input['Instagram'] = 'N/A'
        df_input['Enrichment Status'] = 'Processed'
        
        total_rows = len(df_input)
        
        # Iterate through rows
        for index, row in df_input.iterrows():
            url = row['Website URL']
            
            # Ensure URL has scheme
            if not url.startswith('http'):
                full_url = "https://" + url
            else:
                full_url = url
            
            enrichment_data = self.scrape_website_for_contacts(full_url)
            
            # Update DataFrame
            df_input.loc[index, 'Email'] = ", ".join(enrichment_data['emails']) or 'N/A'
            df_input.loc[index, 'Phone Number'] = ", ".join(enrichment_data['phones']) or 'N/A'
            df_input.loc[index, 'Facebook'] = enrichment_data['social_media'].get('Facebook', 'N/A')
            df_input.loc[index, 'Twitter'] = enrichment_data['social_media'].get('Twitter', 'N/A')
            df_input.loc[index, 'LinkedIn'] = enrichment_data['social_media'].get('LinkedIn', 'N/A')
            df_input.loc[index, 'Instagram'] = enrichment_data['social_media'].get('Instagram', 'N/A')
            
            if df_input.loc[index, 'Email'] == 'N/A' and df_input.loc[index, 'Phone Number'] == 'N/A':
                df_input.loc[index, 'Enrichment Status'] = 'No Contact Found'
            
            # Call progress callback
            if progress_callback:
                progress_callback(index + 1, total_rows)
        
        # Filter out rows with no contact info found
        df_final = df_input[df_input['Enrichment Status'] != 'No Contact Found']
        
        # Save output
        df_final.to_csv(output_filepath, index=False)
        
        return {
            'total_processed': total_rows,
            'output_filename': output_filename,
            'input_filename': input_filename
        }
