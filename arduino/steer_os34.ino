const int BTN1 = 7;
const int BTN2 = 8;
const int BTN3 = 9;
const int BTN4 = 10;

void setup() {
  Serial.begin(115200);

  pinMode(BTN1, INPUT_PULLUP);
  pinMode(BTN2, INPUT_PULLUP);
  pinMode(BTN3, INPUT_PULLUP);
  pinMode(BTN4, INPUT_PULLUP);
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  // read all sensors and buttons
  int knob1 = analogRead(A1);
  delay(1);
  int knob2 = analogRead(A2);
  delay(1);
  int knob3 = analogRead(A3);
  delay(1);
  int b1 = !digitalRead(BTN1);
  int b2 = !digitalRead(BTN2);
  int b3 = !digitalRead(BTN3);
  int b4 = !digitalRead(BTN4);

  // send 7 values
  Serial.print(knob1);
  Serial.print(',');
  Serial.print(knob2);
  Serial.print(',');
  Serial.print(knob3);
  Serial.print(',');
  Serial.print(b1);
  Serial.print(',');
  Serial.print(b2);
  Serial.print(',');
  Serial.print(b3);
  Serial.print(',');
  Serial.println(b4);
  
  delay(50);
}
