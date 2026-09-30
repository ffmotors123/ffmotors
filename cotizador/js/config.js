window.COTIZADOR_CONFIG = {
  // API key de ArgAutos (plan Starter/Pro). Vacío = acceso anónimo, 3 consultas por minuto.
  // Cuando el cotizador pase al servidor, la key se mueve allí y se quita de este archivo.
  argautosKey: '',
  argautosBase: 'https://argautos.com/api/v1',

  // Ajustes por defecto del cálculo; se pueden cambiar desde el panel "Ajustes" del cotizador.
  pricing: {
    ajusteMercado: 0, // % sobre el valor guía para llevarlo al mercado de Córdoba
    primaEstado: 5,   // % extra del precio sugerido (unidad en perfecto estado)
    rango: 7,         // ± % del rango de mercado
  },
};
