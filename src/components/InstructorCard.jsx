import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FF0000', '#009900'];
const RED_MAIN = '#FF6B6B';
const RED_LIGHT = '#FF9E9E';
const defaultFormat = (num) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(num);
const formatNumberWithSeparators = (number) => {
  if (typeof number !== 'number' || isNaN(number)) {
    return '0';
  }
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number);
};
const InstructorCard = ({ instructorName, data, formatNumber = defaultFormat }) => {
  const monthlyData = data.filter(item => item.NOMBRE_INSTRUCTOR === instructorName);
  const tipoContrato = monthlyData.length > 0 ? monthlyData[0].TIPO_CONTRATO : 'N/A';
  const showOtrasHorasWarning = monthlyData.some(item => item.tieneOtrasHorasContrato);

  // Totales encabezado
  const totalProyectado = monthlyData.reduce((sum, i) => sum + (i.horasProyectadas || 0), 0);
  const totalEjecutado = monthlyData.reduce((sum, i) => {
    if (tipoContrato === 'Planta') return sum + ((i.horasFichas || 0) + (i.otrasHoras || 0));
    return sum + (i.horasEjecutadas || 0);
  }, 0);
  const totalDiferencia = totalEjecutado - totalProyectado;

  const summaryData = [{ name: 'Diferencia Total (Hrs)', diferencia: totalDiferencia }];
  const barColor = totalDiferencia < 0 ? COLORS[2] : COLORS[3];
  const totalProyectadoLabel = 'Horas Esperadas';

  // Data para la gráfica mensual + flag por punto de “bajo a lo proyectado”
  const chartData = monthlyData.map(it => {
    const ejecutadoF = (it.horasFichas || 0);
    const ejecutadoO = (it.otrasHoras || 0);
    const ejecutadoTotal = ejecutadoF + ejecutadoO;
    const underPerformed = tipoContrato === 'Planta' && ejecutadoTotal < (it.horasProyectadas || 0);

    return {
      ...it,
      ejecutadoFichas: tipoContrato === 'Planta' ? ejecutadoF : undefined,
      ejecutadoOtras: tipoContrato === 'Planta' ? ejecutadoO : undefined,
      _underPerformed: underPerformed, // <- para colorear por punto
    };
  });

  // Tooltip personalizado (muestra Fichas, Otras, Total y Proyectado)
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    const row = payload[0].payload || {};

    const fichas = (tipoContrato === 'Planta' ? row.ejecutadoFichas : row.horasFichas) || 0;
    const otras = (tipoContrato === 'Planta' ? row.ejecutadoOtras : row.otrasHoras) || 0;
    const totalFO = fichas + otras;
    const proy = row.horasProyectadas || 0;

    return (
      <div style={{ background: '#fff', border: '1px solid #ddd', padding: '8px 10px', borderRadius: 6 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{label}</div>

        
        <div style={{ color: (otras + fichas) < proy ? RED_MAIN : '#00C49F' }}>Fichas : <strong>{formatNumberWithSeparators(fichas)}</strong> hrs</div>
        <div style={{ color: (otras + fichas) < proy ? RED_LIGHT : '#009900', marginBottom: 6 }}>Otras  : <strong>{formatNumberWithSeparators(otras)}</strong> hrs</div>
        <div style={{ marginBottom: 6 }}>
          <strong>Total (Fichas + Otras): {formatNumberWithSeparators(totalFO)} hrs</strong>
        </div>
        <div style={{ color: '#0088FE' }}>Proyectado : <strong>{formatNumberWithSeparators(proy)}</strong> hrs</div>
      </div>
    );
  };

  return (
    <div
      style={{
        width: 1200,
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        border: '1px solid #ddd',
      }}
    >
      <h3>
        👤 {instructorName}
        {showOtrasHorasWarning && (
          <span style={{ color: 'red', marginLeft: 10, fontWeight: 'bold' }}>
            ⚠️ OTRAS HORAS detectadas
          </span>
        )}
      </h3>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, fontWeight: 'bold' }}>
        <span>Proyectado ({totalProyectadoLabel}): {formatNumberWithSeparators(totalProyectado)} hrs</span>
        <span>Ejecutado: {formatNumberWithSeparators(totalEjecutado)} hrs</span>
        <span style={{ color: totalDiferencia < 0 ? 'red' : 'green' }}>
          Diferencia: {formatNumberWithSeparators(totalDiferencia)} hrs
        </span>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {/* Gráfica mensual */}
        <div style={{ flexBasis: '65%', width: 1200, height: 350 }}>
          <ResponsiveContainer height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="MES" height={50} style={{ fontSize: '0.7em' }} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {/* Proyectado (siempre azul) */}
              <Bar dataKey="horasProyectadas" fill={COLORS[0]} name="Proyectado" />

              {/* Ejecutado:
                  - Planta: barra apilada; cada punto se tiñe rojo si (Fichas+Otras) < Proyectado
                  - Contrato: barra única normal */}
              {tipoContrato === 'Planta' ? (
                <>
                  <Bar dataKey="ejecutadoFichas" stackId="ejecutado" name="Fichas">
                    {chartData.map((entry, idx) => (
                      <Cell key={`f-${idx}`} fill={entry._underPerformed ? RED_MAIN : '#00C49F'} />
                    ))}
                  </Bar>
                  <Bar dataKey="ejecutadoOtras" stackId="ejecutado" name="Otras" >
                    {chartData.map((entry, idx) => (
                      <Cell key={`o-${idx}`} fill={entry._underPerformed ? RED_LIGHT : '#009900'} />
                    ))}
                  </Bar>
                </>
              ) : (
                <Bar dataKey="horasEjecutadas" fill="#00C49F" name="Ejecutado" />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfica resumen */}
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
