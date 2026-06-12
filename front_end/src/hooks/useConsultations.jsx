import { useState, useEffect, createContext, useContext } from 'react';
import apiService from '../services/api';
import { useAuth } from './useAuth'; // Import auth hook

// Create context
const ConsultationsContext = createContext();

// Provider component
export const ConsultationsProvider = ({ children }) => {
  const { user } = useAuth(); // Get current user
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create user-specific storage key
  const getStorageKey = () => {
    return user ? `consultations_${user.id}` : 'consultations_anonymous';
  };

  // Load consultations for current user
  const loadConsultations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (user) {
        // Try to load from backend first
        try {
          const data = await apiService.getConsultations();
          setConsultations(data.consultations || []);
          // Also save to localStorage as backup
          localStorage.setItem(getStorageKey(), JSON.stringify(data.consultations || []));
        } catch (backendError) {
          console.warn('Backend load failed, using localStorage:', backendError);
          // Fallback to localStorage
          const stored = localStorage.getItem(getStorageKey());
          if (stored) {
            setConsultations(JSON.parse(stored));
          }
        }
      } else {
        // No user logged in, use anonymous storage
        const stored = localStorage.getItem(getStorageKey());
        if (stored) {
          setConsultations(JSON.parse(stored));
        }
      }
    } catch (err) {
      console.error('Failed to load consultations:', err);
      setError('Failed to load consultation history');
    } finally {
      setLoading(false);
    }
  };

  // Add consultation for current user
  const addConsultation = async (consultationData) => {
    try {
      setError(null);
      
      let newConsultation;
      
      if (user) {
        // Try to save to backend first
        try {
          const response = await apiService.saveSummary(consultationData);
          newConsultation = {
            id: response.consultation?._id || response.consultation?.id || Date.now().toString(),
            ...consultationData,
            userId: user.id, // Store user ID
            createdAt: new Date().toISOString(),
            driveLink: response.driveLink,
            fileId: response.fileId
          };
        } catch (backendError) {
          console.warn('Backend save failed, using localStorage:', backendError);
          // Fallback to localStorage
          newConsultation = {
            id: Date.now().toString(),
            ...consultationData,
            userId: user.id, // Store user ID
            createdAt: new Date().toISOString(),
          };
        }
      } else {
        // No user logged in, use localStorage only
        newConsultation = {
          id: Date.now().toString(),
          ...consultationData,
          userId: 'anonymous',
          createdAt: new Date().toISOString(),
        };
      }

      // Update state
      const updatedConsultations = [newConsultation, ...consultations];
      setConsultations(updatedConsultations);
      
      // Save to user-specific localStorage
      localStorage.setItem(getStorageKey(), JSON.stringify(updatedConsultations));
      
      return newConsultation;
    } catch (error) {
      console.error('Failed to add consultation:', error);
      setError('Failed to save consultation');
      throw error;
    }
  };

  // Clear all consultations for current user
  const clearConsultations = () => {
    setConsultations([]);
    localStorage.removeItem(getStorageKey());
  };

  const deleteConsultation = async (consultationId) => {
    try {
      setError(null);

      if (user) {
        await apiService.deleteConsultation(consultationId);
      }

      const updatedConsultations = consultations.filter(consultation =>
        (consultation._id || consultation.id) !== consultationId
      );

      setConsultations(updatedConsultations);
      localStorage.setItem(getStorageKey(), JSON.stringify(updatedConsultations));
    } catch (error) {
      console.error('Failed to delete consultation:', error);
      setError('Failed to delete consultation');
      throw error;
    }
  };

  // Load consultations when user changes
  useEffect(() => {
    loadConsultations();
  }, [user?.id]); // Reload when user ID changes

  const value = {
    consultations,
    loading,
    error,
    addConsultation,
    refreshConsultations: loadConsultations,
    clearConsultations,
    deleteConsultation,
    setError
  };

  return (
    <ConsultationsContext.Provider value={value}>
      {children}
    </ConsultationsContext.Provider>
  );
};

// Hook
export const useConsultations = () => {
  const context = useContext(ConsultationsContext);
  if (!context) {
    throw new Error('useConsultations must be used within ConsultationsProvider');
  }
  return context;
};

export default useConsultations;