# LearnBuddy – Schematic Overview

> ESP32-WROOM-32 (38-pin DevKit) · 4×4 Matrix Keypad · WS2812B LED Ring · Capacitive Touch · TM1637 7-Segment · 2× IR Reflective Sensor  
> Firmware: ESP-IDF v5.5.2 · FreeRTOS · Bluedroid BLE · No Arduino · Pin config via `board.h`

---

## 1  System Block Diagram

```
                    ┌─────────────────────────────────────────────┐
                    │           ESP32-WROOM-32 (38-pin)           │
                    │                                             │
 ┌──────────────┐   │  GPIO26 ROW0  ──┐                          │
 │  4×4 Matrix  │   │  GPIO25 ROW1  ──┤  OUTPUT (push-pull)      │
 │   Keypad     │◄──│  GPIO21 ROW2  ──┤  Driven HIGH one at a    │
 │              │   │  GPIO22 ROW3  ──┘  time to scan rows        │
 │              │   │                                             │
 │              │───│  GPIO23 COL0  ──┐                          │
 │              │   │  GPIO19 COL1  ──┤  INPUT (PULLDOWN)        │
 │              │   │  GPIO5  COL2  ──┤  Read when row is HIGH   │
 │              │   │  GPIO17 COL3  ──┘                          │
 └──────────────┘   │                                             │
                    │  GPIO18 DATA  ──────────────────────────────│──► WS2812B
 ┌──────────────┐   │               RMT peripheral @ 10 MHz       │    LED Ring
 │ WS2812B Ring │◄──│                                             │    (16 LEDs)
 │  16 NeoPixels│   │  GPIO4  T0  ──┐                            │
 │  5V / GND    │   │  GPIO15 T3  ──┤  Capacitive Touch          │
 └──────────────┘   │  GPIO13 T4  ──┤  (TOUCH_PIN_COUNT=4,       │
                    │  GPIO12 T5  ──┘   diagnostic log only)     │
 ┌──────────────┐   │                                             │
 │  Cap Touch   │───│  (GPIO32 free — touch pad 9 never enabled) │
 │  4 pads      │   │                                             │
 │  (bare wire) │   │  GPIO27 CLK  ──┐                           │
 └──────────────┘   │  GPIO14 DIO  ──┤  TM1637 (bit-banged,      │──► TM1637
 ┌──────────────┐   │                  open-drain DIO/ACK)       │    4-digit
 │  TM1637      │◄──│                                             │    7-segment
 │  7-Segment   │   │  GPIO16  ──────────────────────────────────│──► IR Sensor 1
 └──────────────┘   │  GPIO33  ──────────────────────────────────│──► IR Sensor 2
 ┌──────────────┐   │          INPUT + PULLUP, 60 ms debounce    │
 │ IR Sensor 1  │───│          triggers game_handle_key()        │
 │ IR Sensor 2  │   │                                             │
 └──────────────┘   │  BLE GATT  LearnBuddy_XXXXXX               │
                    │  SoftAP    192.168.4.1                      │
                    └─────────────────────────────────────────────┘
                               │BLE                │WiFi
                    ┌──────────┴──┐      ┌─────────┴────────┐
                    │ Teacher App │      │  Child Game UI   │
                    │ LearnBuddy  │      │  192.168.4.1     │
                    │ .html (BLE) │      │  index.html      │
                    └─────────────┘      └──────────────────┘
```

---

## 2  Pin Assignment Table

### 2.1 Keypad – 4×4 Matrix

| Signal | GPIO | Direction | Config        |
|--------|------|-----------|---------------|
| ROW0   | 26   | OUTPUT    | Push-pull     |
| ROW1   | 25   | OUTPUT    | Push-pull     |
| ROW2   | 21   | OUTPUT    | Push-pull     |
| ROW3   | 22   | OUTPUT    | Push-pull     |
| COL0   | 23   | INPUT     | Pull-down     |
| COL1   | 19   | INPUT     | Pull-down     |
| COL2   | 5    | INPUT     | Pull-down     |
| COL3   | 17   | INPUT     | Pull-down     |

**Key map:**

