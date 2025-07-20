# Automatizador de Consulta RUES

## 📄 Descripción del Proyecto

Este es un automatizador de escritorio diseñado para simplificar el proceso de consulta de información en el portal del Registro Único Empresarial y Social (RUES) de Colombia. La aplicación utiliza una interfaz gráfica (GUI) para que el usuario seleccione un archivo de Excel con NITs. Luego, el sistema se conecta a la página del RUES, busca la información de cada NIT y guarda los resultados en un nuevo archivo de Excel.

## ✨ Características

* **Interfaz Gráfica (GUI):** Desarrollada con `tkinter` para una experiencia de usuario sencilla e intuitiva.
* **Automatización Web:** Utiliza `Selenium` para navegar y extraer datos del sitio web del RUES.
* **Procesamiento de Datos:** Lee y escribe archivos de Excel con la librería `pandas`.

## ⚙️ Requisitos

Para poder correr este proyecto, necesitas tener instalado lo siguiente:

* **Python:** Se recomienda usar Python 3.8 o superior.
* **Microsoft Edge:** El navegador debe estar instalado en tu sistema.
* **Controlador del Navegador:** El archivo `msedgedriver.exe` ya está incluido en la carpeta `drivers/` del proyecto y es compatible con el navegador Edge.

### 📦 Instalación de Dependencias

Todas las librerías de Python necesarias están listadas en el archivo `requirements.txt`. Para instalarlas, abre tu terminal y ejecuta el siguiente comando:

````bash
pip install -r requirements.txt
🚀 Instalación y Uso
Sigue estos pasos para clonar el repositorio, instalar las dependencias y ejecutar la aplicación.

1. Clonar el repositorio
Abre tu terminal y ejecuta el siguiente comando para clonar el proyecto a tu máquina local:

Bash

git clone [https://github.com/NotExer/AutomatizacionRUES](https://github.com/NotExer/AutomatizacionRUES)
cd AutomatizacionRUES
2. Formato del Archivo de Entrada
El archivo de Excel que selecciones para el procesamiento debe tener el siguiente formato:

Debe ser un archivo con extensión .xlsx.

La primera columna (Columna A) debe contener los NITs de las empresas que deseas consultar. No deben haber encabezados en esta columna; el programa comenzará a leer los NITs desde la primera fila de datos.

Ejemplo de estructura:

A
800123456
900234567
812345678

Export to Sheets
3. Ejecutar la aplicación
Una vez que todas las dependencias estén instaladas y tengas tu archivo de Excel listo, puedes ejecutar el script principal de la interfaz gráfica.

Bash

python src/gui.py
La ventana de la aplicación se abrirá, y podrás seleccionar tu archivo de Excel para comenzar el proceso.

📸 Ejemplos de Archivos Excel
A continuación, se muestran ejemplos de cómo deben verse los archivos Excel antes y después de ejecutar el programa.

Archivo de Entrada (Antes)
Asegúrate de tener una columna con los NITs en la primera columna del archivo Excel.




Archivo de Salida (Después)
Después de ejecutar el programa, se generará un nuevo archivo Excel con la información del RUES para cada NIT.




📂 Estructura del Proyecto
.
├── data/
│   └── (Contiene dos archivos de prueba con NITs de ejemplo)
├── drivers/
│   └── msedgedriver.exe
├── src/
│   ├── gui.py
│   └── main.py
├── assets/
│   ├── excel_antes.png
│   └── excel_despues.png
├── .gitignore
├── README.md
└── requirements.txt
✍️ Autor
NotExer

GitHub: https://github.com/NotExer
