import React, { useState, useMemo } from 'react';
import InstructorCard from './InstructorCard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FF0000', '#009900'];
const formatNumber = (num) => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(num);
const normalizeMesKey = (mes) => String(mes ?? '').toUpperCase().trim();

// ===== Agrupar por Instructor-Mes y calcular campos =====
const calculateHours = (data) => {
  const allInstructorNames = [...new Set(
    data.map(item => String(item.NOMBRE_INSTRUCTOR ?? 'N/A'))
  )].sort();

  const grouped = data.reduce((acc, current) => {
    const {
      NOMBRE_INSTRUCTOR, MES, DIAS_HABILES, TIPO_CONTRATO,
      HORAS_ASOCIADAS_A_FICHAS, OTRAS_HORAS, HORAS_ESPERADAS
    } = current;

    const monthKey = normalizeMesKey(MES) || 'N/A';
    const key = `${NOMBRE_INSTRUCTOR}-${monthKey}`;

    const fichas = Number(HORAS_ASOCIADAS_A_FICHAS) || 0;
    const otras  = Number(OTRAS_HORAS) || 0;
    const proy   = Number(HORAS_ESPERADAS) || 0;

    if (!acc[key]) {
      acc[key] = {
        NOMBRE_INSTRUCTOR,
        MES: monthKey,
        TIPO_CONTRATO,
        horasProyectadas: proy,
        // acumuladores detallados:
        horasFichas: 0,
        otrasHoras: 0,
        // compat: total ejecutado (fichas + otras)
        horasEjecutadas: 0,
        diasHabiles: Number(DIAS_HABILES) || 0,
        tieneOtrasHorasContrato: TIPO_CONTRATO !== 'Planta' && otras > 0,
      };
    }

    acc[key].horasFichas     += fichas;
    acc[key].otrasHoras      += otras;
    acc[key].horasEjecutadas += (fichas + otras);

    return acc;
  }, {});

  const aggregatedArray = Object.values(grouped).sort((a, b) =>
    a.NOMBRE_INSTRUCTOR.localeCompare(b.NOMBRE_INSTRUCTOR)
  );

  return { allInstructorNames, aggregatedArray };
};

