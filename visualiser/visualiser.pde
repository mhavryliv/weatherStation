import websockets.*;

WebsocketClient wsc;
int now;
boolean newEllipse;

void setup(){
  size(200,200);
  
  newEllipse=true;
  
  //Here I initiate the websocket connection by connecting to "ws://localhost:8025/john", which is the uri of the server.
  //this refers to the Processing sketch it self (you should always write "this").
  wsc= new WebsocketClient(this, "ws://3.105.228.57:8123");
  now=millis();
}

void draw(){
  
}
 
void webSocketEvent(String msg){
  JSONObject data = parseJSONObject(msg);
  boolean isWaterClick = data.getBoolean("waterclick", false);
  boolean isWindClick = data.getBoolean("windclick", false);
  String windDir = data.getString("wdir");
  if(isWaterClick) {
    println("Water!!!");
  }
  if(isWindClick) {
    println("Is wind!!!");
    println("From " + windDir);
  }
  
  
}
