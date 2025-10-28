// src/components/InstructorCard.jsx
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FF0000', '#009900'];

const InstructorCard = ({ instructorName, data, formatNumber }) => {
  // Formateador por defecto: punto como miles, 0 decimales
  const formatNumberWithSeparators = (number) => {
  // Verificamos si el valor es un número válido
  if (typeof number !== 'number' || isNaN(number)) {
    return '0'; // Retorna un valor por defecto si no es un número
  }

  // Usamos Intl.NumberFormat con la configuración regional de Colombia (es-CO)
  // 'minimumFractionDigits: 2' asegura que siempre haya al menos dos decimales.
  return new Intl.NumberFormat('es-CO', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 // Opcional: limita a dos decimales
  }).format(number);
};


  const monthlyData = data.filter(item => item.NOMBRE_INSTRUCTOR === instructorName);

  const tipoContrato = monthlyData.length > 0 ? monthlyData[0].TIPO_CONTRATO : 'N/A';
  const showOtrasHorasWarning = monthlyData.some(item => item.tieneOtrasHorasContrato);

  const totalEjecutado = monthlyData.reduce((sum, i) => sum + (i.horasEjecutadas || 0), 0);
  const totalProyectado = monthlyData.reduce((sum, i) => sum + (i.horasProyectadas || 0), 0);
  const totalDiferencia = totalEjecutado - totalProyectado;

  const summaryData = [{ name: 'Diferencia Total (Hrs)', diferencia: totalDiferencia }];
  const barColor = totalDiferencia < 0 ? COLORS[2] : COLORS[3];
  const totalProyectadoLabel = 'Horas Esperadas';

  return (
    <div style={{ width: 1200, borderRadius: 8, padding: 12, marginBottom: 16 }}>
      <h3>
        👤 {instructorName} 
        {showOtrasHorasWarning && <span style={{ color: 'red', marginLeft: 10, fontWeight: 'bold' }}>⚠️ OTRAS HORAS detectadas</span>}
      </h3>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, fontWeight: 'bold' }}>
        <span>Proyectado ({totalProyectadoLabel}): {formatNumberWithSeparators(totalProyectado)} hrs</span>
        <span>Ejecutado: {formatNumberWithSeparators(totalEjecutado)} hrs</span>
        <span style={{ color: totalDiferencia < 0 ? 'red' : 'green' }}>Diferencia: {formatNumberWithSeparators(totalDiferencia)} hrs</span>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {/* Gráfica Mensual */}
        <div style={{ flexBasis: '65%', width: 1200, height: 350 }}>
          <ResponsiveContainer height="100%">
            <BarChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="MES" height={50} style={{ fontSize: '0.7em' }} />
              <YAxis />
              <Tooltip formatter={(v) => [`${formatNumberWithSeparators(v)} hrs`]} />
              <Legend />
              <Bar dataKey="horasProyectadas" fill={COLORS[0]} name="Proyectado" />
              <Bar dataKey="horasEjecutadas" fill={COLORS[1]} name="Ejecutado" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfica Resumen */}
        <div style={{ flexBasis: '30%', minWidth: 250, height: 350 }}>
          <h4>Diferencia Total</h4>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summaryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" style={{ fontSize: '0.9em' }} />
              <YAxis />
              <Tooltip formatter={(v) => [`${formatNumberWithSeparators(v)} hrs`]} />
              <Legend payload={[{ value: `Diferencia: ${formatNumberWithSeparators(totalDiferencia)} hrs`, type: 'square', color: barColor }]} />
              <Bar dataKey="diferencia" fill={barColor} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default InstructorCard;
