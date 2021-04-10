import VLCJVideo.*;

VLCJVideo video;

void setup() {
  size(640, 400);
  //fullScreen();
  video = new VLCJVideo(this);
  //video.openAndPlay("https://www.sample-videos.com/video123/mp4/360/big_buck_bunny_360p_30mb.mp4");
  video.openAndPlay("http://babypi.local/hls/index.m3u8");
}

void draw() {
  background(0);
  image(video, 0, 0, width, height);
}
