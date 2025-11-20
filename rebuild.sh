docker rm -f my_service 2>/dev/null || true

docker rmi -f my_service_image:latest 2>/dev/null || true

docker compose up -d --build