import { NextResponse } from "next/server";

interface DatosGovRecord {
  nit: string;
  razon_social?: string;
  codigo_camara?: string;
  matricula?: string;
  estado_matricula?: string;
  categoria_matricula?: string;
  camara_comercio?: string;
  ultimo_ano_renovado?: string;
  cod_ciiu_act_econ_pri?: string;
}

interface DetalleResponse {
  codigo_error: string;
  registros: {
    razon_social?: string | null;
    categoria_matricula?: string | null;
    camara?: string | null;
    estado?: string | null;
    ultimo_ano_renovado?: string | null;
    cod_ciiu_act_econ_pri?: string | null;
    desc_ciiu_act_econ_pri?: string | null;
  } | null;
}

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nit = searchParams.get("nit");

  if (!nit) {
    return NextResponse.json({ error: "El parámetro 'nit' es requerido" }, { status: 400 });
  }

  try {
    const datosRes = await fetchWithTimeout(
      `https://www.datos.gov.co/resource/c82u-588k.json?nit=${nit}`
    );
    const datosRecords: DatosGovRecord[] = await datosRes.json();

    if (!datosRecords || datosRecords.length === 0) {
      return NextResponse.json(
        { nit, error: "No se encontraron registros para este NIT" },
        { status: 404 }
      );
    }

    const best =
      datosRecords.find((r) => r.estado_matricula === "ACTIVA") ?? datosRecords[0];

    const codigoCamara = (best.codigo_camara ?? "").padStart(2, "0");
    const matricula = (best.matricula ?? "").padStart(10, "0");
    const id = `${codigoCamara}${matricula}`;

    let reg: DetalleResponse["registros"] = null;
    try {
      const detalleRes = await fetchWithTimeout(
        `https://ruesapi.rues.org.co/WEB2/api/Expediente/DetalleRM/${id}`
      );
      const body: DetalleResponse = await detalleRes.json();
      if (body.codigo_error === "0000" && body.registros?.razon_social) {
        reg = body.registros;
      }
    } catch {
      reg = null;
    }

    const codCiiu = reg?.cod_ciiu_act_econ_pri ?? best.cod_ciiu_act_econ_pri ?? "";
    const descCiiu = reg?.desc_ciiu_act_econ_pri ?? "";
    const actividad = descCiiu ? `${codCiiu} - ${descCiiu}` : codCiiu;

    return NextResponse.json({
      nit,
      nombre_empresa: reg?.razon_social ?? best.razon_social ?? "",
      categoria_matricula: reg?.categoria_matricula ?? best.categoria_matricula ?? "",
      camara_comercio: reg?.camara ?? best.camara_comercio ?? "",
      estado_matricula: reg?.estado ?? best.estado_matricula ?? "",
      ultimo_ano_renovado: reg?.ultimo_ano_renovado ?? best.ultimo_ano_renovado ?? "",
      actividad_economica: actividad,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ nit, error: message }, { status: 500 });
  }
}