const InstructorReport = ({ data }) => {
  const [selectedInstructor, setSelectedInstructor] = useState('TODOS');
  const [selectedCargo, setSelectedCargo] = useState('TODOS');

  // 1) Agrupación
  const { allInstructorNames, aggregatedArray } = useMemo(() => calculateHours(data), [data]);

  const cargoTypes = ['Planta', 'Contrato'];

  // 2) Resumen global/por cargo con totales y (Fichas/Otras) por mes
  const summaryDataForChart = useMemo(() => {
    if (selectedInstructor !== 'TODOS') return { summaryArray: [], totals: {} };

    const filtered = selectedCargo === 'TODOS'
      ? aggregatedArray
      : aggregatedArray.filter(item => item.TIPO_CONTRATO === selectedCargo);

    const monthlyTotals = filtered.reduce((acc, item) => {
      const { MES, horasProyectadas, horasEjecutadas, TIPO_CONTRATO, horasFichas, otrasHoras } = item;

      if (!acc[MES]) {
        acc[MES] = {
          MES,
          totalProyectado: 0,
          totalEjecutado: 0,   // con tope (solo Contrato)
          totalFichasRaw: 0,   // sin tope
          totalOtrasRaw: 0,    // sin tope
        };
      }

      // tope ejecutado=160 solo para Contrato (en el resumen)
      const limitedEjecutado = (TIPO_CONTRATO === 'Contrato' && horasEjecutadas > 160)
        ? 160
        : horasEjecutadas;

      acc[MES].totalProyectado += (horasProyectadas || 0);
      acc[MES].totalEjecutado  += (limitedEjecutado || 0);
      acc[MES].totalFichasRaw  += (horasFichas || 0);
      acc[MES].totalOtrasRaw   += (otrasHoras || 0);

      return acc;
    }, {});

    const summaryArray = Object.values(monthlyTotals).map(row => ({
      ...row,
      diferencia: row.totalEjecutado - row.totalProyectado,
    }));

    const totalEjecutado  = summaryArray.reduce((s, r) => s + r.totalEjecutado, 0);
    const totalProyectado = summaryArray.reduce((s, r) => s + r.totalProyectado, 0);
    const totalDiferencia = totalEjecutado - totalProyectado;
    const differenceData  = [{ name: 'Diferencia Total (Hrs)', diferencia: totalDiferencia }];

    return { summaryArray, totals: { totalEjecutado, totalProyectado, totalDiferencia, differenceData } };
  }, [selectedCargo, selectedInstructor, aggregatedArray]);

  const filteredInstructorNames = useMemo(() => {
    if (selectedCargo === 'TODOS') return allInstructorNames;
    const filtered = aggregatedArray
      .filter(item => item.TIPO_CONTRATO === selectedCargo)
      .map(item => item.NOMBRE_INSTRUCTOR);
    return [...new Set(filtered)].sort();
  }, [selectedCargo, aggregatedArray, allInstructorNames]);

  const instructorsToDisplay = selectedInstructor !== 'TODOS' ? [selectedInstructor] : [];

  // 3) Tooltip personalizado del resumen mensual
  const CustomMonthlyTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    // Objeto completo del punto
    const row = payload[0].payload || {};

    const fichas   = row.totalFichasRaw || 0;
    const otras    = row.totalOtrasRaw  || 0;
    const totalFO  = fichas + otras; // <-- Total Fichas + Otras (sin tope)
    const proy     = row.totalProyectado || 0;

    return (
      <div style={{ background: '#fff', border: '1px solid #ddd', padding: '8px 10px', borderRadius: 6 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 8, textTransform: 'capitalize' }}>{label}</div>
        <div style={{ color: '#00C49F' }}>Fichas : <strong>{formatNumber(fichas)}</strong> hrs</div>
        <div style={{ color: '#009900', marginBottom: 6 }}>Otras  : <strong>{formatNumber(otras)}</strong> hrs</div>
        <div style={{ marginBottom: 6 }}>
          <strong>Total (Fichas + Otras): {formatNumber(totalFO)} hrs</strong>
        </div>
        <div style={{ color: '#0088FE' }}>Proyectado : <strong>{formatNumber(proy)}</strong> hrs</div>
      </div>
    );
  };

  // 4) Vista resumen
  const DynamicSummary = () => {
    const { totalEjecutado, totalProyectado, totalDiferencia, differenceData } = summaryDataForChart.totals;
    const summaryArray = summaryDataForChart.summaryArray;
    const barColor = totalDiferencia < 0 ? COLORS[2] : COLORS[3];

    return (
      <div>
        <h2>🌎 Resumen {selectedCargo === 'TODOS' ? 'Global' : `para ${selectedCargo}`} de Horas</h2>

        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 20, fontWeight: 'bold', fontSize: '1.1em' }}>
          <span>Total Proyectado: {formatNumber(totalProyectado)} hrs</span>
          <span>Total Ejecutado: {formatNumber(totalEjecutado)} hrs</span>
          <span style={{ color: totalDiferencia < 0 ? 'red' : 'green' }}>
            Diferencia Total: {formatNumber(totalDiferencia)} hrs
          </span>
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {/* Gráfica mensual con tooltip personalizado */}
          <div style={{ flexBasis: '65%', width: 1200, height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summaryArray} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="MES" height={50} style={{ fontSize: '0.7em' }} />
                <YAxis />
                <Tooltip content={<CustomMonthlyTooltip />} />
                <Legend />
                <Bar dataKey="totalProyectado" fill={COLORS[0]} name="Proyectado" />
                <Bar dataKey="totalEjecutado" fill={COLORS[1]} name="Ejecutado" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfica de diferencia total */}
          <div style={{ flexBasis: '30%', minWidth: 250, height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={differenceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: '0.9em' }} />
                <YAxis />
                <Tooltip formatter={(v) => [`${formatNumber(v)} hrs`]} />
                <Legend payload={[{ value: `Total: ${formatNumber(totalDiferencia)} hrs`, type: 'square', color: barColor }]} />
                <Bar dataKey="diferencia" fill={barColor} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  // 5) Render
  return (
    <div>
      {/* Filtros */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 20 }}>
        <div>
          <label>Filtrar por Cargo: </label>
          <select value={selectedCargo} onChange={(e) => setSelectedCargo(e.target.value)}>
            <option value="TODOS">TODOS</option>
            {cargoTypes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label>Filtrar por Instructor: </label>
          <select value={selectedInstructor} onChange={(e) => setSelectedInstructor(e.target.value)}>
            <option value="TODOS">TODOS</option>
            {filteredInstructorNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <hr style={{ margin: '30px 0' }} />

      {selectedInstructor === 'TODOS' ? (
        <DynamicSummary />
      ) : (
        <InstructorCard
          instructorName={selectedInstructor}
          data={aggregatedArray}
          formatNumber={formatNumber}
        />
      )}
    </div>
  );
};

export default InstructorReport;
