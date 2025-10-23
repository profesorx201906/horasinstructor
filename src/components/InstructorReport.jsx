// src/components/InstructorReport.jsx

import React, { useState, useMemo } from 'react';
import InstructorCard from './InstructorCard';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FF0000', '#009900'];

// 🚨 NUEVA TABLA DE HORAS PROYECTADAS PARA PLANTA POR MES 🚨
const PLANT_PROJECTION_HOURS = {
    'ENERO': 111,
    'FEBRERO': 170,
    'MARZO': 170,
    'ABRIL': 170,
    'MAYO': 178,
    'JUNIO': 153,
    'JULIO': 153,
    'AGOSTO': 162,
    'SEPTIEMBRE': 187,
    // Se puede añadir más meses si es necesario, por defecto 0
};

// Helper para calcular las horas ejecutadas y proyectadas, y agrupar la data
const calculateHours = (data) => {
    const allInstructorNames = [...new Set(data.map(item => item.NOMBRE_INSTRUCTOR))].sort();

    const groupedData = data.reduce((acc, current) => {
        const {
            NOMBRE_INSTRUCTOR, MES, DIAS_HABILES, TIPO_CONTRATO,
            HORAS_ASOCIADAS_A_FICHAS, OTRAS_HORAS
        } = current;

        // Aseguramos que el MES esté en mayúsculas para la búsqueda en el mapa
        const monthKey = MES ? MES.toUpperCase() : 'N/A';

        const key = `${NOMBRE_INSTRUCTOR}-${monthKey}`;

        const horasEjecutadasRegistro = HORAS_ASOCIADAS_A_FICHAS + OTRAS_HORAS;

        if (!acc[key]) {
            let horasProyectadas = 0;
            let tieneOtrasHorasContrato = false;

            // 🚨 AJUSTE CLAVE DE LA LÓGICA DE PROYECCIÓN 🚨
            if (TIPO_CONTRATO === 'Planta') {
                // Usar la tabla de referencia por mes
                horasProyectadas = PLANT_PROJECTION_HOURS[monthKey] || 0;
            } else {
                // Lógica anterior para Contrato (8 horas * Días Hábiles)
                horasProyectadas = (8 * DIAS_HABILES);
                                
                if (horasProyectadas > 160) {
                    horasProyectadas = 160
                }
                if (OTRAS_HORAS > 0) {
                    tieneOtrasHorasContrato = true;
                }
            }

            acc[key] = {
                NOMBRE_INSTRUCTOR,
                MES: monthKey, // Usamos la clave en mayúsculas
                TIPO_CONTRATO,
                horasProyectadas: horasProyectadas,
                horasEjecutadas: 0,
                diasHabiles: DIAS_HABILES,
                tieneOtrasHorasContrato: tieneOtrasHorasContrato,
            };
        }

        acc[key].horasEjecutadas += horasEjecutadasRegistro;

        return acc;
    }, {});

    const aggregatedArray = Object.values(groupedData).sort((a, b) => {
        if (a.NOMBRE_INSTRUCTOR < b.NOMBRE_INSTRUCTOR) return -1;
        if (a.NOMBRE_INSTRUCTOR > b.NOMBRE_INSTRUCTOR) return 1;
        return 0;
    });

    return { allInstructorNames, aggregatedArray };
};


