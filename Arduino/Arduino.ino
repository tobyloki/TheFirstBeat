#include <Adafruit_NeoPixel.h>
#include <Thread.h>
#include <ThreadController.h>
#include <TimerOne.h>
#include <ArduinoJson.h>
// #include <arduino-timer.h>

#define pot             A0

#define redBtn          3
#define greenBtn        2

#define led             4

#define stipPin         7
#define ringPin         6

#define stripPixels     10
#define ringPixels      24

Adafruit_NeoPixel ledStrip = Adafruit_NeoPixel(stripPixels, stipPin, NEO_GRB + NEO_KHZ800);
Adafruit_NeoPixel ledRing = Adafruit_NeoPixel(ringPixels, ringPin, NEO_GRB + NEO_KHZ800);

ThreadController controller = ThreadController();
Thread controlsThread = Thread();
Thread ledStripThread = Thread();
Thread ledRingThread = Thread();

float speed = 10000;
const int matchPixels[] = {0, 23, 22};
int ringIndex = 1;
int ringBackgroundColor[] = {25, 0, 25};
bool btnPressed = false;

int healthPoints = 10;

#define start 9

// auto timer = timer_create_default();

void setup() {
  Serial.begin(9600);

  pinMode(start, INPUT);

  pinMode(redBtn, INPUT);
  pinMode(greenBtn, INPUT);
  attachInterrupt(digitalPinToInterrupt(redBtn), redBtnInt, CHANGE); // want to listen for when button is pressed, btn is active low
  attachInterrupt(digitalPinToInterrupt(greenBtn), greenBtnInt, FALLING);

  pinMode(led, OUTPUT);

  ledStrip.setBrightness(40);
  ledRing.setBrightness(40);

  ledStrip.begin();  
  ledRing.begin();

  // thread management
  controlsThread.onRun(handleControls);
  ledStripThread.onRun(spinStrip);
  ledRingThread.onRun(spinRing);
  
  controller.add(&controlsThread);
  controller.add(&ledStripThread);
  controller.add(&ledRingThread);
  
  // timer setup
  Timer1.initialize(0.25 * 1000.0 * 1000.0); // microseconds
  Timer1.attachInterrupt(updateRingBackgroundColor);
  Timer1.stop();

  // init ring
  resetGame();
}

// bool updateBPM(void *value) {
// 	if(value != NULL){
// 		float beat = *(float *)value;
// 		Serial.print("Next beat: ");
// 		Serial.println(beat);

// 		speed = beat / ringPixels;

// 		digitalWrite(led, !digitalRead(led));
// 	}
// 	return false;
// }

bool timer1InProgress = false;
void updateRingBackgroundColor() {
  // timer is always hits when it starts, so need to check on second go round
  static int round = 0;
  round++;
  if(round == 2){
    round = 0;
    timer1InProgress = false;
    Timer1.stop();

    ringBackgroundColor[0] = 25;
    ringBackgroundColor[1] = 0;
    ringBackgroundColor[2] = 25;
  }
}

float offset = 0;
bool gameStarted = false;

void handleControls() {
  // read pot speed
  float val = (int) map(analogRead(pot), 0, 1023, 0, 10);
  
  if(offset != val){
    offset = val;
    resetGame();

    Serial.print("changing offset: ");
    Serial.println(offset / 100);
  }

  // start
  if(!digitalRead(start)){
    if(!gameStarted){
      Serial.println("game started");
      gameStarted = true;
      resetGame();
      speed = (float)random(2, 5) / 100;
      Serial.print("Speed: ");
      Serial.println(speed);
      digitalWrite(led, 1);
    }
  } else {
    if(gameStarted){
      Serial.println("game ended");
      gameStarted = false;
      resetGame();
      digitalWrite(led, 1);
    }
  }
}

void spinStrip() {
  static int stripIndex = 0;

  // update leds
  for(int x=0; x<stripPixels; x++){
    if(x < healthPoints)
      ledStrip.setPixelColor(x, ledStrip.Color(0, 255, 0));
    else
      ledStrip.setPixelColor(x, ledStrip.Color(100, 0, 0));
  }

  ledStrip.show();
}

void spinRing() {
  // update leds
  for(int x=0; x<ringPixels; x++){
    ledRing.setPixelColor(x, ledRing.Color(ringBackgroundColor[0], ringBackgroundColor[1], ringBackgroundColor[2]));
  }

  if(!btnPressed){
    for(int x=0; x<(sizeof(matchPixels)/sizeof(matchPixels[0])); x++){
      ledRing.setPixelColor(matchPixels[x], ledRing.Color(0,0,255));
    }
  }
  
  ledRing.setPixelColor(ringIndex, ledRing.Color(0,255,0));

  ledRing.show();

  ringIndex++;
  if(ringIndex>=ringPixels) ringIndex = 0;

  if(ringIndex == 1){
    if(!btnPressed){      
      penalize();      
    }
    btnPressed = false;
  }
}