```
         COL0(23)  COL1(19)  COL2(5)   COL3(17)
ROW0(26)    1         2         3         R  (Red)
ROW1(25)    4         5         6         Y  (Yellow)
ROW2(21)    7         8         9         O  (Orange)
ROW3(22)   SPC        0         .         G  (Green)
```

> Scanning: one row driven HIGH for 5 ms → read four columns → next row.  
> Debounce: 50 ms scan interval. Key event fires on leading edge only.

### 2.2 LED Ring – WS2812B (NeoPixel)

| Signal | GPIO | Peripheral | Notes                          |
|--------|------|------------|--------------------------------|
| DATA   | 18   | RMT        | 10 MHz resolution, single-wire |

**Power:**
- VCC → 5 V rail (up to 960 mA full white; typical < 200 mA)
- GND → common ground with ESP32

**Recommended passives:**
- 300–500 Ω series resistor on DIN line
- 100 µF electrolytic decoupling across ring 5V/GND

### 2.3 Capacitive Touch (diagnostic)

| Touch Ch | GPIO | Status      |
|----------|------|-------------|
| Touch0   | 4    | Touch pad   |
| Touch3   | 15   | Touch pad   |
| Touch4   | 13   | Touch pad   |
| Touch5   | 12   | Touch pad   |

> Pad count is set by `#define TOUCH_PIN_COUNT` in `touch_test.h` (0–4). Pins are
> enabled in priority order GPIO4 → GPIO15 → GPIO13 → GPIO12; current build uses
> all 4. All enabled pads log to serial monitor only (`touch_test.c`) — not wired
> to game logic yet.  
> GPIO14, GPIO27, GPIO33, GPIO32 (Touch6/7/8/9) are **no longer touch-capable**
> in this build: GPIO14/27 are reassigned to TM1637 (§2.6); GPIO33 is reassigned
> to IR Sensor 2 (§2.7); GPIO32 sits free as plain GPIO.  
> GPIO0 (T1) and GPIO2 (T2) skipped — boot-strap pins.

### 2.6 TM1637 – 4-Digit 7-Segment Display

| Signal | GPIO | Direction         | Notes                                  |
|--------|------|--------------------|-----------------------------------------|
| CLK    | 27   | OUTPUT (push-pull) | Master-driven only, never read back     |
| DIO    | 14   | INPUT_OUTPUT_OD    | Open-drain + internal pull-up; read back for ACK |

> Bit-banged 2-wire protocol (`tm1637.c`), similar to I2C but with its own
> START/STOP/ACK framing. DIO **must** use `GPIO_MODE_INPUT_OUTPUT_OD` (not
> `GPIO_MODE_OUTPUT_OD`) — the latter never enables the ESP32 input buffer, so
> ACK reads silently always return true regardless of actual wiring.  
> Used in Game 1 as a "wait for correct answer" indicator: a 4-digit snake
> spinner animation (`tm1637_spinner_step`) runs continuously, hiding the
> target number until the correct key is pressed.

### 2.7 IR Reflective Sensors

| Sensor | GPIO | Direction      | Key sent | Notes                          |
|--------|------|----------------|----------|--------------------------------|
| IR 1   | 16   | INPUT (PULLUP) | `SPC`    | Enter / cycle game selection   |
| IR 2   | 33   | INPUT (PULLUP) | `.`      | Confirm game start             |

> Module output is active-LOW (LOW = object detected). ESP32 internal pull-up keeps
> the line HIGH when idle. Debounce: 3 consecutive LOW reads at 20 ms = 60 ms.
> Fires once per detection; re-arms only after object is removed (HIGH restored).  
> Key mapping is configurable via `IR_SENSOR_1_KEY` / `IR_SENSOR_2_KEY` in `board.h`.  
> All GPIO pin numbers are defined in `board.h` — change target board there, not here.

### 2.4 Wi-Fi / Web Server

| Parameter   | Value          |
|-------------|----------------|
| Mode        | SoftAP         |
| SSID        | `LearnBuddy`   |
| IP (AP)     | 192.168.4.1    |
| WebSocket   | `/ws`          |
| Routes      | `/` `index.html` · `/style.css` · `/app.js` |

### 2.5 BLE GATT Server

| Parameter  | Value                              |
|------------|------------------------------------|
| Device name| `LearnBuddy_XXXXXX` (last 3 MAC bytes) |
| Service UUID | `0000FF00-0000-1000-8000-00805f9b34fb` |

