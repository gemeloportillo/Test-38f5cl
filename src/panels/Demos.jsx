import React from "react";
import { actualizarAnillos } from "../controllers/AnillosController.jsx";
// IMPORTANTE: Importamos los datos del JSON
import datos from "../estados.json"; 

const { app } = require("indesign");

export const Demos = () => {

    const ejecutarProceso = async () => {
        if (app.documents.length === 0) {
            console.error("No hay documentos abiertos.");
            return;
        }
        
        console.log("Iniciando actualización de anillos con datos del JSON...");

        // 1. Obtenemos la página donde estás parado
        const paginaActiva = app.activeWindow.activePage;

        // 2. Tomamos el primer estado (Aguascalientes) para la prueba
        // Cuando hagamos los 32, esto irá dentro de un bucle
        //const estadoSeleccionado = datos[2]; 

        // BUSCAMOS A COAHUILA EN TU JSON
        const estadoSeleccionado = datos.find(e => e.name === "Durango") || datos[8]; 
        // (Puse datos[4] como respaldo, pero el .find lo encontrará por nombre)

        console.log(`Probando caso extremo con: ${estadoSeleccionado.name}`);

        // 3. Llamamos al controlador pasando la página y los datos del JSON
        // Nota: Asegúrate de que tu AnillosController reciba (pagina, estado)
        await actualizarAnillos(paginaActiva, estadoSeleccionado);
        
        // Refrescar visualmente InDesign
        app.activeWindow.screenMode = app.activeWindow.screenMode;
        console.log(`Fin del proceso para: ${estadoSeleccionado.name}`);
    };

    return (
        <div style={{ padding: "15px" }}>
            <sp-heading>Gráficos PDN</sp-heading>
            <sp-body>Genera anillos SVG basados en los datos reales del JSON (Aguascalientes).</sp-body>
            <hr style={{ margin: "12px 0" }} />
            <sp-button variant="cta" onClick={ejecutarProceso} style={{ width: "100%" }}>
                Actualizar Anillos desde JSON
            </sp-button>
        </div>
    );
};
