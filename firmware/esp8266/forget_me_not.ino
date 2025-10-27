#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecureBearSSL.h>
#include <ArduinoJson.h>

// Wi-Fi credentials (2.4 GHz network).
const char *WIFI_SSID = "YOUR_WIFI_SSID";
const char *WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Supabase identifiers from your project.
const char *SUPABASE_FUNCTION_URL =
    "https://sygwkbkrbowprdopnzgk.supabase.co/functions/v1/touch-event";
const char *SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Z3drYmtyYm93cHJkb3BuemdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NzQ0NjYsImV4cCI6MjA3NzE1MDQ2Nn0.T8fbPhiKQmhzzfJew3ngaMrZafGy9J_mIqY4WA7SFlo";

// Forget-me-not pairing configuration.
const char *PAIR_ID = "00000000-0000-0000-0000-000000000000"; // uuid from pairs.id
const char *DEVICE_ID = "00000000-0000-0000-0000-000000000000"; // uuid from devices.id
const char *DEVICE_SECRET = "device-secret";                    // secret from devices.secret

// REST endpoints built from the Supabase base URL.
const char *SUPABASE_REST_EVENTS_URL_PREFIX =
    "https://sygwkbkrbowprdopnzgk.supabase.co/rest/v1/events"
    "?select=id,pair_id,triggered_at"
    "&order=triggered_at.desc&limit=1&pair_id=eq.";
const char *SUPABASE_REST_PAIR_URL_PREFIX =
    "https://sygwkbkrbowprdopnzgk.supabase.co/rest/v1/pairs"
    "?select=sender_id,receiver_id&id=eq.";

// Hardware configuration.
const int TOUCH_PIN = D5;        // Wire leaf acts as capacitive touch sensor.
const int LED_PIN = LED_BUILTIN; // Built-in LED (active low on ESP8266).

// Behaviour tuning.
const unsigned long DEBOUNCE_MS = 250;
const unsigned long POLL_INTERVAL_MS = 2000;
const unsigned long LED_PULSE_MS = 1200;
const unsigned long PARTNER_FETCH_INTERVAL_MS = 15000;

bool lastTouchState = false;
unsigned long lastTouchMillis = 0;
unsigned long lastPollMillis = 0;
unsigned long lastPartnerFetch = 0;

bool ledActive = false;
unsigned long ledActivatedAt = 0;

String partnerDeviceId;
bool partnerResolved = false;
long lastSeenEventId = -1;
long lastSelfEventId = -1;

void ensureWifiConnected();
void ensurePartnerResolved();
void handleTouch();
void postTouchEvent();
void pollForPartnerEvent();
void pulseLed();

void setup() {
  Serial.begin(115200);
  delay(100);

  pinMode(TOUCH_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH); // LED off.

  ensureWifiConnected();
}

void loop() {
  ensureWifiConnected();
  ensurePartnerResolved();

  handleTouch();

  unsigned long now = millis();
  if (now - lastPollMillis >= POLL_INTERVAL_MS) {
    pollForPartnerEvent();
    lastPollMillis = now;
  }

  pulseLed();
  delay(25);
}

void ensureWifiConnected() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  Serial.print("Connecting to Wi-Fi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 20000) {
    delay(500);
    Serial.print('.');
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi connected, IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Wi-Fi connection failed.");
  }
}

void ensurePartnerResolved() {
  if (partnerResolved || WiFi.status() != WL_CONNECTED) {
    return;
  }

  unsigned long now = millis();
  if (now - lastPartnerFetch < PARTNER_FETCH_INTERVAL_MS) {
    return;
  }
  lastPartnerFetch = now;

  String url = String(SUPABASE_REST_PAIR_URL_PREFIX) + PAIR_ID;

  std::unique_ptr<BearSSL::WiFiClientSecure> client(new BearSSL::WiFiClientSecure);
  client->setInsecure();

  HTTPClient https;
  https.setTimeout(5000);

  Serial.println("Resolving partner device...");
  if (!https.begin(*client, url)) {
    Serial.println("Failed to connect to pairs endpoint.");
    return;
  }

  https.addHeader("apikey", SUPABASE_ANON_KEY);
  https.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);

  int httpCode = https.GET();
  if (httpCode == HTTP_CODE_OK) {
    String payload = https.getString();
    Serial.println("Pairs payload: " + payload);

    StaticJsonDocument<512> doc;
    DeserializationError err = deserializeJson(doc, payload);
    if (err) {
      Serial.print("Failed to parse pairs JSON: ");
      Serial.println(err.c_str());
    } else if (doc.is<JsonArray>() && doc.size() > 0) {
      JsonObject obj = doc[0];
      String sender = obj["sender_id"] | "";
      String receiver = obj["receiver_id"] | "";

      if (sender == DEVICE_ID) {
        partnerDeviceId = receiver;
      } else if (receiver == DEVICE_ID) {
        partnerDeviceId = sender;
      } else {
        Serial.println("Device ID not found in pair record.");
      }

      partnerResolved = partnerDeviceId.length() > 0;
      if (partnerResolved) {
        Serial.print("Partner device resolved: ");
        Serial.println(partnerDeviceId);
      }
    } else {
      Serial.println("Pair record missing or empty.");
    }
  } else if (httpCode > 0) {
    Serial.printf("Pair lookup HTTP error: %d\n", httpCode);
  } else {
    Serial.printf("Pair lookup failed: %s\n", https.errorToString(httpCode).c_str());
  }

  https.end();
}

