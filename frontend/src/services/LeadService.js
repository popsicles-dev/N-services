import axios from 'axios';
import Papa from 'papaparse';

const API_BASE_URL = 'http://localhost:8000/api/leads';

class LeadService {
    async extractUrls(keyword, location) {
        const response = await axios.post(`${API_BASE_URL}/extract-urls`, {
            business_type: keyword,
            location: location,
            num_pages: 1
        });
        return response.data;
    }

    async getJobStatus(jobId) {
        const response = await axios.get(`${API_BASE_URL}/job/${jobId}`);
        return response.data;
    }

    async enrichContacts(filename) {
        const response = await axios.post(`${API_BASE_URL}/enrich-contacts`, {
            input_filename: filename
        });
        return response.data;
    }

    async rankSeo(filename) {
        const response = await axios.post(`${API_BASE_URL}/rank-seo`, {
            input_filename: filename
        });
        return response.data;
    }

    async fetchCsvPreview(jobId) {
        const response = await axios.get(`${API_BASE_URL}/download/${jobId}`, {
            responseType: 'text'
        });

        return new Promise((resolve, reject) => {
            Papa.parse(response.data, {
                complete: (results) => {
                    const rawRows = results.data.filter(row => row.length > 1 && row.some(cell => cell !== ''));
                    if (rawRows.length > 0) {
                        const headers = rawRows[0];
                        const dataRows = rawRows.slice(1).map((row, index) => ({
                            id: index,
                            data: row
                        }));
                        resolve({ headers, rows: dataRows });
                    } else {
                        resolve({ headers: [], rows: [] });
                    }
                },
                error: (err) => reject(err)
            });
        });
    }

    getDownloadUrl(jobId) {
        return `${API_BASE_URL}/download/${jobId}`;
    }

    generateCsv(headers, rows) {
        const csvContent = [headers, ...rows];
        return Papa.unparse(csvContent);
    }
}

export default new LeadService();
