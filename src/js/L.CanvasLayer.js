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

    el.style[L.DomUtil.TRANSFORM] =
      (L.Browser.ie3d
        ? "translate(" + pos.x + "px," + pos.y + "px)"
        : "translate3d(" + pos.x + "px," + pos.y + "px,0)") +
      (scale ? " scale(" + scale + ")" : "");
  };
}

// -- support for both  0.0.7 and 1.0.0 rc2 leaflet
L.CanvasLayer = (L.Layer ? L.Layer : L.Class).extend({
  // -- initialized is called on prototype
  initialize: function (options) {
    this._map = null;
    this._canvas = null;
    this._frame = null;
    this._delegate = null;
    L.setOptions(this, options);
  },

  delegate: function (del) {
    this._delegate = del;
    return this;
  },

  needRedraw: function () {
    if (!this._frame) {
      this._frame = L.Util.requestAnimFrame(this.drawLayer, this);
    }
    return this;
  },

  //-------------------------------------------------------------
  _onLayerDidResize: function (resizeEvent) {
    this._canvas.width = resizeEvent.newSize.x;
    this._canvas.height = resizeEvent.newSize.y;
  },
  //-------------------------------------------------------------
  _onLayerDidMove: function () {
    const topLeft = this._map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this._canvas, topLeft);
    this.drawLayer();
  },
  //-------------------------------------------------------------
  getEvents: function () {
    const events = {
      resize: this._onLayerDidResize,
      zoomend: this._onLayerDidMove,
    };
    if (this._map.options.zoomAnimation && L.Browser.any3d) {
      events.zoomanim = this._animateZoom;
    }

    return events;
  },
  //-------------------------------------------------------------
  onAdd: function (map) {
    this._map = map;
    this._canvas = L.DomUtil.create("canvas", "leaflet-layer");
    this.tiles = {};

    const size = this._map.getSize();
    this._canvas.width = size.x;
    this._canvas.height = size.y;

    const animated = this._map.options.zoomAnimation && L.Browser.any3d;
    L.DomUtil.addClass(
      this._canvas,
      "leaflet-zoom-" + (animated ? "animated" : "hide")
    );

    this.options.pane.appendChild(this._canvas);
    map.on(this.getEvents(), this);

    const del = this._delegate || this;
    del.onLayerDidMount && del.onLayerDidMount(); // -- callback
    this.needRedraw();

    const self = this;
    setTimeout(function () {
      self._onLayerDidMove();
    }, 0);
  },

  //-------------------------------------------------------------
  onRemove: function (map) {
    const del = this._delegate || this;
    del.onLayerWillUnmount && del.onLayerWillUnmount(); // -- callback
    this.options.pane.removeChild(this._canvas);
    map.off(this.getEvents(), this);
    this._canvas = null;
  },

  //------------------------------------------------------------
  addTo: function (map) {
    map.addLayer(this);
    return this;
  },

  //------------------------------------------------------------------------------
  drawLayer: function () {
    // -- todo make the viewInfo properties  flat objects.
    const size = this._map.getSize();
    const bounds = this._map.getBounds();
    const zoom = this._map.getZoom();

    const center = this._map.options.crs.project(this._map.getCenter());
    const corner = this._map.options.crs.project(
      this._map.containerPointToLatLng(this._map.getSize())
    );

    const del = this._delegate || this;
    del.onDrawLayer &&
      del.onDrawLayer({
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
  _setTransform: function (el, offset, scale) {
    const pos = offset || new L.Point(0, 0);

    el.style[L.DomUtil.TRANSFORM] =
      (L.Browser.ie3d
        ? "translate(" + pos.x + "px," + pos.y + "px)"
        : "translate3d(" + pos.x + "px," + pos.y + "px,0)") +
      (scale ? " scale(" + scale + ")" : "");
  },

  //------------------------------------------------------------------------------
  _animateZoom: function (e) {
    const scale = this._map.getZoomScale(e.zoom);
    // -- different calc of offset in leaflet 1.0.0 and 0.0.7 thanks for 1.0.0-rc2 calc @jduggan1
    const offset = L.Layer
      ? this._map._latLngToNewLayerPoint(
        this._map.getBounds().getNorthWest(),
        e.zoom,
        e.center
      )
      : this._map
        ._getCenterOffset(e.center)
        ._multiplyBy(-scale)
        .subtract(this._map._getMapPanePos());

    L.DomUtil.setTransform(this._canvas, offset, scale);
  }
});

L.canvasLayer = function (pane) {
  return new L.CanvasLayer(pane);
};