void handleTouch() {
  bool touchActive = (digitalRead(TOUCH_PIN) == LOW);
  unsigned long now = millis();

  if (touchActive && !lastTouchState && (now - lastTouchMillis) > DEBOUNCE_MS) {
    lastTouchMillis = now;
    postTouchEvent();
  }

  lastTouchState = touchActive;
}

void postTouchEvent() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Cannot post event, Wi-Fi not connected.");
    return;
  }

  std::unique_ptr<BearSSL::WiFiClientSecure> client(new BearSSL::WiFiClientSecure);
  client->setInsecure(); // For production, validate the Supabase certificate.

  HTTPClient https;
  https.setTimeout(5000);

  if (!https.begin(*client, SUPABASE_FUNCTION_URL)) {
    Serial.println("Failed to start HTTPS connection to Supabase function.");
    return;
  }

  https.addHeader("Content-Type", "application/json");
  https.addHeader("apikey", SUPABASE_ANON_KEY);
  https.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);

  String payload = String("{\"pair_id\":\"") + PAIR_ID + "\",\"device_id\":\"" + DEVICE_ID +
                   "\",\"device_secret\":\"" + DEVICE_SECRET + "\"}";
  Serial.println("Posting touch event: " + payload);

  int httpCode = https.POST(payload);
  if (httpCode > 0) {
    Serial.printf("Supabase function response code: %d\n", httpCode);
    String response = https.getString();
    Serial.println(response);

    StaticJsonDocument<256> doc;
    if (deserializeJson(doc, response) == DeserializationError::Ok) {
      long insertedId = doc["id"] | -1;
      if (insertedId > 0) {
        lastSelfEventId = insertedId;
        Serial.printf("Stored self event id: %ld\n", lastSelfEventId);
      }
    }
  } else {
    Serial.printf("Supabase function request failed: %s\n", https.errorToString(httpCode).c_str());
  }

  https.end();
}

void pollForPartnerEvent() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Skipping poll, Wi-Fi not connected.");
    return;
  }

  String restUrl = String(SUPABASE_REST_EVENTS_URL_PREFIX) + PAIR_ID;

  std::unique_ptr<BearSSL::WiFiClientSecure> client(new BearSSL::WiFiClientSecure);
  client->setInsecure();

  HTTPClient https;
  https.setTimeout(5000);

  if (!https.begin(*client, restUrl)) {
    Serial.println("Failed to start HTTPS connection to Supabase REST endpoint.");
    return;
  }

  https.addHeader("apikey", SUPABASE_ANON_KEY);
  https.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);

  int httpCode = https.GET();
  if (httpCode > 0) {
    if (httpCode == HTTP_CODE_OK) {
      String payload = https.getString();
      Serial.println("Supabase poll payload: " + payload);

      StaticJsonDocument<512> doc;
      DeserializationError err = deserializeJson(doc, payload);
      if (err) {
        Serial.print("JSON parse failed: ");
        Serial.println(err.c_str());
      } else if (doc.is<JsonArray>() && doc.size() > 0) {
        JsonObject obj = doc[0];
        long eventId = obj["id"] | -1;
        String triggeredAt = obj["triggered_at"] | "";

        if (eventId > 0 && eventId != lastSeenEventId) {
          lastSeenEventId = eventId;

          if (eventId == lastSelfEventId) {
            Serial.println("Ignoring self-triggered event.");
          } else {
            Serial.print("New partner event at ");
            Serial.println(triggeredAt);
            ledActive = true;
            ledActivatedAt = millis();
            digitalWrite(LED_PIN, LOW);
          }
        }
      } else {
        Serial.println("No events returned for this pair.");
      }
    } else if (httpCode == HTTP_CODE_FORBIDDEN || httpCode == HTTP_CODE_UNAUTHORIZED) {
      Serial.println("Supabase auth error - check anon key and policies.");
    } else {
      Serial.printf("Unexpected HTTP status: %d\n", httpCode);
    }
  } else {
    Serial.printf("Supabase REST request failed: %s\n", https.errorToString(httpCode).c_str());
  }

  https.end();
}

void pulseLed() {
  if (!ledActive) {
    return;
  }

  if (millis() - ledActivatedAt >= LED_PULSE_MS) {
    digitalWrite(LED_PIN, HIGH);
    ledActive = false;
  }
}
