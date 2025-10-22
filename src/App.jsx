// src/App.jsx

import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import InstructorReport from './components/InstructorReport';
import './App.css'

const App = () => {
  const [instructorData, setInstructorData] = useState([]);
  
  const handleDataLoaded = (data) => {
    setInstructorData(data);
    console.log(`Datos cargados: ${data.length} registros.`);
  };

  const dataIsLoaded = instructorData.length > 0;

  return (
    // 🚨 AJUSTE CLAVE: Eliminamos el padding horizontal del contenedor principal.
    // Usamos padding: '20px 0' para mantener el espacio vertical.
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '0 0', margin: '0 auto', width: '100%' }}>
      
      {/* Añadimos un padding horizontal a los elementos internos para que no toquen el borde de la ventana. */}
      <div style={{ padding: '0 20px' }}>
          <h1>📊 Informe de Horas de Instructores</h1>
          
          {!dataIsLoaded && (
            <FileUpload onDataLoaded={handleDataLoaded} />
          )}
      </div>
      
      {/* El InstructorReport y la línea divisoria se extienden al 100% */}
      {dataIsLoaded ? (
        <>
          <hr style={{ margin: '30px 0' }} />
          {/* El contenido de InstructorReport manejará su propio padding interno para las tarjetas */}
          <InstructorReport data={instructorData} /> 
        </>
      ) : (
        !dataIsLoaded && (
          <div style={{ padding: '0 20px' }}>
              <p style={{ marginTop: '20px', fontSize: '1.1em' }}>
                Por favor, cargue un archivo CSV o TXT con la data de programación para generar el informe.
              </p>
          </div>
        )
      )}
      
    </div>
  );
};

export default App;