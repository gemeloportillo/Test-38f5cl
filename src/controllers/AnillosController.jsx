const { app, FitOptions } = require("indesign");
const { storage } = require("uxp");
const fs = storage.localFileSystem;

const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const coloresSistemas = {
    "s1": "#f39889", "s2": "#ae62a4", "s3": "#8f84be", "s6": "#38a6cc"
};

async function generarAnilloSVG(porcentaje, sId, colorHex) {
    const perimetro = 157;
    const guion = (porcentaje / 100) * perimetro;
    const svgCode = `<?xml version="1.0" encoding="UTF-8"?>
    <svg id="Capa_1" xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 100 100">
    <defs><style>.st0 { fill: none; stroke: ${colorHex}; stroke-dasharray: ${guion.toFixed(2)} ${perimetro}; stroke-width: 10px; } .st1 { fill: none; stroke: #e9e1ea; stroke-dasharray: 157 157; stroke-width: 10px; }</style></defs>
    <circle class="st1" cx="25" cy="25" r="25"/><circle class="st0" cx="25" cy="25" r="25" transform="rotate(-90 25 25)"/></svg>`;

    const dataFolder = await fs.getDataFolder();
    const tempFile = await dataFolder.createFile(`anillo_${sId}.svg`, { overwrite: true });
    await tempFile.write(svgCode);
    return tempFile;
}

const calcularPorc = (estado, sId) => {
    const sectores = ["ejecutivo", "legislativo", "judicial", "ocas", "municipal"];
    let tiene = 0, total = 0;
    sectores.forEach(sec => {
        const info = estado.data[sId][sec];
        if (info) { tiene += info.tiene; total += info.total; }
    });
    return { tiene, total, porcentaje: total > 0 ? (tiene / total) * 100 : 0 };
};

// Función auxiliar para buscar items de forma segura (siempre refresca la lista)
function buscarSeguro(pagina, etiqueta) {
    if (!pagina || !pagina.isValid) return null;
    return pagina.allPageItems.find(item => item.label === etiqueta);
}

