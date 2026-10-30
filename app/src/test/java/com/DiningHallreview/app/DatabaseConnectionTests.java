package com.DiningHallreview.app;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;

import javax.sql.DataSource;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DatabaseMetaData;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration test for the real Postgres database configured in
 * application.yaml (Neon, Supabase, or local).
 *
 * <p>The test is skipped when no database is configured, so `./gradlew test`
 * still works for teammates who have not created an .env file. It runs when
 * DB_HOST is set as an environment variable or found in app/.env.
 *
 * <p>ddl-auto is forced to "none" so this test only reads from the database
 * and never changes the schema.
 */
@SpringBootTest
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=none")
@EnabledIf("databaseConfigured")
class DatabaseConnectionTests {

	private static final Logger log = LoggerFactory.getLogger(DatabaseConnectionTests.class);

	private static final String PLACEHOLDER_HOST = "your-project";

	@Autowired
	private DataSource dataSource;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Autowired
	private EntityManager entityManager;

	@Test
	void dataSourceConnectsToPostgres() throws Exception {
		try (Connection connection = dataSource.getConnection()) {
			assertTrue(connection.isValid(5), "The database connection should be valid");

			DatabaseMetaData metadata = connection.getMetaData();
			assertEquals("PostgreSQL", metadata.getDatabaseProductName(),
					"The configured datasource should point at PostgreSQL");

			log.info("Connected to {} {} (database: {}, user: {})",
					metadata.getDatabaseProductName(),
					metadata.getDatabaseProductVersion(),
					connection.getCatalog(),
					metadata.getUserName());
		}
	}

	@Test
	void jdbcTemplateCanExecuteAQuery() {
		Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
		assertEquals(1, result, "SELECT 1 should return 1");
	}

	@Test
	void jpaCanExecuteAQuery() {
		Object result = entityManager.createNativeQuery("SELECT 1").getSingleResult();
		assertNotNull(result, "JPA native query should return a value");
		assertEquals(1, ((Number) result).intValue(), "SELECT 1 through JPA should return 1");
	}

	@Test
	void databaseReportsItsName() {
		String databaseName = jdbcTemplate.queryForObject("SELECT current_database()", String.class);
		assertNotNull(databaseName, "current_database() should return the connected database name");
		log.info("Connected database: {}", databaseName);
	}

	/**
	 * JUnit condition that runs before the Spring context is created, so an
	 * unconfigured database never triggers a connection attempt.
	 */
	static boolean databaseConfigured() {
		String host = System.getenv("DB_HOST");
		if (host != null && !host.isBlank() && !host.contains(PLACEHOLDER_HOST)) {
			return true;
		}
		// Gradle and IntelliJ normally run tests with app/ as the working
		// directory, but check the repository root too.
		return envFileHasHost(Path.of(".env")) || envFileHasHost(Path.of("app", ".env"));
	}

	private static boolean envFileHasHost(Path envFile) {
		if (!Files.isRegularFile(envFile)) {
			return false;
		}
		try {
			return Files.readAllLines(envFile).stream()
					.map(String::trim)
					.filter(line -> line.startsWith("DB_HOST="))
					.map(line -> line.substring("DB_HOST=".length()).trim())
					.anyMatch(value -> !value.isEmpty() && !value.contains(PLACEHOLDER_HOST));
		} catch (IOException e) {
			log.warn("Could not read {}: {}", envFile, e.getMessage());
			return false;
		}
	}
}
