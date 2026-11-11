FROM eclipse-temurin:17-jdk AS build
WORKDIR /workspace
COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
COPY src ./src
RUN chmod +x gradlew
RUN ./gradlew --no-daemon clean bootJar -x test

# run it
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /workspace/build/libs/app-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]

