/* Final Project — Generative System Steering
 * Built on Week 11.2 bidi serial example
 */

let myFont;
function preload() {
  myFont = loadFont('VT323-Regular.ttf');
}

let help = "Press f (possibly twice) to toggle fullscreen";
let knob1 = 0;
let knob2 = 0;
let knob3 = 0;
let btn1 = 0;
let btn2 = 0;
let btn3 = 0;
let btn4 = 0;

let port;
let baudrate = 115200;
let showConnectButton = false;

// state variables for button logic
let lastBtn3 = 0; 
let droneOff = false;
let lastKnob3 = -1;

// typewriter variables
let typeProgress = 0;
let typeSpeed = 1.5;
let allTypedOut = false;

// CRT scan
let scanY = 0;

// =======================================
// ======== PARTICLES ====================

let shapes = ['circle', 'triangle', 'square'];
let all_objects = [];
let size = 30;
let anchors = [];
let points = [];
let connections = [];
let speedMult = 1;

class Shape {
  constructor(x, y) {
    this.shape = random(shapes);
    this.x = x;
    this.y = y;
    this.d = 5;
    this.s = 5;
    this.r = 5;
    this.vx = random(-2, 2);
    this.vy = random(-2, 2);
  }

  overlapping() {
    for (let other of all_objects) {
      let d = dist(this.x, this.y, other.x, other.y);
      if (d < size) return true;
    }
    return false;
  }

  move() {
    this.x += this.vx * speedMult;
    this.y += this.vy * speedMult;
    if (this.x - size < 0 || this.x + size > windowWidth) this.vx *= -1;
    if (this.y - size < 0 || this.y + size > windowHeight) this.vy *= -1;
  }

  draw_shape() {
    stroke(0,174,64);
    // visual mapping of knob 2 to stroke weight
    strokeWeight(map(knob2, 0, 1023, 0.5, 4));
    noFill();
    this.move();

    if (this.shape === 'circle') {
      circle(this.x, this.y, this.d);
    } else if (this.shape === 'triangle') {
      let h = this.r * sqrt(3) / 2;
      triangle(
        this.x, this.y - h * 2 / 3,
        this.x + 0.5 * this.r, this.y + h / 3,
        this.x - 0.5 * this.r, this.y + h / 3
      );
    } else {
      square(this.x, this.y, this.s);
    }

    push();
    strokeWeight(2);
    point(this.x, this.y);
    fill(0,174,64);
    noStroke();
    textSize(12);
    textAlign(CENTER);
    let coords = `(${round(this.x)}, ${round(this.y)})`;
    text(coords, this.x, this.y - 15);
    pop();
  }
}


// ==================================================
// ============== AUDIO =============================
let osc1, osc2, filter, reverb;
let noteOsc, noteEnv;
let noteOsc2, noteOsc3;
let noteEnv2, noteEnv3;
let audioStarted = false;
let dorianScale = [146.83, 164.81, 174.61, 196.00, 220.00, 246.94, 261.63, 293.66];
let lastNoteTime = 0;

function setup_audio() {
  // ===== drone layer =====
  osc1 = new p5.Oscillator('sawtooth');
  osc2 = new p5.Oscillator('sawtooth');
  filter = new p5.LowPass();
  reverb = new p5.Reverb();

  osc1.disconnect();
  osc2.disconnect();
  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(reverb);
  filter.res(8);

  osc1.freq(73.42);
  osc2.freq(73.86);
  osc1.amp(0.1);
  osc2.amp(0.1);

  // ===== note layers =====
  // base layer
  noteOsc = new p5.Oscillator('triangle');
  noteOsc.amp(0);
  noteEnv = new p5.Envelope();
  noteEnv.setADSR(0.3, 0.5, 0.3, 1.5);
  noteEnv.setRange(0.08, 0);
  noteOsc.disconnect();
  noteOsc.connect(filter);

  // detune layer
  noteOsc2 = new p5.Oscillator('triangle');
  noteOsc2.amp(0);
  noteEnv2 = new p5.Envelope();
  noteEnv2.setADSR(0.4, 0.5, 0.3, 1.5);
  noteEnv2.setRange(0.05, 0);
  noteOsc2.disconnect();
  noteOsc2.connect(filter);

  // lead layer
  noteOsc3 = new p5.Oscillator('sawtooth');
  noteOsc3.amp(0);
  noteEnv3 = new p5.Envelope();
  noteEnv3.setADSR(0.6, 0.4, 0.2, 1.2);
  noteEnv3.setRange(0.06, 0);
  noteOsc3.disconnect();
  noteOsc3.connect(filter);
}

function startAudio() {
  if (!audioStarted) {
    userStartAudio();
    osc1.start();
    osc2.start();
    noteOsc.start();
    noteOsc2.start();
    noteOsc3.start();
    reverb.process(filter, 4, 2);
    audioStarted = true;
  }
}

