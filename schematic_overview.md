# LearnBuddy – Schematic Overview

> ESP32-WROOM-32 (38-pin DevKit) · 4×4 Matrix Keypad · WS2812B LED Ring  
> Firmware: ESP-IDF v5.x · FreeRTOS · No Arduino  

---

## 1  System Block Diagram

```
                    ┌─────────────────────────────────────────────┐
                    │           ESP32-WROOM-32 (38-pin)           │
                    │                                             │
 ┌──────────────┐   │  GPIO26 ROW0  ──┐                          │
 │  4×4 Matrix  │   │  GPIO25 ROW1  ──┤  OUTPUT (push-pull)      │
 │   Keypad     │◄──│  GPIO33 ROW2  ──┤  Driven HIGH one at a    │
 │              │   │  GPIO32 ROW3  ──┘  time to scan rows        │
 │              │   │                                             │
 │              │───│  GPIO27 COL0  ──┐                          │
 │              │   │  GPIO14 COL1  ──┤  INPUT (PULLDOWN_ONLY)   │
 │              │   │  GPIO12 COL2  ──┤  Read when row is HIGH   │
 │              │   │  GPIO13 COL3  ──┘                          │
 └──────────────┘   │                                             │
                    │  GPIO18 DATA  ──────────────────────────────│──► WS2812B
 ┌──────────────┐   │               RMT peripheral @ 10 MHz       │    LED Ring
 │ WS2812B Ring │◄──│                                             │    (16 LEDs)
 │  16 NeoPixels│   │  SoftAP Wi-Fi  SSID: LeanBuddy              │
 │  5V / GND    │   │  WebSocket  /ws  → KEY_x messages           │
 └──────────────┘   └─────────────────────────────────────────────┘
                                        │
                                  192.168.4.1
                                        │
                                  TV Browser
                                  (HTML5 UI + Audio)
```

---

## 2  Pin Assignment Table

### 2.1 Keypad – 4×4 Matrix

| Signal | GPIO | Direction | Config          | Keypad Connector |
|--------|------|-----------|-----------------|------------------|
| ROW0   | 26   | OUTPUT    | Push-pull       | Row 0 wire       |
| ROW1   | 25   | OUTPUT    | Push-pull       | Row 1 wire       |
| ROW2   | 33   | OUTPUT    | Push-pull       | Row 2 wire       |
| ROW3   | 32   | OUTPUT    | Push-pull       | Row 3 wire       |
| COL0   | 27   | INPUT     | PULLDOWN_ONLY   | Col 0 wire       |
| COL1   | 14   | INPUT     | PULLDOWN_ONLY   | Col 1 wire       |
| COL2   | 12   | INPUT     | PULLDOWN_ONLY   | Col 2 wire       |
| COL3   | 13   | INPUT     | PULLDOWN_ONLY   | Col 3 wire       |

**Key map:**

```
         COL0(27)  COL1(14)  COL2(12)  COL3(13)
ROW0(26)    1         2         3         R  (Red)
ROW1(25)    4         5         6         Y  (Yellow)
ROW2(33)    7         8         9         O  (Orange)
ROW3(32)   SPC        0         .         G  (Green)
```

> Scanning logic in `keypad.c`: one row driven HIGH for 5 ms → read four columns → next row.  
> Debounce: 50 ms scan interval. Key event fires on leading edge (press, not release).

### 2.2 LED Ring – WS2812B (NeoPixel)

| Signal  | GPIO | Peripheral | Notes                              |
|---------|------|------------|------------------------------------|
| DATA    | 18   | RMT        | 10 MHz resolution, single-wire     |

**Power:**  
- VCC → 5 V rail (capable of up to 960 mA at full white; typical game use < 200 mA)  
- GND → common ground with ESP32  

**Recommended passives:**  
- 300–500 Ω series resistor on the DIN line (between GPIO18 and ring DIN pad)  
- 100 µF electrolytic decoupling capacitor across the ring's 5 V / GND pads  

### 2.3 Wi-Fi / WebSocket

