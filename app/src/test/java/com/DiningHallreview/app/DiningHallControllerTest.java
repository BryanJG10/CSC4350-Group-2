
package com.DiningHallreview.app;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DiningHallControllerTest {

    private final MockMvc mockMvc = MockMvcBuilders
            .standaloneSetup(new DiningHallController())
            .build();

    @Test
    void shouldReturnAllDiningHalls() throws Exception {
        mockMvc.perform(get("/api/dining-halls"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].name").value("Patton"))
                .andExpect(jsonPath("$[1].name").value("Piedmont Central"))
                .andExpect(jsonPath("$[2].name").value("Piedmont North"));
    }
}

