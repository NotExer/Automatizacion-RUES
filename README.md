# Automatizador RUES

Herramienta web para la consulta masiva y automatizada de información empresarial en el **RUES (Registro Único Empresarial y Social)** de Colombia.

**Preview:** [automatizacion-rues.vercel.app](https://automatizacion-rues.vercel.app)

## ¿Cómo funciona?

1. **Sube un archivo Excel (.xlsx)** con los NITs de las empresas en la primera columna (sin encabezados, sin puntos ni guiones).
2. **La app consulta automáticamente** cada NIT contra la API de [datos.gov.co](https://www.datos.gov.co/) y la API del RUES de forma concurrente.
3. **Visualiza los resultados** en una tabla y descárgalos como un nuevo archivo Excel.

**Datos obtenidos por cada NIT:**
- Nombre de la empresa
- Categoría de la matrícula
- Cámara de comercio
- Estado de la matrícula
- Último año renovado
- Actividad económica (código CIIU)

## Tecnologías

- [Next.js](https://nextjs.org/) 16 (App Router)
- [React](https://react.dev/) 19
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) 4
- [SheetJS (xlsx)](https://sheetjs.com/) — lectura y escritura de archivos Excel
- Desplegado en [Vercel](https://vercel.com/)

## Requisitos

- [Node.js](https://nodejs.org/) 18 o superior
- npm (incluido con Node.js)

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/notexer/automatizacion-rues.git
cd automatizacion-rues

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Scripts disponibles

| Comando         | Descripción                        |
| --------------- | ---------------------------------- |
| `npm run dev`   | Inicia el servidor de desarrollo   |
| `npm run build` | Genera la build de producción      |
| `npm run start` | Inicia el servidor de producción   |
| `npm run lint`  | Ejecuta ESLint                     |

## Autor

Creado por [NotExer](https://github.com/NotExer)
