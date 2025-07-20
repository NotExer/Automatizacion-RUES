from selenium import webdriver
from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    NoSuchElementException, TimeoutException,
    ElementClickInterceptedException, ElementNotInteractableException
)
import pandas as pd
import time
import os
import sys
from unicodedata import normalize

# --- ⚙️ LÓGICA DE RUTAS CENTRALIZADA ---
if getattr(sys, 'frozen', False):
    # Cuando es un ejecutable PyInstaller
    ROOT_DIR = sys._MEIPASS
else:
    # Cuando es modo de desarrollo (script Python normal)
    ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

# Rutas de recursos
driver_path = os.path.join(ROOT_DIR, "drivers", "msedgedriver.exe")
OUTPUT_PATH = os.path.join(ROOT_DIR, "ResultadoRues.xlsx")

# Constantes
URL_RUES = "https://www.rues.org.co/?old=true"
ESPERA_GENERAL = 2


# --- 🧼 Utilidades ---
def normalizar(texto):
    return normalize('NFKD', texto).encode('ASCII', 'ignore').decode('ASCII').strip().lower()

def click_elemento(driver, element):
    try:
        element.click()
    except (ElementClickInterceptedException, ElementNotInteractableException):
        driver.execute_script("arguments[0].click();", element)

def scroll_a_elemento(driver, element):
    driver.execute_script("arguments[0].scrollIntoView(true);", element)


def cerrar_modal(driver, wait):
    try:
        print("⏳ Esperando modal...")
        modal_cerrar_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(),'Cerrar')]")))
        time.sleep(1)
        modal_cerrar_btn.click()
        print("✅ Modal cerrado.")
    except TimeoutException:
        print("❌ No se encontró el botón para cerrar el modal a tiempo.")
        raise Exception("No se pudo cerrar el modal.")

def ingresar_nit(driver, wait, nit):
    campo = wait.until(EC.presence_of_element_located((By.ID, "txtNIT")))
    campo.clear()
    campo.send_keys(nit)
    campo.send_keys(Keys.ENTER)

def expandir_resultado(driver, wait):
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "table.dataTable")))
    btn = wait.until(EC.element_to_be_clickable(
        (By.CSS_SELECTOR, "table.dataTable.dtr-inline.collapsed > tbody > tr > td:first-child")
    ))
    click_elemento(driver, btn)

def entrar_a_detalle(driver, wait):
    enlace = wait.until(EC.presence_of_element_located((By.XPATH, "//span[contains(@class, 'dtr-data')]//a[contains(@href, 'ConsultarDetalleRM')]")))
    scroll_a_elemento(driver, enlace)
    click_elemento(driver, enlace)

    verificar_y_enviar_si_es_necesario(driver, wait)

def verificar_y_enviar_si_es_necesario(driver, wait, timeout=5):
    try:
        boton_enviar = WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.XPATH, "//input[@type='submit' and @value='Enviar']"))
        )
        print("⚠️ Apareció pantalla intermedia. Enviando formulario...")
        scroll_a_elemento(driver, boton_enviar)
        click_elemento(driver, boton_enviar)
        time.sleep(2)
    except TimeoutException:
        pass


def obtener_nombre_empresa(driver, wait):
    try:
        h1 = wait.until(EC.presence_of_element_located((
            By.XPATH, "//h1[i[contains(@class, 'fa-chevron-right')]]"
        )))
        return h1.text.strip().replace("»", "").strip()
    except TimeoutException:
        return "No encontrado"

def obtener_dato_por_etiqueta(driver, etiqueta):
    try:
        filas = driver.find_elements(By.XPATH, "//tr")
        etiqueta_normalizada = normalizar(etiqueta)
        for fila in filas:
            celdas = fila.find_elements(By.TAG_NAME, "td")
            if len(celdas) >= 2:
                clave = normalizar(celdas[0].text)
                if etiqueta_normalizada in clave:
                    return celdas[1].text.strip()
        return "No encontrado"
    except Exception as e:
        return f"Error al buscar: {e}"
    
def reiniciar_busqueda(driver, wait):
    try:
        campo = wait.until(EC.presence_of_element_located((By.ID, "txtNIT")))
        campo.clear()
    except TimeoutException:
        print("⚠️ No se pudo reiniciar el campo de búsqueda.")


def clasificar_categoria(valor):
    valor_mayus = valor.upper()
    if "SOCIEDAD" in valor_mayus:
        return "Empresa"
    elif "PERSONA NATURAL" in valor_mayus:
        return "Persona natural"
    return valor

def obtener_actividad_economica(driver):
    try:
        return driver.find_element(By.CSS_SELECTOR, "ul.cleanlist").text.strip()
    except NoSuchElementException:
        return "No encontrada"

# --- 🔁 Lógica del scraping para un solo NIT ---
def procesar_nit(driver, wait, nit, idx, df):
    try:
        ingresar_nit(driver, wait, nit)
        expandir_resultado(driver, wait)
        entrar_a_detalle(driver, wait)

        df.at[idx, "Nombre Empresa"] = obtener_nombre_empresa(driver, wait)

        etiquetas = {
            "Último Año Renovado": "Último Año Renovado",
            "Estado de la Matrícula": "Estado Matrícula",
            "Categoría de la Matrícula": "Categoría"
        }

        for label_text, col_name in etiquetas.items():
            valor = obtener_dato_por_etiqueta(driver, label_text)
            if col_name == "Categoría":
                df.at[idx, col_name] = clasificar_categoria(valor)
            else:
                df.at[idx, col_name] = valor

        df.at[idx, "Actividad Económica"] = obtener_actividad_economica(driver)
    except Exception as e:
        print(f"❌ Error con NIT {nit}")


def ejecutar_proceso_desde_excel(excel_path):
    print(f"Usando driver desde: {driver_path}")
    print(f"El archivo de salida se guardará en: {OUTPUT_PATH}")

    df = pd.read_excel(excel_path, usecols="A", engine="openpyxl")
    df.columns = ["NIT"]
    df["NIT"] = df["NIT"].astype(str).str.replace(r"\D", "", regex=True).str[:9]
    nits = df["NIT"].dropna().tolist()

    df["Nombre Empresa"] = ""
    df["Último Año Renovado"] = ""
    df["Estado Matrícula"] = ""
    df["Categoría"] = ""
    df["Actividad Económica"] = ""

    options = Options()
    options.add_argument("--start-maximized")
    

    try:
        service = EdgeService(executable_path=driver_path)
        driver = webdriver.Edge(service=service, options=options)
        wait = WebDriverWait(driver, ESPERA_GENERAL)
    except Exception as e:
        print(f"❌ Error al iniciar el navegador Edge. Asegúrate de que 'msedgedriver.exe' está presente y es compatible con tu versión de Edge. Error: {e}")
        return

    driver.get(URL_RUES)

    try:
        cerrar_modal(driver, wait)
    except Exception as e:
        print(f"❌ No se pudo cerrar el modal inicial: {e}")
        driver.quit()
        return

    reiniciar_busqueda(driver, wait)

    for idx, nit in enumerate(nits):
        print(f"🔍 Procesando NIT {nit} ({idx + 1}/{len(nits)})")
        procesar_nit(driver, wait, nit, idx, df)
        time.sleep(2)

        driver.get(URL_RUES)
        reiniciar_busqueda(driver, wait)

        if idx % 5 == 0:
            df.to_excel(OUTPUT_PATH, index=False)

    df.to_excel(OUTPUT_PATH, index=False)
    driver.quit()
    print(f"✅ Proceso finalizado. Datos guardados en: {OUTPUT_PATH}")