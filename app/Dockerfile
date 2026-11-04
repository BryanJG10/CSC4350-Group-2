# build stage: make the jar
FROM docker.io/library/eclipse-temurin:17-jdk AS build
WORKDIR /src

# copy build files first, so this layer is cached when only code changes
COPY gradle/ gradle/
COPY gradlew settings.gradle build.gradle ./

# download dependencies now, so a code change does not download them again
RUN ./gradlew --no-daemon dependencies

# source changes most, so copy it last
COPY src/ src/

RUN ./gradlew --no-daemon bootJar

# run stage: no jdk or source in the final image
FROM docker.io/library/eclipse-temurin:17-jre
WORKDIR /app

# don't run the app as root
RUN useradd --uid 1001 --no-create-home --shell /usr/sbin/nologin spring
USER 1001

COPY --from=build /src/build/libs/app-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
