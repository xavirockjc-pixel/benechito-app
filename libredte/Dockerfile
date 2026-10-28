# LibreDTE Edición Comunidad (rama legacy) — imagen autocontenida para EasyPanel.
# PROBADO en producción Benechito (2026-10-28). Se pega tal cual en
# EasyPanel → servicio App → Fuente → Dockerfile.
#
# Al arrancar, el contenedor:
#  1. Genera /var/www/libredte-community/.env desde las variables de entorno.
#  2. Si la base está vacía, carga el esquema completo (usuarios + comunas +
#     actividades + DTE + honorarios). Queda el usuario por defecto admin/admin
#     que HAY QUE CAMBIAR al primer ingreso.
#  3. Si faltan comunas/actividades económicas, las carga desde datos-chile.sql
#     (generado en el build desde fuentes públicas: CUT chilemapas + sii.cl).
#
# Variables de entorno requeridas (servicio → Entorno):
#   APP_URL=https://facturas.<dominio>
#   APP_KEY=base64:<32 bytes aleatorios en base64>
#   DB_HOST=<proyecto>_<servicio-postgres>   DB_USERNAME / DB_PASSWORD / DB_DATABASE
#     (las DB_* las usa el script de arranque para cargar el esquema con psql)
#   ⚠️ La APP (rama legacy) lee la conexión desde OTRAS variables — van las DOS familias:
#   LIBREDTE_APP_DATABASE_DEFAULT_HOST=<proyecto>_<servicio-postgres>
#   LIBREDTE_APP_DATABASE_DEFAULT_PORT=5432
#   LIBREDTE_APP_DATABASE_DEFAULT_USER=libredte
#   LIBREDTE_APP_DATABASE_DEFAULT_PASS=<la misma del postgres>
#   LIBREDTE_APP_DATABASE_DEFAULT_NAME=libredte
# Volumen persistente: /var/www/libredte-community/data  (opcional pero recomendado)

