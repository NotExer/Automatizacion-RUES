"use client";

import { useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import {
  UploadCloud,
  FileSpreadsheet,
  Play,
  Download,
  Info,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Sparkles,
  Trash2,
  HelpCircle,
  FileText,
  Search,
  Check
} from "lucide-react";

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
  const [isDragging, setIsDragging] = useState(false);
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

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f && f.name.endsWith(".xlsx")) parseFile(f);
    },
    [parseFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) parseFile(f);
    },
    [parseFile]
  );

  const handleClearFile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setNits([]);
    setResults([]);
    setProgress({ done: 0, total: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

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
    <div className="min-h-screen flex flex-col items-center px-4 py-12 sm:py-16 bg-[#000000] text-white">
      <div className="w-full max-w-5xl space-y-8 animate-slide-up">

        {/* ── Header ── */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white">
            Automatizador RUES
          </h1>
          <p className="text-[#86868b] text-base max-w-2xl mx-auto leading-relaxed font-normal">
            Consulta masiva de información empresarial en el Registro Único Empresarial y Social de Colombia de forma automatizada y directa.
          </p>
        </header>

        {/* ── Upload / Drop Zone ── */}
        <section className="glass p-6 sm:p-8 space-y-6">
          <h2 className="text-md font-medium text-white flex items-center gap-2">
            <FileSpreadsheet className="h-4.5 w-4.5 text-[#86868b]" />
            Comenzar consulta
          </h2>

          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`dropzone p-8 sm:p-10 text-center transition-all duration-300 ${
              isDragging ? "dropzone-dragging" : ""
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="space-y-3 animate-fade-in flex flex-col items-center justify-center">
                <FileSpreadsheet className="h-10 w-10 text-[#0071e3]" />
                <div className="space-y-1">
                  <p className="text-white font-medium text-base">{file.name}</p>
                  <p className="text-[#86868b] text-xs">
                    {nits.length} NITs encontrados y listos para procesar
                  </p>
                </div>
                <button
                  onClick={handleClearFile}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#ff453a] hover:text-[#ff6961] transition bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 active:scale-95"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover archivo
                </button>
              </div>
            ) : (
              <div className="space-y-3 py-4">
                <div className="flex justify-center">
                  <UploadCloud className="h-10 w-10 text-[#86868b]" />
                </div>
                <div className="space-y-1">
                  <p className="text-[#e5e5ea] text-sm">
                    Arrastra y suelta un archivo <strong className="text-white font-medium">.xlsx</strong> aquí
                  </p>
                  <p className="text-[#86868b] text-xs">o haz clic para seleccionar desde tu computadora</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleProcess}
              disabled={nits.length === 0 || processing}
              className="btn-apple-primary px-6 py-2.5 text-sm inline-flex items-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  Procesando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Ejecutar proceso
                </>
              )}
            </button>
            {results.length > 0 && !processing && (
              <button
                onClick={handleDownload}
                className="btn-apple-secondary px-6 py-2.5 text-sm inline-flex items-center gap-2"
              >
                <Download className="h-4 w-4 text-[#86868b]" />
                Descargar Resultados
              </button>
            )}
          </div>

          {/* Progress */}
          {(processing || progress.done > 0) && (
            <div className="space-y-2.5 animate-fade-in p-4 glass-sm">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  {processing ? (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0071e3] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0071e3]"></span>
                    </span>
                  ) : (
                    <Check className="h-4 w-4 text-[#30d158]" />
                  )}
                  <span className="text-[#86868b]">
                    {processing ? "Procesando NITs en tiempo real..." : "Proceso completado"}
                  </span>
                </div>
                <span className="text-[#86868b] font-mono text-xs">
                  {progress.done} / {progress.total} ({Math.round(progress.total > 0 ? (progress.done / progress.total) * 100 : 0)}%)
                </span>
              </div>
              <div className="progress-track h-1.5">
                <div
                  className="progress-fill h-1.5"
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

        {/* ── Ejemplo de archivo ── */}
        <section className="glass p-6 sm:p-8 space-y-4">
          <h2 className="text-md font-medium text-white flex items-center gap-2">
            <FileText className="h-4.5 w-4.5 text-[#86868b]" />
            Formato del archivo de entrada
          </h2>
          <p className="text-[#86868b] text-sm leading-relaxed">
            Tu archivo Excel debe contener una sola columna con los NITs de las empresas que deseas consultar (sin encabezados, sin puntos, sin guiones ni dígitos de verificación).
          </p>
          <div className="border border-white/5 bg-[#1c1c1e]/40 p-4 rounded-xl flex items-center justify-center min-h-[220px]">
            <img src="/Ejemplo.png" alt="Ejemplo de archivo Excel" className="rounded-lg max-h-72 object-contain opacity-80" />
          </div>
        </section>

        {/* ── Info Section ── */}
        <section className="glass p-6 sm:p-8 space-y-6">
          <h2 className="text-md font-medium text-white flex items-center gap-2">
            <Info className="h-4.5 w-4.5 text-[#86868b]" />
            ¿Qué hace esta aplicación?
          </h2>
          <p className="text-[#86868b] text-sm leading-relaxed font-normal">
            Esta herramienta automatiza la consulta de información empresarial directamente en el <strong className="text-white font-medium">RUES (Registro Único Empresarial y Social)</strong> de Colombia. Permite ahorrar horas de consulta manual mediante la carga masiva y concurrente.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="feature-card space-y-3">
              <div className="p-2 w-fit rounded-lg bg-white/5 border border-white/5">
                <UploadCloud className="h-5 w-5 text-[#86868b]" />
              </div>
              <h3 className="text-sm font-medium text-white">1. Sube tu archivo</h3>
              <p className="text-xs text-[#86868b] leading-relaxed">
                Carga el archivo Excel (.xlsx) con la columna de NITs. La app limpiará y normalizará cada registro automáticamente.
              </p>
            </div>
            <div className="feature-card space-y-3">
              <div className="p-2 w-fit rounded-lg bg-white/5 border border-white/5">
                <Search className="h-5 w-5 text-[#86868b]" />
              </div>
              <h3 className="text-sm font-medium text-white">2. Consulta concurrente</h3>
              <p className="text-xs text-[#86868b] leading-relaxed">
                Consultas paralelas rápidas para obtener el nombre, cámara de comercio, actividad económica y estado actual.
              </p>
            </div>
            <div className="feature-card space-y-3">
              <div className="p-2 w-fit rounded-lg bg-white/5 border border-white/5">
                <Download className="h-5 w-5 text-[#86868b]" />
              </div>
              <h3 className="text-sm font-medium text-white">3. Resultados listos</h3>
              <p className="text-xs text-[#86868b] leading-relaxed">
                Visualiza los datos en una tabla limpia y descárgalos directamente en un nuevo archivo Excel listo para reportar.
              </p>
            </div>
          </div>
        </section>

        {/* ── Results Table ── */}
        {results.length > 0 && (
          <section className="glass p-5 sm:p-6 overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-md font-medium text-white flex items-center gap-2">
                <Building2 className="h-4.5 w-4.5 text-[#86868b]" />
                Resultados obtenidos
              </h2>
              <span className="badge badge-neutral">{results.length} registros</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#1c1c1e]/20">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th className="text-left">NIT</th>
                    <th className="text-left">Nombre Empresa</th>
                    <th className="text-left">Categoría Matrícula</th>
                    <th className="text-left">Cámara de Comercio</th>
                    <th className="text-left">Estado Matrícula</th>
                    <th className="text-left">Último Año</th>
                    <th className="text-left">Actividad Económica</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, i) => (
                    <tr key={i} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                      <td className="font-mono text-[#86868b] font-normal text-xs">{row.nit}</td>
                      <td>
                        {row.error ? (
                          <span className="text-[#ff453a] text-xs font-normal inline-flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 inline" />
                            {row.error}
                          </span>
                        ) : (
                          <span className="font-medium text-[#e5e5ea]">{row.nombre_empresa}</span>
                        )}
                      </td>
                      <td className="text-xs text-[#86868b]">{row.categoria_matricula || "—"}</td>
                      <td className="text-xs text-[#86868b]">{row.camara_comercio || "—"}</td>
                      <td>
                        {row.estado_matricula ? (
                          <span
                            className={`badge text-xs font-normal ${
                              row.estado_matricula.toLowerCase().includes("activ")
                                ? "bg-[#30d158]/10 text-[#30d158] border border-[#30d158]/15"
                                : row.estado_matricula.toLowerCase().includes("cancel") || row.estado_matricula.toLowerCase().includes("inactiv")
                                ? "bg-[#ff453a]/10 text-[#ff453a] border border-[#ff453a]/15"
                                : "badge-neutral"
                            }`}
                          >
                            {row.estado_matricula}
                          </span>
                        ) : (
                          <span className="text-[#86868b]">—</span>
                        )}
                      </td>
                      <td className="font-mono text-xs text-[#86868b]">{row.ultimo_ano_renovado || "—"}</td>
                      <td className="max-w-[200px] truncate text-xs text-[#86868b]" title={row.actividad_economica}>
                        {row.actividad_economica || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Footer ── */}
        <footer className="text-center py-8 space-y-1.5 border-t border-white/5">
          <p className="text-[#48484a] text-xs font-normal">
            Automatizador RUES — Sistema de consulta masiva empresarial
          </p>
          <p className="text-[#48484a] text-xs font-normal">
            Creado por{" "}
            <a
              href="https://github.com/NotExer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#86868b] hover:text-white transition-colors duration-200"
            >
              NotExer
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
