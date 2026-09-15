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
import org.springframework.util.MimeType;

void main() throws Exception {
  try (var gemma = JinferChatModel.builder()
      .model("unsloth/gemma-4-E2B-it-GGUF:Q4_K_M")
      .companion("media", "unsloth/gemma-4-E2B-it-GGUF/mmproj-BF16.gguf")
      .build()) {

    // jfk.wav: JFK's own voice, inaugural address, January 20, 1961
    var speech = new UrlResource("https://qxotic.ai/snippets/jfk.wav");
    var transcript = ChatClient.create(gemma).prompt()
        .user(u -> u.text("Transcribe this recording.")
                    .media(MimeType.valueOf("audio/wav"), speech))
        .call().content();
    System.out.println(transcript);
  }
}
