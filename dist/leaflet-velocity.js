"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _readOnlyError(r) { throw new TypeError('"' + r + '" is read-only'); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
/*
 Generic  Canvas Layer for leaflet 0.7 and 1.0-rc,
 copyright Stanislav Sumbera,  2016 , sumbera.com , license MIT
 originally created and motivated by L.CanvasOverlay  available here: https://gist.github.com/Sumbera/11114288

 */

// -- L.DomUtil.setTransform from leaflet 1.0.0 to work on 0.0.7
//------------------------------------------------------------------------------
if (!L.DomUtil.setTransform) {
  L.DomUtil.setTransform = function (el, offset, scale) {
    var pos = offset || new L.Point(0, 0);
    el.style[L.DomUtil.TRANSFORM] = (L.Browser.ie3d ? "translate(" + pos.x + "px," + pos.y + "px)" : "translate3d(" + pos.x + "px," + pos.y + "px,0)") + (scale ? " scale(" + scale + ")" : "");
  };
}

// -- support for both  0.0.7 and 1.0.0 rc2 leaflet
L.CanvasLayer = (L.Layer ? L.Layer : L.Class).extend({
  // -- initialized is called on prototype
  initialize: function initialize(options) {
    this._map = null;
    this._canvas = null;
    this._frame = null;
    this._delegate = null;
    L.setOptions(this, options);
  },
  delegate: function delegate(del) {
    this._delegate = del;
    return this;
  },
  needRedraw: function needRedraw() {
    if (!this._frame) {
      this._frame = L.Util.requestAnimFrame(this.drawLayer, this);
    }
    return this;
  },
  //-------------------------------------------------------------
  _onLayerDidResize: function _onLayerDidResize(resizeEvent) {
    this._canvas.width = resizeEvent.newSize.x;
    this._canvas.height = resizeEvent.newSize.y;
  },
  //-------------------------------------------------------------
  _onLayerDidMove: function _onLayerDidMove() {
    var topLeft = this._map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._canvas, topLeft);
    this.drawLayer();
  },
  //-------------------------------------------------------------
  getEvents: function getEvents() {
    var events = {
      resize: this._onLayerDidResize,
      zoomend: this._onLayerDidMove
    };
    if (this._map.options.zoomAnimation && L.Browser.any3d) {
      events.zoomanim = this._animateZoom;
    }
    return events;
  },
  //-------------------------------------------------------------
  onAdd: function onAdd(map) {
    this._map = map;
    this._canvas = L.DomUtil.create("canvas", "leaflet-layer");
    this.tiles = {};
    var size = this._map.getSize();
    this._canvas.width = size.x;
    this._canvas.height = size.y;
    var animated = this._map.options.zoomAnimation && L.Browser.any3d;
    L.DomUtil.addClass(this._canvas, "leaflet-zoom-" + (animated ? "animated" : "hide"));
    this.options.pane.appendChild(this._canvas);
    map.on(this.getEvents(), this);
    var del = this._delegate || this;
    del.onLayerDidMount && del.onLayerDidMount(); // -- callback
    this.needRedraw();
    var self = this;
    setTimeout(function () {
      self._onLayerDidMove();
    }, 0);
  },
  //-------------------------------------------------------------
  onRemove: function onRemove(map) {
    var del = this._delegate || this;
    del.onLayerWillUnmount && del.onLayerWillUnmount(); // -- callback
    this.options.pane.removeChild(this._canvas);
    map.off(this.getEvents(), this);
    this._canvas = null;
  },
  //------------------------------------------------------------
  addTo: function addTo(map) {
    map.addLayer(this);
    return this;
  },
  //------------------------------------------------------------------------------
  drawLayer: function drawLayer() {
    // -- todo make the viewInfo properties  flat objects.
    var size = this._map.getSize();
    var bounds = this._map.getBounds();
    var zoom = this._map.getZoom();
    var center = this._map.options.crs.project(this._map.getCenter());
    var corner = this._map.options.crs.project(this._map.containerPointToLatLng(this._map.getSize()));
    var del = this._delegate || this;
    del.onDrawLayer && del.onDrawLayer({
      layer: this,
      canvas: this._canvas,
      bounds: bounds,
      size: size,
      zoom: zoom,
      center: center,
      corner: corner
    });
    this._frame = null;
  },
  // -- L.DomUtil.setTransform from leaflet 1.0.0 to work on 0.0.7
  //------------------------------------------------------------------------------
  _setTransform: function _setTransform(el, offset, scale) {
    var pos = offset || new L.Point(0, 0);
    el.style[L.DomUtil.TRANSFORM] = (L.Browser.ie3d ? "translate(" + pos.x + "px," + pos.y + "px)" : "translate3d(" + pos.x + "px," + pos.y + "px,0)") + (scale ? " scale(" + scale + ")" : "");
  },
  //------------------------------------------------------------------------------
  _animateZoom: function _animateZoom(e) {
    var scale = this._map.getZoomScale(e.zoom);
    // -- different calc of offset in leaflet 1.0.0 and 0.0.7 thanks for 1.0.0-rc2 calc @jduggan1
    var offset = L.Layer ? this._map._latLngToNewLayerPoint(this._map.getBounds().getNorthWest(), e.zoom, e.center) : this._map._getCenterOffset(e.center)._multiplyBy(-scale).subtract(this._map._getMapPanePos());
    L.DomUtil.setTransform(this._canvas, offset, scale);
  }
});
L.canvasLayer = function (pane) {
  return new L.CanvasLayer(pane);
};
L.Control.Velocity = L.Control.extend({
  options: {
    position: "bottomleft",
    emptyString: "Unavailable",
    // Could be any combination of 'bearing' (angle toward which the flow goes) or 'meteo' (angle from which the flow comes)
    // and 'CW' (angle value increases clock-wise) or 'CCW' (angle value increases counter clock-wise)
    angleConvention: "bearingCCW",
    showCardinal: false,
    // Could be 'm/s' for meter per second, 'k/h' for kilometer per hour, 'mph' for miles per hour or 'kt' for knots
    speedUnit: "m/s",
    heightUnit: "m",
    directionString: "Direction",
    speedString: "Speed",
    heightString: "Height",
    onAdd: null,
    onRemove: null,
    waveMode: false
  },
  onAdd: function onAdd(map) {
    var _this$options$leaflet, _this$options$leaflet2;
    this._container = L.DomUtil.create("div", "leaflet-control-velocity");
    L.DomEvent.disableClickPropagation(this._container);
    map.on("mousemove", this._onMouseMove, this);
    this._container.innerHTML = this.options.emptyString;
    (_this$options$leaflet = this.options.leafletVelocity) === null || _this$options$leaflet === void 0 || (_this$options$leaflet = _this$options$leaflet.options) === null || _this$options$leaflet === void 0 || (_this$options$leaflet2 = _this$options$leaflet.onAdd) === null || _this$options$leaflet2 === void 0 || _this$options$leaflet2.call(_this$options$leaflet);
    return this._container;
  },
  onRemove: function onRemove(map) {
    map.off("mousemove", this._onMouseMove, this);
    if (this.options.leafletVelocity.options.onRemove) this.options.leafletVelocity.options.onRemove();
  },
  vectorToSpeed: function vectorToSpeed(uMs, vMs, unit) {
    var velocityAbs = Math.sqrt(Math.pow(uMs, 2) + Math.pow(vMs, 2));
    // Default is m/s
    if (unit === "k/h") {
      return this.meterSec2kilometerHour(velocityAbs);
    } else if (unit === "kt") {
      return this.meterSec2Knots(velocityAbs);
    } else if (unit === "mph") {
      return this.meterSec2milesHour(velocityAbs);
    } else {
      return velocityAbs;
    }
  },
  vectorToDegrees: function vectorToDegrees(uMs, vMs, angleConvention) {
    // Default angle convention is CW
    if (angleConvention.endsWith("CCW")) {
      // vMs comes out upside-down..
      if (vMs > 0) {
        vMs = -vMs;
      } else {
        vMs = Math.abs(vMs);
      }
    }
    var velocityAbs = Math.sqrt(Math.pow(uMs, 2) + Math.pow(vMs, 2));
    var velocityDir = Math.atan2(uMs / velocityAbs, vMs / velocityAbs);
    var velocityDirToDegrees = velocityDir * 180 / Math.PI + 180;
    if (angleConvention === "bearingCW" || angleConvention === "meteoCCW") {
      velocityDirToDegrees += 180;
      if (velocityDirToDegrees >= 360) velocityDirToDegrees -= 360;
    }
    return velocityDirToDegrees;
  },
  degreesToCardinalDirection: function degreesToCardinalDirection(deg) {
    var cardinalDirection = '';
    if (deg >= 0 && deg < 11.25 || deg >= 348.75) {
      cardinalDirection = 'N';
    } else if (deg >= 11.25 && deg < 33.75) {
      cardinalDirection = 'NNW';
    } else if (deg >= 33.75 && deg < 56.25) {
      cardinalDirection = 'NW';
    } else if (deg >= 56.25 && deg < 78.75) {
      cardinalDirection = 'WNW';
    } else if (deg >= 78.25 && deg < 101.25) {
      cardinalDirection = 'W';
    } else if (deg >= 101.25 && deg < 123.75) {
      cardinalDirection = 'WSW';
    } else if (deg >= 123.75 && deg < 146.25) {
      cardinalDirection = 'SW';
    } else if (deg >= 146.25 && deg < 168.75) {
      cardinalDirection = 'SSW';
    } else if (deg >= 168.75 && deg < 191.25) {
      cardinalDirection = 'S';
    } else if (deg >= 191.25 && deg < 213.75) {
      cardinalDirection = 'SSE';
    } else if (deg >= 213.75 && deg < 236.25) {
      cardinalDirection = 'SE';
    } else if (deg >= 236.25 && deg < 258.75) {
      cardinalDirection = 'ESE';
    } else if (deg >= 258.75 && deg < 281.25) {
      cardinalDirection = 'E';
    } else if (deg >= 281.25 && deg < 303.75) {
      cardinalDirection = 'ENE';
    } else if (deg >= 303.75 && deg < 326.25) {
      cardinalDirection = 'NE';
    } else if (deg >= 326.25 && deg < 348.75) {
      cardinalDirection = 'NNE';
    }
    return cardinalDirection;
  },
  meterSec2Knots: function meterSec2Knots(meters) {
    return meters / 0.514;
  },
  meterSec2kilometerHour: function meterSec2kilometerHour(meters) {
    return meters * 3.6;
  },
  meterSec2milesHour: function meterSec2milesHour(meters) {
    return meters * 2.23694;
  },
  _onMouseMove: function _onMouseMove(e) {
    var self = this;
    var pos = this.options.leafletVelocity._map.containerPointToLatLng(L.point(e.containerPoint.x, e.containerPoint.y));
    var gridValue = this.options.leafletVelocity._windy.interpolatePoint(pos.lng, pos.lat);
    var htmlOut = "";
    if (gridValue && !isNaN(gridValue[0]) && !isNaN(gridValue[1])) {
      var deg = self.vectorToDegrees(gridValue[0], gridValue[1], this.options.angleConvention);
      var cardinal = this.options.showCardinal ? " (".concat(self.degreesToCardinalDirection(deg), ") ") : "";
      var variableOutput = "";
      var labelString = "";
      var unit = "";
      if (this.options.waveMode) {
        variableOutput = gridValue[2] ? gridValue[2].toFixed(2) : "No data";
        labelString = this.options.heightString;
        unit = gridValue[2] ? this.options.heightUnit : "";
      } else {
        variableOutput = self.vectorToSpeed(gridValue[0], gridValue[1], this.options.speedUnit).toFixed(2);
        labelString = this.options.speedString;
        unit = this.options.speedUnit;
      }
      htmlOut = "".concat("<strong> ").concat(this.options.velocityType, ": ").concat(this.options.directionString, ": </strong> ").concat(deg.toFixed(2), "\xB0").concat(cardinal, ", <strong> ").concat(labelString, ": </strong> ").concat(variableOutput, " ").concat(unit);
    } else {
      htmlOut = this.options.emptyString;
    }
    self._container.innerHTML = htmlOut;
  }
});
L.Map.mergeOptions({
  positionControl: false
});
L.Map.addInitHook(function () {
  if (this.options.positionControl) {
    this.positionControl = new L.Control.MousePosition();
    this.addControl(this.positionControl);
  }
});
L.control.velocity = function (options) {
  return new L.Control.Velocity(options);
};
var coordinateCache = {};
L.VelocityLayer = (L.Layer ? L.Layer : L.Class).extend({
  options: {
    displayValues: true,
    displayOptions: {
      velocityType: "Velocity",
      position: "bottomleft",
      emptyString: "No velocity data"
    },
    maxVelocity: 10,
    // used to align color scale
    colorScale: null,
    data: null,
    waveMode: false // if true, transform particles shape to waves style
  },
  _map: null,
  _canvasLayer: null,
  _windy: null,
  _context: null,
  _timer: 0,
  _mouseControl: null,
  initialize: function initialize(options) {
    L.setOptions(this, options);
  },
  onAdd: function onAdd(map) {
    // determine where to add the layer
    this._paneName = this.options.paneName || "overlayPane";

    // fall back to overlayPane for leaflet < 1
    var pane = map._panes.overlayPane;
    if (map.getPane) {
      // attempt to get pane first to preserve parent (createPane voids this)
      pane = map.getPane(this._paneName);
      if (!pane) {
        pane = map.createPane(this._paneName);
      }
    }
    // create canvas, add to map pane
    this._canvasLayer = L.canvasLayer({
      pane: pane
    }).delegate(this);
    this._canvasLayer.addTo(map);
    this._map = map;
  },
  onRemove: function onRemove(map) {
    this._destroyWind();
  },
  setData: function setData(data) {
    this.options.data = data;
    if (this._windy) {
      this._windy.setData(data);
      this._clearAndRestart();
    }
    this.fire("load");
  },
  setOpacity: function setOpacity(opacity) {
    this._canvasLayer.setOpacity(opacity);
  },
  setOptions: function setOptions(options) {
    this.options = Object.assign(this.options, options);
    if (options.hasOwnProperty("displayOptions")) {
      this.options.displayOptions = Object.assign(this.options.displayOptions, options.displayOptions);
      this._initMouseHandler(true);
    }
    if (options.hasOwnProperty("data")) this.options.data = options.data;
    if (this._windy) {
      this._windy.setOptions(options);
      if (options.hasOwnProperty("data")) this._windy.setData(options.data);
      this._clearAndRestart();
    }
    this.fire("load");
  },
  /*------------------------------------ PRIVATE ------------------------------------------*/
  onDrawLayer: function onDrawLayer(overlay, params) {
    if (!this._windy) {
      this._initWindy(this);
      return;
    }
    if (!this.options.data) {
      return;
    }
    if (this._timer) clearTimeout(self._timer);
    this._timer = setTimeout(this._clearAndRestart.bind(this), 150); // showing velocity is delayed
  },
  _startWindy: function _startWindy() {
    var bounds = this._map.getBounds();
    var size = this._map.getSize();

    // bounds, width, height, extent
    this._windy.start([[0, 0], [size.x, size.y]], size.x, size.y, [[bounds._southWest.lng, bounds._southWest.lat], [bounds._northEast.lng, bounds._northEast.lat]]);
  },
  _initWindy: function _initWindy(self) {
    // windy object, copy options
    var options = Object.assign({
      canvas: self._canvasLayer._canvas,
      map: this._map
    }, self.options);
    this._windy = new Windy(options);

    // prepare context global var, start drawing
    this._context = this._canvasLayer._canvas.getContext("2d");
    this._canvasLayer._canvas.classList.add("velocity-overlay");
    this.onDrawLayer();
    this._map.on("zoomstart", self._windy.stop);
    this._map.on("zoomend", function () {
      coordinateCache = {};
      return self._clearAndRestart();
    });
    this._map.on("resize", self._clearWind);
    this._initMouseHandler(false);
  },
  _initMouseHandler: function _initMouseHandler(voidPrevious) {
    if (voidPrevious) {
      this._map.removeControl(this._mouseControl);
      this._mouseControl = false;
    }
    if (!this._mouseControl && this.options.displayValues) {
      var options = this.options.displayOptions || {};
      options["leafletVelocity"] = this;
      this._mouseControl = L.control.velocity(_objectSpread(_objectSpread({}, options), {}, {
        waveMode: this.options.waveMode
      })).addTo(this._map);
    }
  },
  _clearAndRestart: function _clearAndRestart() {
    if (this._context) this._context.clearRect(0, 0, 3000, 3000);
    if (this._windy) this._startWindy();
  },
  _clearWind: function _clearWind() {
    if (this._windy) this._windy.stop();
    if (this._context) this._context.clearRect(0, 0, 3000, 3000);
  },
  _destroyWind: function _destroyWind() {
    if (this._timer) clearTimeout(this._timer);
    if (this._windy) this._windy.stop();
    if (this._context) this._context.clearRect(0, 0, 3000, 3000);
    if (this._mouseControl) this._map.removeControl(this._mouseControl);
    this._mouseControl = null;
    this._windy = null;
    this._map.removeLayer(this._canvasLayer);
  }
});
L.velocityLayer = function (options) {
  return new L.VelocityLayer(options);
};

