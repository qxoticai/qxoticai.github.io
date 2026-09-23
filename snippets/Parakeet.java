///usr/bin/env jbang "$0" "$@" ; exit $?
//DESCRIPTION Speech recognition with NVIDIA Parakeet
//JAVA 25+
//RUNTIME_OPTIONS --add-modules jdk.incubator.vector --enable-native-access=ALL-UNNAMED
//DEPS com.qxotic:jinfer-bom:0.3.0@pom
//DEPS com.qxotic:jinfer-spring-ai
//DEPS com.qxotic:jinfer-parakeet
//DEPS com.qxotic:jam-native com.qxotic:jam-vector
//DEPS org.slf4j:slf4j-nop:2.0.17

import com.qxotic.jinfer.spring.ai.JinferTranscriptionModel;
import org.springframework.ai.audio.transcription.AudioTranscriptionPrompt;
import org.springframework.core.io.UrlResource;

void main() throws Exception {
  try (var parakeet = JinferTranscriptionModel.builder()
      .model("mudler/parakeet-cpp-gguf/tdt-0.6b-v3-q8_0.gguf")
      .build()) {

    // jfk.wav: JFK's own voice, inaugural address, January 20, 1961
    var speech = new UrlResource("https://qxotic.ai/snippets/jfk.wav");
    var response = parakeet.call(new AudioTranscriptionPrompt(speech));
    System.out.println(response.getResult().getOutput());
  }
}
