import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  getAuthHeaders() {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      ...options
    };

    // Handle FormData (for file uploads) - don't set Content-Type
    if (options.body instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    try {
      const response = await fetch(url, config);
      
      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Server returned non-JSON response: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Request failed: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth endpoints
  async login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async signup(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // Consultation endpoints
  async getConsultations() {
    return this.request('/consultations');
  }

  async saveSummary(summaryData) {
    return this.request('/consultations', {
      method: 'POST',
      body: JSON.stringify(summaryData)
    });
  }

  async getConsultationById(id) {
    return this.request(`/consultations/${id}`);
  }

  async updateConsultation(id, updateData) {
    return this.request(`/consultations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  async deleteConsultation(id) {
    return this.request(`/consultations/${id}`, {
      method: 'DELETE'
    });
  }

  // User endpoints
  async updateProfile(userData) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  async changePassword(currentPassword, newPassword) {
    return this.request('/users/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  }

  // Audio upload (commented out until implemented)
  // Audio endpoints

async uploadAudio(audioBlob) {
  const formData = new FormData();
  formData.append('audio', audioBlob);

  return this.request('/audio/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.TOKEN)}`
    },
    body: formData
  });
}

async getAudioStatus(consultationId) {
  return this.request(`/audio/status/${consultationId}`);
}
}

export default new ApiService();