/*  Global class for simulating the movement of particle through a 1km wind grid

 credit: All the credit for this work goes to: https://github.com/cambecc for creating the repo:
 https://github.com/cambecc/earth. The majority of this code is directly take nfrom there, since its awesome.

 This class takes a canvas element and an array of data (1km GFS from http://www.emc.ncep.noaa.gov/index.php?branch=GFS)
 and then uses a mercator (forward/reverse) projection to correctly map wind vectors in "map space".

 The "start" method takes the bounds of the map at its current extent and starts the whole gridding,
 interpolation and animation process.
 */

var Windy = function Windy(params) {
  if (params.waveMode) {
    var _params$particleAge = params.particleAge,
      particleAge = _params$particleAge === void 0 ? 200 : _params$particleAge,
      _params$particleMulti = params.particleMultiplier,
      particleMultiplier = _params$particleMulti === void 0 ? 1 / 10000 : _params$particleMulti,
      _params$velocityScale = params.velocityScale,
      velocityScale = _params$velocityScale === void 0 ? 0.0045 : _params$velocityScale;
    Object.assign(params, {
      velocityScale: velocityScale,
      particleAge: particleAge,
      lineWidth: 1,
      particleMultiplier: particleMultiplier
    });
  }
  var MIN_VELOCITY_INTENSITY = params.minVelocity || 0; // velocity at which particle intensity is minimum (m/s)
  var MAX_VELOCITY_INTENSITY = params.maxVelocity || 10; // velocity at which particle intensity is maximum (m/s)
  var VELOCITY_SCALE = (params.velocityScale || 0.005) * (Math.pow(window.devicePixelRatio, 1 / 3) || 1); // scale for wind velocity (completely arbitrary--this value looks nice)
  var MAX_PARTICLE_AGE = params.particleAge || 90; // max number of frames a particle is drawn before regeneration
  var PARTICLE_LINE_WIDTH = params.lineWidth || 1; // line width of a drawn particle
  var PARTICLE_MULTIPLIER = params.particleMultiplier || 1 / 300; // particle count scalar (completely arbitrary--this values looks nice)
  var PARTICLE_REDUCTION = Math.pow(window.devicePixelRatio, 1 / 3) || 1.6; // multiply particle count for mobiles by this amount
  var FRAME_RATE = params.frameRate || 15;
  var FRAME_TIME = 1000 / FRAME_RATE; // desired frames per second
  var OPACITY = 0.97;
  var SEPARATION = params.wavesParticlesSeparation || 3.5; // separation of wave particles

  var defaulColorScale = ["rgb(36,104, 180)", "rgb(60,157, 194)", "rgb(128,205,193 )", "rgb(151,218,168 )", "rgb(198,231,181)", "rgb(238,247,217)", "rgb(255,238,159)", "rgb(252,217,125)", "rgb(255,182,100)", "rgb(252,150,75)", "rgb(250,112,52)", "rgb(245,64,32)", "rgb(237,45,28)", "rgb(220,24,32)", "rgb(180,0,35)"];
  var colorScale = params.colorScale || defaulColorScale;
  var NULL_WIND_VECTOR = [NaN, NaN, null]; // singleton for no wind in the form: [u, v, magnitude]

  var builder;
  var grid;
  var gridData = params.data;
  var date;
  var λ0, φ0, Δλ, Δφ, ni, nj;
  var setData = function setData(data) {
    gridData = data;
  };
  var setOptions = function setOptions(options) {
    if (options.hasOwnProperty("minVelocity")) options.minVelocity, _readOnlyError("MIN_VELOCITY_INTENSITY");
    if (options.hasOwnProperty("maxVelocity")) options.maxVelocity, _readOnlyError("MAX_VELOCITY_INTENSITY");
    if (options.hasOwnProperty("velocityScale")) (options.velocityScale || 0.005) * (Math.pow(window.devicePixelRatio, 1 / 3) || 1), _readOnlyError("VELOCITY_SCALE");
    if (options.hasOwnProperty("particleAge")) options.particleAge, _readOnlyError("MAX_PARTICLE_AGE");
    if (options.hasOwnProperty("lineWidth")) options.lineWidth, _readOnlyError("PARTICLE_LINE_WIDTH");
    if (options.hasOwnProperty("particleMultiplier")) options.particleMultiplier, _readOnlyError("PARTICLE_MULTIPLIER");
    if (options.hasOwnProperty("opacity")) +options.opacity, _readOnlyError("OPACITY");
    if (options.hasOwnProperty("frameRate")) options.frameRate, _readOnlyError("FRAME_RATE");
    1000 / FRAME_RATE, _readOnlyError("FRAME_TIME");
  };
  var createWindBuilder = function createWindBuilder(uComp, vComp, scalar) {
    return {
      header: uComp.header,
      data: function data(i) {
        var u = uComp.data[i],
          v = vComp.data[i],
          // if exists scalar field (wave height) use it, otherwise calculate magnitude.
          w = scalar ? scalar.data[i] : Math.sqrt(u * u + v * v);
        return [u, v, w];
      },
      // interpolation for vectors like wind (u,v,m)

      interpolate: function interpolate(x, y, g00, g10, g01, g11) {
        var rx = 1 - x,
          ry = 1 - y,
          a = rx * ry,
          b = x * ry,
          c = rx * y,
          d = x * y;
        var u = g00[0] * a + g10[0] * b + g01[0] * c + g11[0] * d;
        var v = g00[1] * a + g10[1] * b + g01[1] * c + g11[1] * d;
        var w = scalar ? g00[2] * a + g10[2] * b + g01[2] * c + g11[2] * d : undefined;
        if (w < 0) {
          u = 0;
          v = 0;
        }
        return [u, v, w];
      }
    };
  };
  var createBuilder = function createBuilder(data) {
    var uComp = null,
      vComp = null,
      scalar = null;
    data.forEach(function (record) {
      switch (record.header.parameterCategory + "," + record.header.parameterNumber) {
        case "1,2":
        case "2,2":
          uComp = record;
          break;
        case "1,3":
        case "2,3":
          vComp = record;
          break;
        default:
          scalar = record;
      }
    });
    return createWindBuilder(uComp, vComp, scalar);
  };
  var buildGrid = function buildGrid(data, callback) {
    var supported = true;
    if (data.length < 2) supported = false;
    if (!supported) console.log("Windy Error: data must have at least two components (u,v)");
    builder = createBuilder(data);
    var header = builder.header;
    if (header.hasOwnProperty("gridDefinitionTemplate") && header.gridDefinitionTemplate != 0) supported = false;
    if (!supported) {
      console.log("Windy Error: Only data with Latitude_Longitude coordinates is supported");
    }
    supported = true; // reset for futher checks

    λ0 = header.lo1;
    φ0 = header.la1; // the grid's origin (e.g., 0.0E, 90.0N)

    Δλ = header.dx;
    Δφ = header.dy; // distance between grid points (e.g., 2.5 deg lon, 2.5 deg lat)

    ni = header.nx;
    nj = header.ny; // number of grid points W-E and N-S (e.g., 144 x 73)

    if (header.hasOwnProperty("scanMode")) {
      var scanModeMask = header.scanMode.toString(2);
      scanModeMask = ('0' + scanModeMask).slice(-8);
      var scanModeMaskArray = scanModeMask.split('').map(Number).map(Boolean);
      if (scanModeMaskArray[0]) Δλ = -Δλ;
      if (scanModeMaskArray[1]) Δφ = -Δφ;
      if (scanModeMaskArray[2]) supported = false;
      if (scanModeMaskArray[3]) supported = false;
      if (scanModeMaskArray[4]) supported = false;
      if (scanModeMaskArray[5]) supported = false;
      if (scanModeMaskArray[6]) supported = false;
      if (scanModeMaskArray[7]) supported = false;
      if (!supported) console.log("Windy Error: Data with scanMode: " + header.scanMode + " is not supported.");
    }
    date = new Date(header.refTime);
    date.setHours(date.getHours() + header.forecastTime);

    // Scan modes 0, 64 allowed.
    // http://www.nco.ncep.noaa.gov/pmb/docs/grib2/grib2_table3-4.shtml
    grid = [];
    var p = 0;
    var isContinuous = Math.floor(ni * Δλ) >= 360;
    for (var j = 0; j < nj; j++) {
      var row = [];
      for (var i = 0; i < ni; i++, p++) {
        row[i] = builder.data(p);
      }
      if (isContinuous) {
        // For wrapped grids, duplicate first column as last column to simplify interpolation logic
        row.push(row[0]);
      }
      grid[j] = row;
    }
    callback({
      date: date,
      interpolate: interpolate
    });
  };

  /**
   * Get interpolated grid value from Lon/Lat position
   * @param λ {Float} Longitude
   * @param φ {Float} Latitude
   * @returns {Object}
   */
  var interpolate = function interpolate(λ, φ) {
    if (!grid) return null;
    var i = floorMod(λ - λ0, 360) / Δλ; // calculate longitude index in wrapped range [0, 360)

    var j = (φ0 - φ) / Δφ; // calculate latitude index in direction +90 to -90

    var fi = Math.floor(i),
      ci = fi + 1;
    var fj = Math.floor(j),
      cj = fj + 1;
    var row;
    row = grid[fj];
    if (row) {
      var g00 = row[fi];
      var g10 = row[ci];
      row = grid[cj];
      if (isValue(g00) && isValue(g10) && row) {
        var g01 = row[fi];
        var g11 = row[ci];
        if (isValue(g01) && isValue(g11)) {
          // All four points found, so interpolate the value.
          return builder.interpolate(i - fi, j - fj, g00, g10, g01, g11);
        }
      }
    }
    return null;
  };

  /**
   * @returns {Boolean} true if the specified value is not null and not undefined.
   */
  var isValue = function isValue(x) {
    return x !== null && x !== undefined;
  };

  /**
   * @returns {Number} returns remainder of floored division, i.e., floor(a / n). Useful for consistent modulo
   *          of negative numbers. See http://en.wikipedia.org/wiki/Modulo_operation.
   */
  var floorMod = function floorMod(a, n) {
    return a - n * Math.floor(a / n);
  };

  /**
   * @returns {Boolean} true if agent is probably a mobile device. Don't really care if this is accurate.
   */
  var isMobile = function isMobile() {
    return /android|blackberry|iemobile|ipad|iphone|ipod|opera mini|webos/i.test(navigator.userAgent);
  };
  var distortionCache = {};
  var distortion = function distortion(projection, λ, φ, x, y) {
    var key = "".concat(λ.toFixed(4), "_").concat(φ.toFixed(4), "_").concat(x, "_").concat(y);
    if (distortionCache[key]) {
      return distortionCache[key];
    }
    var τ = 2 * Math.PI;
    var H = 5;
    var hλ = λ < 0 ? H : -H;
    var hφ = φ < 0 ? H : -H;
    var pλ = project(φ, λ + hλ);
    var pφ = project(φ + hφ, λ);
    var k = Math.cos(φ / 360 * τ);
    var result = [(pλ[0] - x) / hλ / k, (pλ[1] - y) / hλ / k, (pφ[0] - x) / hφ, (pφ[1] - y) / hφ];
    distortionCache[key] = result;
    return result;
  };

  /**
   * Calculate distortion of the wind vector caused by the shape of the projection at point (x, y). The wind
   * vector is modified in place and returned by this function.
   */
  var distort = function distort(projection, λ, φ, x, y, scale, wind) {
    var u = wind[0] * scale;
    var v = wind[1] * scale;
    var d = distortion(projection, λ, φ, x, y);

    // Scale distortion vectors by u and v, then add.
    wind[0] = d[0] * u + d[2] * v;
    wind[1] = d[1] * u + d[3] * v;
    return wind;
  };
  var createField = function createField(columns, bounds, callback) {
    /**
     * @returns {Array} wind vector [u, v, magnitude] at the point (x, y), or [NaN, NaN, null] if wind
     *          is undefined at that point.
     */
    function field(x, y) {
      var column = columns[Math.round(x)];
      return column && column[Math.round(y)] || NULL_WIND_VECTOR;
    }

    // Frees the massive "columns" array for GC. Without this, the array is leaked (in Chrome) each time a new
    // field is interpolated because the field closure's context is leaked, for reasons that defy explanation.
    field.release = function () {
      columns = [];
    };
    field.randomize = function (o) {
      // UNDONE: this method is terrible
      var x, y;
      var safetyNet = 0;
      do {
        x = Math.round(Math.floor(Math.random() * bounds.width) + bounds.x);
        y = Math.round(Math.floor(Math.random() * bounds.height) + bounds.y);
      } while (field(x, y)[2] === null && safetyNet++ < 30);
      o.x = x;
      o.y = y;
      return o;
    };
    callback(bounds, field);
  };
  var buildBounds = function buildBounds(bounds, width, height) {
    var upperLeft = bounds[0];
    var lowerRight = bounds[1];
    var x = Math.round(upperLeft[0]); //Math.max(Math.floor(upperLeft[0], 0), 0);
    var y = Math.max(Math.floor(upperLeft[1], 0), 0);
    var yMax = Math.min(Math.ceil(lowerRight[1], height), height - 1);
    return {
      x: x,
      y: y,
      xMax: width,
      yMax: yMax,
      width: width,
      height: height
    };
  };
  var deg2rad = function deg2rad(deg) {
    return deg / 180 * Math.PI;
  };
  var invert = function invert(x, y) {
    var latlon = params.map.containerPointToLatLng(L.point(x, y));
    return [latlon.lng, latlon.lat];
  };
  var project = function project(lat, lon) {
    var xy = params.map.latLngToContainerPoint(L.latLng(lat, lon));
    return [xy.x, xy.y];
  };
  var interpolateField = function interpolateField(grid, bounds, extent, callback) {
    var projection = {};
    var mapArea = (extent.south - extent.north) * (extent.west - extent.east);
    var velocityScale = VELOCITY_SCALE * Math.pow(mapArea, 0.4);
    var columns = [];
    var x = bounds.x;
    var step = 2;
    var currentZoom = params.map.getZoom();
    if (currentZoom < 10) {
      step = 4;
    }
    function interpolateColumn(x) {
      var column = [];
      for (var y = bounds.y; y <= bounds.yMax; y += step) {
        var coord = invert(x, y);
        if (coord) {
          var λ = coord[0],
            φ = coord[1];
          if (isFinite(λ)) {
            var wind = grid.interpolate(λ, φ);
            if (wind) {
              wind = distort(projection, λ, φ, x, y, velocityScale, wind);
              column[y + 1] = column[y] = wind;
            }
          }
        }
      }
      columns[x + 1] = columns[x] = column;
    }
    (function batchInterpolate() {
      var start = Date.now();
      while (x < bounds.width) {
        interpolateColumn(x);
        x += step;
        if (Date.now() - start > 300) {
          setTimeout(batchInterpolate, 25);
          return;
        }
      }
      createField(columns, bounds, callback);
    })();
  };
  var animationLoop;
  var animate = function animate(bounds, field) {
    function windIntensityColorScale(min, max) {
      colorScale.indexFor = function (m) {
        // map velocity speed to a style
        return Math.max(0, Math.min(colorScale.length - 1, Math.round((m - min) / (max - min) * (colorScale.length - 1))));
      };
      return colorScale;
    }
    var colorStyles = windIntensityColorScale(MIN_VELOCITY_INTENSITY, MAX_VELOCITY_INTENSITY);
    var buckets = colorStyles.map(function () {
      return [];
    });
    var particleCount = Math.round(bounds.width * bounds.height * PARTICLE_MULTIPLIER);
    if (isMobile()) {
      particleCount *= PARTICLE_REDUCTION;
    }
    var fadeOpacity = params.waveMode ? 0.89 : OPACITY;
    var fadeFillStyle = "rgba(0, 0, 0, ".concat(fadeOpacity, ")");
    var particles = [];
    for (var i = 0; i < particleCount; i++) {
      particles.push(field.randomize({
        age: Math.floor(Math.random() * MAX_PARTICLE_AGE) + 0
      }));
    }
    function evolve() {
      buckets.forEach(function (bucket) {
        bucket.length = 0;
      });
      particles.forEach(function (particle) {
        if (particle.age > MAX_PARTICLE_AGE) {
          field.randomize(particle).age = 0;
        }
        var x = particle.x;
        var y = particle.y;
        var v = field(x, y); // vector at current position
        var m = v[2] || 2;
        particle.waveHeight = m;
        if (m === null) {
          particle.age = MAX_PARTICLE_AGE; // particle has escaped the grid, never to return...
        } else {
          var xt = x + v[0];
          var yt = y + v[1];
          if (field(xt, yt)[2] !== null) {
            // Path from (x,y) to (xt,yt) is visible, so add this particle to the appropriate draw bucket.
            particle.xt = xt;
            particle.yt = yt;
            buckets[colorStyles.indexFor(m)].push(particle);
          } else {
            // Particle isn't visible, but it still moves through the field.
            particle.x = xt;
            particle.y = yt;
          }
        }
        particle.age += 1;
      });
    }
    var g = params.canvas.getContext("2d");
    g.lineWidth = PARTICLE_LINE_WIDTH;
    g.fillStyle = fadeFillStyle;
    g.globalAlpha = params.waveMode ? 0.2 : 0.6;
    function verticalOffset(offset, maxOffset) {
      return 7 * Math.cos(Math.abs(offset) / maxOffset * (Math.PI / 2));
    }
    function generateOffsets(numPoints) {
      var numDivisions = (numPoints - 1) / 2;
      var offsets = [];
      for (var _i = -numDivisions; _i <= numDivisions; _i++) {
        offsets.push(_i);
      }
      return offsets;
    }
    function draw() {
      if (params.waveMode) {
        drawWaves();
      } else {
        drawWind();
      }
    }
    function drawWind() {
      // Fade existing particle trails.
      var prev = "lighter";
      g.globalCompositeOperation = "destination-in";
      g.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      g.globalCompositeOperation = prev;
      g.globalAlpha = OPACITY === 0 ? 0 : OPACITY * 0.9; // Draw new particle trails.

      buckets.forEach(function (bucket, i) {
        if (bucket.length > 0) {
          g.beginPath();
          g.strokeStyle = colorStyles[i];
          bucket.forEach(function (particle) {
            g.moveTo(particle.x, particle.y);
            g.lineTo(particle.xt, particle.yt);
            particle.x = particle.xt;
            particle.y = particle.yt;
          });
          g.stroke();
        }
      });
    }
    function drawWaves() {
      var prev = "lighter";
      g.globalCompositeOperation = "destination-in";
      g.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      g.globalCompositeOperation = prev;
      g.globalAlpha = OPACITY;
      buckets.forEach(function (bucket, i) {
        if (bucket.length > 0) {
          g.beginPath();
          g.strokeStyle = colorStyles[i];
          bucket.forEach(function (particle) {
            var dx = particle.xt - particle.x;
            var dy = particle.yt - particle.y;
            var mag = Math.sqrt(dx * dx + dy * dy);
            var perpX = mag ? -dy / mag : 0;
            var perpY = mag ? dx / mag : 0;
            var normX = mag ? dx / mag : 0;
            var normY = mag ? dy / mag : 0;
            function calculateWaveParticles(waveHeight) {
              if (waveHeight < 0.5) {
                return 4;
              } else if (waveHeight < 0.7) {
                return 5;
              } else if (waveHeight < 1) {
                return 6;
              } else if (waveHeight < 1.5) {
                return 7;
              } else if (waveHeight < 2) {
                return 8;
              } else if (waveHeight < 2.5) {
                return 9;
              } else if (waveHeight < 3) {
                return 10;
              } else if (waveHeight < 4) {
                return 10;
              } else if (waveHeight < 10) {
                return 11;
              } else if (waveHeight < 20) {
                return 12;
              } else if (waveHeight < 30) {
                return 13;
              } else {
                return 14;
              }
            }
            var waveHeight = particle.waveHeight;
            var numWaveParticles = calculateWaveParticles(waveHeight);
            var offSets = generateOffsets(numWaveParticles); // Ahora basado en la altura
            var maxOffset = 4.5; // max offset from the line

            offSets.forEach(function (offset) {
              var shiftX = perpX * offset * SEPARATION;
              var shiftY = perpY * offset * SEPARATION;
              var vOff = verticalOffset(offset, maxOffset);
              var startX = particle.x + shiftX + normX * vOff;
              var startY = particle.y + shiftY + normY * vOff;
              var endX = particle.xt + shiftX + normX * vOff;
              var endY = particle.yt + shiftY + normY * vOff;
              g.moveTo(startX, startY);
              g.lineTo(endX, endY);
            });
            particle.x = particle.xt;
            particle.y = particle.yt;
          });
          g.stroke();
        }
      });
    }
    var then = Date.now();
    (function frame() {
      animationLoop = requestAnimationFrame(frame);
      var now = Date.now();
      var delta = now - then;
      if (delta > FRAME_TIME) {
        then = now - delta % FRAME_TIME;
        evolve();
        draw();
      }
    })();
  };
  var start = function start(bounds, width, height, extent) {
    var mapBounds = {
      south: deg2rad(extent[0][1]),
      north: deg2rad(extent[1][1]),
      east: deg2rad(extent[1][0]),
      west: deg2rad(extent[0][0]),
      width: width,
      height: height
    };
    stop();

    // build grid
    buildGrid(gridData, function (grid) {
      // interpolateField
      interpolateField(grid, buildBounds(bounds, width, height), mapBounds, function (bounds, field) {
        // animate the canvas with random points
        windy.field = field;
        animate(bounds, field);
      });
    });
  };
  var stop = function stop() {
    if (windy.field) windy.field.release();
    if (animationLoop) cancelAnimationFrame(animationLoop);
  };
  var windy = {
    params: params,
    start: start,
    stop: stop,
    createField: createField,
    interpolatePoint: interpolate,
    setData: setData,
    setOptions: setOptions
  };
  return windy;
};
if (!window.cancelAnimationFrame) {
  window.cancelAnimationFrame = function (id) {
    clearTimeout(id);
  };
}