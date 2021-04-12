// Weather information class

float windClickCounter = 0;
float windXComponent = 0.f;
float windYComponent = 0.f;
float lastTemp = 20.0f;
float lastHum = 50.0f;
String lastWindDir = "(none)";
float lastWindSpeed = 0.f;

class WInfo {
  WInfo() {
    
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
    if(isWindClick) {
      handleWindInput(lastWindDir);
    }
  }
  
void handleWindInput(String windDir) {
  windClickCounter++;
  if(windDir.equals("N")) {
    windXComponent = 0.f;
    windYComponent = 1.f;
  }
  else if(windDir.equals("NE")) {
    windXComponent = -0.5f;
    windYComponent = 0.5f;      
  }
  else if(windDir.equals("E")) {
    windXComponent = -1.f;
    windYComponent = 0.f;
  }
  else if(windDir.equals("SE")) {
    windXComponent = -0.5f;
    windYComponent = -0.5f;
  }
  else if(windDir.equals("S")) {
    windXComponent = 0.f;
    windYComponent = -1.f;
  }
  else if(windDir.equals("SW")) {
    windXComponent = 0.5f;
    windYComponent = -0.5f;
  }
  else if(windDir.equals("W")) {
    windXComponent = 1.f;
    windYComponent = 0.f;
  }
  else if(windDir.equals("NW")) {
    windXComponent = 0.5f;
    windYComponent = 0.5f;
  }
}
}
