import tkinter as tk
from tkinter import filedialog
import threading
import os
import sys
import webbrowser
from main import ejecutar_proceso_desde_excel

# Ruta del ícono
if getattr(sys, 'frozen', False):
    # Si es ejecutable, la ruta está en la carpeta temporal
    ruta_icono = os.path.join(sys._MEIPASS, "src", "Exer.ico")
else:
    # Si es modo de desarrollo, la ruta está en la misma carpeta src
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    ruta_icono = os.path.join(BASE_DIR, "Exer.ico")

class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Automatizador RUES")
        self.geometry("600x450")
        
        # Agrega esta línea para evitar redimensionar la ventana
        self.resizable(False, False)
        
        self.configure(bg="#0e1117")
        try:
            self.iconbitmap(ruta_icono)
        except Exception as e:
            print(f"No se pudo cargar el icono: {e}")
            pass
        self.ruta_excel = ""
        self.build_ui()

    # Métodos para el efecto hover
    def on_enter(self, event, button):
        button.config(bg="#3b82f6", fg="white")

    def on_leave(self, event, button):
        button.config(bg="#2563eb", fg="white")

    def build_ui(self):
        # Título
        self.titulo = tk.Label(self, text="⚙️ Automatizador de Consulta RUES", fg="#60a5fa", bg="#0e1117",font=("Segoe UI", 16, "bold"), pady=20)
        self.titulo.pack()

        # Descripción
        self.descripcion = tk.Label(
            self,
            text="Selecciona un archivo Excel con una columna de NITs.\n"
                "El sistema buscará automáticamente la información en el RUES\n"
                "y generará un archivo de resultados.",
            fg="#a1a1aa", bg="#0e1117", font=("Segoe UI", 11), pady=10)
        self.descripcion.pack()

        # Label de estado
        self.label = tk.Label(self, text="📄 Selecciona un archivo Excel con NITs", bg="#0e1117", fg="#f0f0f0", font=("Segoe UI", 12))
        self.label.pack(pady=10)

        # Botón seleccionar archivo
        self.boton_archivo = tk.Button(self, text="📂 Seleccionar archivo", command=self.seleccionar_archivo, bg="#2563eb", fg="white", font=("Segoe UI", 10, "bold"), bd=0, activebackground="#1d4ed8")
        self.boton_archivo.pack(pady=5, ipadx=10, ipady=5)
        self.boton_archivo.bind("<Enter>", lambda e: self.on_enter(e, self.boton_archivo))
        self.boton_archivo.bind("<Leave>", lambda e: self.on_leave(e, self.boton_archivo))

        # Botón ejecutar proceso
        self.boton_ejecutar = tk.Button(self, text="🚀 Ejecutar proceso", command=self.ejecutar_scraping, bg="#2563eb", fg="white", font=("Segoe UI", 10, "bold"), bd=0, activebackground="#1d4ed8", state=tk.DISABLED)
        self.boton_ejecutar.pack(pady=5, ipadx=10, ipady=5)
        self.boton_ejecutar.bind("<Enter>", lambda e: self.on_enter(e, self.boton_ejecutar))
        self.boton_ejecutar.bind("<Leave>", lambda e: self.on_leave(e, self.boton_ejecutar))

        # Footer
        self.footer = tk.Label(self, text="Creado por NotExer – GitHub", fg="#60a5fa", bg="#0e1117", font=("Segoe UI", 10), cursor="hand2")
        self.footer.pack(side="bottom", pady=15)
        self.footer.bind("<Button-1>", lambda e: webbrowser.open("https://github.com/NotExer"))

    def seleccionar_archivo(self):
        archivo = filedialog.askopenfilename(filetypes=[("Archivos Excel", "*.xlsx")])
        if archivo:
            self.ruta_excel = archivo
            nombre_archivo = os.path.basename(archivo)
            self.label.config(text=f"📁 Archivo seleccionado: {nombre_archivo}")
            self.boton_ejecutar.config(state=tk.NORMAL)

    def ejecutar_scraping(self):
        if self.ruta_excel:
            self.label.config(text="⏳ Procesando, por favor espera...")
            self.boton_ejecutar.config(state=tk.DISABLED)
            threading.Thread(target=self.run_worker).start()

    def run_worker(self):
        try:
            ejecutar_proceso_desde_excel(self.ruta_excel)
            self.after(0, lambda: self.label.config(text="✅ Proceso finalizado con éxito."))
        except Exception as e:
            self.after(0, lambda: self.label.config(text=f"❌ Error: {str(e)}"))
        finally:
            self.after(0, lambda: self.boton_ejecutar.config(state=tk.NORMAL))

if __name__ == "__main__":
    app = App()
    app.mainloop()