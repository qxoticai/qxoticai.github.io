///usr/bin/env jbang "$0" "$@" ; exit $?
//DESCRIPTION A spoiler shield, with probabilities
//JAVA 25+
//RUNTIME_OPTIONS --add-modules jdk.incubator.vector --enable-native-access=ALL-UNNAMED
//DEPS com.qxotic:jinfer-bom:0.4.0@pom
//DEPS com.qxotic:jinfer-spring-ai com.qxotic:jinfer-models-all
//DEPS com.qxotic:jam-native com.qxotic:jam-vector
//DEPS org.slf4j:slf4j-nop:2.0.20

import com.qxotic.jinfer.spring.ai.JinferDecisionModel;
import java.util.List;
import java.util.Map;
import org.springframework.ai.decision.question.YesNoQuestion;

void main() {
  try (var shield = JinferDecisionModel.builder()
      .model("LiquidAI/d1-2B-GGUF:Q8_0")
      .build()) {
    // A spoiler shield: hide every comment that gives away the twist
    var spoiler = Map.of("spoiler",
        YesNoQuestion.of("Does this give away the movie's big twist?"));
    for (var comment : List.of(
        "The asteroid field chase is the best scene.",
        "No way, Vader is Luke's father?!",
        "Han Solo is the coolest character.")) {
      var p = shield.call(comment, spoiler)
          .getYesNo("spoiler").getProbability();
      System.out.printf("%.2f  %s%n", p, p > 0.5 ? "[SPOILER]" : comment);
    }
  }
}