FROM php:7.4-apache
# Debian bullseye ya está archivado: apuntar los repos al archive para que apt funcione.
RUN sed -i -e 's|deb.debian.org/debian-security|archive.debian.org/debian-security|g' -e 's|deb.debian.org/debian|archive.debian.org/debian|g' -e 's|security.debian.org|archive.debian.org|g' -e '/bullseye-updates/d' /etc/apt/sources.list && apt-get -o Acquire::Check-Valid-Until=false update && apt-get install -y --no-install-recommends git unzip wget postgresql-client libpq-dev libxml2-dev libzip-dev libpng-dev libjpeg-dev libonig-dev libicu-dev libxslt1-dev && docker-php-ext-configure gd --with-jpeg && docker-php-ext-install -j4 pdo_pgsql pgsql gd zip intl soap xsl bcmath mbstring && a2enmod rewrite && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www
RUN git clone --depth 1 https://github.com/sascocl/sowerphp.git sowerphp-framework && git clone --depth 1 https://github.com/LibreDTE/libredte-app-community.git libredte-community
WORKDIR /var/www/libredte-community
ENV COMPOSER_ALLOW_SUPERUSER=1
# Las libs legacy tienen avisos de seguridad conocidos; composer >=2.9 las bloquea por defecto.
RUN composer config policy.advisories.block false && (composer install --no-interaction --no-dev --optimize-autoloader || composer install --no-interaction --no-dev --ignore-platform-reqs)
RUN sed -ri 's#DocumentRoot /var/www/html#DocumentRoot /var/www/libredte-community/public#' /etc/apache2/sites-available/000-default.conf && printf '<Directory /var/www/libredte-community/public>\nAllowOverride All\nRequire all granted\n</Directory>\n' > /etc/apache2/conf-available/libredte.conf && a2enconf libredte && chown -R www-data:www-data /var/www/libredte-community /var/www/sowerphp-framework
COPY <<'EOPHP' /usr/local/share/gen-datos.php
<?php
// Genera /usr/local/share/datos-chile.sql con datos oficiales: regiones, provincias y
// comunas (CUT, via chilemapas) + actividades economicas del SII (sii.cl).
$out = ["BEGIN;"];
$e = fn($s) => str_replace("'", "''", $s);
$csv = file_get_contents('https://raw.githubusercontent.com/pachadotdev/chilemapas/master/data_csv/codigos_territoriales.csv');
$lines = array_slice(preg_split('/\r?\n/', trim($csv)), 1);
$reg = []; $prov = []; $com = [];
foreach ($lines as $l) {
    if (!$l) continue;
    [$rid, $rn, $pid, $pn, $cid, $cn] = explode(',', $l);
    $reg[$rid] = $rn; $prov[$pid] = [$pn, $rid]; $com[] = [$cid, $cn, $pid];
}
ksort($reg); ksort($prov);
foreach ($reg as $c => $n) $out[] = "INSERT INTO region (codigo, region, orden) VALUES ('$c', '{$e($n)}', ".intval($c).") ON CONFLICT (codigo) DO NOTHING;";
foreach ($prov as $c => $pr) $out[] = "INSERT INTO provincia (codigo, provincia, region) VALUES ('$c', '".substr($e($pr[0]), 0, 30)."', '{$pr[1]}') ON CONFLICT (codigo) DO NOTHING;";
foreach ($com as $cm) $out[] = "INSERT INTO comuna (codigo, comuna, provincia) VALUES ('{$cm[0]}', '".substr($e($cm[1]), 0, 40)."', '{$cm[2]}') ON CONFLICT (codigo) DO NOTHING;";
$ctx = stream_context_create(['http' => ['header' => "User-Agent: Mozilla/5.0\r\n"]]);
$h = file_get_contents('https://www.sii.cl/ayudas/ayudas_por_servicios/1956-codigos-1959.html', false, $ctx);
preg_match_all('~<tr[^>]*>(.*?)</tr>~s', $h, $rows);
foreach ($rows[1] as $r) {
    preg_match_all('~<td[^>]*>(.*?)</td>~s', $r, $tds);
    $c = array_map(fn($x) => trim(preg_replace('/\s+/', ' ', html_entity_decode(strip_tags($x), ENT_QUOTES | ENT_HTML5, 'UTF-8'))), $tds[1]);
    if (count($c) >= 4 && preg_match('/^\d{5,6}$/', $c[0])) {
        $iva = $c[2] === 'SI' ? 'true' : ($c[2] === 'NO' ? 'false' : 'NULL');
        $cat = preg_match('/^\d+$/', $c[3]) ? $c[3] : 'NULL';
        $g = substr($e(mb_strtoupper($c[1], 'UTF-8')), 0, 120);
        $out[] = "INSERT INTO actividad_economica (codigo, actividad_economica, afecta_iva, categoria) VALUES (".intval($c[0]).", '$g', $iva, $cat) ON CONFLICT (codigo) DO NOTHING;";
    }
}
$out[] = "COMMIT;";
file_put_contents('/usr/local/share/datos-chile.sql', implode("\n", $out)."\n");
echo "datos-chile.sql: ".count($out)." lineas\n";
EOPHP
RUN php /usr/local/share/gen-datos.php && grep -c "INSERT INTO comuna" /usr/local/share/datos-chile.sql && grep -c "INSERT INTO actividad_economica" /usr/local/share/datos-chile.sql
COPY <<'EOS' /usr/local/bin/start.sh
#!/bin/sh
env | grep -E '^(APP_|DB_|MAIL_|REDIS_|SERVICES_|LIBREDTE_)' | sed 's/=\(.*\)$/="\1"/' > /var/www/libredte-community/.env
chown www-data:www-data /var/www/libredte-community/.env
export PGPASSWORD="$DB_PASSWORD"
PSQLC="psql -h $DB_HOST -U $DB_USERNAME -d $DB_DATABASE -q"
i=0; until $PSQLC -c 'select 1' >/dev/null 2>&1; do i=$((i+1)); [ $i -gt 30 ] && break; sleep 2; done
if ! $PSQLC -c 'select 1 from usuario limit 1' >/dev/null 2>&1; then
echo 'Cargando esquema inicial de LibreDTE...'
for p in '*Usuarios/Model/Sql/usuarios.sql' '*DivisionGeopolitica/Model/Sql/PostgreSQL/division_geopolitica.sql' '*General/Model/Sql/afd.sql' '*General/Model/Sql/moneda.sql' '*General/Model/Sql/PostgreSQL/actividad_economica.sql' '*General/Model/Sql/PostgreSQL/banco.sql' '*Dte/Model/Sql/PostgreSQL.sql' '*Honorarios/Model/Sql/PostgreSQL.sql'; do
f=$(find /var/www -path "$p" 2>/dev/null | head -1)
[ -n "$f" ] && echo "-> $f" && $PSQLC -f "$f"
done
fi
C=$($PSQLC -t -A -c 'select count(*) from comuna' 2>/dev/null)
A=$($PSQLC -t -A -c 'select count(*) from actividad_economica' 2>/dev/null)
if [ "$C" = "0" ] || [ "$A" = "0" ]; then
echo 'Cargando datos de Chile (comunas y actividades economicas)...'
$PSQLC -f /usr/local/share/datos-chile.sql
fi
exec apache2-foreground
EOS
RUN chmod +x /usr/local/bin/start.sh
EXPOSE 80
CMD ["/usr/local/bin/start.sh"]