function triggerNote() {
  if (btn2 == 1) return;
  if (!audioStarted) return;
  if (millis() - lastNoteTime < 600) return; 
  
  let note = random(dorianScale);
  
  // base
  noteOsc.freq(note);
  noteEnv.play(noteOsc);
  
  // detune
  noteOsc2.freq(note * 1.005);
  noteEnv2.play(noteOsc2);
  
  // lead
  noteOsc3.freq(note * 2);
  noteEnv3.play(noteOsc3);
  
  lastNoteTime = millis();
}

function mousePressed() {
  startAudio();
}

// ==================================================
// ============== TYPEWRITER HELPER =================
// returns how much of a line should be visible based on global typeProgress
function typedSubstring(fullText, startCharIndex) {
  let availableChars = floor(typeProgress) - startCharIndex;
  if (availableChars <= 0) return "";
  if (availableChars >= fullText.length) return fullText;
  return fullText.substring(0, availableChars);
}

// ==================================================
// =============== SHARED ===========================
function setup() {
  createCanvas(windowWidth, windowHeight);
  
  print(help);
  frameRate(60);

  rectMode(CENTER);
  ellipseMode(CENTER);
  textAlign(CENTER, CENTER);
  textSize(24);

  port = createSerial();

  let usedPorts = usedSerialPorts();
  if (usedPorts.length > 0) {
    port.open(usedPorts[0], baudrate);
  }

  if (showConnectButton) {
    connectBtn = createButton('Connect to Arduino');
    connectBtn.position(80, 200);
    connectBtn.mousePressed(setupSerial);
  }

  setup_audio();
}

function setupSerial() {
  if (!port.opened()) {
    port.open('Arduino', baudrate);
  } else {
    port.close();
  }
}

// ==========================================
// ========== TIMER FUNCTION ================
let m = 0;
let s = 0;
let m_s = "";
let s_s = "";

function update_time() {
  let totalSeconds = floor(millis() / 1000);
  s = totalSeconds % 60;
  m = floor(totalSeconds / 60) % 60;
  
  // leading zero if single digit
  m_s = m < 10 ? "0" + m : str(m);
  s_s = s < 10 ? "0" + s : str(s);
}