| Characteristic | UUID   | Access        | Purpose              |
|----------------|--------|---------------|----------------------|
| Game list      | 0xFF01 | Read          | JSON list of games   |
| Game select    | 0xFF02 | Write         | Select active game   |
| Config         | 0xFF03 | Read/Write    | Game settings JSON   |
| Session        | 0xFF04 | Write         | Start(1) / Stop(0)  |
| Score          | 0xFF05 | Notify        | Live score JSON      |
| Round info     | 0xFF06 | Notify        | Round prompt JSON    |
| Analytics      | 0xFF07 | Read          | Lifetime stats JSON  |

---

## 3  Free Pins

| GPIO | Notes |
|------|-------|
| 32   | Free — touch pad 9 never enabled (`TOUCH_PIN_COUNT` caps at 4) |
| 1, 3 | TX/RX — free if serial monitor not needed |
| 34, 35 | Input only, no internal pull-up |
| 36, 39 | Input only, no internal pull-up |
| 6–11 | **DO NOT USE** — internal SPI flash |

> GPIO14 and GPIO27 are used by TM1637 (§2.6).  
> GPIO16 and GPIO33 are used by IR sensors (§2.7).  
> All assignments are defined in `board.h`.

---

## 4  Game Logic State Machine

```
         ┌──────────┐
  boot   │          │  SPC key
 ───────►│  IDLE    │──────────────────────┐
         │          │◄────────────────────┐│
         └──────────┘    "." cancel       ││
                                          ││
                    ┌─────────────────┐   ││
              SPC   │   SELECTING     │◄──┘│
         ┌─────────►│  (1 or 2 LEDs   │    │
         │ (toggles) │   shown blue)   │    │
         │          └────────┬────────┘    │
         │                   │ "." confirm │
         │          ┌────────┴────────┐    │
         │          │                 │    │
         │    sel=1  ▼         sel=2  ▼    │
         │  ┌──────────┐   ┌──────────┐   │
         │  │  GAME 1  │   │  GAME 2  │   │
         │  │ Count    │   │ Colour   │   │
         │  │ the LEDs │   │  Match   │   │
         │  └─────┬────┘   └────┬─────┘   │
         │        │             │         │
         │   0-9  │ correct     │ R/Y/O/G │
         │        ▼             ▼  correct│
         │   ┌──────────────────────┐     │
         │   │   WIN ANIMATION      │     │
         │   │   (rainbow 1.5 s)    │     │
         │   └──────────┬───────────┘     │
         │              │ auto restart    │
         └──────────────┘                 │
                wrong → red flash + retry─┘
```

### 4.1 Key Bindings

| Key  | IDLE             | SELECTING        | GAME 1                    | GAME 2                    |
|------|------------------|------------------|---------------------------|---------------------------|
| 0    | Cycle brightness | Cycle brightness | –                         | –                         |
| 1–9  | –                | –                | Submit count answer       | –                         |
| R    | LEDs red         | LEDs red         | Change LED colour → red   | Submit colour (Red)       |
| Y    | LEDs yellow      | LEDs yellow      | Change LED colour → yellow| Submit colour (Yellow)    |
| O    | LEDs orange      | LEDs orange      | Change LED colour → orange| Submit colour (Orange)    |
| G    | LEDs green       | LEDs green       | Change LED colour → green | Submit colour (Green)     |
| SPC  | Enter SELECTING  | Cycle game 1↔2   | –                         | –                         |
| .    | –                | Confirm start    | –                         | –                         |

---

## 5  LED Ring Effects

| Function               | Effect                                   | Used when                  |
|------------------------|------------------------------------------|----------------------------|
| `led_ring_spinner`     | Single blue pixel chases ring            | Game start transition      |
| `led_ring_set_all`     | Solid colour all 16 LEDs                 | Game 2 display             |
| `led_ring_set_count`   | First N LEDs lit solid                   | Game selection indicator   |
| `led_ring_flash`       | Full ring blink N times                  | Wrong answer feedback      |
| `led_ring_win_animation` | Rainbow cycle 30×50 ms               | Correct answer celebration |
| `led_ring_begin/paint/commit` | Buffered multi-colour paint     | Game 1 multi-colour ring   |
| `led_ring_clear`       | All off                                  | Reset                      |

