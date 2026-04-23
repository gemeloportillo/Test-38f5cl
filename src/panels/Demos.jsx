import React from "react";
import { actualizarAnillos } from "../controllers/AnillosController.jsx";
import datos from "../estados.json"; 

// IMPORTANTE: Añade LocationOptions aquí
const { app, LocationOptions } = require("indesign");

export const Demos = () => {

    const ejecutarProcesoMasivo = async () => {
        if (app.documents.length === 0) {
            console.error("No hay documentos abiertos.");
            return;
        }
        
        const doc = app.activeDocument;
        // La página 1 es nuestra plantilla (índice 0)
        const plantilla = doc.pages.item(0); 
        
        console.log("🚀 Iniciando generación masiva de 32 estados...");

        // BUCLE: Recorremos los 32 estados del JSON
        for (let i = 0; i < datos.length; i++) {
            const estadoSeleccionado = datos[i];
            let paginaObjetivo;

            try {
                if (i === 0) {
                    // Para el primer estado usamos la página 1 que ya existe
                    paginaObjetivo = plantilla;
                } else {
                    // CAMBIO AQUÍ: Usamos LocationOptions.AFTER en lugar del ID numérico
                    // Y nos aseguramos de que se duplique después de la última página actual
                    paginaObjetivo = plantilla.duplicate(LocationOptions.AFTER, doc.pages.lastItem());
                    // Un pequeño delay de 50ms ayuda a que la comunicación UXP -> InDesign sea estable
                    await new Promise(r => setTimeout(r, 50));
                }

                console.log(`Pintando (${i + 1}/32): ${estadoSeleccionado.name}`);

                // Llamamos a tu controlador enviando la página recién creada y los datos
                await actualizarAnillos(paginaObjetivo, estadoSeleccionado);

            } catch (error) {
                console.error(`Error procesando ${estadoSeleccionado.name}:`, error);
            }
        }
        
        // Refrescar visualmente InDesign al finalizar
        app.activeWindow.screenMode = app.activeWindow.screenMode;
        console.log("✅ Proceso masivo completado.");
        alert("¡Listo! Se han generado las 32 fichas estatales.");
    };

    return (
        <div style={{ padding: "15px" }}>
            <sp-heading>Generador de Reportes PDN</sp-heading>
            <sp-body>Crea 32 páginas Media Carta basadas en la plantilla y el JSON.</sp-body>
            <hr style={{ margin: "12px 0" }} />
            <sp-button variant="cta" onClick={ejecutarProcesoMasivo} style={{ width: "100%" }}>
                Generar 32 Estados
            </sp-button>
        </div>
    );
};
