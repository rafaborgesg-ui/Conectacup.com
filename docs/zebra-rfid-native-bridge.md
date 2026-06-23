# Zebra RFID Native Bridge

This project is a Vite web app. The production site can keep running in a normal browser, but Zebra-grade RFID capture requires a native Android wrapper around the page. The wrapper owns the reader and sends clean tag events into the web page.

## Web contract

`ConferirPneus.tsx` now exposes a JavaScript bridge:

```js
window.ConectaCupRFIDBridge.receiveStatus({
  available: true,
  connected: true,
  reader: "RFD40",
  mode: "sdk"
});

window.ConectaCupRFIDBridge.receiveTag({
  epc: "3034...",
  barcode: "00012345",
  cai: "123456",
  rssi: -44,
  seenCount: 1,
  source: "zebra-sdk"
});
```

The same data can be sent by DOM event:

```js
window.dispatchEvent(new CustomEvent("conectacup:rfid-tag", {
  detail: {
    epc: "3034...",
    barcode: "00012345",
    rssi: -44,
    source: "zebra-sdk"
  }
}));
```

The page emits `conectacup:rfid-bridge-ready` after the bridge is registered. The native wrapper should wait for this event or poll for `window.ConectaCupRFIDBridge` before starting inventory. The web side also keeps a small pending queue for early native calls, but the wrapper should still treat the ready event as the handshake.

The page accepts `barcode` directly. If only `epc` is sent, it decodes SGTIN-96 using the current Conecta Cup rule and registers the resulting barcode.

## Duplicate handling in the web page

The page rejects a read before it consumes the next tire field when:

- the same EPC or barcode was received in the last 5 seconds;
- the barcode is already queued for save;
- the barcode is already registered in the current chassis.

This is only the last defense. The native layer should still filter duplicates before sending tags to the web page.

## Preferred native path: Zebra RFID SDK

Use the Zebra RFID SDK when possible. The native layer should:

- connect to the integrated reader or sled;
- set regulatory region if needed;
- enable unique tag reporting;
- purge tag buffers between inventory rounds;
- include RSSI and seen count in reports;
- choose the strongest tag when multiple tags arrive in the same read cycle;
- emit one clean tag event to the web bridge.

Skeleton Kotlin:

```kotlin
class ConectaCupRfidEmitter(private val webView: WebView) {
    fun status(connected: Boolean, readerName: String?) {
        val json = JSONObject()
            .put("available", true)
            .put("connected", connected)
            .put("reader", readerName ?: JSONObject.NULL)
            .put("mode", "sdk")

        webView.post {
            webView.evaluateJavascript(
                "window.ConectaCupRFIDBridge?.receiveStatus(${json});",
                null
            )
        }
    }

    fun tag(epc: String, barcode: String?, cai: String?, rssi: Short?, seenCount: Int?) {
        val json = JSONObject()
            .put("epc", epc)
            .put("barcode", barcode ?: JSONObject.NULL)
            .put("cai", cai ?: JSONObject.NULL)
            .put("rssi", rssi ?: JSONObject.NULL)
            .put("seenCount", seenCount ?: JSONObject.NULL)
            .put("source", "zebra-sdk")

        webView.post {
            webView.evaluateJavascript(
                "window.ConectaCupRFIDBridge?.receiveTag(${json});",
                null
            )
        }
    }
}
```

Reader configuration sketch:

```kotlin
reader.connect()
reader.Config.setUniqueTagReport(true)

val tagStorage = reader.Config.getTagStorageSettings()
tagStorage.setTagFields(arrayOf(
    TAG_FIELD.PEAK_RSSI,
    TAG_FIELD.TAG_SEEN_COUNT
))
reader.Config.setTagStorageSettings(tagStorage)

reader.Events.setTagReadEvent(true)
reader.Events.setAttachTagDataWithReadEvent(false)
reader.Actions.purgeTags()
reader.Actions.Inventory.perform()
```

Read event sketch:

```kotlin
override fun eventReadNotify(event: RfidReadEvents?) {
    val tags = reader.Actions.getReadTags(100) ?: return
    val strongest = tags.maxByOrNull { it.peakRSSI } ?: return

    emitter.tag(
        epc = strongest.tagID,
        barcode = decodeBarcodeIfNativeRuleExists(strongest.tagID),
        cai = decodeCaiIfNativeRuleExists(strongest.tagID),
        rssi = strongest.peakRSSI,
        seenCount = strongest.tagSeenCount
    )
}
```

After a trigger release or a completed inventory window:

```kotlin
reader.Actions.Inventory.stop()
reader.Actions.purgeTags()
```

## DataWedge fallback

If the wrapper uses DataWedge instead of the SDK, configure an app-specific RFID profile:

- RFID Input enabled;
- Filter duplicate tags enabled;
- Tag read duration tuned for the operation;
- Antenna transmit power calibrated on the Zebra device;
- post-filter RSSI set to ignore distant tires;
- Intent Output enabled and Keystroke Output disabled;
- intent delivery as broadcast to the wrapper app.

The Android receiver should translate the DataWedge payload into the same `receiveTag` contract above.

## Recommended first field settings

Start conservative, then tune at the event:

- duplicate window in web: 5 seconds;
- native inventory window: 150 to 300 ms for one tire at a time;
- choose strongest RSSI when multiple tags are present;
- prefer unique tag reporting in the SDK;
- purge reader tags after each trigger release.

## References

- Zebra DataWedge RFID Input: https://techdocs.zebra.com/datawedge/14-1/guide/input/rfid/
- Zebra DataWedge Intent Output: https://techdocs.zebra.com/datawedge/13-0/guide/output/intent/
- Zebra RFID SDK Android guide: https://techdocs.zebra.com/dcs/rfid/android/2-0-2-94/tutorials/rfiddevguide/
- Zebra RFID SDK FAQ, unique tag reporting: https://techdocs.zebra.com/dcs/rfid/android/2-0-2-94/guide/faqs/
