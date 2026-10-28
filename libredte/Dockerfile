# LibreDTE Edición Comunidad (rama legacy) — imagen autocontenida para EasyPanel.
# PROBADO en producción Benechito (2026-10-28). Se pega tal cual en
# EasyPanel → servicio App → Fuente → Dockerfile.
#
# Al arrancar, el contenedor:
#  1. Genera /var/www/libredte-community/.env desde las variables de entorno.
#  2. Si la base está vacía, carga el esquema completo (usuarios + comunas +
#     actividades + DTE + honorarios). Queda el usuario por defecto admin/admin
#     que HAY QUE CAMBIAR al primer ingreso.
#
# Variables de entorno requeridas (servicio → Entorno):
#   APP_URL=https://facturas.<dominio>
#   APP_KEY=base64:<32 bytes aleatorios en base64>
#   DB_HOST=<proyecto>_<servicio-postgres>   DB_USERNAME / DB_PASSWORD / DB_DATABASE
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
COPY <<'EOS' /usr/local/bin/start.sh
#!/bin/sh
env | grep -E '^(APP_|DB_|MAIL_|REDIS_|SERVICES_)' | sed 's/=\(.*\)$/="\1"/' > /var/www/libredte-community/.env
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
exec apache2-foreground
EOS
RUN chmod +x /usr/local/bin/start.sh
EXPOSE 80
CMD ["/usr/local/bin/start.sh"]
