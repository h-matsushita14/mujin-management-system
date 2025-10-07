import React, { createContext, useState, useContext, useEffect } from 'react';
import { EXTERNAL_SERVICES } from '../config/externalServices';

const ManualContext = createContext();

export const useManuals = () => useContext(ManualContext);

export const ManualProvider = ({ children }) => {
  const [manuals, setManuals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch manuals from GAS API
  const fetchManuals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${EXTERNAL_SERVICES.gasApi.v2.url}?type=manuals`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json(); // data is now the array directly
      // Map the incoming data to the expected format { title, url }
      const transformedManuals = data.map(item => ({
        title: item['マニュアル名'],
        url: item['URL']
      }));
      setManuals(transformedManuals);
    } catch (err) {
      console.error("Failed to fetch manuals:", err);
      setError(err.message);
      setManuals([]); // Set to empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  // Function to save manuals to GAS API
  const saveManuals = async (manualsToSave) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${EXTERNAL_SERVICES.gasApi.v2.url}?type=manuals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `action=updateManuals&contents=${JSON.stringify(manualsToSave)}`,
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success === false) {
        throw new Error(data.error || 'Failed to save manuals to GAS.');
      }
      setManuals(manualsToSave); // Update local state only after successful save
    } catch (err) {
      console.error("Failed to save manuals:", err);
      setError(err.message);
      // Optionally, re-fetch to revert to last saved state if save failed
      // fetchManuals();
    } finally {
      setIsLoading(false);
    }
  };

  // Function to upload PDF and add manual entry
  const uploadPdfAndAddManual = async (file, title) => {
    setIsLoading(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      return new Promise((resolve, reject) => {
        reader.onload = async () => {
          const base64Data = reader.result.split(',')[1]; // Get base64 part
          const formData = new URLSearchParams();
          formData.append('action', 'uploadPdf');
          formData.append('fileName', file.name);
          formData.append('mimeType', file.type);
          formData.append('data', base64Data);

          const response = await fetch(`${EXTERNAL_SERVICES.gasApi.v2.url}?type=manuals`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          if (data.success === false) {
            throw new Error(data.error || 'Failed to upload PDF to Google Drive.');
          }

          // After successful upload, add the new manual to the list and save
          const newManual = { title: title || file.name, url: data.url };
          const updatedManuals = [...manuals, newManual];
          await saveManuals(updatedManuals); // This will also update local state
          resolve(newManual);
        };
        reader.onerror = (err) => {
          console.error("FileReader error:", err);
          setError("Failed to read file.");
          setIsLoading(false);
          reject(err);
        };
      });
    } catch (err) {
      console.error("Failed to upload PDF and add manual:", err);
      setError(err.message);
      setIsLoading(false);
      throw err; // Re-throw to be caught by calling component
    }
  };


  // Initial fetch of manuals
  useEffect(() => {
    fetchManuals();
  }, []);

  // updateManuals now just calls saveManuals
  const updateManuals = (newManuals) => {
    saveManuals(newManuals);
  };

  return (
    <ManualContext.Provider value={{ manuals, updateManuals, uploadPdfAndAddManual, isLoading, error }}>
      {children}
    </ManualContext.Provider>
  );
};
