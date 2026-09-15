///usr/bin/env jbang "$0" "$@" ; exit $?
//JAVA 25+
//RUNTIME_OPTIONS --add-modules jdk.incubator.vector --enable-native-access=ALL-UNNAMED
//DEPS com.qxotic:jinfer-bom:0.2.0@pom
//DEPS com.qxotic:jinfer-spring-ai com.qxotic:jinfer-models-all
//DEPS com.qxotic:jam-native com.qxotic:jam-vector
//DEPS org.slf4j:slf4j-nop:2.0.17

import com.qxotic.jinfer.spring.ai.JinferEmbeddingModel;

void main() {
  try (var emb = JinferEmbeddingModel.builder()
      .model("LiquidAI/LFM2.5-Embedding-350M-GGUF:Q8_0")
      .build()) {
    var a = emb.embed("AI on the JVM");
    var b = emb.embed("the JVM thinks now");
    var c = emb.embed("the python shed its skin");
    System.out.printf("similar   %.3f%n", cosineSimilarity(a, b));
    System.out.printf("unrelated %.3f%n", cosineSimilarity(a, c));
  }
}

float cosineSimilarity(float[] a, float[] b) {
  float dot = 0, na = 0, nb = 0;
  for (int i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i];
  }
  return (float) (dot / Math.sqrt(na * nb));
}
