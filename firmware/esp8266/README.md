# Forget-me-not Lamp (ESP8266 + Supabase)

Two ESP8266 boards act as the paired leaves of a lamp: touching one leaf posts an event into Supabase so the partner lamp glows. The same firmware runs on both devices; configuration determines which physical lamp a board belongs to.

## Files
- `forget_me_not.ino` - Unified sketch that senses touch, posts to the `touch-event` Edge Function, and polls the `events` table for the latest partner trigger.

## Requirements
- Arduino IDE (or PlatformIO) with the ESP8266 board support package installed.
- Libraries (Library Manager):
  - `ESP8266WiFi`
  - `ESP8266HTTPClient`
  - `ArduinoJson`
- 2.4 GHz Wi-Fi access.
- Supabase project with:
  - `public.devices` table (`id`, `user_id`, `name`, `role`, `secret`, `created_at`).
  - `public.pairs` table (`id`, `user_id`, `sender_id`, `receiver_id`, `created_at`).
  - `public.events` table (`id`, `pair_id`, `triggered_at`).
  - Edge Function `touch-event` that validates the device secret, writes an `events` row, and returns the inserted record (or at least its `id`).

## Hardware setup
1. Connect a jumper wire to GPIO `D5`; the free end is the capacitive touch leaf. The sketch enables the internal pull-up, so the wire idles HIGH.
2. Use the onboard LED (`LED_BUILTIN`) for the glow. To drive an external LED, wire it (with about a 220 Ohm resistor) to a GPIO and update `LED_PIN` in the sketch.

## Firmware configuration
Edit the constants near the top of `forget_me_not.ino` before flashing:

- `WIFI_SSID`, `WIFI_PASSWORD` - your network credentials.
- `PAIR_ID` - UUID from the `pairs` row that links the two lamps.
- `DEVICE_ID` - UUID from `devices.id` for the board being flashed.
- `DEVICE_SECRET` - secret string from `devices.secret` for that record.

Flash the same sketch to both boards, changing only the device-specific values. The firmware automatically fetches the `pairs` record to learn the partner device id.

## Supabase expectations
- `touch-event` should accept a payload like:
  ```json
  {"pair_id":"<PAIR_ID>","device_id":"<DEVICE_ID>","device_secret":"<DEVICE_SECRET>"}
  ```
  It should validate the secret, confirm the device belongs to the pair, insert into `public.events`, and respond with the inserted row (for example `{"id":123,"pair_id":"...","triggered_at":"..."}`).
- Row Level Security (RLS) for the anon key must permit:
  - The Edge Function to insert into `public.events`.
  - The REST client (role `anon`) to select from `public.events` and `public.pairs` filtered by the relevant keys.

## Runtime flow
1. Each board debounces touch on `D5`. When touched, it POSTs its `pair_id`, `device_id`, and `device_secret` to the Edge Function.
2. Both boards poll `rest/v1/events?pair_id=eq.<PAIR_ID>&order=triggered_at.desc&limit=1`. The device ignores the most recent event if its `id` matches the one it just created.
3. When a new partner event appears, the LED pulls LOW (on) for about 1.2 seconds, then turns off. Serial output at 115200 baud logs Wi-Fi status, POST/GET responses, and partner resolution.

## Tuning and hardening
- Adjust `DEBOUNCE_MS`, `POLL_INTERVAL_MS`, and `LED_PULSE_MS` to suit responsiveness and power goals.
- Replace `setInsecure()` with certificate validation or fingerprint pinning before deploying outside a trusted network.
- For lower latency, consider extending the Edge Function to broadcast via Supabase Realtime instead of polling.