void redBtnInt() {
  // button debouncing
  static unsigned long last_interrupt_time = 0;
  unsigned long interrupt_time = millis();
  // If interrupts come faster than 500ms, assume it's a bounce and ignore
  if (interrupt_time - last_interrupt_time > 500) 
  {
    // red button logic goes here
    // Serial.print("red button: ");
    // Serial.println(digitalRead(redBtn));
    // if(digitalRead(redBtn)){
    //   // if(!gameStarted){
    //     Serial.println("game started");
    //     gameStarted = true;
    //     resetGame();
    //     speed = 0.05;
    //     digitalWrite(led, 1);
    //   // }
    // } else {
    //   // if(gameStarted){
    //     Serial.println("game ended");
    //     gameStarted = false;
    //     resetGame();
    //     digitalWrite(led, 1);
    //   // }
    // }
  }
  last_interrupt_time = interrupt_time;
}

void greenBtnInt() {
  // button debouncing
  static unsigned long last_interrupt_time = 0;
  unsigned long interrupt_time = millis();
  // If interrupts come faster than 500ms, assume it's a bounce and ignore
  if (interrupt_time - last_interrupt_time > 500) 
  {
    // green button logic goes here
    
    if(!btnPressed){  // don't register button press again if already registered this round
      btnPressed = true;

      Serial.println(ringIndex);
      bool inZone = arrayContainsValue(matchPixels, ringIndex);
      Serial.print("In zone: ");
      Serial.println(inZone);
      
      if(!inZone){
        penalize();
      } else {
        // healthPoints++;
        // healthPoints = constrain(healthPoints, 0, 10);
      }
    }
  }
  last_interrupt_time = interrupt_time;
}

void penalize() {
  if(!timer1InProgress){
    healthPoints--;
    healthPoints = constrain(healthPoints, 0, 10);

    ringBackgroundColor[0] = 100;
    ringBackgroundColor[1] = 0;
    ringBackgroundColor[2] = 0;

    timer1InProgress = true;
    Timer1.restart();

    if(healthPoints == 0){
      Serial.println("game over");
      digitalWrite(led, 0);

      gameStarted = false;
      resetGame();
      digitalWrite(led, 1);
    }    
  }
}

String inData;

void loop() {
	// timer.tick();

  ledRingThread.setInterval(speed * 1000);
  controller.run();

  // read serial data
  while (Serial.available() > 0)
	{
		char recieved = Serial.read();
		inData += recieved;

		// Process message when new line character is recieved
		if (recieved == '\n' || recieved == '\r' || recieved == '~')
		{
			inData.replace("\n", "");
      inData.replace("\r", "");
      inData.replace("~", "");
			Serial.print("data received: ");
			Serial.println(inData);

			DynamicJsonDocument doc(1024);
			deserializeJson(doc, inData);
			const char* rawCommand = doc["command"];
      String command(rawCommand);
			Serial.println(command);

      if(command.equals("start")){
				resetGame();        
      }
			else if(command.equals("beats")){
        float beat = doc["beat"];
        beat -= offset / 50;
        speed = beat / ringPixels;

//				// JsonArray beats = doc["beats"];
//
//				// timer.cancel();
//				
//				// timer.at(0, updateBPM, &(beats[0]));
//
//				// for(uint64_t x=0; x<beats.size(); x++){
//				// 	// if(x < beats.size()-1){
//				// 	// 	float nextBeat = 0.6;//beats[x+1];
//				// 	// 	timer.at(beats[x]*1000, updateBPM, &nextBeat);
//				// 	// } else {
//				// 	// 	timer.at(beats[x]*1000, updateBPM);
//				// 	// }
//				// 	float currBeat = beats[x];
//				// 	float nextBeat = beats[x+1];
//				// 	timer.at(currBeat*1000, updateBPM, &nextBeat);
//				// }
//
//				// healthPoints = 10;
//				// btnPressed = false;
//				// ringIndex = 1;
//				// ringBackgroundColor[0] = 25;
//				// ringBackgroundColor[1] = 0;
//				// ringBackgroundColor[2] = 25;
			}

			inData = ""; // Clear recieved buffer
		}
	}
}

bool arrayContainsValue(const int arr[], const int val){
  for(int x=0; x<(sizeof(matchPixels)/sizeof(matchPixels[0])); x++){
    if(arr[x] == val) return true;
  }
  return false;
}


void resetGame() {
  ringIndex = 1;
  spinRing();
  healthPoints = 10;
  btnPressed = false;        
  ringBackgroundColor[0] = 25;
  ringBackgroundColor[1] = 0;
  ringBackgroundColor[2] = 25;
  speed = 10000;
}