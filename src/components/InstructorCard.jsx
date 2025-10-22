// src/components/InstructorCard.jsx

import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
} from 'recharts';

// Colores
const COLORS = ['#0088FE', '#00C49F', '#FF0000', '#009900']; 

const InstructorCard = ({ instructorName, data }) => {
  const monthlyData = data.filter(item => item.NOMBRE_INSTRUCTOR === instructorName);
  
  const tipoContrato = monthlyData.length > 0 ? monthlyData[0].TIPO_CONTRATO : 'N/A';
  const showOtrasHorasWarning = monthlyData.some(item => item.tieneOtrasHorasContrato);

  // 1. Preparar datos y aplicar el LÍMITE de 160 horas (solo a Contrato)
  const dataWithLimit = monthlyData.map(item => {
    // La lógica de proyección ahora se maneja completamente en InstructorReport.jsx,
    // aquí solo usamos los valores calculados: item.horasProyectadas
    
    const limitedHorasEjecutadas = (tipoContrato === 'Contrato' && item.horasEjecutadas > 160) 
      ? item.horasEjecutadas 
      : item.horasEjecutadas;

    return {
      ...item,
      horasEjecutadas: limitedHorasEjecutadas,
    };
  });


  // 2. Preparar datos para la gráfica de resumen total 
  const totalEjecutado = dataWithLimit.reduce((sum, item) => sum + item.horasEjecutadas, 0);
  const totalProyectado = dataWithLimit.reduce((sum, item) => sum + item.horasProyectadas, 0);
  const totalDiferencia = totalEjecutado - totalProyectado;

  const summaryData = [{
    name: 'Diferencia Total (Hrs)',
    diferencia: parseFloat(totalDiferencia.toFixed(1)),
  }];
  
  // Calcular el color de la tarjeta y la barra resumen
  let cardColor = 'rgba(255, 205, 86, 0.2)'; // Amarillo (neutral)
  if (showOtrasHorasWarning) {
      cardColor = 'rgba(255, 0, 0, 0.2)'; // Rojo (Advertencia de OTRAS HORAS en Contrato)
  } else if (totalDiferencia < -10) {
      cardColor = 'rgba(255, 99, 132, 0.2)'; // Rojo claro (Baja ejecución)
  } else if (totalDiferencia > 10) {
      cardColor = 'rgba(75, 192, 192, 0.2)'; // Verde claro (Alta ejecución)
  }
  
  const barColor = totalDiferencia < 0 ? COLORS[2] : COLORS[3]; // ROJO o VERDE oscuro

  // 🚨 AJUSTE DE ETIQUETA: Refleja la nueva fuente de datos.
  const totalProyectadoLabel = tipoContrato === 'Planta' 
    ? '' 
    : '8.0h * Días Hábiles';


  return (
    <div 
      style={{ 
       width:1200
      }}
    >
      <h3>
        👤 {instructorName} ({tipoContrato}) 
        {showOtrasHorasWarning && (
            <span style={{ color: 'red', marginLeft: '15px', fontSize: '0.8em', fontWeight: 'bold' }}>
                ⚠️ OTRAS HORAS detectadas (Contrato)
            </span>
        )}
      </h3>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontWeight: 'bold' }}>
        <span>
            Proyectado : {totalProyectado.toFixed(1)} hrs
        </span>
        <span>
            Ejecutado{tipoContrato === 'Contrato' && ' '}: {totalEjecutado.toFixed(1)} hrs
        </span>
        <span style={{ color: totalDiferencia < 0 ? 'red' : 'green' }}>Diferencia: {totalDiferencia.toFixed(1)} hrs</span>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        
        {/* Gráfica Mensual (Barras) - Comparación Proyectado vs Ejecutado */}
        <div style={{ flexBasis: '65%', width:1200, height: '350px' }}> 

          <ResponsiveContainer  height="100%">
            <BarChart data={dataWithLimit} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="MES" 
                angle={0} 
                textAnchor="middle" 
                interval={0} 
                height={50} 
                style={{ fontSize: '0.6em' }} 
              />
              <YAxis />
              <Tooltip formatter={(value) => [`${value.toFixed(1)} hrs`]} />
              <Legend />
              <Bar dataKey="horasProyectadas" fill={COLORS[0]} name="Proyectado" />
              <Bar 
                dataKey="horasEjecutadas" 
                fill={COLORS[1]} 
                name={`Ejecutado${tipoContrato === 'Contrato' ? ' (Límite)' : ''}`} 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfica de Resumen (Barra Única) */}
        <div style={{ flexBasis: '30%', minWidth: '250px', height: '350px' }}> 
          <h4>Diferencia Total</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summaryData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" interval={0} style={{ fontSize: '0.9em' }} /> 
              <YAxis /> 
              <Tooltip formatter={(value) => [`${value.toFixed(1)} hrs`]} />
              <Legend payload={[{ value: `Diferencia: ${totalDiferencia.toFixed(1)} hrs`, type: 'square', color: barColor }]} />
              <Bar dataKey="diferencia" fill={barColor} name="Diferencia Total" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default InstructorCard;