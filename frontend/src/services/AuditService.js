import axios from 'axios';
import Papa from 'papaparse';

const API_BASE_URL = 'http://localhost:8000/api/leads';

class AuditService {
    async listFiles() {
        const response = await axios.get(`${API_BASE_URL}/list-files`);
        return response.data;
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post(`${API_BASE_URL}/audit/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    }

    async runAudit(filename, limit) {
        const response = await axios.post(`${API_BASE_URL}/audit/run`, {
            input_filename: filename,
            limit: parseInt(limit)
        });
        return response.data;
    }

    async getAuditStatus(jobId) {
        const response = await axios.get(`${API_BASE_URL}/audit/job/${jobId}`);
        return response.data;
    }

    async fetchAuditPreview(jobId) {
        const response = await axios.get(`${API_BASE_URL}/audit/download/${jobId}`, {
            responseType: 'text'
        });

        return new Promise((resolve, reject) => {
            Papa.parse(response.data, {
                complete: (results) => {
                    const rows = results.data.filter(row => row.length > 1 && row.some(cell => cell !== ''));
                    resolve(rows);
                },
                header: false,
                skipEmptyLines: true,
                error: (err) => reject(err)
            });
        });
    }

    getDownloadUrl(jobId) {
        return `${API_BASE_URL}/audit/download/${jobId}`;
    }
}

export default new AuditService();
