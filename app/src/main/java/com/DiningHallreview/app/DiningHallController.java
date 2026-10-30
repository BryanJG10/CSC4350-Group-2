package com.DiningHallreview.app;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DiningHallController {

    @GetMapping("/api/dining-halls")
    public List<DiningHall> getDiningHalls() {
        return List.of(
            new DiningHall(1, "Patton"),
            new DiningHall(2, "Piedmont Central"),
            new DiningHall(3, "Piedmont North")
        );
    }

    public record DiningHall(int id, String name) {}
}

