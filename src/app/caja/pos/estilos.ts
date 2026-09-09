// CSS autocontenido y compatible con Chrome 56 (sin @layer, sin oklch, sin color-mix,
// sin grid). Se comparte entre /caja/pos (vender), /caja/pos/nuevo (agregar producto)
// y /caja/pos/vecina (Caja Vecina). Solo hex plano + flexbox.

export const POS_CSS = `
.posx-root{position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;background:#f1f5f9;color:#0f172a;
  display:-webkit-box;display:-webkit-flex;display:flex;-webkit-box-orient:vertical;-webkit-flex-direction:column;flex-direction:column;
  font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;overflow:hidden;-webkit-tap-highlight-color:rgba(0,0,0,0);}
.posx-root *{box-sizing:border-box;}
.posx-root button{font-family:inherit;cursor:pointer;border:0;}
.posx-root input,.posx-root select,.posx-root textarea{font-family:inherit;font-size:17px;}
.posx-root a{color:inherit;text-decoration:none;}

/* Cabecera */
.posx-head{-webkit-flex:0 0 auto;flex:0 0 auto;display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;
  background:#0f7a44;color:#fff;padding:8px 10px;}
.posx-head-brand{display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;}
.posx-logo{background:#fff;color:#0f7a44;font-weight:800;border-radius:10px;width:40px;height:40px;
  display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;-webkit-justify-content:center;justify-content:center;font-size:22px;}
.posx-logo-sm{width:32px;height:32px;font-size:18px;background:rgba(255,255,255,0.22);color:#fff;}
.posx-title{font-weight:800;font-size:16px;margin-left:8px;}
.posx-stats{margin-left:auto;display:-webkit-flex;display:flex;}
.posx-stat{text-align:center;padding:0 8px;line-height:1.1;}
.posx-stat b{display:block;font-size:14px;}
.posx-stat span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:#d1fae5;}
.posx-close-btn{margin-left:8px;background:#0b5c33;color:#fff;font-weight:700;font-size:13px;border-radius:10px;padding:9px 12px;}
.posx-head-back{margin-right:6px;background:rgba(255,255,255,0.22);color:#fff;font-weight:800;font-size:18px;border-radius:10px;width:38px;height:38px;line-height:1;
  display:-webkit-inline-flex;display:inline-flex;-webkit-align-items:center;align-items:center;-webkit-justify-content:center;justify-content:center;}

/* Barra de navegación entre pantallas del POS */
.posx-nav{-webkit-flex:0 0 auto;flex:0 0 auto;white-space:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;
  background:#0b5c33;padding:6px 8px;}
.posx-nav a{display:inline-block;color:#fff;font-weight:700;font-size:14px;background:rgba(255,255,255,0.12);border-radius:999px;padding:8px 14px;margin-right:6px;min-height:38px;}
.posx-nav a.posx-nav-on{background:#fff;color:#0f7a44;}

/* Herramientas */
.posx-tools{-webkit-flex:0 0 auto;flex:0 0 auto;display:-webkit-flex;display:flex;padding:8px;background:#fff;border-bottom:1px solid #e2e8f0;}
.posx-select{background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:10px;padding:10px;margin-right:8px;min-height:44px;}
.posx-select-full{width:100%;margin:0;}
.posx-buscar{-webkit-flex:1;flex:1;background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;min-height:44px;}

/* Categorías */
.posx-cats{-webkit-flex:0 0 auto;flex:0 0 auto;white-space:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;
  background:#fff;border-bottom:1px solid #e2e8f0;padding:6px 8px;}
.posx-cat{display:inline-block;background:#eef2f7;color:#334155;font-weight:700;font-size:14px;border-radius:999px;padding:9px 14px;margin-right:6px;min-height:40px;}
.posx-cat-on{background:#0f7a44;color:#fff;}

/* Productos */
.posx-prods{-webkit-flex:1;flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:8px;
  display:-webkit-flex;display:flex;-webkit-flex-wrap:wrap;flex-wrap:wrap;-webkit-align-content:flex-start;align-content:flex-start;}
.posx-pbtn{width:48%;margin:1%;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px 10px;text-align:left;
  min-height:92px;display:-webkit-flex;display:flex;-webkit-box-orient:vertical;-webkit-flex-direction:column;flex-direction:column;box-shadow:0 1px 2px rgba(15,23,42,.06);}
.posx-pbtn:active{background:#f0fdf4;border-color:#0f7a44;}
.posx-pnom{font-weight:800;font-size:15px;color:#0f172a;line-height:1.15;}
.posx-pmeta{font-size:11px;color:#94a3b8;margin-top:2px;-webkit-flex:1;flex:1;}
.posx-pprecio{font-weight:800;font-size:17px;color:#0f7a44;margin-top:6px;}
.posx-vacio{color:#64748b;font-size:14px;padding:16px;}

/* Barra inferior */
.posx-barra{-webkit-flex:0 0 auto;flex:0 0 auto;display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;
  background:#0f172a;color:#fff;padding:10px 12px;}
.posx-barra-info{-webkit-flex:1;flex:1;line-height:1.15;}
.posx-barra-n{display:block;font-size:12px;color:#cbd5e1;}
.posx-barra-total{display:block;font-size:22px;font-weight:800;}
.posx-btn-ver{background:#0f7a44;color:#fff;font-weight:800;font-size:16px;border-radius:12px;padding:14px 22px;min-height:52px;}

/* Overlays (carrito / cierre) */
.posx-overlay{display:none;position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,.45);z-index:5;}
.posx-overlay.posx-open{display:-webkit-flex;display:flex;-webkit-box-orient:vertical;-webkit-flex-direction:column;flex-direction:column;-webkit-box-pack:end;-webkit-justify-content:flex-end;justify-content:flex-end;}
.posx-panel{background:#fff;border-top-left-radius:18px;border-top-right-radius:18px;padding:14px;max-height:92%;
  display:-webkit-flex;display:flex;-webkit-box-orient:vertical;-webkit-flex-direction:column;flex-direction:column;overflow:hidden;}
.posx-panel-sm{max-height:80%;}
.posx-panel-head{display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;-webkit-justify-content:space-between;justify-content:space-between;margin-bottom:8px;}
.posx-panel-head h2{font-size:20px;font-weight:800;margin:0;}
.posx-x{background:#f1f5f9;color:#334155;font-weight:800;font-size:16px;border-radius:10px;width:40px;height:40px;}
.posx-lineas{overflow-y:auto;-webkit-overflow-scrolling:touch;-webkit-flex:1;flex:1;min-height:60px;}
.posx-linea{border:1px solid #eef2f7;border-radius:12px;padding:10px;margin-bottom:8px;}
.posx-linea-top{display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;-webkit-justify-content:space-between;justify-content:space-between;}
.posx-linea-nom{font-weight:700;font-size:15px;color:#0f172a;}
.posx-linea-sub{font-weight:800;font-size:15px;color:#0f172a;}
.posx-linea-ctrl{display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;margin-top:8px;}
.posx-qbtn{background:#eef2f7;color:#0f172a;font-weight:800;font-size:22px;border-radius:10px;width:48px;height:48px;line-height:1;}
.posx-qnum{min-width:44px;text-align:center;font-weight:800;font-size:18px;}
.posx-linea-quitar{margin-left:auto;background:#fee2e2;color:#b91c1c;font-weight:700;font-size:13px;border-radius:10px;padding:10px 12px;}
.posx-desc{display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;-webkit-justify-content:space-between;justify-content:space-between;margin:10px 0 4px;}
.posx-desc label{font-weight:700;color:#475569;}
.posx-money{display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;border:1px solid #cbd5e1;border-radius:12px;padding:0 10px;background:#fff;}
.posx-money span{font-weight:800;color:#64748b;margin-right:4px;}
.posx-money input{border:0;outline:none;padding:12px 4px;width:100%;font-size:20px;font-weight:700;background:transparent;}
.posx-money-sm{max-width:140px;}
.posx-money-sm input{text-align:right;}
.posx-total-row{display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;-webkit-justify-content:space-between;justify-content:space-between;
  border-top:1px solid #e2e8f0;margin-top:8px;padding-top:10px;font-weight:800;}
.posx-total-row span:first-child{font-size:16px;color:#475569;}
.posx-total-row span:last-child{font-size:26px;color:#0f172a;}
.posx-lbl{display:block;font-weight:700;color:#475569;font-size:14px;margin:10px 0 4px;}
.posx-textarea{width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:10px;font-size:16px;}
.posx-btn-primary{width:100%;background:#0f7a44;color:#fff;font-weight:800;font-size:19px;border-radius:14px;padding:16px;margin-top:12px;min-height:56px;}
.posx-btn-primary:active{background:#0b5c33;}
.posx-btn-cobrar[disabled]{opacity:.4;}
.posx-btn-danger{background:#b91c1c;}
.posx-btn-danger:active{background:#991b1b;}
.posx-btn-vaciar{width:100%;background:#fff;color:#b91c1c;font-weight:700;font-size:15px;border:1px solid #fecaca;border-radius:12px;padding:12px;margin-top:8px;}

/* Pantalla de apertura */
.posx-abrir{-webkit-flex:1;flex:1;display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;-webkit-justify-content:center;justify-content:center;padding:16px;}
.posx-abrir-card{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:24px;max-width:420px;width:100%;text-align:center;box-shadow:0 8px 30px rgba(15,23,42,.10);}
.posx-abrir-card .posx-logo{margin:0 auto 12px;width:56px;height:56px;font-size:30px;background:#0f7a44;color:#fff;}
.posx-abrir-card h1{font-size:24px;font-weight:800;margin:0 0 4px;}
.posx-abrir-card p{color:#64748b;margin:0 0 16px;}
.posx-abrir-card .posx-money{margin-bottom:4px;}

/* ===== Subpantallas (formularios: agregar producto, caja vecina) ===== */
.posx-sub{-webkit-flex:1;flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px;}
.posx-sub-inner{max-width:520px;margin:0 auto;}
.posx-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:16px;margin-bottom:14px;box-shadow:0 1px 2px rgba(15,23,42,.06);}
.posx-card h2{font-size:18px;font-weight:800;margin:0 0 4px;}
.posx-card p.posx-hint{color:#64748b;font-size:13px;margin:0 0 10px;}
.posx-input{width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:12px;font-size:17px;background:#fff;color:#0f172a;min-height:48px;}
.posx-row{display:-webkit-flex;display:flex;}
.posx-row > *{-webkit-flex:1;flex:1;}
.posx-row > *:first-child{margin-right:8px;}
.posx-kpis{display:-webkit-flex;display:flex;-webkit-flex-wrap:wrap;flex-wrap:wrap;margin:0 -4px 6px;}
.posx-kpi{width:33.33%;padding:4px;box-sizing:border-box;}
.posx-kpi-in{background:#fff;border:1px solid #e2e8f0;border-top:3px solid #0f7a44;border-radius:12px;padding:8px;text-align:center;}
.posx-kpi-in b{display:block;font-size:16px;font-weight:800;color:#0f172a;}
.posx-kpi-in span{display:block;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;color:#94a3b8;margin-top:2px;}
.posx-badge{display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;background:#e5f2ea;border:1px solid #bbe3cc;border-radius:12px;padding:10px 12px;font-size:14px;margin-bottom:12px;}
.posx-badge b{color:#0f7a44;}
.posx-badge .posx-badge-btn{margin-left:auto;background:#0f172a;color:#fff;font-weight:800;font-size:12px;border-radius:10px;padding:9px 12px;}
.posx-movs{list-style:none;margin:0;padding:0;}
.posx-mov{display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;border:1px solid #e2e8f0;border-radius:12px;padding:10px;margin-bottom:8px;background:#fff;}
.posx-mov-ic{width:40px;height:40px;border-radius:10px;background:#f1f5f9;display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;-webkit-justify-content:center;justify-content:center;font-size:18px;margin-right:10px;-webkit-flex:0 0 auto;flex:0 0 auto;}
.posx-mov-body{-webkit-flex:1;flex:1;min-width:0;}
.posx-mov-body b{display:block;font-size:14px;color:#0f172a;}
.posx-mov-body span{display:block;font-size:11px;color:#94a3b8;}
.posx-mov-monto{font-weight:800;font-size:15px;-webkit-flex:0 0 auto;flex:0 0 auto;}
.posx-mov-mas{color:#059669;}
.posx-mov-menos{color:#e11d48;}
.posx-ok{background:#dcfce7;border:1px solid #86efac;color:#166534;border-radius:12px;padding:12px;font-weight:700;font-size:14px;margin-bottom:12px;}
.posx-secc-tit{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.03em;color:#64748b;margin:4px 0 8px;}
`;
