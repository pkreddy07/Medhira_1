class GoogleDriveService {
  constructor() {
    this.initialized = false;
    this.gapiLoaded = false;
    this.gisLoaded = false;
    this.clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    this.tokenClient = null;
    this.accessToken = null;
  }

  async initialize() {
    if (this.initialized) return;

    return new Promise((resolve, reject) => {
      let scriptsLoaded = 0;
      let hasError = false;

      // Load Google API Client (for Drive API)
      const script1 = document.createElement('script');
      script1.src = 'https://apis.google.com/js/api.js';
      script1.onload = () => {
        console.log('✅ Google API client loaded');
        
        // Initialize gapi client
        gapi.load('client', async () => {
          try {
            await gapi.client.init({
              // Remove apiKey from here - it's not needed for OAuth
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
            });
            this.gapiLoaded = true;
            console.log('✅ Google Drive API client initialized');
            scriptsLoaded++;
            if (scriptsLoaded === 2 && !hasError) {
              this.initialized = true;
              resolve();
            }
          } catch (error) {
            hasError = true;
            console.error('Google API init error:', error);
            // Continue anyway - the API might still work
            this.gapiLoaded = true;
            scriptsLoaded++;
            if (scriptsLoaded === 2 && !hasError) {
              this.initialized = true;
              resolve();
            }
          }
        });
      };
      script1.onerror = () => {
        hasError = true;
        reject(new Error('Failed to load Google API client'));
      };

      // Load Google Identity Services (for OAuth)
      const script2 = document.createElement('script');
      script2.src = 'https://accounts.google.com/gsi/client';
      script2.onload = () => {
        console.log('✅ Google Identity Services loaded');
        
        this.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          // Use broader scope for folder creation
          scope: 'https://www.googleapis.com/auth/drive',
          callback: (response) => {
            if (response.error) {
              console.error('❌ OAuth callback error:', response);
              return;
            }
            this.accessToken = response.access_token;
            localStorage.setItem('google_drive_token', response.access_token);
            console.log('✅ Token received successfully');
          },
        });

        this.gisLoaded = true;
        scriptsLoaded++;
        if (scriptsLoaded === 2 && !hasError) {
          this.initialized = true;
          resolve();
        }
      };
      script2.onerror = () => {
        hasError = true;
        reject(new Error('Failed to load Google Identity Services'));
      };

      document.head.appendChild(script1);
      document.head.appendChild(script2);
    });
  }

  async authenticate() {
    if (!this.initialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      // Check if we already have a valid token
      const storedToken = localStorage.getItem('google_drive_token');
      if (storedToken && this.isTokenValid(storedToken)) {
        this.accessToken = storedToken;
        console.log('✅ Using stored token');
        resolve(storedToken);
        return;
      }

      console.log('🔧 Requesting new token...');
      
      // Request a new token
      this.tokenClient.callback = (response) => {
        if (response.error) {
          console.error('❌ Authentication failed:', response);
          reject(new Error(response.error_description || 'Authentication failed'));
          return;
        }
        
        this.accessToken = response.access_token;
        localStorage.setItem('google_drive_token', response.access_token);
        console.log('✅ New token received');
        resolve(response.access_token);
      };

      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  isTokenValid(token) {
    if (!token) return false;
    
    try {
      // Check if token is expired
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = tokenData.exp * 1000;
      return Date.now() < expirationTime;
    } catch {
      return token.length > 100;
    }
  }

  async ensureFolder() {
    try {
      console.log('🔧 Checking for existing folder...');
      
      // Use direct fetch instead of gapi.client for better error handling
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='Patient Summaries' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!searchResponse.ok) {
        const errorData = await searchResponse.json();
        throw new Error(`Folder search failed: ${errorData.error?.message || searchResponse.statusText}`);
      }

      const searchData = await searchResponse.json();

      if (searchData.files && searchData.files.length > 0) {
        console.log('✅ Folder already exists:', searchData.files[0].id);
        return searchData.files[0].id;
      }

      console.log('🔧 Creating new folder...');
      const createResponse = await fetch(
        'https://www.googleapis.com/drive/v3/files',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'Patient Summaries',
            mimeType: 'application/vnd.google-apps.folder',
            description: 'Patient consultation summaries generated by Patient-Doctor Summarizer'
          })
        }
      );

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(`Folder creation failed: ${errorData.error?.message || createResponse.statusText}`);
      }

      const folderData = await createResponse.json();
      console.log('✅ Folder created:', folderData.id);
      return folderData.id;

    } catch (error) {
      console.error('❌ Folder operation failed:', error);
      throw new Error(`Failed to create folder: ${error.message}`);
    }
  }

  async uploadPDF(pdfBlob, fileName, summaryData) {
    try {
      console.log('🔧 Starting PDF upload...');
      
      // Ensure we have a valid token
      if (!this.accessToken || !this.isTokenValid(this.accessToken)) {
        await this.authenticate();
      }

      const folderId = await this.ensureFolder();

      const metadata = {
        name: fileName,
        mimeType: 'application/pdf',
        parents: [folderId],
        description: `Medical summary for ${summaryData.patientName}`,
      };

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', pdfBlob);

      console.log('🔧 Uploading file to Google Drive...');
      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Upload failed:', response.status, errorData);
        throw new Error(`Upload failed: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ File uploaded successfully:', result);
      return result;

    } catch (error) {
      console.error('❌ PDF upload failed:', error);
      throw error;
    }
  }

  async generatePDF(summaryData) {
    const pdfContent = `
PATIENT MEDICAL SUMMARY
Patient-Doctor Summarizer
Generated: ${new Date().toLocaleDateString()}

================================================================================
PATIENT INFORMATION
================================================================================
Name: ${summaryData.patientName}
Age: ${summaryData.age}
Gender: ${summaryData.gender}

================================================================================
SYMPTOMS & CHIEF COMPLAINT
================================================================================
${summaryData.symptoms}

================================================================================
MEDICAL HISTORY
================================================================================
${summaryData.history || 'No significant medical history noted'}

================================================================================
EXAMINATION FINDINGS
================================================================================
${summaryData.examination || 'No examination findings recorded'}

================================================================================
DIAGNOSIS
================================================================================
${summaryData.diagnosis}

================================================================================
MEDICATION & TREATMENT
================================================================================
${summaryData.medication || 'No medication provided'}

================================================================================
FOLLOW-UP INSTRUCTIONS
================================================================================
${summaryData.followUp || 'No specific follow-up instructions'}

--------------------------------------------------------------------------------
This document was automatically generated by Patient-Doctor Summarizer.
Confidential medical information - For authorized personnel only.
--------------------------------------------------------------------------------
    `.trim();

    return new Blob([pdfContent], { type: 'application/pdf' });
  }

  async uploadSummary(summaryData) {
    try {
      console.log('🚀 Starting Google Drive upload process...');
      
      if (!summaryData.patientName) {
        throw new Error('Patient name is required');
      }
      if (!summaryData.diagnosis) {
        throw new Error('Diagnosis is required');
      }

      const pdfBlob = await this.generatePDF(summaryData);
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `Medical_Summary_${summaryData.patientName.replace(/\s+/g, '_')}_${timestamp}.pdf`;
      
      console.log('🔧 Generated PDF, now uploading...');
      const result = await this.uploadPDF(pdfBlob, fileName, summaryData);
      
      console.log('✅ Upload completed successfully');
      return {
        success: true,
        driveLink: result.webViewLink,
        fileId: result.id,
        fileName: fileName,
        message: 'Summary successfully saved to Google Drive!'
      };

    } catch (error) {
      console.error('❌ Upload summary failed:', error);
      return {
        success: false,
        error: error.message,
        message: `Failed to upload: ${error.message}`
      };
    }
  }

  isConnected() {
    const token = localStorage.getItem('google_drive_token');
    const isConnected = !!(token && this.isTokenValid(token));
    return isConnected;
  }

  disconnect() {
    if (this.accessToken && google?.accounts?.oauth2?.revoke) {
      google.accounts.oauth2.revoke(this.accessToken, () => {
        console.log('✅ Token revoked');
      });
    }
    
    localStorage.removeItem('google_drive_token');
    this.accessToken = null;
    this.initialized = false;
    console.log('✅ Disconnected from Google Drive');
  }

  async testConnection() {
    try {
      console.log('🧪 Testing Google Drive connection...');
      
      await this.initialize();
      const token = await this.authenticate();
      const folderId = await this.ensureFolder();
      
      return {
        success: true,
        message: 'Google Drive connection successful!',
        hasToken: !!token,
        folderId: folderId,
        initialized: this.initialized
      };
    } catch (error) {
      console.error('Connection test error:', error);
      return {
        success: false,
        message: `Connection test failed: ${error.message}`,
        error: error.message
      };
    }
  }
}

export default new GoogleDriveService();