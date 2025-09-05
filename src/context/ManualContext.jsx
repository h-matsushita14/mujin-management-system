import React, { createContext, useState, useContext } from 'react';

const ManualContext = createContext();

export const useManuals = () => useContext(ManualContext);

export const ManualProvider = ({ children }) => {
  const [manuals, setManuals] = useState([
    { title: 'オペレーションマニュアル', url: 'https://example.com/operation' },
    { title: 'トラブルシューティング', url: 'https://example.com/troubleshooting' },
  ]);

  const updateManuals = (newManuals) => {
    setManuals(newManuals);
  };

  return (
    <ManualContext.Provider value={{ manuals, updateManuals }}>
      {children}
    </ManualContext.Provider>
  );
};
