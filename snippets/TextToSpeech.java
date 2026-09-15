///usr/bin/env jbang "$0" "$@" ; exit $?
//JAVA 25+
//RUNTIME_OPTIONS --add-modules jdk.incubator.vector --enable-native-access=ALL-UNNAMED
//DEPS com.qxotic:jinfer-bom:0.2.0@pom
//DEPS com.qxotic:jinfer-spring-ai
//DEPS com.qxotic:jinfer-kokoro
//DEPS com.qxotic:jam-native com.qxotic:jam-vector
//DEPS org.slf4j:slf4j-nop:2.0.17

import com.qxotic.jinfer.spring.ai.JinferSpeechModel;
import java.nio.file.*;

void main() throws Exception {
  try (var tts = JinferSpeechModel.builder()
      .model("simonfxr/kokoro.cpp-GGUF:Q8_0")
      .companion("voice", "simonfxr/kokoro.cpp-GGUF/voices/kokoro-voice-af_heart.gguf")
      .build()) {
    var line = "Turns out, matrix multiplications can talk. "
             + "The JVM just crunched a few billion numbers to say this.";
    Files.write(Path.of("kokoro.wav"), tts.call(line));
  }
}
