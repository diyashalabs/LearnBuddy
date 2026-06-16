# LearnBuddy – Schematic Overview

> ESP32-WROOM-32 (38-pin DevKit) · 4×4 Matrix Keypad · WS2812B LED Ring · Capacitive Touch  
> Firmware: ESP-IDF v5.5.2 · FreeRTOS · Bluedroid BLE · No Arduino

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
 └──────────────┘   │  GPIO13 T4  ──┤  (diagnostic log only)     │
                    │  GPIO12 T5  ──┤                             │
 ┌──────────────┐   │  GPIO14 T6  ──┤                             │
 │  Cap Touch   │───│  GPIO27 T7  ──┤                             │
 │  8 pads      │   │  GPIO33 T8  ──┤                             │
 │  (bare wire) │   │  GPIO32 T9  ──┘                             │
 └──────────────┘   │                                             │
                    │  BLE GATT  LearnBuddy_XXXXXX               │
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
| Touch6   | 14   | Touch pad   |
| Touch7   | 27   | Touch pad   |
| Touch8   | 33   | Touch pad   |
| Touch9   | 32   | Touch pad   |

> All 8 pads log to serial monitor only (`touch_test.c`). Not wired to game logic yet.  
> GPIO0 (T1) and GPIO2 (T2) skipped — boot-strap pins.

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
| 16   | General purpose output |
| 1, 3 | TX/RX — free if serial monitor not needed |
| 34, 35 | Input only, no internal pull-up |
| 36, 39 | Input only, no internal pull-up |
| 6–11 | **DO NOT USE** — internal SPI flash |

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
  └── game_logic.c        (game_logic_init)
        ├── game_config.c       (NVS read/write)
        ├── game_analytics.c    (NVS read/write, flush at session end)
        ├── session_tracker.c   (in-RAM counters)
        ├── game_registry.c     (game metadata)
        └── led_ring.c          (all LED primitives)
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
           GND ───┤7           7├─── IO32 ◄ T9
   IO19 ◄ COL1 ───┤8           8├─── IO33 ◄ T8
   IO18 ◄ DATA ───┤9           9├─── IO25 ◄ ROW1
    IO5 ◄ COL2 ───┤10         10├─── IO26 ◄ ROW0
   IO17 ◄ COL3 ───┤11         11├─── IO27 ◄ T7
          IO16 ───┤12         12├─── IO14 ◄ T6
     IO4 ◄ T0  ───┤13         13├─── IO12 ◄ T5
     IO0 ⚠ T1  ───┤14         14├─── IO13 ◄ T4
     IO2 ⚠ T2  ───┤15         15├─── SD3 / IO10  ⚠FLASH
    IO15 ◄ T3  ───┤16         16├─── SD2 / IO9   ⚠FLASH
    SD1 / IO8 ⚠───┤17         17├─── CMD / IO11  ⚠FLASH
    SD0 / IO7 ⚠───┤18         18├─── 5V / VIN
    CLK / IO6 ⚠───┤19         19├─── GND
                    │             │
                    └────[USB]────┘

◄ = used by LearnBuddy firmware
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
| 1   | 300–500 Ω resistor  | Series on WS2812B DIN line               |
| 1   | 100 µF electrolytic | Decoupling across LED ring 5V/GND        |
| 1   | 5 V USB supply      | ≥ 2 A for LED ring                       |
| –   | Dupont jumper wires | Female-to-female                          |
