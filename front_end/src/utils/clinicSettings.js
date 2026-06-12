const STORAGE_KEY = 'medhira_clinic_settings';

export const DEFAULT_CLINIC_SETTINGS = {
  clinicName: '',
  doctorName: '',
  qualification: '',
  registrationNo: '',
  address: '',
  phone: '',
  email: '',
};

export const getClinicSettings = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULT_CLINIC_SETTINGS, ...JSON.parse(stored) } : { ...DEFAULT_CLINIC_SETTINGS };
  } catch {
    return { ...DEFAULT_CLINIC_SETTINGS };
  }
};

export const saveClinicSettings = (settings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};