| Parameter   | Value          |
|-------------|----------------|
| Mode        | SoftAP         |
| SSID        | `LeanBuddy`    |
| Password    | `12345678`     |
| Channel     | 1              |
| Auth        | WPA/WPA2-PSK   |
| Max clients | 4              |
| IP (AP)     | 192.168.4.1    |
| WebSocket   | `/ws`          |
| Power save  | Disabled (latency) |

---

## 3  Capacitive Touch Pin Analysis

The ESP32 has **10 dedicated capacitive touch channels** (Touch0–Touch9).  
They share GPIOs with other functions; some are already claimed by this project.

### 3.1 Full Touch Channel Map

| Touch Ch | GPIO | Status in LearnBuddy | Note                            |
|----------|------|----------------------|---------------------------------|
| Touch0   | 4    | **FREE ★**           | Safe to use as cap-touch input  |
| Touch1   | 0    | **FREE ⚠**           | Boot-strap pin; add 10 kΩ pull-up |
| Touch2   | 2    | **FREE ⚠**           | Boot-strap pin; LED may conflict |
| Touch3   | 15   | **FREE ★**           | Safe to use as cap-touch input  |
| Touch4   | 13   | IN USE – COL3        | Matrix keypad column            |
| Touch5   | 12   | IN USE – COL2        | Matrix keypad column            |
| Touch6   | 14   | IN USE – COL1        | Matrix keypad column            |
| Touch7   | 27   | IN USE – COL0        | Matrix keypad column            |
| Touch8   | 33   | IN USE – ROW2        | Matrix keypad row               |
| Touch9   | 32   | IN USE – ROW3        | Matrix keypad row               |

**Recommendation:** Use **GPIO4 (T0)** and **GPIO15 (T3)** for any additional capacitive touch buttons.  
GPIO0 and GPIO2 can be used but require care during flashing (hold low = boot mode).

### 3.2 Capacitive Touch API (ESP-IDF)

```c
// Example: read Touch0 on GPIO4
touch_pad_init();
touch_pad_set_voltage(TOUCH_HVOLT_2V7, TOUCH_LVOLT_0V5, TOUCH_HVOLT_ATTEN_1V);
touch_pad_config(TOUCH_PAD_NUM0, 0);   // GPIO4 = TOUCH_PAD_NUM0
touch_pad_filter_start(10);            // 10 ms IIR filter

uint16_t val;
touch_pad_read_filtered(TOUCH_PAD_NUM0, &val);
// val < threshold → touched
```

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

### 4.1 Key Bindings Summary

| Key  | IDLE                | SELECTING           | GAME 1 (wait input)       | GAME 2 (wait input)       |
|------|---------------------|---------------------|---------------------------|---------------------------|
| 0    | Cycle brightness    | Cycle brightness    | –                         | –                         |
| 1–9  | –                   | –                   | Submit count answer        | –                         |
| R    | All LEDs red        | All LEDs red        | Change LED colour → red   | Submit colour (R=Red)     |
| Y    | All LEDs yellow     | All LEDs yellow     | Change LED colour → yellow| Submit colour (Y=Yellow)  |
| O    | All LEDs orange     | All LEDs orange     | Change LED colour → orange| Submit colour (O=Orange)  |
| G    | All LEDs green      | All LEDs green      | Change LED colour → green | Submit colour (G=Green)   |
| SPC  | Enter SELECTING     | Cycle game (1↔2)    | –                         | –                         |
| .    | –                   | Confirm game start  | –                         | –                         |

---

## 5  LED Ring Effects

| Function               | Effect                                      | Used when                    |
|------------------------|---------------------------------------------|------------------------------|
| `led_ring_spinner`     | Single blue pixel chases ring for N ms      | Game start transition        |
| `led_ring_set_all`     | Solid colour, all 16 LEDs                   | Colour mode / Game 2 display |
| `led_ring_set_pixels`  | Specific indices lit (random or sequential) | Game 1 count display         |
| `led_ring_set_count`   | First N LEDs lit solid                      | Game selection indicator     |
| `led_ring_flash`       | Full ring blink N times at 200 ms           | Wrong-answer feedback        |
| `led_ring_win_animation` | Rainbow cycle 30 frames × 50 ms          | Correct-answer celebration   |
| `led_ring_clear`       | All off                                     | Reset / brightness preview   |

