import { useState } from 'react';

export default function App() {
  const [ruc, setRuc] = useState('1712345678001');
  const [placa, setPlaca] = useState('ABC1234');
  const [cargando, setCargando] = useState(false);

  const [contribuyente, setContribuyente] = useState(null);
  const [errorSriRuc, setErrorSriRuc] = useState('');

  const [vehiculo, setVehiculo] = useState(null);
  const [errorSriVehiculo, setErrorSriVehiculo] = useState('');

  const [licencia, setLicencia] = useState(null);
  const [errorAnt, setErrorAnt] = useState('');

  const consultarTodo = async (e) => {
    e.preventDefault();
    setCargando(true);
    setContribuyente(null);
    setErrorSriRuc('');
    setVehiculo(null);
    setErrorSriVehiculo('');
    setLicencia(null);
    setErrorAnt('');

    const rucLimpio = ruc.trim();
    const cedula = rucLimpio.substring(0, 10);
    const placaLimpia = placa.trim().toUpperCase();

    if (rucLimpio) {
      try {
        const resRuc = await fetch(`http://localhost:8081/api/sri/contribuyente/${rucLimpio}`);
        const dataRuc = await resRuc.json();
        if (!resRuc.ok) {
          setErrorSriRuc(dataRuc.error || 'No se pudo validar el RUC.');
        } else {
          setContribuyente(dataRuc);
        }
      } catch {
        setErrorSriRuc('No se pudo conectar con ms-sri (puerto 8081).');
      }
    }

    if (placaLimpia) {
      try {
        const resVeh = await fetch(`http://localhost:8081/api/sri/vehiculo/${placaLimpia}`);
        const dataVeh = await resVeh.json();
        if (!resVeh.ok) {
          setErrorSriVehiculo(dataVeh.error || 'Vehículo no encontrado.');
        } else {
          setVehiculo(dataVeh);
        }
      } catch {
        setErrorSriVehiculo('No se pudo conectar con ms-sri (puerto 8081).');
      }
    }

    if (cedula.length === 10) {
      try {
        const resAnt = await fetch(`http://localhost:8082/api/ant/puntos/${cedula}`);
        const dataAnt = await resAnt.json();
        if (!resAnt.ok) {
          setErrorAnt(dataAnt.error || 'No se pudieron obtener los puntos de licencia.');
        } else {
          setLicencia(dataAnt);
        }
      } catch {
        setErrorAnt('No se pudo conectar con ms-ant (puerto 8082).');
      }
    } else {
      setErrorAnt('Ingresa un RUC válido de al menos 10 dígitos para consultar la cédula en la ANT.');
    }

    setCargando(false);
  };

  const badgeEstilo = (origen) => {
    if (origen === 'ANT_EN_VIVO') return { background: '#dcfce7', color: '#166534' };
    if (origen === 'CACHE_REDIS') return { background: '#dbeafe', color: '#1e40af' };
    return { background: '#fef3c7', color: '#92400e' };
  };

  return (
    <div className="contenedor">
      <style>{`
        * { box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
        body { margin: 0; background: #f1f5f9; color: #0f172a; }
        .contenedor { max-width: 960px; margin: 0 auto; padding: 2rem 1rem; }
        .header { text-align: center; margin-bottom: 2rem; }
        .header h1 { margin: 0 0 0.4rem; font-size: 1.8rem; color: #0f172a; }
        .header p { margin: 0; color: #475569; }
        .formulario {
          background: #ffffff; padding: 1.5rem; border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06);
          display: grid; grid-template-columns: 1fr 1fr auto; gap: 1rem; align-items: end;
          margin-bottom: 2rem;
        }
        @media (max-width: 700px) { .formulario { grid-template-columns: 1fr; } }
        .campo label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.4rem; color: #334155; }
        .campo input {
          width: 100%; padding: 0.65rem 0.85rem; border: 1px solid #cbd5e1;
          border-radius: 8px; font-size: 1rem;
        }
        .boton {
          background: #2563eb; color: white; border: none; padding: 0.72rem 1.5rem;
          border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer;
        }
        .boton:disabled { background: #94a3b8; cursor: not-allowed; }
        .grid-resultados { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; }
        .tarjeta {
          background: #ffffff; border-radius: 12px; padding: 1.25rem;
          box-shadow: 0 2px 10px rgba(0,0,0,0.06); border-top: 4px solid #2563eb;
        }
        .tarjeta.ant { border-top-color: #0d9488; }
        .tarjeta h2 { margin: 0 0 1rem; font-size: 1.1rem; color: #1e293b; }
        .dato { margin-bottom: 0.6rem; font-size: 0.92rem; }
        .dato strong { color: #475569; display: inline-block; min-width: 125px; }
        .error { background: #fee2e2; color: #991b1b; padding: 0.75rem; border-radius: 8px; font-size: 0.9rem; }
        .badge {
          display: inline-block; padding: 0.25rem 0.6rem; border-radius: 999px;
          font-size: 0.75rem; font-weight: 700; margin-bottom: 0.75rem;
        }
        .puntos-numero { font-size: 2.2rem; font-weight: 800; color: #0f172a; margin: 0.25rem 0; }
      `}</style>

      <div className="header">
        <h1>Sistema de Consulta Vehicular y Licencias</h1>
        <p>Arquitectura de Microservicios: SRI (8081) + ANT con Caché Upstash Redis (8082)</p>
      </div>

      <form className="formulario" onSubmit={consultarTodo}>
        <div className="campo">
          <label>RUC Persona Natural (13 dígitos)</label>
          <input
            type="text"
            maxLength={13}
            value={ruc}
            onChange={(e) => setRuc(e.target.value)}
            placeholder="Ej: 1712345678001"
          />
        </div>

        <div className="campo">
          <label>Placa del Vehículo</label>
          <input
            type="text"
            maxLength={8}
            value={placa}
            onChange={(e) => setPlaca(e.target.value)}
            placeholder="Ej: ABC1234"
          />
        </div>

        <button className="boton" type="submit" disabled={cargando}>
          {cargando ? 'Consultando...' : 'Consultar'}
        </button>
      </form>

      <div className="grid-resultados">
        <div className="tarjeta">
          <h2>Contribuyente (SRI)</h2>
          {errorSriRuc && <div className="error">{errorSriRuc}</div>}
          {contribuyente && (
            <>
              <div className="dato"><strong>RUC:</strong> {contribuyente.numeroRuc}</div>
              <div className="dato"><strong>Razón Social:</strong> {contribuyente.razonSocial}</div>
              <div className="dato"><strong>Tipo:</strong> {contribuyente.tipoContribuyente}</div>
              <div className="dato"><strong>Estado:</strong> {contribuyente.estadoContribuyenteRuc}</div>
            </>
          )}
          {!contribuyente && !errorSriRuc && <p style={{ color: '#94a3b8' }}>Sin datos consultados.</p>}
        </div>

        <div className="tarjeta">
          <h2>Vehículo (SRI)</h2>
          {errorSriVehiculo && <div className="error">{errorSriVehiculo}</div>}
          {vehiculo && (
            <>
              <div className="dato"><strong>Placa:</strong> {vehiculo.numeroPlaca}</div>
              <div className="dato"><strong>Marca:</strong> {vehiculo.descripcionMarca}</div>
              <div className="dato"><strong>Modelo:</strong> {vehiculo.descripcionModelo}</div>
              <div className="dato"><strong>Año:</strong> {vehiculo.anioAuto}</div>
              <div className="dato"><strong>País:</strong> {vehiculo.descripcionPais}</div>
              <div className="dato"><strong>Último Pago:</strong> {vehiculo.ultimoAnioPagado}</div>
            </>
          )}
          {!vehiculo && !errorSriVehiculo && <p style={{ color: '#94a3b8' }}>Sin datos consultados.</p>}
        </div>

        <div className="tarjeta ant">
          <h2>Puntos de Licencia (ANT)</h2>
          {errorAnt && <div className="error">{errorAnt}</div>}
          {licencia && (
            <>
              <span className="badge" style={badgeEstilo(licencia.origen)}>
                {licencia.origen}
              </span>
              <div className="puntos-numero">{licencia.puntos} pts</div>
              <div className="dato"><strong>Cédula:</strong> {licencia.cedula}</div>
              <p style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.5rem' }}>
                {licencia.mensaje}
              </p>
            </>
          )}
          {!licencia && !errorAnt && <p style={{ color: '#94a3b8' }}>Sin datos consultados.</p>}
        </div>
      </div>
    </div>
  );
}