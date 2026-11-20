package ms_sri;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sri")
@CrossOrigin(origins = "*")
public class SriController {

    private final RestTemplate restTemplate = new RestTemplate();

    private static final String URL_EXISTE_RUC =
            "https://srienlinea.sri.gob.ec/sri-catastro-sujeto-servicio-internet/rest/ConsolidadoContribuyente/existePorNumeroRuc?numeroRuc=";
    private static final String URL_OBTENER_RUC =
            "https://srienlinea.sri.gob.ec/sri-catastro-sujeto-servicio-internet/rest/ConsolidadoContribuyente/obtenerPorNumerosRuc?&ruc=";
    private static final String URL_VEHICULO =
            "https://srienlinea.sri.gob.ec/sri-matriculacion-vehicular-recaudacion-servicio-internet/rest/BaseVehiculo/obtenerPorNumeroPlacaOPorNumeroCampvOPorNumeroCpn?numeroPlacaCampvCpn=";

    private HttpEntity<String> headers() {
        HttpHeaders h = new HttpHeaders();
        h.set("User-Agent", "Mozilla/5.0");
        return new HttpEntity<>(h);
    }

    @GetMapping("/contribuyente/{ruc}")
    public ResponseEntity<?> validarContribuyente(@PathVariable String ruc) {
        try {
            ResponseEntity<Boolean> existe = restTemplate.exchange(
                    URL_EXISTE_RUC + ruc, HttpMethod.GET, headers(), Boolean.class);

            if (existe.getBody() == null || !existe.getBody()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "El RUC no esta registrado como contribuyente en el SRI."));
            }

            ResponseEntity<List> detalle = restTemplate.exchange(
                    URL_OBTENER_RUC + ruc, HttpMethod.GET, headers(), List.class);

            List lista = detalle.getBody();
            if (lista == null || lista.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "No se encontraron datos del contribuyente."));
            }

            Map persona = (Map) lista.get(0);
            String tipo = String.valueOf(persona.getOrDefault("tipoContribuyente", ""));
            if (!tipo.toUpperCase().contains("NATURAL")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "El RUC no corresponde a una Persona Natural.", "tipo", tipo));
            }

            return ResponseEntity.ok(persona);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Error al consultar el SRI: " + e.getMessage()));
        }
    }

    @GetMapping("/vehiculo/{placa}")
    public ResponseEntity<?> consultarVehiculo(@PathVariable String placa) {
        try {
            ResponseEntity vehiculo = restTemplate.exchange(
                    URL_VEHICULO + placa.toUpperCase(), HttpMethod.GET, headers(), Map.class);

            Map body = (Map) vehiculo.getBody();
            if (body == null || body.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "No se encontro vehiculo para la placa " + placa));
            }
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Error al consultar vehiculo en el SRI: " + e.getMessage()));
        }
    }
}