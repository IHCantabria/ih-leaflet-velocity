# IH-Leaflet-Velocity  [Archived] [DEPRECATED]

## IMPORTANT

This repository has been replaced by [ih-leaflet-velocity-ts](https://github.com/IHCantabria/ih-leaflet-velocity-ts)

## REPO INFO

This is a fork of [leaflet-velocity](https://github.com/onaci/leaflet-velocity), a Leaflet plugin for visualizing directional and intensity layers of arbitrary velocities (e.g., wind or ocean currents).

![Screenshot](/screenshots/velocity.gif?raw=true)

## 🔄 Differences from the Original Repository

This fork introduces the following modifications compared to the original repository:

- New waves representation
- Update Control.Velocity to support wave parameters
- Update dependencies

![Screenshot](/screenshots/waves-velocity.gif?raw=true)

## ✨ Usage

To use this fork:

Download the [dist](https://github.com/IHCantabria/ih-leaflet-velocity/tree/main/dist) content in your project and import leaflet-velocity.js and leaflet.velocity.css (or min. versions)

Basic example:

```javascript
const velocityLayer = L.velocityLayer({
  displayValues: true,
  displayOptions: {
    // label prefix
    velocityType: "Global Wind",

    // leaflet control position
    position: "bottomleft",

    // no data at cursor
    emptyString: "No velocity data",

    // see explanation below
    angleConvention: "bearingCW",

    // display cardinal direction alongside degrees
    showCardinal: false,

    // one of: ['ms', 'k/h', 'mph', 'kt']
    speedUnit: "ms",

    // unit for waves visualization
    heightUnit: "m"

    // direction label prefix
    directionString: "Direction",

    // speed label prefix
    speedString: "Speed",

    // height label prefix
    heightString: "Height"
  },
  data: data, // see demo/*.json, or wind-js-server for example data service

  // OPTIONAL
  minVelocity: 0, // used to align color scale
  maxVelocity: 10, // used to align color scale
  velocityScale: 0.005, // modifier for particle animations, arbitrarily defaults to 0.005
  colorScale: [], // define your own array of hex/rgb colors
  onAdd: null, // callback function
  onRemove: null, // callback function
  opacity: 0.97, // layer opacity, default 0.97

  // optional pane to add the layer, will be created if doesn't exist
  // leaflet v1+ only (falls back to overlayPane for < v1)
  paneName: "overlayPane",

  // WAVE MODE 🌊
  waveMode: true // transform particles into waves
  wavesParticlesSeparation: 3.5, // separation between wave particles
});
```

The angle convention option refers to the convention used to express the wind direction as an angle from north direction in the control.
It can be any combination of `bearing` (angle toward which the flow goes) or `meteo` (angle from which the flow comes),
and `CW` (angle value increases clock-wise) or `CCW` (angle value increases counter clock-wise). If not given defaults to `bearingCCW`.

The speed unit option refers to the unit used to express the wind speed in the control.
It can be `m/s` for meter per second, `k/h` for kilometer per hour or `kt` for knots. If not given defaults to `m/s`.


# 🌊 Wave Mode Explanation

When `waveMode` is enabled, the visualization adapts to represent waves instead of standard velocity particles. This means:

- **Particle Behavior**:  
  The particles move according to the provided velocity data, but their representation changes to mimic wave shapes instead of individual velocity particles.

- **Wave Height Representation**:  
  If the data array contains a third parameter with wave height information, the waves will be rendered with different sizes and colors according to their height.

- **Control Display**:  
  The height of the waves will be displayed in the control, allowing users to visualize the intensity of the swell.



## Public methods

| method       | params     | description                       |
| ------------ | ---------- | --------------------------------- |
| `setData`    | `{Object}` | update the layer with new data    |
| `setOptions` | `{Object}` | update the layer with new options |

## Build / watch

```shell
npm run watch
```

## 📚 License and Credits

This project is a fork of [leaflet-velocity](https://github.com/onaci/leaflet-velocity), originally developed by [onaci](https://github.com/onaci) under the [CSIRO Open Source Software Licence Agreement](LICENSE.md), a variation of the BSD/MIT license.

The code also includes components licensed under MIT, such as:

- [L.CanvasOverlay.js](https://gist.github.com/Sumbera/11114288)
- [WindJS](https://github.com/Esri/wind-js)
- [earth](https://github.com/cambecc/earth)

See the [LICENSE](LICENSE.md) file for more details on the terms of use.

## 📈 Contributions

This fork is open to contributions. If you would like to suggest improvements or report issues, feel free to open an issue or submit a pull request.


