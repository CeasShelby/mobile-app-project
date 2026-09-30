FROM php:8.2-apache

# Install PDO MySQL extension required for PHP database connections
RUN docker-php-ext-install pdo pdo_mysql

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Set Apache working directory
WORKDIR /var/www/html

# Copy backend files into Apache web root
COPY parent-teacher-backend/ /var/www/html/

# Set permissions for web server
RUN chown -R www-data:www-data /var/www/html

# Expose port 80
EXPOSE 80