Brightness is global (`s_intensity`, 8-bit scale), applied as `(channel × intensity) / 255`.  
Four steps: 40, 100, 180, 255 (dim → medium → high → full).

---

## 6  Module Dependency Map

```
main.c
  ├── nvs_flash_init()
  ├── wifi_ap.c        (wifi_init_softap)
  ├── webserver.c      (start_webserver)
  │     └── websocket.c  (websocket_handler, websocket_broadcast_key)
  ├── keypad.c         (keypad_init → FreeRTOS task)
  │     ├── game_logic.c  (game_handle_key)
  │     └── websocket.c   (websocket_broadcast_key)
  └── game_logic.c     (game_logic_init)
        └── led_ring.c    (all LED primitives)
              └── espressif__led_strip  (managed component)
```

---

## 7  38-Pin Module Physical Pinout Reference

```
                    ┌──[ANTENNA]──┐
                    │             │
           GND  ───┤1           1├─── 3V3
          IO23  ───┤2           2├─── EN / RESET
          IO22  ───┤3           3├─── IO36 / VP (input-only)
    IO1 / TXD0  ───┤4           4├─── IO39 / VN (input-only)
    IO3 / RXD0  ───┤5           5├─── IO34       (input-only)
          IO21  ───┤6           6├─── IO35       (input-only)
           GND  ───┤7           7├─── IO32 ◄ ROW3 [Touch9]
          IO19  ───┤8           8├─── IO33 ◄ ROW2 [Touch8]
   IO18 ◄ DATA  ───┤9           9├─── IO25 ◄ ROW1
           IO5  ───┤10         10├─── IO26 ◄ ROW0
          IO17  ───┤11         11├─── IO27 ◄ COL0 [Touch7]
          IO16  ───┤12         12├─── IO14 ◄ COL1 [Touch6]
  IO4 ★ [T0]   ───┤13         13├─── IO12 ◄ COL2 [Touch5]
  IO0 ⚠ [T1]   ───┤14         14├─── IO13 ◄ COL3 [Touch4]
  IO2 ⚠ [T2]   ───┤15         15├─── SD3 / IO10  ⚠FLASH
  IO15 ★[T3]   ───┤16         16├─── SD2 / IO9   ⚠FLASH
 SD1 / IO8 ⚠   ───┤17         17├─── CMD / IO11  ⚠FLASH
 SD0 / IO7 ⚠   ───┤18         18├─── 5V / VIN
 CLK / IO6 ⚠   ───┤19         19├─── GND
                    │             │
                    └────[USB]────┘

★ = free capacitive touch pin (safe)
⚠ = caution (boot-strap or flash-interface pin)
◄ = used by LearnBuddy firmware
⚠FLASH = connected to internal SPI flash – do not use
```

---

## 8  Bill of Materials (Hardware)

| Qty | Component             | Notes                                      |
|-----|-----------------------|--------------------------------------------|
| 1   | ESP32-WROOM-32 DevKit | 38-pin, any ESP32 DevKitC variant          |
| 1   | 4×4 Matrix Keypad     | Passive membrane, 8-pin header             |
| 1   | WS2812B LED Ring      | 16 LEDs, 5 V, ~60 mA/LED max              |
| 1   | 300–500 Ω resistor    | Series on WS2812B DIN line                 |
| 1   | 100 µF electrolytic   | Decoupling across LED ring 5V/GND          |
| 1   | 5 V USB power supply  | ≥ 2 A recommended for LED ring             |
| –   | Dupont jumper wires   | Female-to-female for DevKit to breadboard  |

---

*See `connection_diagram.html` for the interactive visual wiring diagram.*