export async function actualizarAnillos(pagina, estado) {
    // Validamos que la página exista realmente antes de empezar
    if (!pagina || !pagina.isValid || !estado) {
        console.error("Página no válida o estado vacío");
        return;
    }

    // 1. Textos base
    const tEstado = buscarSeguro(pagina, "txt_estado");
    if (tEstado) tEstado.contents = estado.name;
    
    // 2. Mapa
    if (estado.icon2) {
        try {
            const cMapa = buscarSeguro(pagina, "marco_mapa");
            const pluginFolder = await fs.getPluginFolder();
            const mapasFolder = await pluginFolder.getEntry("mapas");
            const archivoMapa = await mapasFolder.getEntry(estado.icon2);

            if (cMapa && archivoMapa) {
                await cMapa.place(archivoMapa);
                await esperar(200); 

                try {
                    // Al haberlo importado arriba, esto ya no fallará
                    cMapa.fit(FitOptions.CONTENT_TO_FRAME);
                    cMapa.fit(FitOptions.CENTER_CONTENT);
                    console.log(`✅ Mapa ${estado.icon2} ajustado con éxito.`);
                } catch (e) {
                    console.warn("⚠️ Falló el ajuste, intentando método alterno...");
                    // Si todo falla, este es el comando de menú nativo
                    app.menuActions.itemByID(11270).invoke(); // Ajustar contenido a marco
                }
            }
        } catch (e) {
            // Esto nos dirá si el problema es el archivo o el comando
            console.warn("⚠️ Error mapa:", e.message);
        }
    }



    const sistemas = ["s1", "s2", "s3", "s6"];
    const sectoresIds = ["ejecutivo", "legislativo", "judicial", "ocas", "municipal"];

    for (const sId of sistemas) {
        try {
            const res = calcularPorc(estado, sId);
            
            // Refrescamos referencias en cada vuelta del bucle
            // --- B. ACTUALIZAR TEXTOS TOTALES DEL SISTEMA ---
            const tPorc = buscarSeguro(pagina, `txt_total_porc_${sId}`);
            if (tPorc) tPorc.contents = `${Math.round(res.porcentaje)}%`;

            const tConteo = buscarSeguro(pagina, `txt_total_conteo_${sId}`);
            if (tConteo) tConteo.contents = `${res.tiene} de ${res.total}`;

            // --- B.2 NUEVAS ETIQUETAS PARA LOS PIES (PIE_PORC y PIE_CONTEO) ---
            const tPiePorc = buscarSeguro(pagina, `txt_pie_porc_${sId}`);
            if (tPiePorc) tPiePorc.contents = `${Math.round(res.porcentaje)}%`;

            const tPieConteo = buscarSeguro(pagina, `txt_pie_conteo_${sId}`);
            if (tPieConteo) tPieConteo.contents = `${res.tiene} de ${res.total}`;


            // --- LÓGICA ESPECIAL TRIBUNAL (SOLO S3) ---
            if (sId === "s3") {
                const valorS3T = estado.data[sId].s3t;
                const tS3T = buscarSeguro(pagina, "txt_s3t");
                if (tS3T) tS3T.contents = valorS3T ? "SI" : "NO";

                const marcoIconoS3T = buscarSeguro(pagina, "svg_s3t");
                if (marcoIconoS3T) {
                    if (marcoIconoS3T.graphics.length > 0) {
                        marcoIconoS3T.graphics.item(0).remove();
                    }

                    if (valorS3T === true) {
                        try {
                            const pluginFolder = await fs.getPluginFolder();
                            const archivoIcono = await pluginFolder.getEntry("iconos/tribunal.svg");

                            if (archivoIcono) {
                                await marcoIconoS3T.place(archivoIcono);
                                // Agregamos el mismo tiempo de espera que el mapa
                                await esperar(200); 

                                // USAMOS LA MISMA LÓGICA QUE EL MAPA (Nombre en lugar de número)
                                try {
                                    marcoIconoS3T.fit(FitOptions.CONTENT_TO_FRAME);
                                    marcoIconoS3T.fit(FitOptions.CENTER_CONTENT);
                                    console.log("✅ Icono tribunal ajustado con éxito.");
                                } catch (fitError) {
                                    // Si falla el nombre, usamos el comando de menú que es infalible
                                    marcoIconoS3T.fit(1668575077);
                                    console.warn("⚠️ Ajuste de tribunal por ID numérico.");
                                }
                            }
                        } catch (e) {
                            console.warn("⚠️ No se pudo cargar o ajustar iconos/tribunal.svg");
                        }
                    }
                }
            }






            const marcoPie = buscarSeguro(pagina, `pie_total_${sId}`);
            if (marcoPie) {
                const color = coloresSistemas[sId];
                const svgFile = await generarAnilloSVG(res.porcentaje, sId, color);
                await esperar(100);
                await marcoPie.place(svgFile);

                // --- CAMBIO AQUÍ: Usamos IDs numéricos para evitar el error de undefined ---
                // --- FORMA OFICIAL Y SEGURA (Sin Warnings) ---
                try {
                    // Usamos las constantes oficiales que cargamos de 'indesign'
                    marcoPie.fit(FitOptions.CONTENT_TO_FRAME);
                    marcoPie.fit(FitOptions.CENTER_CONTENT);
                } catch (e) {
                    // Si llegara a fallar el objeto, usamos el número como último recurso
                    marcoPie.fit(1668575077);
                    console.log("Nota: Se usó ID numérico como respaldo para el fit.");
                }
            }

             // --- Barras Totales (Horizontales) ---
            const barraT = buscarSeguro(pagina, `barra_total_${sId}`);
            if (barraT) {
                const b = barraT.geometricBounds; // [y1, x1, y2, x2]
                const x1 = b[1];
                const anchoMax = 312;

                // Calculamos el crecimiento horizontal
                const crecimientoH = (res.porcentaje / 100 * anchoMax);

                // --- EL MISMO TRUCO PARA LAS HORIZONTALES ---
                // Usamos Math.max(0.1, ...) para que el ancho nunca sea 0 exacto
                const nuevoX2 = x1 + Math.max(0.1, crecimientoH);

                // Mantenemos y1, x1 y y2 intactos. Solo movemos x2
                barraT.geometricBounds = [b[0], x1, b[2], nuevoX2];
            }

            // --- DENTRO DEL BUCLE DE SECTORES ---
            for (const secId of sectoresIds) {
                try {
                    const info = estado.data[sId][secId];
                    if (!info) continue;

                    const pSec = info.total > 0 ? (info.tiene / info.total) * 100 : 0;

                    // Actualizar textos (esto ya te funciona bien)
                    const tPSec = buscarSeguro(pagina, `txt_porc_${sId}_${secId}`);
                    if (tPSec) tPSec.contents = `${Math.round(pSec)}%`;

                    const tCSec = buscarSeguro(pagina, `txt_conteo_${sId}_${secId}`);
                    if (tCSec) tCSec.contents = `${info.tiene} de ${info.total}`;

                    // --- CORRECCIÓN DE BARRA VERTICAL ---
                    const barraSec = buscarSeguro(pagina, `barra_${sId}_${secId}`);
                    if (barraSec) {
                        const b = barraSec.geometricBounds; // [y1, x1, y2, x2]
                        const y2 = b[2];
                        const altoMaximo = 50;

                        // Calculamos el crecimiento
                        const crecimiento = (pSec / 100 * altoMaximo);

                        // 1. Forzamos que por defecto la altura sea 0 (y1 = y2)
                        let nuevoY1 = y2 - Math.max(0.1, crecimiento);


                        // Aplicamos las coordenadas: [nuevoY1, x1, y2, x2]
                        barraSec.geometricBounds = [nuevoY1, b[1], y2, b[3]];
                    }
                } catch (err) {
                    console.warn(`⚠️ Error en barra sector ${secId} de ${sId}: ${err.message}`);
                    // Al estar dentro de un try/catch, si falla una barra, el ciclo SIGUE con la siguiente
                }
            }


        } catch (err) { console.error(`Fallo en ${sId}:`, err.message); }
    }
}
