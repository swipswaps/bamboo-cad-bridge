import React, { useState, useEffect, useRef } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function App() {
  const [backendStatus, setBackendStatus] = useState('checking');
  const [culm, setCulm] = useState({
    culm_id: 'Column_01',
    length_m: 3.0,
    basal_diameter_m: 0.12,
    top_diameter_m: 0.10,
    wall_thickness_m: 0.015,
    node_spacing_m: 0.28
  });

  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    checkBackend();
    timerRef.current = setInterval(checkBackend, 4000);
    return () => clearInterval(timerRef.current);
  }, []);

  const checkBackend = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    try {
      const res = await fetch(BACKEND_URL + '/health', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        setBackendStatus('online');
      } else {
        setBackendStatus('offline');
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name !== 'AbortError') {
        setBackendStatus('offline');
      }
    }
  };

  const updateField = (field, val) => {
    setCulm(prev => ({
      ...prev,
      [field]: field === 'culm_id' ? val : val === '' ? '' : Number(val)
    }));
  };

  const handleProcess = async () => {
    setLoading(true);
    setErrorMsg('');

    const payload = {
      culm_id: culm.culm_id || 'Unnamed_Culm',
      length_m: Number(culm.length_m) || 1.0,
      basal_diameter_m: Number(culm.basal_diameter_m) || 0.1,
      top_diameter_m: Number(culm.top_diameter_m) || 0.08,
      wall_thickness_m: Number(culm.wall_thickness_m) || 0.01,
      node_spacing_m: Number(culm.node_spacing_m) || 0.25
    };

    if (backendStatus === 'online') {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(BACKEND_URL + '/api/generate-spec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([payload]),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        setOutput({ source: 'Docker FastAPI Engine', data });
      } catch (err) {
        setErrorMsg('Docker backend unresponsive. Executing local WASM/JS fallback.');
        setBackendStatus('offline');
        executeLocalFallback(payload);
      }
    } else {
      executeLocalFallback(payload);
    }
    setLoading(false);
  };

  const executeLocalFallback = (p) => {
    const rBase = p.basal_diameter_m / 2.0;
    const rTop = p.top_diameter_m / 2.0;

    const vTotal = (1/3) * Math.PI * p.length_m * (Math.pow(rBase, 2) + rBase * rTop + Math.pow(rTop, 2));
    const rInnerBase = Math.max(0, rBase - p.wall_thickness_m);
    const rInnerTop = Math.max(0, rTop - p.wall_thickness_m);
    const vInner = (1/3) * Math.PI * p.length_m * (Math.pow(rInnerBase, 2) + rInnerBase * rInnerTop + Math.pow(rInnerTop, 2));

    const solidVol = vTotal - vInner;
    const wallRatio = (p.wall_thickness_m / rBase) * 100.0;

    setOutput({
      source: 'Client-Side WASM/JS Fallback Engine',
      data: {
        results: [{
          culm_id: p.culm_id,
          length_m: p.length_m,
          basal_diameter_m: p.basal_diameter_m,
          top_diameter_m: p.top_diameter_m,
          wall_thickness_m: p.wall_thickness_m,
          node_count: Math.floor(p.length_m / p.node_spacing_m),
          calculated_solid_volume_m3: Number(solidVol.toFixed(6)),
          wall_ratio_percentage: Number(wallRatio.toFixed(2)),
          structural_validity: wallRatio >= 15.0 ? "VALID" : "WARNING_WALL_TOO_THIN"
        }]
      }
    });
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '1.5rem', borderBottom: '2px solid #e9ecef', paddingBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>Bamboo CAD Parametric Bridge</h1>
        <p style={{ color: '#6c757d', margin: '0.4rem 0 0 0' }}>
          Parametric specification generator for Blender and Godot structural assets.
        </p>
      </header>

      <div style={{
        padding: '0.8rem 1.2rem',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: backendStatus === 'online' ? '#d1e7dd' : '#fff3cd',
        border: '1px solid ' + (backendStatus === 'online' ? '#badbcc' : '#ffecb5'),
        color: backendStatus === 'online' ? '#0f5132' : '#664d03'
      }}>
        <div>
          <strong>Engine Mode: </strong>
          {backendStatus === 'checking' && 'Polling local container...'}
          {backendStatus === 'online' && 'Docker Backend Active (FastAPI Server)'}
          {backendStatus === 'offline' && 'Standalone Mode (Browser WASM/JS Fallback)'}
        </div>
        <button onClick={checkBackend} style={{ padding: '0.3rem 0.6rem', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc' }}>
          Poll Status
        </button>
      </div>

      {errorMsg && (
        <div style={{ padding: '0.8rem', backgroundColor: '#f8d7da', color: '#842029', borderRadius: '6px', marginBottom: '1rem' }}>
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.2rem' }}>Culm Identifier:</label>
          <input style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }} type="text" value={culm.culm_id} onChange={e => updateField('culm_id', e.target.value)} />
        </div>
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.2rem' }}>Length (m):</label>
          <input style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }} type="number" step="0.1" value={culm.length_m} onChange={e => updateField('length_m', e.target.value)} />
        </div>
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.2rem' }}>Basal Diameter (m):</label>
          <input style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }} type="number" step="0.01" value={culm.basal_diameter_m} onChange={e => updateField('basal_diameter_m', e.target.value)} />
        </div>
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.2rem' }}>Top Diameter (m):</label>
          <input style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }} type="number" step="0.01" value={culm.top_diameter_m} onChange={e => updateField('top_diameter_m', e.target.value)} />
        </div>
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.2rem' }}>Wall Thickness (m):</label>
          <input style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }} type="number" step="0.001" value={culm.wall_thickness_m} onChange={e => updateField('wall_thickness_m', e.target.value)} />
        </div>
        <div>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.2rem' }}>Node Spacing (m):</label>
          <input style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ced4da' }} type="number" step="0.01" value={culm.node_spacing_m} onChange={e => updateField('node_spacing_m', e.target.value)} />
        </div>
      </div>

      <button onClick={handleProcess} disabled={loading} style={{
        padding: '0.75rem 1.5rem',
        backgroundColor: '#0d6efd',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: '1rem',
        fontWeight: 'bold'
      }}>
        {loading ? 'Processing...' : 'Compute CAD Spec'}
      </button>

      {output && (
        <div style={{ marginTop: '2rem', padding: '1.25rem', backgroundColor: '#fff', border: '1px solid #ced4da', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0, fontSize: '1.1rem', color: '#495057' }}>Execution Engine: {output.source}</h3>
          <pre style={{ backgroundColor: '#212529', color: '#00ff66', padding: '1rem', borderRadius: '6px', overflowX: 'auto', fontSize: '0.9rem' }}>
            {JSON.stringify(output.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
