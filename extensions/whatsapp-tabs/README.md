# Pestaña de WhatsApp de Señor Arroz

La extensión activa la pestaña del WhatsApp interno que seleccionó Pedidos. Funciona en el mismo perfil de escritorio de Chrome o Edge. El POS valida la cuenta y la sucursal antes de enviar el pedido. La extensión solo recibe la solicitud de activar su propia pestaña.

## Instalar en un PC de caja

1. Descarga y descomprime el paquete en una carpeta que el PC pueda conservar. [Descargar extensión](https://senorarroz.up.railway.app/downloads/senor-arroz-whatsapp-tabs-1.0.0.zip)
2. Abre `chrome://extensions` o `edge://extensions`. Activa el modo de desarrollador y elige **Cargar descomprimida**. Selecciona la carpeta que contiene `manifest.json`.
3. Recarga Pedidos y WhatsApp en el mismo perfil. Abre un pedido desde el ícono de WhatsApp para comprobar el cambio de pestaña.

## Empaquetar una versión

Actualiza la versión del manifiesto, vuelve a crear el ZIP desde esta carpeta y actualiza el enlace de descarga para que coincida con la versión publicada.

```sh
python3 -m zipfile -c ../../public/downloads/senor-arroz-whatsapp-tabs-1.0.0.zip manifest.json background.js whatsapp-tab.js
```
