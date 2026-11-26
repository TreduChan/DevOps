// Declarative Jenkins Pipeline for the hotel booking app (Node.js + React)
pipeline {
    // Runs on the Jenkins container (Linux, so the steps use sh)
    agent any

    environment {
        IMAGE = 'treduchan/hotel-app'
    }

    stages {
        // Stage 1: Get the source code from GitHub
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        // Stage 2: Check that Node.js, npm, Git and Docker are installed
        stage('Check Tools') {
            steps {
                sh 'node --version'
                sh 'npm --version'
                sh 'git --version'
                sh 'docker --version'
            }
        }

        // Stage 3: Install the backend packages and run the Jest tests
        stage('Backend Test') {
            steps {
                dir('backend') {
                    sh 'npm ci'
                    sh 'npm test'
                }
            }
        }

        // Stage 4: Install the frontend packages and build the React app
        stage('Frontend Build') {
            steps {
                dir('frontend') {
                    sh 'npm ci'
                    sh 'npm run build'
                }
            }
        }

        // Stage 5: Build the Docker image, tagged with the build number and latest
        stage('Docker Build') {
            steps {
                sh 'docker build -t $IMAGE:$BUILD_NUMBER -t $IMAGE:latest .'
            }
        }

        // Stage 6: Push the image to Docker Hub
        stage('Docker Push') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub',
                        usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'
                    sh 'docker push $IMAGE:$BUILD_NUMBER'
                    sh 'docker push $IMAGE:latest'
                }
            }
        }

        // Stage 7: Deploy the app and the database to Docker Swarm
        stage('Deploy to Swarm') {
            steps {
                sh 'docker stack deploy -c docker-stack.yml hotel'
                sh 'docker service update --force --image $IMAGE:$BUILD_NUMBER hotel_room-app'
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'frontend/dist/**', allowEmptyArchive: true
        }
        success {
            echo 'Hotel booking app built, pushed and deployed successfully!'
        }
        failure {
            echo 'Hotel booking build failed. Check the Jenkins console logs.'
        }
    }
}