function draw() {
  update_time();
  let trailAlpha = map(knob3, 0, 1023, 50, 5);
  background(10, 10, 10, trailAlpha);
  
  // ===================================================
  // =============== CRT sweep =========================
  scanY += 1.5;
  if (scanY > windowHeight) scanY = 0;


  stroke(0, 174, 64, 80);
  strokeWeight(1);
  line(0, scanY, windowWidth, scanY);
  
  stroke(0, 0, 0, 60);
  strokeWeight(1);
  for (let y = 0; y < windowHeight; y += 3) {
    line(0, y, windowWidth, y);
  }
  
  // =============== heading ============================
  push();
  textAlign(RIGHT);
  textSize(36);
  text("STEER_OS34 v1.2", windowWidth - 10, 30);
  pop();
  
  // ====================================================
  // ================== CLOCK ===========================
  push();
  textAlign(RIGHT);
  textSize(22);
  text("[ T+00:" + m_s + ":" + s_s +" ]", windowWidth - 10, 60);
  pop();

  // ============= debug panel helper ====================
  function on_off(v) {
    if (v==1) return "ON";
    else return "OFF";
  } 
  
  // =================================================
  // ============== BUTTONS ==========================
  // BUTTON 1 HOLD: tension + knob 2 controls the cutoff
  if (audioStarted) {
    let cutoff = map(knob2, 0, 1023, 60, 6000);
    if (btn1 == 1) {
      filter.freq(600);
      filter.res(15);
    } else {
      filter.freq(cutoff);
      filter.res(8); 
    }
  }

  // BUTTON 2 HOLD: freeze (smooth easing in/out)
  let targetSpeed = btn2 == 1 ? 0.1 : 1;
  speedMult += (targetSpeed - speedMult) * 0.1;
  

  // BUTTON 3 TOGGLE: drone quiet
  if (btn3 == 1 && lastBtn3 == 0) {
    droneOff = !droneOff;
  }
  lastBtn3 = btn3;
  
  // smoothed drone amp transition
  if (audioStarted) {
    let targetAmp = droneOff ? 0.015 : 0.1;
    osc1.amp(targetAmp, 0.2);
    osc2.amp(targetAmp, 0.2);
  }

  // BUTTON 4 HOLD: detune wobble
  if (audioStarted) {
    if (btn4 == 1) {
      osc1.freq(73.42 - 15);
      osc2.freq(73.86 + 15);
    } else {
      osc1.freq(73.42);
      osc2.freq(73.86);
    }
  }
  
  // KNOB 3: reverb decay (only re-process when knob has moved enough)
  if (audioStarted && abs(knob3 - lastKnob3) > 30) {
    let decayTime = map(knob3, 0, 1023, 0.5, 8);
    reverb.process(filter, decayTime, 2);
    lastKnob3 = knob3;
  }

  // spawn new shapes up to a cap
  if (frameCount % 10 === 0 && all_objects.length < 25) {
    let candidate = new Shape(
      random(size, windowWidth - size),
      random(size, windowHeight - size)
    );

    if (!candidate.overlapping()) {
      all_objects.push(candidate);
      let half = floor(all_objects.length / 2);
      points = all_objects.slice(0, half);
    }
  }

  // knob1 controls shape size
  let mappedSize = map(knob1, 0, 1023, 5, 80);
  for (let obj of all_objects) {
    obj.r = mappedSize;
    obj.s = mappedSize;
    obj.d = mappedSize;
  }

  // draw shapes
  for (let obj of all_objects) {
    obj.draw_shape();
  }

  // ===================================================
  // ============== DEBUG CONSOLE =========
  fill(0,174,64);
  textFont(myFont);
  noStroke();
  textAlign(LEFT);

  // build the lines fresh each frame so values update live
  let lines = [
    'SCAN RADIUS:    ' + knob1,
    'CLARITY:        ' + knob2,
    'DEPTH:          ' + knob3,
    'ALERT:          ' + on_off(btn1),
    'HOLD POSITION:  ' + on_off(btn2),
    'AMBIENT MUTE:   ' + on_off(droneOff ? 1 : 0),
    'INTERFERENCE:   ' + on_off(btn4),
  ];

  // total characters across all lines
  let totalChars = lines.reduce((sum, l) => sum + l.length, 0);

  // advance the typewriter while still typing
  if (!allTypedOut) {
    typeProgress += typeSpeed;
    if (typeProgress >= totalChars + 60) {
      allTypedOut = true;
    }
  }

// blinking cursor — visible half the time
let cursorVisible = (frameCount % 60) < 45;

// render lines
if (allTypedOut) {
  // typing finished — draw lines normally
  let yPos = 50;
  for (let line of lines) {
    text(line, 20, yPos);
    yPos += 20;
  }
  // persistent cursor at the bottom
  if (cursorVisible) {
    text('_', 20, yPos);
  }
} else {
  // typewriter mode — reveal characters progressively
  let charsSoFar = 0;
  let yPos = 50;
  let cursorY = 50;
  for (let line of lines) {
    let visible = typedSubstring(line, charsSoFar);
    text(visible, 20, yPos);
    
    // if this line is currently being typed, remember its position for the cursor
    if (typeProgress >= charsSoFar && typeProgress < charsSoFar + line.length) {
      cursorY = yPos;
      // draw cursor right after the visible text
      if (cursorVisible) {
        let cursorX = 20 + textWidth(visible);
        text('_', cursorX, yPos);
      }
    }
    
    charsSoFar += line.length;
    yPos += 20;
  }
}

  // detect close encounters between shapes -> trigger notes
  for (let i = 0; i < all_objects.length; i++) {
    for (let j = i + 1; j < all_objects.length; j++) {
      let d = dist(
        all_objects[i].x, all_objects[i].y,
        all_objects[j].x, all_objects[j].y
      );
      if (d < (all_objects[i].d + all_objects[j].d) / 2) {
        triggerNote();
      }
    }
  }

  if (showConnectButton) {
    if (!port.opened()) {
      connectBtn.html('Connect to Arduino');
    } else {
      connectBtn.html('Disconnect');
    }
  }

  if (!port.opened()) {
    text("Disconnected - press space to connect", 20, 30);
  } else {
    text("Connected - press space to disconnect", 20, 30);

    ////////////////////////////////////
    // READ FROM ARDUINO
    ////////////////////////////////////
    while (port.available() > 0) {
      let data = port.readUntil("\n");
      if (data) {
        let fromArduino = split(trim(data), ",");
        if (fromArduino.length == 7) {
          knob1 = int(fromArduino[0]);
          knob2 = int(fromArduino[1]);
          knob3 = int(fromArduino[2]);
          btn1  = int(fromArduino[3]);
          btn2  = int(fromArduino[4]);
          btn3  = int(fromArduino[5]);
          btn4  = int(fromArduino[6]);
        }
      }
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  for (let obj of all_objects) {
    obj.x = constrain(obj.x, size, windowWidth - size);
    obj.y = constrain(obj.y, size, windowHeight - size);
  }
}

function keyPressed() {
  if (key == " ") {
    setupSerial();
  }
}

function keyTyped() {
  // $$$ For some reason on Chrome/Mac you may have to press f twice to toggle. Works correctly on Firefox/Mac
  if (key === 'f') {
    toggleFullscreen();
  }
}

function toggleFullscreen() {
  let fs = fullscreen();
  fullscreen(!fs);
}
