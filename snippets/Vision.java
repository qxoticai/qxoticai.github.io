///usr/bin/env jbang "$0" "$@" ; exit $?
//JAVA 25+
//RUNTIME_OPTIONS --add-modules jdk.incubator.vector --enable-native-access=ALL-UNNAMED
//DEPS com.qxotic:jinfer-bom:0.2.0@pom
//DEPS com.qxotic:jinfer-spring-ai com.qxotic:jinfer-models-all
//DEPS org.springframework.ai:spring-ai-client-chat:2.0.1
//DEPS com.qxotic:jam-native com.qxotic:jam-vector
//DEPS org.slf4j:slf4j-nop:2.0.17

import com.qxotic.jinfer.spring.ai.*;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.core.io.UrlResource;
import org.springframework.util.MimeTypeUtils;

void main() throws Exception {
  try (var vision = JinferChatModel.builder()
      .model("LiquidAI/LFM2.5-VL-3B-GGUF:Q8_0")
      .companion("media", "LiquidAI/LFM2.5-VL-3B-GGUF/mmproj-LFM2.5-VL-3B-Q8_0.gguf")
      .build()) {

    // The windmills of Consuegra, La Mancha: Don Quixote's "giants"
    var windmills = new UrlResource("https://qxotic.ai/snippets/consuegra.jpg");
    var answer = ChatClient.create(vision).prompt()
        .user(u -> u.text("Don Quixote saw giants here. What do you see?")
                    .media(MimeTypeUtils.IMAGE_JPEG, windmills))
        .call().content();
    System.out.println(answer);
  }
}
