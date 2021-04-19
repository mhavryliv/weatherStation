// Weather information class
import http.requests.*;

float windClickCounter = 0;
float windXComponent = 0.f;
float windYComponent = 0.f;
float lastTemp = 20.0f;
float lastHum = 50.0f;
String lastWindDir = "(none)";
float lastWindSpeed = 0.f;

class WDataPoint {
  float temp = 0.f;
  float humidity = 0.f;
  float windMax = 0.f;
  float windAvg = 0.f;
  int waterCount = 0;
  int timeOffset = 0;
}

class WInfo {
  WInfo() {
  }

  void getBOMData() {
    String url = "http://www.bom.gov.au/fwo/IDN60801/IDN60801.94938.json";
  }

  void updateHistoricalData() {
    PostRequest post = new PostRequest("https://weatherreporting.flyingaspidistra.net/events");
    //PostRequest post = new PostRequest("http://localhost:3000/dev/events");
    post.addHeader("Content-Type", "application/json");
    //String data = "{\"getPastSeconds\": 120}";
    //post.addData("body", data); 
    println("Making request...");
    post.send();
    JSONObject data = parseJSONObject(post.getContent());
    println("Got " + data.getInt("count") + " data points");
    //System.out.println("Reponse Content: " + post.getContent());
    //System.out.println("Reponse Content-Length Header: " + post.getHeader("Content-Length"));
  }

  void updateWithWSMsg(String msg) {
    JSONObject data = parseJSONObject(msg);
    lastTemp = data.getFloat("temp", 20.f);
    lastHum = data.getFloat("humidity", 50.0f);
    lastWindDir = data.getString("wdir", "(n/a)");
    lastWindSpeed = data.getFloat("wspeed", 0.f);
    boolean isWaterClick = data.getBoolean("waterclick", false);
    boolean isWindClick = data.getBoolean("windclick", false);
    ////println(windDir);
    //if(isWaterClick) {
    //  println("Water!!!");
    //  println(msg);
    //}
    if (isWindClick) {
      handleWindInput(lastWindDir);
    }
  }

  void handleWindInput(String windDir) {
    windClickCounter++;
    if (windDir.equals("N")) {
      windXComponent = 0.f;
      windYComponent = 1.f;
    } else if (windDir.equals("NE")) {
      windXComponent = -0.5f;
      windYComponent = 0.5f;
    } else if (windDir.equals("E")) {
      windXComponent = -1.f;
      windYComponent = 0.f;
    } else if (windDir.equals("SE")) {
      windXComponent = -0.5f;
      windYComponent = -0.5f;
    } else if (windDir.equals("S")) {
      windXComponent = 0.f;
      windYComponent = -1.f;
    } else if (windDir.equals("SW")) {
      windXComponent = 0.5f;
      windYComponent = -0.5f;
    } else if (windDir.equals("W")) {
      windXComponent = 1.f;
      windYComponent = 0.f;
    } else if (windDir.equals("NW")) {
      windXComponent = 0.5f;
      windYComponent = 0.5f;
    }
  }
}
