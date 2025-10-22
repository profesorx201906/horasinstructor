// src/components/FileUpload.jsx

import React, { useState } from 'react';

// Helper para limpiar y convertir valores numéricos: maneja separadores de miles (.), coma decimal (,)
const cleanNumber = (value) => {
    // 1. Reemplaza el separador de miles (punto) por nada
    // 2. Reemplaza la coma decimal (,) por el punto decimal (.)
    const cleaned = String(value).replace(/\./g, '').replace(/,/g, '.').trim();
    const result = parseFloat(cleaned);
    return isNaN(result) ? 0 : result;
};

// Lógica de parseo ajustada para el delimitador ";" y la estructura de columnas
const parseFileContent = (text) => {
  // Usamos \r\n para manejar saltos de línea comunes en archivos CSV exportados desde Excel
  const lines = text.trim().split('\r\n'); 
  if (lines.length <= 1) return [];

  const headers = lines[0].split(';').map(header => header.trim().replace(/"/g, ''));
  const data = [];

  // Definición de los nombres de columna esperados
  const COL_NOMBRE_INSTRUCTOR = 'NOMBRE_INSTRUCTOR';
  const COL_NOMBRE_MES = 'NOMBRE-MES';
  const COL_HORAS_FICHAS = 'HORA ASOCIADAS A FICHAS';
  const COL_OTRAS_HORAS = 'OTRAS HORAS';
  const COL_DIAS_HABILES = 'DÍAS HABILES';
  const COL_CARGO = 'CARGO'; 

  // Función para obtener el índice de forma segura
  const getIndex = (headerName) => headers.indexOf(headerName);

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';').map(val => val.trim().replace(/"/g, ''));
    
    // Verificación de que la línea tiene suficientes columnas y no está vacía
    if (values.length >= headers.length && values.join('').length > 0) { 
      const record = {};
      
      const horasFichas = values[getIndex(COL_HORAS_FICHAS)];
      const otrasHoras = values[getIndex(COL_OTRAS_HORAS)];
      const diasHabiles = values[getIndex(COL_DIAS_HABILES)];
      const cargo = values[getIndex(COL_CARGO)] || '';
      
      // Mapea valores
      record['NOMBRE_INSTRUCTOR'] = values[getIndex(COL_NOMBRE_INSTRUCTOR)] || 'N/A';
      record['MES'] = values[getIndex(COL_NOMBRE_MES)] || 'N/A';
      
      // Aplicar cleanNumber
      record['HORAS_ASOCIADAS_A_FICHAS'] = cleanNumber(horasFichas);
      record['OTRAS_HORAS'] = cleanNumber(otrasHoras);
      record['DIAS_HABILES'] = parseInt(diasHabiles || 0, 10); 
      
      // Determinar TIPO_CONTRATO para la proyección de horas
      record['TIPO_CONTRATO'] = cargo.toUpperCase().includes('PLANTA') ? 'Planta' : 'Contrato';
      
      data.push(record);
    }
  }
  return data;
};

const FileUpload = ({ onDataLoaded }) => {
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
      setLoading(true);
      setError(null);
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target.result;
          const data = parseFileContent(content); 
          
          if (data.length > 0) {
            onDataLoaded(data);
            setError(null);
          } else {
            setError('El archivo parece estar vacío o el formato es incorrecto.');
            onDataLoaded([]);
          }
          
        } catch (err) {
          console.error("Error al procesar el archivo:", err);
          setError('Ocurrió un error al leer o procesar el archivo.');
          onDataLoaded([]);
        } finally {
          setLoading(false);
        }
      };

      reader.onerror = () => {
        setLoading(false);
        setError('Error al leer el archivo. Intente de nuevo.');
        onDataLoaded([]);
      };

      // Usar 'ISO-8859-1' para manejar la ñ y tildes comunes en archivos CSV latinos (ANSI/Windows-1252)
      reader.readAsText(file, 'ISO-8859-1'); 
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '5px', marginBottom: '20px' }}>
      <h3>Cargar Archivo de Programación 📄</h3>
      <input 
        type="file" 
        accept=".csv, .txt" 
        onChange={handleFileChange}
        disabled={loading}
        style={{ marginBottom: '10px' }}
      />
      
      {fileName && !loading && !error && (
        <p>✅ Archivo cargado: **{fileName}**</p>
      )}
      
      {loading && <p>Cargando y procesando datos... por favor espere.</p>}
      
      {error && <p style={{ color: 'red' }}>❌ Error: {error}</p>}
    </div>
  );
};

export default FileUpload;