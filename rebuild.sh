docker rm -f my_service || true

docker rmi -f my_service_image:latest || true

docker compose up -d --build my_service
