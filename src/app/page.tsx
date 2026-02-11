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
    <div className="min-h-screen bg-[#0e1117] text-white flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-5xl">
        <h1 className="text-3xl font-bold text-blue-400 mb-2">
          ⚙️ Automatizador de Consulta RUES
        </h1>
        <p className="text-zinc-400 text-sm mb-8">
          Sube un archivo Excel (.xlsx) con los NITs en la primera columna.
          La aplicación consultará el RUES para cada NIT y mostrará los
          resultados. Podrás descargar los resultados en un nuevo archivo Excel.
        </p>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-zinc-600 rounded-lg p-8 text-center hover:border-blue-500 transition cursor-pointer"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="hidden"
          />
          {file ? (
            <p className="text-blue-400 font-medium">
              📄 {file.name}{" "}
              <span className="text-zinc-400">
                ({nits.length} NITs encontrados)
              </span>
            </p>
          ) : (
            <p className="text-zinc-400">
              Arrastra y suelta un archivo .xlsx aquí o haz clic para
              seleccionar
            </p>
          )}
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={handleProcess}
            disabled={nits.length === 0 || processing}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {processing ? "Procesando..." : "Ejecutar proceso"}
          </button>
          {results.length > 0 && !processing && (
            <button
              onClick={handleDownload}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition"
            >
              Descargar Resultados
            </button>
          )}
        </div>

        {(processing || progress.done > 0) && (
          <div className="mt-6">
            <p className="text-zinc-300 text-sm mb-1">
              Procesando {progress.done}/{progress.total}...
            </p>
            <div className="w-full bg-zinc-800 rounded-full h-3 mt-4">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all"
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

        {results.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left mt-6">
              <thead>
                <tr className="bg-zinc-800/80 text-zinc-300">
                  <th className="px-3 py-2">NIT</th>
                  <th className="px-3 py-2">Nombre Empresa</th>
                  <th className="px-3 py-2">Categoría de la Matrícula</th>
                  <th className="px-3 py-2">Cámara de Comercio</th>
                  <th className="px-3 py-2">Estado de la Matrícula</th>
                  <th className="px-3 py-2">Último Año Renovado</th>
                  <th className="px-3 py-2">Actividad Económica</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-zinc-800 hover:bg-zinc-800/40"
                  >
                    <td className="px-3 py-2">{row.nit}</td>
                    <td className="px-3 py-2">
                      {row.error ? (
                        <span className="text-red-400">{row.error}</span>
                      ) : (
                        row.nombre_empresa
                      )}
                    </td>
                    <td className="px-3 py-2">{row.categoria_matricula}</td>
                    <td className="px-3 py-2">{row.camara_comercio}</td>
                    <td className="px-3 py-2">{row.estado_matricula}</td>
                    <td className="px-3 py-2">{row.ultimo_ano_renovado}</td>
                    <td className="px-3 py-2">{row.actividad_economica}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="mt-12 text-center text-zinc-500 text-xs">
          Creado por{" "}
          <a
            href="https://github.com/NotExer"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            NotExer
          </a>
        </footer>
      </div>
    </div>
  );
}
