from selenium import webdriver
from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import pandas as pd
import time
import os
import sys

# --- ⚙️ Configuración de rutas ---
if getattr(sys, 'frozen', False):
    ROOT_DIR = sys._MEIPASS
else:
    ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

driver_path = os.path.join(ROOT_DIR, "drivers", "msedgedriver.exe")
OUTPUT_PATH = os.path.join(ROOT_DIR, "ResultadoRues.xlsx")

# Constantes
URL_RUES = "https://www.rues.org.co"
ESPERA_GENERAL = 5


def cerrar_modal(driver, wait):
    """Cierra el modal inicial"""
    try:
        modal_cerrar_btn = wait.until(EC.element_to_be_clickable((By.CLASS_NAME, "swal2-close")))
        modal_cerrar_btn.click()
        print("✅ Modal cerrado")
    except TimeoutException:
        print("⚠️ No se encontró modal")


def ingresar_nit(driver, wait, nit):
    campo = wait.until(EC.presence_of_element_located((By.ID, "search")))
    

    campo.click()
    campo.send_keys(Keys.CONTROL + "a")
    campo.send_keys(Keys.DELETE)      
    time.sleep(0.2)                     
    
 
    campo.send_keys(nit)
    campo.send_keys(Keys.ENTER)
    print(f"🔍 NIT {nit} ingresado")



def entrar_a_detalle(driver, wait):
    """Hace clic en el enlace Ver información"""
    enlace = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[contains(text(),'Ver información')]")))
    enlace.click()
    print("✅ Entró al detalle")


def obtener_texto_por_etiqueta(driver, etiqueta):
    """Busca un bloque con etiqueta y devuelve el valor"""
    bloques = driver.find_elements(By.CLASS_NAME, "registroapi")
    for bloque in bloques:
        try:
            label = bloque.find_element(By.CLASS_NAME, "registroapi__etiqueta").text.strip().lower()
            valor = bloque.find_element(By.CLASS_NAME, "registroapi__valor").text.strip()
            if etiqueta.lower() in label:
                return valor
        except:
            continue
    return "No encontrado"


def obtener_nombre_empresa(driver, wait):
    try:
        # Espera a que exista el H1 con clase que contenga "intro__nombre"
        h1 = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "h1[class*='intro__nombre']"))
        )

        # Hacer reintentos si el texto está vacío
        intentos = 0
        while intentos < 5:
            nombre = h1.text.strip()
            if nombre:  # si ya tiene texto, lo devuelve
                return nombre
            time.sleep(1)
            intentos += 1

        return "No encontrado"
    except TimeoutException:
        return "No encontrado"


def obtener_actividad_economica(driver, wait):
    """Va a la pestaña de actividad económica y extrae el primer dato que encuentre."""
    try:
        # Espera y haz clic en la pestaña de actividad económica
        pestaña = wait.until(EC.element_to_be_clickable((By.ID, "detail-tabs-tab-pestana_economica")))
        pestaña.click()
        
        # Espera a que el contenido se cargue
        time.sleep(2)
        
        # Localiza el primer bloque de actividad económica usando un selector CSS
        bloque_actividad = wait.until(
            EC.presence_of_element_located((
                By.CSS_SELECTOR, "#detail-tabs-tabpane-pestana_economica .registroapi:first-of-type .registroapi__valor"
            ))
        )
        
        # Devuelve el texto del elemento
        return bloque_actividad.text.strip()
        
    except TimeoutException:
        print("⚠️ No se encontró la actividad económica o la pestaña")
        return "No encontrada"
    

def procesar_nit(driver, wait, nit, idx, df):
    try:
        ingresar_nit(driver, wait, nit)
        entrar_a_detalle(driver, wait)

        df.at[idx, "Nombre Empresa"] = obtener_nombre_empresa(driver, wait)
        df.at[idx, "Categoría de la Matrícula"] = obtener_texto_por_etiqueta(driver, "Categoria de la Matrícula")
        df.at[idx, "Cámara de Comercio"] = obtener_texto_por_etiqueta(driver, "Cámara de Comercio")
        df.at[idx, "Estado de la Matrícula"] = obtener_texto_por_etiqueta(driver, "Estado de la Matrícula")
        df.at[idx, "Último Año Renovado"] = obtener_texto_por_etiqueta(driver, "Último año renovado")
        df.at[idx, "Actividad Económica"] = obtener_actividad_economica(driver, wait)

        print(f"✅ Datos guardados para NIT {nit}")
    except Exception as e:
        print(f"❌ Error con NIT {nit}: {e}")


def ejecutar_proceso_desde_excel(excel_path):
    df = pd.read_excel(excel_path, usecols="A", engine="openpyxl")
    df.columns = ["NIT"]
    df["NIT"] = df["NIT"].astype(str).str.replace(r"\D", "", regex=True).str[:9]

    # Crear columnas de salida
    df["Nombre Empresa"] = ""
    df["Categoría de la Matrícula"] = ""
    df["Cámara de Comercio"] = ""
    df["Estado de la Matrícula"] = ""
    df["Último Año Renovado"] = ""
    df["Actividad Económica"] = ""

    # Opciones navegador
    options = Options()
    options.add_argument("--start-maximized")
    service = EdgeService(executable_path=driver_path)
    driver = webdriver.Edge(service=service, options=options)
    wait = WebDriverWait(driver, ESPERA_GENERAL)

    driver.get(URL_RUES)
    cerrar_modal(driver, wait)

    for idx, nit in enumerate(df["NIT"]):
        print(f"\n➡️ Procesando {idx+1}/{len(df)}: {nit}")
        procesar_nit(driver, wait, nit, idx, df)
        driver.back()  # volver atrás
        time.sleep(2)

    df.to_excel(OUTPUT_PATH, index=False)
    driver.quit()
    print(f"\n📂 Proceso finalizado. Datos guardados en {OUTPUT_PATH}")


# --- 🚀 Ejecutar ---
if __name__ == "__main__":
    ejecutar_proceso_desde_excel("Nits.xlsx")
