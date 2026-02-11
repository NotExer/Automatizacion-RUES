"use client";

import { useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";

interface ResultRow {
  nit: string;
  nombre_empresa: string;
  categoria_matricula: string;
  camara_comercio: string;
  estado_matricula: string;
  ultimo_ano_renovado: string;
  actividad_economica: string;
  error?: string;
}

async function processWithConcurrency<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  concurrency: number
): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()!;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [nits, setNits] = useState<string[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback((f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const parsed: string[] = [];
      for (const row of rows) {
        if (row[0] !== undefined && row[0] !== null) {
          const raw = String(row[0]).replace(/\D/g, "").slice(0, 9);
          if (raw.length > 0) parsed.push(raw);
        }
      }
      setNits(parsed);
    };
    reader.readAsArrayBuffer(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f && f.name.endsWith(".xlsx")) parseFile(f);
    },
    [parseFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
    },
    []
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) parseFile(f);
    },
    [parseFile]
  );

  const handleProcess = useCallback(async () => {
    if (nits.length === 0) return;
    setProcessing(true);
    setResults([]);
    setProgress({ done: 0, total: nits.length });

    let done = 0;

    await processWithConcurrency(
      nits,
      async (nit) => {
        try {
          const res = await fetch(`/api/rues/lookup?nit=${nit}`);
          const data = await res.json();
          const row: ResultRow = {
            nit,
            nombre_empresa: data.nombre_empresa ?? "",
            categoria_matricula: data.categoria_matricula ?? "",
            camara_comercio: data.camara_comercio ?? "",
            estado_matricula: data.estado_matricula ?? "",
            ultimo_ano_renovado: data.ultimo_ano_renovado ?? "",
            actividad_economica: data.actividad_economica ?? "",
            error: data.error,
          };
          setResults((prev) => [...prev, row]);
        } catch {
          setResults((prev) => [
            ...prev,
            {
              nit,
              nombre_empresa: "",
              categoria_matricula: "",
              camara_comercio: "",
              estado_matricula: "",
              ultimo_ano_renovado: "",
              actividad_economica: "",
              error: "Error de conexión",
            },
          ]);
        }
        done++;
        setProgress({ done, total: nits.length });
      },
      3
    );

    setProcessing(false);
  }, [nits]);

  const handleDownload = useCallback(() => {
    const ws = XLSX.utils.json_to_sheet(
      results.map((r) => ({
        NIT: r.nit,
        "Nombre Empresa": r.nombre_empresa,
        "Categoría de la Matrícula": r.categoria_matricula,
        "Cámara de Comercio": r.camara_comercio,
        "Estado de la Matrícula": r.estado_matricula,
        "Último Año Renovado": r.ultimo_ano_renovado,
        "Actividad Económica": r.actividad_economica,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resultados");
    XLSX.writeFile(wb, "ResultadoRues.xlsx");
  }, [results]);

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-5xl space-y-8">

        {/* ── Header ── */}
        <header className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 badge badge-blue mb-2">
            <span>⚡</span> Herramienta de Automatización
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-400 via-blue-300 to-indigo-400 bg-clip-text text-transparent">
            Automatizador RUES
          </h1>
          <p className="text-slate-400 text-base max-w-2xl mx-auto leading-relaxed">
            Consulta masiva de información empresarial en el Registro Único Empresarial y Social de Colombia.
          </p>
        </header>

        {/* ── Info Section ── */}
        <section className="glass p-8 space-y-6">
          <h2 className="text-lg font-semibold text-blue-300 flex items-center gap-2">
            <span className="text-xl">📋</span> ¿Qué hace esta aplicación?
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Esta herramienta permite automatizar la consulta de información empresarial en el
            <strong className="text-blue-300"> RUES (Registro Único Empresarial y Social)</strong> de Colombia.
            Solo necesitas subir un archivo Excel con los NITs de las empresas que deseas consultar y la
            aplicación se encargará de buscar automáticamente cada NIT, recopilando datos como el nombre
            de la empresa, estado de la matrícula, cámara de comercio, actividad económica y más.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="feature-card">
              <div className="text-2xl mb-2">📤</div>
              <h3 className="text-sm font-semibold text-blue-200 mb-1">1. Sube tu archivo</h3>
              <p className="text-xs text-slate-400">
                Carga un archivo Excel (.xlsx) con los NITs en la primera columna. Sin encabezados, solo los números.
              </p>
            </div>
            <div className="feature-card">
              <div className="text-2xl mb-2">🔍</div>
              <h3 className="text-sm font-semibold text-blue-200 mb-1">2. Consulta automática</h3>
              <p className="text-xs text-slate-400">
                La aplicación consulta el RUES para cada NIT de forma concurrente y muestra el progreso en tiempo real.
              </p>
            </div>
            <div className="feature-card">
              <div className="text-2xl mb-2">📊</div>
              <h3 className="text-sm font-semibold text-blue-200 mb-1">3. Descarga resultados</h3>
              <p className="text-xs text-slate-400">
                Visualiza los resultados en una tabla y descárgalos en un nuevo archivo Excel listo para usar.
              </p>
            </div>
          </div>
        </section>

        {/* ── Ejemplo de archivo ── */}
        <section className="glass p-8 space-y-4">
          <h2 className="text-lg font-semibold text-blue-300 flex items-center gap-2">
            <span className="text-xl">🖼️</span> Formato del archivo de entrada
          </h2>
          <p className="text-slate-400 text-sm">
            Tu archivo Excel debe verse así: una sola columna con los NITs de las empresas (sin encabezados, sin puntos, sin guiones).
          </p>
          {/* ──────────────────────────────────────────────────────────
              ESPACIO PARA IMAGEN DE EJEMPLO
              Coloca tu imagen en /public/ejemplo-archivo.png y descomenta la línea <img>
              ────────────────────────────────────────────────────────── */}
          <div className="image-placeholder">
            {/* <img src="/ejemplo-archivo.png" alt="Ejemplo de archivo Excel" className="rounded-xl max-h-64 object-contain" /> */}
            <div className="text-center space-y-2 p-6">
              <div className="text-4xl opacity-40">🖼️</div>
              <p className="text-slate-500 text-sm">Coloca aquí tu imagen de ejemplo</p>
              <p className="text-slate-600 text-xs">
                Guarda la imagen en <code className="text-blue-400/70 bg-blue-400/5 px-1.5 py-0.5 rounded">public/ejemplo-archivo.png</code> y descomenta la etiqueta img en el código
              </p>
            </div>
          </div>
        </section>

        {/* ── Upload / Drop Zone ── */}
        <section className="glass p-8 space-y-6">
          <h2 className="text-lg font-semibold text-blue-300 flex items-center gap-2">
            <span className="text-xl">🚀</span> Comenzar consulta
          </h2>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="dropzone p-10 text-center"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="space-y-1">
                <p className="text-blue-300 font-medium text-lg">📄 {file.name}</p>
                <p className="text-slate-400 text-sm">
                  {nits.length} NITs encontrados y listos para procesar
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-4xl opacity-50">📂</div>
                <p className="text-slate-400 text-sm">
                  Arrastra y suelta un archivo <strong className="text-slate-300">.xlsx</strong> aquí
                </p>
                <p className="text-slate-500 text-xs">o haz clic para seleccionar</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleProcess}
              disabled={nits.length === 0 || processing}
              className="btn-glass px-7 py-3 text-sm"
            >
              {processing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Procesando...
                </span>
              ) : (
                "⚡ Ejecutar proceso"
              )}
            </button>
            {results.length > 0 && !processing && (
              <button onClick={handleDownload} className="btn-glass px-7 py-3 text-sm">
                📥 Descargar Resultados
              </button>
            )}
          </div>

          {/* Progress */}
          {(processing || progress.done > 0) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">
                  Procesando NITs...
                </span>
                <span className="text-blue-300 font-mono text-xs">
                  {progress.done}/{progress.total}
                </span>
              </div>
              <div className="progress-track h-2">
                <div
                  className="progress-fill h-2"
                  style={{
                    width:
                      progress.total > 0
                        ? `${(progress.done / progress.total) * 100}%`
                        : "0%",
                  }}
                />
              </div>
            </div>
          )}
        </section>

        {/* ── Results Table ── */}
        {results.length > 0 && (
          <section className="glass p-6 overflow-hidden">
            <h2 className="text-lg font-semibold text-blue-300 mb-4 flex items-center gap-2">
              <span className="text-xl">📊</span> Resultados
              <span className="badge badge-blue ml-2">{results.length} registros</span>
            </h2>
            <div className="overflow-x-auto rounded-xl glass-sm">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th className="text-left">NIT</th>
                    <th className="text-left">Nombre Empresa</th>
                    <th className="text-left">Categoría Matrícula</th>
                    <th className="text-left">Cámara de Comercio</th>
                    <th className="text-left">Estado Matrícula</th>
                    <th className="text-left">Último Año Renovado</th>
                    <th className="text-left">Actividad Económica</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, i) => (
                    <tr key={i}>
                      <td className="font-mono text-blue-200/80">{row.nit}</td>
                      <td>
                        {row.error ? (
                          <span className="text-red-400 text-xs font-medium">{row.error}</span>
                        ) : (
                          row.nombre_empresa
                        )}
                      </td>
                      <td>{row.categoria_matricula}</td>
                      <td>{row.camara_comercio}</td>
                      <td>
                        <span
                          className={`badge text-xs ${
                            row.estado_matricula?.toLowerCase().includes("activa")
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                              : row.estado_matricula?.toLowerCase().includes("cancel")
                              ? "bg-red-500/15 text-red-400 border border-red-500/20"
                              : "badge-blue"
                          }`}
                        >
                          {row.estado_matricula || "—"}
                        </span>
                      </td>
                      <td>{row.ultimo_ano_renovado}</td>
                      <td className="max-w-[200px] truncate" title={row.actividad_economica}>
                        {row.actividad_economica}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Footer ── */}
        <footer className="text-center py-6 space-y-1">
          <p className="text-slate-600 text-xs">
            Automatizador RUES — Consulta empresarial automatizada
          </p>
          <p className="text-slate-600 text-xs">
            Creado por{" "}
            <a
              href="https://github.com/NotExer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400/60 hover:text-blue-400 transition"
            >
              NotExer
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