---

## 6  Module Dependency Map

```
main.c
  ├── nvs_flash_init()
  ├── ble_manager.c       (ble_manager_init — BLE GATT server)
  │     ├── session_tracker.c  (score notifications)
  │     └── game_logic.c       (round notifications)
  ├── wifi_ap.c           (wifi_init_softap)
  ├── webserver.c         (start_webserver)
  │     └── websocket.c   (websocket_handler)
  ├── keypad.c            (keypad_init → FreeRTOS task)
  │     └── game_logic.c  (game_handle_key)
  ├── touch_test.c        (touch_test_init → FreeRTOS task, serial log only)
  ├── tm1637.c            (tm1637_init — CLK/DIO bit-bang setup)
  ├── ir_sensor.c         (ir_sensor_init → FreeRTOS task, calls game_handle_key)
  └── game_logic.c        (game_logic_init)
        ├── game_config.c       (NVS read/write)
        ├── game_analytics.c    (NVS read/write, flush at session end)
        ├── session_tracker.c   (in-RAM counters)
        ├── game_registry.c     (game metadata)
        ├── led_ring.c          (all LED primitives)
        └── tm1637.c            (g1_anim_task spinner via tm1637_spinner_step,
                                  tm1637_display_number on correct answer)
```

---

## 7  38-Pin Module Physical Pinout Reference

```
                    ┌──[ANTENNA]──┐
                    │             │
           GND  ───┤1           1├─── 3V3
   IO23 ◄ COL0 ───┤2           2├─── EN / RESET
   IO22 ◄ ROW3 ───┤3           3├─── IO36 / VP  (input-only)
    IO1 / TXD0 ───┤4           4├─── IO39 / VN  (input-only)
    IO3 / RXD0 ───┤5           5├─── IO34        (input-only)
   IO21 ◄ ROW2 ───┤6           6├─── IO35        (input-only)
           GND ───┤7           7├─── IO32        (free)
   IO19 ◄ COL1 ───┤8           8├─── IO33 ◄ IR2
   IO18 ◄ DATA ───┤9           9├─── IO25 ◄ ROW1
    IO5 ◄ COL2 ───┤10         10├─── IO26 ◄ ROW0
   IO17 ◄ COL3 ───┤11         11├─── IO27 ◄ TM1637 CLK
   IO16 ◄ IR1 ───┤12         12├─── IO14 ◄ TM1637 DIO
     IO4 ◄ T0  ───┤13         13├─── IO12 ◄ T5
     IO0 ⚠ T1  ───┤14         14├─── IO13 ◄ T4
     IO2 ⚠ T2  ───┤15         15├─── SD3 / IO10  ⚠FLASH
    IO15 ◄ T3  ───┤16         16├─── SD2 / IO9   ⚠FLASH
    SD1 / IO8 ⚠───┤17         17├─── CMD / IO11  ⚠FLASH
    SD0 / IO7 ⚠───┤18         18├─── 5V / VIN
    CLK / IO6 ⚠───┤19         19├─── GND
                    │             │
                    └────[USB]────┘

◄ = used by LearnBuddy firmware   (IR1 = IR Sensor 1, IR2 = IR Sensor 2)
⚠ = caution (boot-strap or flash-interface pin)
⚠FLASH = connected to internal SPI flash — DO NOT USE
```

---

## 8  Bill of Materials

| Qty | Component           | Notes                                     |
|-----|---------------------|-------------------------------------------|
| 1   | ESP32-WROOM-32 DevKit | 38-pin                                  |
| 1   | 4×4 Matrix Keypad   | Passive membrane, 8-pin connector         |
| 1   | WS2812B LED Ring    | 16 LEDs, 5 V                             |
| 1   | TM1637 7-Segment Module | 4-digit, 2-wire CLK/DIO              |
| 2   | IR Reflective Sensor    | TCRT5000 or similar, digital output  |
| 1   | 300–500 Ω resistor  | Series on WS2812B DIN line               |
| 1   | 100 µF electrolytic | Decoupling across LED ring 5V/GND        |
| 1   | 5 V USB supply      | ≥ 2 A for LED ring                       |
| –   | Dupont jumper wires | Female-to-female                          |
