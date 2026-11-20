# Assignment III (Docker)

Docker Hub image: https://hub.docker.com/r/treduchan/hotel-app

## How we worked

- **Rio** made the Docker image and pushed it to Docker Hub.
- **Ahti** pulled the image, edited it and pushed it back to Docker Hub.

## Make and Push

```bash


docker build -t treduchan/hotel-app:latest .

docker push treduchan/hotel-app:latest
```

##  Pull and Copy

```bash
docker pull treduchan/hotel-app:latest

docker create --name frontend_temp_container treduchan/hotel-frontend:latest

docker cp frontend_temp_container:/app/frontend/src/views ./views


```