const InstructorReport = ({ data }) => {
    const [selectedInstructor, setSelectedInstructor] = useState('TODOS');
    const [selectedCargo, setSelectedCargo] = useState('TODOS');

    // 1. Agrupamiento de datos
    const { allInstructorNames, aggregatedArray } = useMemo(() => {
        return calculateHours(data);
    }, [data]);

    const cargoTypes = ['Planta', 'Contrato'];

    // 2. Data para el resumen (Global o Filtrado por Cargo) 
    const summaryDataForChart = useMemo(() => {
        if (selectedInstructor !== 'TODOS') return { summaryArray: [], totals: {} };

        const filteredAggregated = selectedCargo === 'TODOS'
            ? aggregatedArray
            : aggregatedArray.filter(item => item.TIPO_CONTRATO === selectedCargo);

        const monthlyTotals = filteredAggregated.reduce((acc, item) => {
            const { MES, horasProyectadas, horasEjecutadas, TIPO_CONTRATO } = item;

            if (!acc[MES]) {
                acc[MES] = { MES, totalProyectado: 0, totalEjecutado: 0 };
            }

            const limitedEjecutado = (TIPO_CONTRATO === 'Contrato' && horasEjecutadas > 160)
                ? 160
                : horasEjecutadas;

            acc[MES].totalProyectado += horasProyectadas;
            acc[MES].totalEjecutado += limitedEjecutado;

            return acc;
        }, {});

        const summaryArray = Object.values(monthlyTotals).map(item => ({
            ...item,
            totalProyectado: parseFloat(item.totalProyectado.toFixed(1)),
            totalEjecutado: parseFloat(item.totalEjecutado.toFixed(1)),
            diferencia: parseFloat((item.totalEjecutado - item.totalProyectado).toFixed(1)),
        }));

        const totalEjecutado = summaryArray.reduce((sum, item) => sum + item.totalEjecutado, 0);
        const totalProyectado = summaryArray.reduce((sum, item) => sum + item.totalProyectado, 0);
        const totalDiferencia = totalEjecutado - totalProyectado;

        const differenceData = [{
            name: 'Diferencia Total (Hrs)',
            diferencia: parseFloat(totalDiferencia.toFixed(1)),
        }];

        return {
            summaryArray,
            totals: { totalEjecutado, totalProyectado, totalDiferencia, differenceData }
        };
    }, [selectedCargo, selectedInstructor, aggregatedArray]);

    // 3. Lógica de Filtrado de Nombres en Cascada (Cargo -> Nombre)

    const filteredInstructorNames = useMemo(() => {
        if (selectedCargo === 'TODOS') {
            return allInstructorNames;
        }

        const uniqueNamesWithCargo = [...new Set(
            aggregatedArray
                .filter(item => item.TIPO_CONTRATO === selectedCargo)
                .map(item => item.NOMBRE_INSTRUCTOR)
        )].sort();

        if (selectedInstructor !== 'TODOS' && !uniqueNamesWithCargo.includes(selectedInstructor)) {
            setTimeout(() => setSelectedInstructor('TODOS'), 0);
        }

        return uniqueNamesWithCargo;

    }, [selectedCargo, allInstructorNames, aggregatedArray]);


    const instructorsToDisplay = useMemo(() => {
        if (selectedInstructor !== 'TODOS') {
            return [selectedInstructor];
        }
        return [];
    }, [selectedInstructor]);


    // 4. Componente de Resumen Dinámico (Global o Filtrado por Cargo)
    const DynamicSummary = () => {
        const { totalEjecutado, totalProyectado, totalDiferencia, differenceData } = summaryDataForChart.totals;
        const summaryArray = summaryDataForChart.summaryArray;

        const isGlobal = selectedCargo === 'TODOS';
        const barColor = totalDiferencia < 0 ? COLORS[2] : COLORS[3];

        return (
            <div >
                <h2>
                    🌎 Resumen {isGlobal ? 'Global' : `para ${selectedCargo}`} de Horas
                </h2>
                <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px', fontWeight: 'bold', fontSize: '1.1em' }}>
                    <span>Total Proyectado: {totalProyectado.toFixed(1)} hrs</span>
                    <span>Total Ejecutado: {totalEjecutado.toFixed(1)} hrs</span>
                    <span style={{ color: totalDiferencia < 0 ? 'red' : 'green' }}>Diferencia Total: {totalDiferencia.toFixed(1)} hrs</span>
                </div>

                <div style={{ display: 'flex', gap: '20px', marginTop: '20px', flexWrap: 'wrap' }}>

                    {/* Gráfica 1: Comparación Mensual (Proyectado vs Ejecutado) */}
                    <div style={{ flexBasis: '65%', width: 1200, height: '350px' }}>
                        <h4>1. Proyectado vs. Ejecutado por Mes</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={summaryArray} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
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
                                <Bar dataKey="totalProyectado" fill={COLORS[0]} name="Proyectado" />
                                <Bar dataKey="totalEjecutado" fill={COLORS[1]} name="Ejecutado" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Gráfica 2: Resumen de Diferencia (Barra Única Rojo/Verde) */}
                    <div style={{ flexBasis: '30%', minWidth: '250px', height: '350px' }}>
                        <h4>2. Diferencia Total (Ejecutado - Proyectado)</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={differenceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" interval={0} style={{ fontSize: '0.9em' }} />
                                <YAxis />
                                <Tooltip formatter={(value) => [`${value.toFixed(1)} hrs`]} />
                                <Legend payload={[{ value: `Total: ${totalDiferencia.toFixed(1)} hrs`, type: 'square', color: barColor }]} />
                                <Bar dataKey="diferencia" fill={barColor} name="Diferencia Total" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        );
    };

    const showSummary = selectedInstructor === 'TODOS';
    const showInstructorCards = selectedInstructor !== 'TODOS';


    return (
        <div >

            {/* 1. Selectores de Filtro */}
            <div style={{ marginBottom: '20px', display: 'flex', gap: '20px' }}>

                {/* Filtro por Cargo */}
                <div>
                    <label htmlFor="cargo-select">Filtrar por Cargo: </label>
                    <select
                        id="cargo-select"
                        value={selectedCargo}
                        onChange={(e) => setSelectedCargo(e.target.value)}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="TODOS">TODOS</option>
                        {cargoTypes.map(cargo => (
                            <option key={cargo} value={cargo}>
                                {cargo}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Filtro por Instructor */}
                <div>
                    <label htmlFor="instructor-select">Filtrar por Instructor: </label>
                    <select
                        id="instructor-select"
                        value={selectedInstructor}
                        onChange={(e) => setSelectedInstructor(e.target.value)}
                        style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                    >
                        <option value="TODOS">TODOS</option>
                        {filteredInstructorNames.map(name => (
                            <option key={name} value={name}>
                                {name}
                            </option>
                        ))}
                    </select>
                </div>

            </div>

            <hr style={{ margin: '30px 0' }} />

            {/* 2. Renderizado Condicional */}
            {showSummary && <DynamicSummary />}

            {showInstructorCards && (
                <>

                    {instructorsToDisplay.length > 0 ? (
                        instructorsToDisplay.map(name => (
                            <InstructorCard
                                key={name}
                                instructorName={name}
                                data={aggregatedArray}
                            />
                        ))
                    ) : (
                        <p>No hay instructores que coincidan con los filtros seleccionados.</p>
                    )}
                </>
            )}

            {!showSummary && !showInstructorCards && (
                <p>Seleccione un cargo o un instructor para ver los datos.</p>
            )}

        </div>
    );
};

export default InstructorReport;