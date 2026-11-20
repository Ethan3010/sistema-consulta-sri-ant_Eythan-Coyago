# Sistema de Consulta Vehicular, Contribuyentes y Licencias (SRI - ANT)

Aplicación distribuida basada en una **arquitectura de microservicios** para consultar información tributaria y vehicular del SRI junto con los puntos de licencia de conducir de la ANT, incorporando tolerancia a fallos mediante caché distribuida en la nube (**Upstash Redis**).

## Arquitectura del Sistema (Modelo C4)

* **Diagrama arquitectónico completo (IcePanel):** [Abrir Icepanel_Eythan Coyago.pdf](docs/Icepanel_Eythan%20Coyago.pdf)

```text
+-----------------------+
|   Frontend (React)    |
|  http://localhost:5173|
+-----------+-----------+
            |
            +-------------------------------+
            | HTTP REST (JSON)              | HTTP REST (JSON)
            v                               v
+-----------------------+       +-----------------------+
|   Microservicio SRI   |       |   Microservicio ANT   |
|  (ms-sri - Port 8081) |       |  (ms-ant - Port 8082) |
+-----------+-----------+       +-----+-----------+-----+
            |                         |           |
            | API Pública             | Web       | SSL (rediss)
            | REST                    | Scraping  | Cache-Aside &
            v                         | (Jsoup)   | Stale-If-Error
+-----------------------+             |           v
|   Servicios en línea  |             |   +---------------+
|    SRI Ecuador        |             |   | Upstash Redis |
+-----------------------+             |   |  (ant-cache)  |
                                      |   +---------------+
                                      v
                        +---------------------------+
                        | Portal Web Consulta ANT   |
                        +---------------------------+
```

## Componentes y Tecnologías

| Módulo | Puerto | Tecnologías | Responsabilidad |
| :--- | :--- | :--- | :--- |
| **`ms-sri`** | `8081` | Java 17, Spring Boot, Maven | Consulta en tiempo real de contribuyentes (RUC) y datos vehiculares (Placa) desde los servicios del SRI. |
| **`ms-ant`** | `8082` | Java 17, Spring Boot, Jsoup, Spring Data Redis | Extracción de puntos de licencia desde la ANT con patrón **Cache-Aside** (`12h`) y respaldo **Fallback** (`30d`) en Upstash Redis. |
| **`frontend`** | `5173` | React, Vite, JavaScript (Fetch API) | Interfaz web unificada que consume ambos microservicios de forma desacoplada. |

## Patrones de Resiliencia Implementados (`ms-ant`)

1. **Cache-Aside (`CACHE_REDIS`):** Antes de consultar al portal externo de la ANT, verifica si los puntos de la cédula ya existen en caché activa (`ant:puntos:{cedula}`, TTL de 12 horas) para reducir latencia.
2. **Consulta en Vivo (`ANT_EN_VIVO`):** Si no existe caché reciente, realiza *web scraping* con Jsoup y actualiza tanto la caché activa como la llave de respaldo.
3. **Stale-If-Error / Fallback (`BACKUP_REDIS_FALLBACK`):** Si el portal de la ANT presenta intermitencia o errores HTTP (como `502 Bad Gateway`), el microservicio recupera automáticamente el último valor válido almacenado en Upstash Redis (`ant:backup:{cedula}`, TTL de 30 días) evitando la caída del sistema.

## Endpoints Principales

* **SRI Contribuyente:** `GET http://localhost:8081/api/sri/contribuyente/{ruc}`
* **SRI Vehículo:** `GET http://localhost:8081/api/sri/vehiculo/{placa}`
* **ANT Puntos:** `GET http://localhost:8082/api/ant/puntos/{cedula}`

## Instrucciones de Ejecución

Abrir tres terminales independientes en la raíz del proyecto:

1. **Levantar Microservicio SRI:**
   ```bash
   cd ms-sri
   .\mvnw.cmd spring-boot:run
   ```

2. **Levantar Microservicio ANT:**
   ```bash
   cd ms-ant
   .\mvnw.cmd spring-boot:run
   ```

3. **Levantar Frontend React:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Abrir en el navegador: `http://localhost:5173`