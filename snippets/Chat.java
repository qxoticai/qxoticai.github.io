///usr/bin/env jbang "$0" "$@" ; exit $?
//JAVA 25+
//RUNTIME_OPTIONS --add-modules jdk.incubator.vector --enable-native-access=ALL-UNNAMED
//DEPS com.qxotic:jinfer-bom:0.2.0@pom
//DEPS com.qxotic:jinfer-spring-ai com.qxotic:jinfer-models-all
//DEPS com.qxotic:jam-native com.qxotic:jam-vector
//DEPS org.slf4j:slf4j-nop:2.0.17

import com.qxotic.jinfer.spring.ai.*;

void main() {
  try (var model = JinferChatModel.builder()
      .model("LiquidAI/LFM2.5-350M-GGUF:Q8_0")
      .build()) {
    System.out.println(model.call("What is the capital of France?"));
  }
}
