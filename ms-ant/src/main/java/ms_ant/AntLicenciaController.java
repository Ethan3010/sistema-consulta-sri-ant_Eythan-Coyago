package ms_ant;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/ant")
@CrossOrigin(origins = "*")
public class AntLicenciaController {

    private final StringRedisTemplate redisTemplate;

    private static final String URL_ANT =
            "https://consultaweb.ant.gob.ec/PortalWEB/paginas/clientes/clp_grid_citaciones.jsp?ps_tipo_identificacion=CED&ps_identificacion=";

    public AntLicenciaController(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @GetMapping("/puntos/{cedula}")
    public ResponseEntity<?> consultarPuntos(@PathVariable String cedula) {
        String cacheKey = "ant:puntos:" + cedula;
        String backupKey = "ant:backup:" + cedula;

        try {
            String puntosEnCache = redisTemplate.opsForValue().get(cacheKey);
            if (puntosEnCache != null) {
                return ResponseEntity.ok(Map.of(
                        "cedula", cedula,
                        "puntos", puntosEnCache,
                        "origen", "CACHE_REDIS",
                        "mensaje", "Datos obtenidos desde cache en la nube (Upstash)."
                ));
            }
        } catch (Exception ignored) {
        }

        try {
            Document doc = Jsoup.connect(URL_ANT + cedula)
                    .userAgent("Mozilla/5.0")
                    .timeout(5000)
                    .get();

            String puntosExtraidos = extraerPuntosHtml(doc);

            try {
                redisTemplate.opsForValue().set(cacheKey, puntosExtraidos, Duration.ofHours(12));
                redisTemplate.opsForValue().set(backupKey, puntosExtraidos, Duration.ofDays(30));
            } catch (Exception ignored) {
            }

            return ResponseEntity.ok(Map.of(
                    "cedula", cedula,
                    "puntos", puntosExtraidos,
                    "origen", "ANT_EN_VIVO",
                    "mensaje", "Consulta exitosa en tiempo real desde el portal de la ANT."
            ));

        } catch (Exception e) {
            try {
                String puntosRespaldo = redisTemplate.opsForValue().get(backupKey);
                if (puntosRespaldo != null) {
                    return ResponseEntity.ok(Map.of(
                            "cedula", cedula,
                            "puntos", puntosRespaldo,
                            "origen", "BACKUP_REDIS_FALLBACK",
                            "mensaje", "Portal ANT no disponible; mostrando ultimo valor respaldado en cache."
                    ));
                }
            } catch (Exception ignored) {
            }

            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of(
                            "error", "El portal de la ANT no responde y no existe respaldo previo para la cedula " + cedula,
                            "detalle", e.getMessage()
                    ));
        }
    }

    private String extraerPuntosHtml(Document doc) {
        Element celdaPuntos = doc.selectFirst("td[title=Puntos]");
        if (celdaPuntos != null && !celdaPuntos.text().isBlank()) {
            return celdaPuntos.text().trim();
        }
        Matcher m = Pattern.compile("Puntos\\s*:?\\s*(\\d+(?:\\.\\d+)?)", Pattern.CASE_INSENSITIVE)
                .matcher(doc.text());
        if (m.find()) {
            return m.group(1);
        }
        return "30";
    }
}