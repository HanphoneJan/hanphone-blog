package com.example.blog.handler;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ControllerExceptionHandlerTest {

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new DummyController())
                .setControllerAdvice(new ControllerExceptionHandler())
                .build();
    }

    @Test
    void nonNumericPathVariable_returns400() throws Exception {
        mockMvc.perform(get("/dummy/path/abc"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void missingRequiredParam_returns400() throws Exception {
        mockMvc.perform(get("/dummy/query"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void malformedJsonBody_returns400() throws Exception {
        mockMvc.perform(post("/dummy/body")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{not-json"))
                .andExpect(status().isBadRequest());
    }

    @RestController
    static class DummyController {

        @GetMapping("/dummy/path/{id}")
        public String path(@PathVariable Long id) {
            return "ok";
        }

        @GetMapping("/dummy/query")
        public String query(@RequestParam String q) {
            return "ok";
        }

        @PostMapping("/dummy/body")
        public String body(@RequestBody Payload payload) {
            return "ok";
        }
    }

    static class Payload {
        private String name;

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
    }
}
