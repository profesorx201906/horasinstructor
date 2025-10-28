// src/components/FileUpload.jsx
import React, { useState } from 'react';

// Limpia números: quita separadores de miles '.' y cambia ',' por '.'
const cleanNumber = (value) => {
  const cleaned = String(value ?? '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .trim();
  const result = parseFloat(cleaned);
  return isNaN(result) ? 0 : result;
};

// Normaliza texto: quita comillas, trim, colapsa espacios
const norm = (s) => String(s ?? '').replace(/"/g, '').trim();

// Normaliza MES: "1. ENERO" -> "ENERO"
const normalizeMes = (mes) => {
  const raw = norm(mes).toUpperCase();
  // elimina prefijo tipo "1. " o "01. "
  const sinNumero = raw.replace(/^\d{1,2}\.\s*/, '');
  // opcionalmente eliminar tildes/marcadores raros si vinieran con mojibake
  return sinNumero
    .replace('Á', 'A')
    .replace('É', 'E')
    .replace('Í', 'I')
    .replace('Ó', 'O')
    .replace('Ú', 'U');
};

// Mapea VINCULACIÓN a "Planta" | "Contrato"
const mapVinculacion = (v) => {
  const t = norm(v).toLowerCase();
  if (t.includes('planta')) return 'Planta';
  return 'Contrato';
};

// Parsing del nuevo archivo: separador ';'
const parseFileContent = (text) => {
  const lines = text.trim().split('\r\n'); // CSV de Excel común en Windows
  if (lines.length <= 1) return [];

  const headers = lines[0].split(';').map(h => norm(h));

  // helpers de índice seguro
  const idx = (name) => headers.indexOf(name);

  // nombres exactos del nuevo CSV
  const H_REGIONAL = 'REGIONAL';
  const H_CENTRO = 'DATOS CENTRO';
  const H_DOC = 'DOCUMENTO';
  const H_NOMBRE = 'NOMBRE INSTRUCTOR';
  const H_MES = 'MES';
  const H_INI = 'FECHA INICIO CONTRATO';
  const H_FIN = 'FECHA FIN CONTRATO';
  const H_HORAS_ESPERADAS = 'HORAS ESPERADAS';
  const H_HORAS_ACADEMICAS = 'HORAS ACADÉMICAS'; // puede venir con mojibake en ANSI
  const H_OTRAS = 'OTRAS HORAS';                  // puede venir como " OTRAS HORAS" (con espacio inicial)
  const H_TOTAL = 'TOTAL HORAS PROGRAMADAS';
  const H_PCT = '% DE PROGRAMACIÓN';
  const H_VINC = 'VINCULACIÓN';
  const H_CALIF = 'Calificación';

  // tolerancia a mojibake: intenta fallback si no se encuentra
  const getIndexLoose = (primary, fallbacks = []) => {
    const candidates = [primary, ...fallbacks];
    for (const c of candidates) {
      const i = idx(c);
      if (i !== -1) return i;
    }
    // búsqueda flexible por includes (para casos " OTRAS HORAS" con espacio)
    const found = headers.findIndex(h => h.replace(/\s+/g, ' ').toUpperCase().includes(primary.toUpperCase()));
    return found;
  };

  const ix = {
    regional: getIndexLoose(H_REGIONAL),
    centro: getIndexLoose(H_CENTRO),
    documento: getIndexLoose(H_DOC),
    nombre: getIndexLoose(H_NOMBRE),
    mes: getIndexLoose(H_MES),
    ini: getIndexLoose(H_INI),
    fin: getIndexLoose(H_FIN),
    horasEsperadas: getIndexLoose(H_HORAS_ESPERADAS),
    horasAcademicas: getIndexLoose(H_HORAS_ACADEMICAS, ['HORAS ACADMICAS', 'HORAS ACADEMICAS']),
    otras: getIndexLoose(H_OTRAS, [' OTRAS HORAS']),
    total: getIndexLoose(H_TOTAL),
    pct: getIndexLoose(H_PCT, ['% DE PROGRAMACIàN', '% DE PROGRAMACION']),
    vinc: getIndexLoose(H_VINC, ['VINCULACIàN', 'VINCULACION']),
    calif: getIndexLoose(H_CALIF, ['Calificaci¢n', 'Calificacion']),
  };

  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw || !raw.trim()) continue;

    const vals = raw.split(';').map(v => norm(v));
    if (vals.length < headers.length) continue;

    // valores crudos (tal cual CSV)
    const rawRow = {
      REGIONAL: vals[ix.regional] ?? '',
      DATOS_CENTRO: vals[ix.centro] ?? '',
      DOCUMENTO: vals[ix.documento] ?? '',
      NOMBRE_INSTRUCTOR_RAW: vals[ix.nombre] ?? '',
      MES_RAW: vals[ix.mes] ?? '',
      FECHA_INICIO_CONTRATO: vals[ix.ini] ?? '',
      FECHA_FIN_CONTRATO: vals[ix.fin] ?? '',
      HORAS_ESPERADAS_RAW: vals[ix.horasEsperadas] ?? '',
      HORAS_ACADEMICAS_RAW: vals[ix.horasAcademicas] ?? '',
      OTRAS_HORAS_RAW: vals[ix.otras] ?? '',
      TOTAL_HORAS_PROGRAMADAS_RAW: vals[ix.total] ?? '',
      PORCENTAJE_PROGRAMACION_RAW: vals[ix.pct] ?? '',
      VINCULACION_RAW: vals[ix.vinc] ?? '',
      CALIFICACION: vals[ix.calif] ?? '',
    };

    // conversiones numéricas
    const horasEsperadas = cleanNumber(rawRow.HORAS_ESPERADAS_RAW);
    const horasAcademicas = cleanNumber(rawRow.HORAS_ACADEMICAS_RAW);
    const otrasHoras = cleanNumber(rawRow.OTRAS_HORAS_RAW);
    const totalHoras = cleanNumber(rawRow.TOTAL_HORAS_PROGRAMADAS_RAW);
    const pctProg = cleanNumber(rawRow.PORCENTAJE_PROGRAMACION_RAW); // 100,45% -> 100.45

    // normalizados para el resto de la app
    const nombre = norm(rawRow.NOMBRE_INSTRUCTOR_RAW);
    const mes = normalizeMes(rawRow.MES_RAW);
    const tipoContrato = mapVinculacion(rawRow.VINCULACION_RAW);

    // DIAS_HABILES: para Contrato, inferimos de horas esperadas; para Planta no se usa
    const diasHabiles = tipoContrato === 'Contrato'
      ? Math.round(horasEsperadas / 8)
      : 0;

    const record = {
      // ---- Campos requeridos por tu app (compatibilidad) ----
      NOMBRE_INSTRUCTOR: nombre || 'N/A',
      MES: mes || 'N/A',
      HORAS_ASOCIADAS_A_FICHAS: horasAcademicas,
      OTRAS_HORAS: otrasHoras,
      DIAS_HABILES: diasHabiles,
      TIPO_CONTRATO: tipoContrato,

      // ---- Todos los campos originales (limpios y/o crudos) ----
      REGIONAL: rawRow.REGIONAL,
      DATOS_CENTRO: rawRow.DATOS_CENTRO,
      DOCUMENTO: rawRow.DOCUMENTO,
      FECHA_INICIO_CONTRATO: rawRow.FECHA_INICIO_CONTRATO,
      FECHA_FIN_CONTRATO: rawRow.FECHA_FIN_CONTRATO,
      HORAS_ESPERADAS: horasEsperadas,
      HORAS_ACADEMICAS: horasAcademicas,
      OTRAS_HORAS_DETALLE: otrasHoras,
      TOTAL_HORAS_PROGRAMADAS: totalHoras,
      PORCENTAJE_PROGRAMACION: pctProg,
      VINCULACION: norm(rawRow.VINCULACION_RAW),
      CALIFICACION: rawRow.CALIFICACION,
      // crudos por si necesitas trazabilidad exacta:
      __RAW: rawRow,
    };

    data.push(record);
  }

  return data;
};

const FileUpload = ({ onDataLoaded }) => {
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

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
        console.error('Error al procesar el archivo:', err);
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

    // Mantener la lectura en ISO-8859-1 para ñ/acentos de archivos de Excel/Windows
    reader.readAsText(file, 'ISO-8859-1');
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
      {fileName && !loading && !error && <p>✅ Archivo cargado: <strong>{fileName}</strong></p>}
      {loading && <p>Cargando y procesando datos... por favor espere.</p>}
      {error && <p style={{ color: 'red' }}>❌ Error: {error}</p>}
    </div>
  );
};

export default FileUpload;
