import React, { useState, useMemo } from 'react';
import InstructorCard from './InstructorCard';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FF0000', '#009900'];
const formatNumber = (num) => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 }).format(num);

const normalizeMesKey = (mes) => String(mes ?? '').toUpperCase().trim();

const calculateHours = (data) => {
    const allInstructorNames = [...new Set(
        data.map(item => String(item.NOMBRE_INSTRUCTOR ?? 'N/A'))
    )].sort();

    const groupedData = data.reduce((acc, current) => {
        const {
            NOMBRE_INSTRUCTOR, MES, DIAS_HABILES, TIPO_CONTRATO,
            HORAS_ASOCIADAS_A_FICHAS, OTRAS_HORAS, HORAS_ESPERADAS
        } = current;

        const monthKey = normalizeMesKey(MES) || 'N/A';
        const key = `${NOMBRE_INSTRUCTOR}-${monthKey}`;
        const horasEjecutadasRegistro = (Number(HORAS_ASOCIADAS_A_FICHAS) || 0) + (Number(OTRAS_HORAS) || 0);

        if (!acc[key]) {
            const horasProyectadas = Number(HORAS_ESPERADAS) || 0;

            acc[key] = {
                NOMBRE_INSTRUCTOR,
                MES: monthKey,
                TIPO_CONTRATO,
                horasProyectadas,
                horasEjecutadas: 0,
                diasHabiles: Number(DIAS_HABILES) || 0,
                tieneOtrasHorasContrato: TIPO_CONTRATO !== 'Planta' && (Number(OTRAS_HORAS) || 0) > 0,
            };
        }

        acc[key].horasEjecutadas += horasEjecutadasRegistro;
        return acc;
    }, {});

    return {
        allInstructorNames,
        aggregatedArray: Object.values(groupedData).sort((a, b) =>
            a.NOMBRE_INSTRUCTOR.localeCompare(b.NOMBRE_INSTRUCTOR)
        )
    };
};

const InstructorReport = ({ data }) => {
    const [selectedInstructor, setSelectedInstructor] = useState('TODOS');
    const [selectedCargo, setSelectedCargo] = useState('TODOS');

    const { allInstructorNames, aggregatedArray } = useMemo(() => calculateHours(data), [data]);

    const cargoTypes = ['Planta', 'Contrato'];

    const summaryDataForChart = useMemo(() => {
        if (selectedInstructor !== 'TODOS') return { summaryArray: [], totals: {} };

        const filteredAggregated = selectedCargo === 'TODOS'
            ? aggregatedArray
            : aggregatedArray.filter(item => item.TIPO_CONTRATO === selectedCargo);

        const monthlyTotals = filteredAggregated.reduce((acc, item) => {
            const { MES, horasProyectadas, horasEjecutadas, TIPO_CONTRATO } = item;
            if (!acc[MES]) acc[MES] = { MES, totalProyectado: 0, totalEjecutado: 0 };

            const limitedEjecutado = (TIPO_CONTRATO === 'Contrato' && horasEjecutadas > 160)
                ? 160
                : horasEjecutadas;

            acc[MES].totalProyectado += horasProyectadas;
            acc[MES].totalEjecutado += limitedEjecutado;
            return acc;
        }, {});

        const summaryArray = Object.values(monthlyTotals).map(item => ({
            ...item,
            totalProyectado: item.totalProyectado,
            totalEjecutado: item.totalEjecutado,
            diferencia: item.totalEjecutado - item.totalProyectado,
        }));

        const totalEjecutado = summaryArray.reduce((s, it) => s + it.totalEjecutado, 0);
        const totalProyectado = summaryArray.reduce((s, it) => s + it.totalProyectado, 0);
        const totalDiferencia = totalEjecutado - totalProyectado;
        const differenceData = [{ name: 'Diferencia Total (Hrs)', diferencia: totalDiferencia }];

        return { summaryArray, totals: { totalEjecutado, totalProyectado, totalDiferencia, differenceData } };
    }, [selectedCargo, selectedInstructor, aggregatedArray]);

    const filteredInstructorNames = useMemo(() => {
        if (selectedCargo === 'TODOS') return allInstructorNames;
        const filtered = aggregatedArray
            .filter(item => item.TIPO_CONTRATO === selectedCargo)
            .map(item => item.NOMBRE_INSTRUCTOR);
        return [...new Set(filtered)].sort();
    }, [selectedCargo, aggregatedArray]);

    const instructorsToDisplay = selectedInstructor !== 'TODOS' ? [selectedInstructor] : [];

    const DynamicSummary = () => {
        const { totalEjecutado, totalProyectado, totalDiferencia, differenceData } = summaryDataForChart.totals;
        const summaryArray = summaryDataForChart.summaryArray;
        const barColor = totalDiferencia < 0 ? COLORS[2] : COLORS[3];

        return (
            <div>
                <h2>🌎 Resumen {selectedCargo === 'TODOS' ? 'Global' : `para ${selectedCargo}`} de Horas</h2>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px', fontWeight: 'bold', fontSize: '1.1em' }}>
                    <span>Total Proyectado: {formatNumber(totalProyectado)} hrs</span>
                    <span>Total Ejecutado: {formatNumber(totalEjecutado)} hrs</span>
                    <span style={{ color: totalDiferencia < 0 ? 'red' : 'green' }}>Diferencia Total: {formatNumber(totalDiferencia)} hrs</span>
                </div>

                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ flexBasis: '65%', width: 1200, height: '350px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={summaryArray} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="MES" height={50} style={{ fontSize: '0.7em' }} />
                                <YAxis />
                                <Tooltip formatter={(v) => [`${formatNumber(v)} hrs`]} />
                                <Legend />
                                <Bar dataKey="totalProyectado" fill={COLORS[0]} name="Proyectado" />
                                <Bar dataKey="totalEjecutado" fill={COLORS[1]} name="Ejecutado" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={{ flexBasis: '30%', minWidth: '250px', height: '350px' }}>
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

    return (
        <div>
            <div style={{ marginBottom: '20px', display: 'flex', gap: '20px' }}>
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
                    formatNumber={(num) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(num)}
                />
            )}
        </div>
    );
};

export default InstructorReport;
